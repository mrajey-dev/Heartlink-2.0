<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Swipe;
use App\Models\UserMatch;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\Request;

class RequestController extends Controller
{
    /**
     * Accept an incoming like request.
     * - Creates a mutual like (swipe) from current user → requester
     * - Creates or finds the match record
     * - Notifies the requester that their like was accepted
     */
    public function accept(Request $request, $fromUserId)
    {
        $rawParam    = (string) $fromUserId;
        $fromUserId  = (int) preg_replace('/[^0-9]/', '', $rawParam);
        $currentUser = $request->user();
        $currentId   = $currentUser->id;

        \Log::info('[Accept] raw=' . $rawParam . ' parsed=' . $fromUserId . ' currentId=' . $currentId);

        $targetUser = User::find($fromUserId);
        if (!$targetUser) {
            \Log::warning('[Accept] User not found for id=' . $fromUserId);
            return response()->json(['message' => 'User not found'], 404);
        }

        // Create/update reciprocal like swipe
        Swipe::updateOrCreate(
            ['swiper_id' => $currentId, 'swiped_user_id' => $fromUserId],
            ['type' => 'like', 'is_declined_by_receiver' => false]
        );

        // Reset declined status on original incoming swipe if present
        Swipe::where('swiper_id', $fromUserId)
            ->where('swiped_user_id', $currentId)
            ->update(['is_declined_by_receiver' => false]);

        // Create match record
        $match = UserMatch::firstOrCreate([
            'user_1_id' => min($currentId, $fromUserId),
            'user_2_id' => max($currentId, $fromUserId),
        ], [
            'matched_at' => now(),
        ]);

        \Log::info('[Accept] match_id=' . $match->id . ' wasRecentlyCreated=' . ($match->wasRecentlyCreated ? 'yes' : 'no'));

        $currentDisplayName = $currentUser->display_name ?: $currentUser->name;
        $targetDisplayName  = $targetUser->display_name ?: $targetUser->name;

        // Send explicit notification to the original requester
        Notification::create([
            'user_id'      => $fromUserId,
            'from_user_id' => $currentId,
            'type'         => 'request_accepted',
            'message'      => "{$currentDisplayName} has accepted your request!",
            'is_read'      => false,
        ]);

        // Send explicit notification to the user who accepted
        Notification::create([
            'user_id'      => $currentId,
            'from_user_id' => $fromUserId,
            'type'         => 'request_accepted',
            'message'      => "You accepted {$targetDisplayName}'s request!",
            'is_read'      => true,
        ]);

        return response()->json([
            'message'  => 'Request accepted',
            'is_match' => true,
            'match_id' => $match->id,
        ]);
    }

    /**
     * Decline an incoming like request.
     * - Marks the swipe as declined
     * - Notifies the requester that their request was declined
     */
    public function decline(Request $request, $fromUserId)
    {
        $fromUserId  = (int) preg_replace('/[^0-9]/', '', (string) $fromUserId);
        $currentUser = $request->user();
        $currentId   = $currentUser->id;

        $targetUser = User::find($fromUserId);
        if (!$targetUser) {
            return response()->json(['message' => 'User not found'], 404);
        }

        // Mark the existing swipe as declined by receiver
        Swipe::where('swiper_id', $fromUserId)
            ->where('swiped_user_id', $currentId)
            ->update(['is_declined_by_receiver' => true]);

        $currentDisplayName = $currentUser->display_name ?: $currentUser->name;

        // Send explicit notification to the original requester
        Notification::create([
            'user_id'      => $fromUserId,
            'from_user_id' => $currentId,
            'type'         => 'request_declined',
            'message'      => "{$currentDisplayName} has declined your request.",
            'is_read'      => false,
        ]);

        return response()->json(['message' => 'Request declined']);
    }

    /**
     * Get all notifications for the current user.
     */
    public function notifications(Request $request)
    {
        $userId = $request->user()->id;

        $notifications = Notification::where('user_id', $userId)
            ->with(['fromUser.photos'])
            ->orderByDesc('created_at')
            ->limit(50)
            ->get()
            ->map(function ($n) {
                $fu = $n->fromUser;
                $img = $fu ? $fu->avatar : null;
                if ($fu && $fu->photos && count($fu->photos) > 0) {
                    $p0 = $fu->photos[0];
                    $img = is_string($p0) ? $p0 : ($p0->photo_url ?? $img);
                }
                return [
                    'id'           => $n->id,
                    'type'         => $n->type,
                    'message'      => $n->message,
                    'is_read'      => $n->is_read,
                    'created_at'   => $n->created_at,
                    'from_user'    => $fu ? [
                        'id'           => $fu->id,
                        'name'         => $fu->name,
                        'display_name' => $fu->display_name ?: $fu->name,
                        'avatar'       => $img,
                        'image'        => $img,
                    ] : null,
                ];
            });

        $unreadCount = Notification::where('user_id', $userId)
            ->where('is_read', false)
            ->count();

        return response()->json([
            'notifications' => $notifications,
            'unread_count'  => $unreadCount,
        ]);
    }

    /**
     * Mark all notifications as read.
     */
    public function markRead(Request $request)
    {
        $userId = $request->user()->id;

        Notification::where('user_id', $userId)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return response()->json(['message' => 'All notifications marked as read']);
    }
}
