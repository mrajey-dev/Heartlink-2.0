<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Message;
use App\Models\UserReport;
use App\Models\UserBlock;
use App\Models\UserMatch;
use App\Models\Swipe;
use App\Models\ChatMessageCounter;
use Illuminate\Http\Request;

class ChatController extends Controller
{
    public function getMessages(Request $request, $otherUserId)
    {
        $user = $request->user();
        $authId = $user->id;

        $isBlockedByMe = UserBlock::where('blocker_id', $authId)
            ->where('blocked_user_id', $otherUserId)
            ->exists();

        $isBlockedByOther = UserBlock::where('blocker_id', $otherUserId)
            ->where('blocked_user_id', $authId)
            ->exists();

        if ($isBlockedByOther) {
            return response()->json([
                'message'             => 'User is blocked',
                'messages'            => [],
                'is_blocked_by_me'    => false,
                'is_blocked_by_other' => true,
            ], 403);
        }

        $messages = Message::where(function ($q) use ($authId, $otherUserId) {
            $q->where('sender_id', $authId)
              ->where('receiver_id', $otherUserId)
              ->where('deleted_by_sender', false);
        })->orWhere(function ($q) use ($authId, $otherUserId) {
            $q->where('sender_id', $otherUserId)
              ->where('receiver_id', $authId)
              ->where('deleted_by_receiver', false);
        })
        ->orderBy('created_at', 'asc')
        ->get();

        Message::where('sender_id', $otherUserId)
            ->where('receiver_id', $authId)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        $otherUser = \App\Models\User::with('photos')->find($otherUserId);

        // Check persistent male free message counter (unlimited if user bought ANY subscription plan)
        $genderLower = strtolower(trim($user->gender ?? ''));
        $isMale = ($genderLower === 'male' || $genderLower === 'm');
        $isSubscribed = !empty($user->subscription_plan) && !in_array(strtolower(trim($user->subscription_plan)), ['none', 'free', '']);
        $hasActiveSub = \App\Models\UserSubscription::where('user_id', $authId)->where('status', 'active')->where('expires_at', '>', now())->exists();
        $isPremium = (bool) $user->is_premium || $isSubscribed || $hasActiveSub;

        $freeMessagesLeft = null;
        $totalSent = 0;

        if ($isMale && !$isPremium) {
            $counter = ChatMessageCounter::firstOrCreate([
                'sender_id'   => $authId,
                'receiver_id' => (int) $otherUserId,
            ]);
            $totalSent = (int) $counter->sent_count;
            $freeMessagesLeft = max(0, 5 - $totalSent);
        }

        return response()->json([
            'messages'           => $messages,
            'is_blocked_by_me'   => $isBlockedByMe,
            'other_user'         => $otherUser,
            'is_male'            => $isMale,
            'is_premium'         => $isPremium,
            'free_messages_left' => $freeMessagesLeft,
            'sent_count'         => $totalSent,
            'free_messages_limit'=> 5,
        ]);
    }

    public function conversations(Request $request)
    {
        $authId = $request->user()->id;

        $blockedIds = UserBlock::where('blocker_id', $authId)
            ->pluck('blocked_user_id')
            ->merge(UserBlock::where('blocked_user_id', $authId)->pluck('blocker_id'))
            ->unique();

        $matches = UserMatch::where(function ($q) use ($authId) {
                $q->where('user_1_id', $authId)->orWhere('user_2_id', $authId);
            })
            ->whereNotIn('user_1_id', $blockedIds)
            ->whereNotIn('user_2_id', $blockedIds)
            ->with(['user1.photos', 'user2.photos'])
            ->get();

        $conversations = $matches->map(function ($match) use ($authId) {
            $otherUser = $match->user_1_id === $authId ? $match->user2 : $match->user1;

            if (!$otherUser) return null;

            $lastMsg = Message::where(function ($q) use ($authId, $otherUser) {
                $q->where('sender_id', $authId)
                  ->where('receiver_id', $otherUser->id)
                  ->where('deleted_by_sender', false);
            })->orWhere(function ($q) use ($authId, $otherUser) {
                $q->where('sender_id', $otherUser->id)
                  ->where('receiver_id', $authId)
                  ->where('deleted_by_receiver', false);
            })
            ->orderBy('created_at', 'desc')
            ->first();

            // Only show in chat conversations list if a message has actually been sent
            if (!$lastMsg) {
                return null;
            }

            $unreadCount = Message::where('sender_id', $otherUser->id)
                ->where('receiver_id', $authId)
                ->where('is_read', false)
                ->where('deleted_by_receiver', false)
                ->count();

            $isMe = ($lastMsg->sender_id === $authId);
            $msgText = $isMe ? 'You: ' . $lastMsg->message : $lastMsg->message;

            return [
                'id'             => $otherUser->id,
                'match_id'       => $match->id,
                'name'           => $otherUser->name,
                'avatar'         => $otherUser->avatar ?: ($otherUser->photos->first()->photo_url ?? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400'),
                'online'         => (bool) $otherUser->is_online,
                'last_msg'       => $msgText,
                'last_time'      => $lastMsg->created_at->diffForHumans(),
                'last_timestamp' => $lastMsg->created_at->timestamp,
                'last_sender_id' => $lastMsg->sender_id,
                'is_me'          => $isMe,
                'unread_count'   => $unreadCount,
                'user'           => $otherUser,
            ];
        })->filter()->sortByDesc('last_timestamp')->values();

        return response()->json([
            'conversations' => $conversations,
        ]);
    }

    public function sendMessage(Request $request)
    {
        $validated = $request->validate([
            'receiver_id' => 'required|exists:users,id',
            'message'     => 'required|string|max:50',
        ]);

        $user = $request->user();
        $senderId = $user->id;
        $receiverId = (int) $validated['receiver_id'];

        $isBlocked = UserBlock::where(function ($q) use ($senderId, $receiverId) {
            $q->where('blocker_id', $senderId)->where('blocked_user_id', $receiverId);
        })->orWhere(function ($q) use ($senderId, $receiverId) {
            $q->where('blocker_id', $receiverId)->where('blocked_user_id', $senderId);
        })->exists();

        if ($isBlocked) {
            return response()->json([
                'message' => 'Cannot send message. User is blocked.',
            ], 403);
        }

        // Persistent 5 free message limit check for male users (unlimited if user bought ANY subscription plan)
        $genderLower = strtolower(trim($user->gender ?? ''));
        $isMale = ($genderLower === 'male' || $genderLower === 'm');
        $isSubscribed = !empty($user->subscription_plan) && !in_array(strtolower(trim($user->subscription_plan)), ['none', 'free', '']);
        $hasActiveSub = \App\Models\UserSubscription::where('user_id', $senderId)->where('status', 'active')->where('expires_at', '>', now())->exists();
        $isPremium = (bool) $user->is_premium || $isSubscribed || $hasActiveSub;

        if ($isMale && !$isPremium) {
            $counter = ChatMessageCounter::firstOrCreate([
                'sender_id'   => $senderId,
                'receiver_id' => $receiverId,
            ]);

            if ($counter->sent_count >= 5) {
                return response()->json([
                    'message'            => 'Free limit reached (5/5 messages used for this chat). Upgrade to Premium to keep chatting!',
                    'free_limit_reached' => true,
                    'free_messages_left' => 0,
                ], 403);
            }
        }

        $message = Message::create([
            'sender_id'   => $senderId,
            'receiver_id' => $receiverId,
            'message'     => $validated['message'],
        ]);

        // Increment persistent counter for male users so deleting messages or clearing chat NEVER resets counter!
        if ($isMale && !$isPremium) {
            $counter = ChatMessageCounter::firstOrCreate([
                'sender_id'   => $senderId,
                'receiver_id' => $receiverId,
            ]);
            $counter->increment('sent_count');
            $newLeft = max(0, 5 - $counter->sent_count);
        } else {
            $newLeft = null;
        }

        return response()->json([
            'message'            => 'Message sent successfully',
            'data'               => $message,
            'free_messages_left' => $newLeft,
        ], 201);
    }

    public function deleteMessage(Request $request, $messageId)
    {
        $authId = $request->user()->id;

        $msg = Message::where('id', $messageId)
            ->where(function ($q) use ($authId) {
                $q->where('sender_id', $authId)->orWhere('receiver_id', $authId);
            })
            ->first();

        if (!$msg) {
            return response()->json(['message' => 'Message not found or not authorized'], 404);
        }

        if ($msg->sender_id === $authId) {
            $msg->deleted_by_sender = true;
        } elseif ($msg->receiver_id === $authId) {
            $msg->deleted_by_receiver = true;
        }

        if ($msg->deleted_by_sender && $msg->deleted_by_receiver) {
            $msg->delete();
        } else {
            $msg->save();
        }

        return response()->json([
            'message' => 'Message deleted for you',
            'id'      => $messageId,
        ]);
    }

    public function clearChat(Request $request, $otherUserId)
    {
        $authId = $request->user()->id;
        $otherUserId = (int) $otherUserId;

        // Mark messages sent by authId as deleted_by_sender = true
        Message::where('sender_id', $authId)
            ->where('receiver_id', $otherUserId)
            ->update(['deleted_by_sender' => true]);

        // Mark messages received by authId as deleted_by_receiver = true
        Message::where('sender_id', $otherUserId)
            ->where('receiver_id', $authId)
            ->update(['deleted_by_receiver' => true]);

        // Clean up rows where both sides deleted for themselves
        Message::where('deleted_by_sender', true)
            ->where('deleted_by_receiver', true)
            ->delete();

        return response()->json([
            'message' => 'Chat cleared for you',
        ]);
    }

    public function reactMessage(Request $request)
    {
        $validated = $request->validate([
            'receiver_id' => 'required|exists:users,id',
            'emoji'       => 'nullable|string',
            'message_id'  => 'nullable',
        ]);

        $sender = $request->user();
        $senderId = $sender->id;
        $receiverId = (int) $validated['receiver_id'];
        $emoji = $validated['emoji'] ?? '❤️';

        if (!$emoji) {
            return response()->json(['message' => 'Reaction removed']);
        }

        // Send in-app notification to receiver
        \App\Models\Notification::create([
            'user_id'      => $receiverId,
            'from_user_id' => $senderId,
            'type'         => 'message_reaction',
            'message'      => "{$sender->name} reacted {$emoji} to your message",
            'is_read'      => false,
        ]);

        return response()->json([
            'message' => 'Reaction recorded and notification sent',
        ]);
    }

    public function getBlockedUsers(Request $request)
    {
        $userId = $request->user()->id;
        $blockedIds = UserBlock::where('blocker_id', $userId)->pluck('blocked_user_id');
        $users = \App\Models\User::whereIn('id', $blockedIds)->with('photos')->get();

        return response()->json([
            'blocked_users' => $users,
        ]);
    }

    public function blockUser(Request $request)
    {
        $validated = $request->validate([
            'blocked_user_id' => 'required|exists:users,id',
        ]);

        $blockerId = $request->user()->id;
        $blockedUserId = (int) $validated['blocked_user_id'];

        $block = UserBlock::firstOrCreate([
            'blocker_id'      => $blockerId,
            'blocked_user_id' => $blockedUserId,
        ]);

        // AUTOMATIC UNMATCH: Remove any match record between blocker and blocked user
        UserMatch::where(function ($q) use ($blockerId, $blockedUserId) {
            $q->where('user_1_id', $blockerId)->where('user_2_id', $blockedUserId);
        })->orWhere(function ($q) use ($blockerId, $blockedUserId) {
            $q->where('user_1_id', $blockedUserId)->where('user_2_id', $blockerId);
        })->delete();

        // Delete any swipes between blocker and blocked user
        Swipe::where(function ($q) use ($blockerId, $blockedUserId) {
            $q->where('swiper_id', $blockerId)->where('swiped_user_id', $blockedUserId);
        })->orWhere(function ($q) use ($blockerId, $blockedUserId) {
            $q->where('swiper_id', $blockedUserId)->where('swiped_user_id', $blockerId);
        })->delete();

        return response()->json([
            'message' => 'User blocked and unmatched successfully',
            'block'   => $block,
        ]);
    }

    public function unblockUser(Request $request)
    {
        $validated = $request->validate([
            'blocked_user_id' => 'required|exists:users,id',
        ]);

        $blockerId = $request->user()->id;

        UserBlock::where('blocker_id', $blockerId)
            ->where('blocked_user_id', $validated['blocked_user_id'])
            ->delete();

        return response()->json([
            'message' => 'User unblocked successfully',
        ]);
    }

    public function reportUser(Request $request)
    {
        $validated = $request->validate([
            'reported_user_id' => 'required|exists:users,id',
            'reason'           => 'required|string|max:255',
        ]);

        $reporterId = $request->user()->id;

        $report = UserReport::create([
            'reporter_id'      => $reporterId,
            'reported_user_id' => $validated['reported_user_id'],
            'reason'           => $validated['reason'],
        ]);

        return response()->json([
            'message' => 'Report submitted successfully. Thank you!',
            'report'  => $report,
        ]);
    }

    public function getUnreadCounts(Request $request)
    {
        $authId = $request->user()->id;

        $blockedIds = UserBlock::where('blocker_id', $authId)
            ->pluck('blocked_user_id')
            ->merge(UserBlock::where('blocked_user_id', $authId)->pluck('blocker_id'))
            ->unique();

        $unreadMessages = Message::where('receiver_id', $authId)
            ->where('is_read', false)
            ->where('deleted_by_receiver', false)
            ->whereNotIn('sender_id', $blockedIds)
            ->count();

        $matchedIds = UserMatch::where('user_1_id', $authId)
            ->orWhere('user_2_id', $authId)
            ->get()
            ->flatMap(fn($m) => [$m->user_1_id, $m->user_2_id])
            ->filter(fn($id) => $id !== $authId)
            ->toArray();

        $pendingRequests = Swipe::where('swiped_user_id', $authId)
            ->whereIn('type', ['like', 'super_like'])
            ->whereNotIn('swiper_id', $blockedIds)
            ->whereNotIn('swiper_id', $matchedIds)
            ->where('is_declined_by_receiver', false)
            ->count();

        return response()->json([
            'unread_chats'     => $unreadMessages,
            'pending_requests' => $pendingRequests,
            'total_badges'     => $unreadMessages + $pendingRequests,
        ]);
    }
}
