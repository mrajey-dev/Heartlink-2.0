<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Message;
use App\Models\UserReport;
use App\Models\UserBlock;
use App\Models\UserMatch;
use App\Models\Swipe;
use App\Models\ChatMessageCounter;
use Illuminate\Http\Request;
use App\Services\ExpoPushService;

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

        // Mark incoming messages as read
        Message::where('sender_id', $otherUserId)
            ->where('receiver_id', $authId)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        // Auto-fetch recipient user details so the chat header & modal can display live info
        $recipient = User::where('id', $otherUserId)->with('photos')->first();
        $recipientData = null;
        if ($recipient) {
            $photos = $recipient->photos->pluck('photo_url')->toArray();
            if ($recipient->avatar && !in_array($recipient->avatar, $photos)) {
                array_unshift($photos, $recipient->avatar);
            }
            $recipientData = [
                'id'                => $recipient->id,
                'name'              => $recipient->name,
                'display_name'      => $recipient->display_name ?? $recipient->name,
                'avatar'            => $recipient->avatar,
                'photos'            => $photos,
                'bio'               => $recipient->bio ?? '',
                'age'               => $recipient->age,
                'job'               => $recipient->job ?? $recipient->occupation ?? 'Member',
                'occupation'        => $recipient->occupation ?? $recipient->job ?? 'Member',
                'city'              => $recipient->city ?? 'Nearby',
                'state'             => $recipient->state ?? '',
                'is_verified'       => (bool) $recipient->is_verified,
                'is_online'         => (bool) $recipient->is_online,
                'is_support'        => (int) $recipient->id === 16 || !empty($recipient->is_support),
                'subscription_plan' => $recipient->subscription_plan ?? null,
                'interests'         => $recipient->interests ?? [],
            ];
        }

        return response()->json([
            'messages'           => $messages,
            'is_blocked_by_me'   => $isBlockedByMe,
            'recipient'          => $recipientData,
            'free_messages_limit'=> 5,
        ]);
    }

    public function conversations(Request $request)
    {
        $authId = $request->user()->id;

        $blockedIds = UserBlock::where('blocker_id', $authId)
            ->pluck('blocked_user_id')
            ->merge(UserBlock::where('blocked_user_id', $authId)->pluck('blocker_id'))
            ->unique()
            ->filter()
            ->values();

        // 1. Get all partner IDs who have exchanged messages with auth user (does NOT require matching)
        $messagePartnerIds = Message::where(function ($q) use ($authId) {
                $q->where('sender_id', $authId)->where('deleted_by_sender', false);
            })
            ->orWhere(function ($q) use ($authId) {
                $q->where('receiver_id', $authId)->where('deleted_by_receiver', false);
            })
            ->selectRaw('CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END AS partner_id', [$authId])
            ->pluck('partner_id')
            ->unique();

        // 2. Get partner IDs from user_matches
        $matchPartnerIds = UserMatch::where(function ($q) use ($authId) {
                $q->where('user_1_id', $authId)->orWhere('user_2_id', $authId);
            })
            ->selectRaw('CASE WHEN user_1_id = ? THEN user_2_id ELSE user_1_id END AS partner_id', [$authId])
            ->pluck('partner_id')
            ->unique();

        $allPartnerIds = $messagePartnerIds
            ->merge($matchPartnerIds)
            ->reject(function ($id) use ($authId, $blockedIds) {
                return (int) $id === (int) $authId || $blockedIds->contains($id);
            });

        // For every regular user (male or female), ALWAYS show HeartLink Support without needing to match
        if ((int) $authId !== 16) {
            $allPartnerIds->push(16);
        }

        // If user 16 (HeartLink Support), show ALL users (male + female) regardless of messages or match
        if ((int) $authId === 16) {
            $allUserIds = User::where('id', '!=', 16)->pluck('id');
            $allPartnerIds = $allPartnerIds->merge($allUserIds);
        }

        $allPartnerIds = $allPartnerIds->unique()->values();

        $users = User::whereIn('id', $allPartnerIds)
            ->with('photos')
            ->get()
            ->keyBy('id');

        $conversations = $allPartnerIds->map(function ($partnerId) use ($authId, $users) {
            $partnerId = (int) $partnerId;
            $otherUser = $users->get($partnerId);

            if (!$otherUser) {
                if ($partnerId === 16) {
                    $otherUser = (object) [
                        'id'                => 16,
                        'name'              => 'HeartLink Support',
                        'display_name'      => 'HeartLink Support',
                        'avatar'            => null,
                        'is_online'         => true,
                        'is_verified'       => true,
                        'is_support'        => true,
                        'subscription_plan' => 'Official Support',
                        'photos'            => collect(),
                    ];
                } else {
                    return null;
                }
            }

            $lastMsg = Message::where(function ($q) use ($authId, $partnerId) {
                $q->where('sender_id', $authId)
                  ->where('receiver_id', $partnerId)
                  ->where('deleted_by_sender', false);
            })->orWhere(function ($q) use ($authId, $partnerId) {
                $q->where('sender_id', $partnerId)
                  ->where('receiver_id', $authId)
                  ->where('deleted_by_receiver', false);
            })
            ->orderBy('created_at', 'desc')
            ->first();

            // For regular matches without messages, don't show empty item unless it's Support (id: 16)
            if (!$lastMsg && $partnerId !== 16 && (int) $authId !== 16) {
                return null;
            }

            $unreadCount = Message::where('sender_id', $partnerId)
                ->where('receiver_id', $authId)
                ->where('is_read', false)
                ->where('deleted_by_receiver', false)
                ->count();

            $isMe = $lastMsg ? ($lastMsg->sender_id === (int) $authId) : false;
            $msgText = $lastMsg
                ? ($isMe ? 'You: ' . $lastMsg->message : $lastMsg->message)
                : ((int) $authId === 16 ? 'No messages yet' : "We're here to help! Tap to message our support team.");

            $lastTime = $lastMsg ? $lastMsg->created_at->diffForHumans() : '24/7';
            $lastTimestamp = $lastMsg ? $lastMsg->created_at->timestamp : 0;

            $photosCol = isset($otherUser->photos) ? $otherUser->photos : collect();
            $avatarUrl = $otherUser->avatar ?: ($photosCol->first() ? $photosCol->first()->photo_url : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400');

            return [
                'id'             => (int) $otherUser->id,
                'name'           => $otherUser->name ?? 'User',
                'display_name'   => $otherUser->display_name ?? ($otherUser->name ?? 'User'),
                'avatar'         => $avatarUrl,
                'online'         => (bool) ($otherUser->is_online ?? true),
                'is_verified'    => (bool) ($otherUser->is_verified ?? false),
                'is_support'     => $partnerId === 16 || !empty($otherUser->is_support),
                'subscription_plan' => $otherUser->subscription_plan ?? null,
                'last_msg'       => $msgText,
                'last_time'      => $lastTime,
                'last_timestamp' => $lastTimestamp,
                'last_sender_id' => $lastMsg ? $lastMsg->sender_id : null,
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
           'receiver_id'     => 'required|exists:users,id',
            'message'         => 'required|string|max:2000',
            'reply_to_id'     => 'nullable',
            'reply_to_text'   => 'nullable|string',
            'reply_to_sender' => 'nullable|string',
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

        if ($isMale && !$isPremium && (int)$receiverId !== 16 && (int)$senderId !== 16) {
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

        $messageData = [
            'sender_id'   => $senderId,
            'receiver_id' => $receiverId,
            'message'     => $validated['message'],
      ];

        if (!empty($validated['reply_to_id'])) {
            $messageData['reply_to_id'] = $validated['reply_to_id'];
        }
        if (!empty($validated['reply_to_text'])) {
            $messageData['reply_to_text'] = $validated['reply_to_text'];
        }
        if (!empty($validated['reply_to_sender'])) {
            $messageData['reply_to_sender'] = $validated['reply_to_sender'];
        }

        $message = Message::create($messageData);

        $senderName = $user->display_name ?: $user->name;
        $notifSnippet = mb_strlen($validated['message']) > 200 ? mb_substr($validated['message'], 0, 197) . '...' : $validated['message'];

        // Create database in-app notification record for targeted user
        \App\Models\Notification::create([
            'user_id'      => $receiverId,
            'from_user_id' => $senderId,
            'type'         => 'message',
            'message'      => "{$senderName}: {$notifSnippet}",
            'is_read'      => false,
        ]);

        // Send remote push notification to receiver (even if app is closed!)
        ExpoPushService::sendToUser(
            $receiverId,
            $senderName,
            $notifSnippet,
            [
                'screen' => 'ChatDetail',
                'params' => [
                    'userId' => $senderId,
                    'user'   => [
                        'id'   => $senderId,
                        'name' => $senderName,
                    ],
                ],
            ]
        );

        if ($isMale && !$isPremium && (int)$receiverId !== 16 && (int)$senderId !== 16) {
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

       $emoji = $validated['emoji'] ?? null;

        $message = null;
        if (!empty($validated['message_id'])) {
            $message = Message::where('id', $validated['message_id'])->first();
        }

        if (!$message) {
            $message = Message::where(function ($q) use ($senderId, $receiverId) {
                $q->where('sender_id', $senderId)->where('receiver_id', $receiverId);
            })->orWhere(function ($q) use ($senderId, $receiverId) {
                $q->where('sender_id', $receiverId)->where('receiver_id', $senderId);
            })->latest()->first();
        }

        if ($message) {
            if ($message->sender_id === $senderId) {
                $message->sender_reaction = ($message->sender_reaction === $emoji) ? null : $emoji;
            } else {
                $message->receiver_reaction = ($message->receiver_reaction === $emoji) ? null : $emoji;
            }
            $message->save();
        }
        if ($emoji) {
            $senderDisplayName = $sender->display_name ?: $sender->name;
            $reactionMsg = "{$senderDisplayName} reacted {$emoji} to your message";

            // Send in-app notification to receiver
            \App\Models\Notification::create([
                'user_id'      => $receiverId,
                'from_user_id' => $senderId,
                'type'         => 'message_reaction',
                'message'      => $reactionMsg,
                'is_read'      => false,
            ]);

            // Send remote push notification to receiver
            ExpoPushService::sendToUser(
                $receiverId,
                $senderDisplayName,
                $reactionMsg,
                [
                    'screen' => 'ChatDetail',
                    'params' => [
                        'userId' => $senderId,
                        'user'   => [
                            'id'   => $senderId,
                            'name' => $senderDisplayName,
                        ],
                    ],
                ]
            );
        }
        return response()->json([
             'message' => 'Reaction updated',
            'data'    => $message,
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

        // Mark all messages and notifications between blocker and blocked user as read
        Message::where(function ($q) use ($blockerId, $blockedUserId) {
            $q->where('sender_id', $blockerId)->where('receiver_id', $blockedUserId);
        })->orWhere(function ($q) use ($blockerId, $blockedUserId) {
            $q->where('sender_id', $blockedUserId)->where('receiver_id', $blockerId);
        })->update(['is_read' => true]);

        \App\Models\Notification::where(function ($q) use ($blockerId, $blockedUserId) {
            $q->where('user_id', $blockerId)->where('from_user_id', $blockedUserId);
        })->orWhere(function ($q) use ($blockerId, $blockedUserId) {
            $q->where('user_id', $blockedUserId)->where('from_user_id', $blockerId);
        })->update(['is_read' => true]);

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
            ->unique()
            ->filter()
            ->values();

        $matchedIds = UserMatch::where('user_1_id', $authId)
            ->orWhere('user_2_id', $authId)
            ->get()
            ->flatMap(fn($m) => [$m->user_1_id, $m->user_2_id])
            ->filter(fn($id) => $id !== $authId)
            ->values()
            ->toArray();

        // Only count unread messages from active matches (never from unmatched or blocked users!)
        $unreadMessages = empty($matchedIds)
            ? 0
            : Message::where('receiver_id', $authId)
                ->where('is_read', false)
                ->where('deleted_by_receiver', false)
                ->whereNotIn('sender_id', $blockedIds)
                ->whereIn('sender_id', $matchedIds)
                ->count();

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
