<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserMatch;
use App\Models\Swipe;
use App\Models\User;
use App\Models\UserBlock;
use Illuminate\Http\Request;

class MatchController extends Controller
{
    public function index(Request $request)
    {
        $userId = $request->user()->id;
        $search = trim((string) $request->input('q', $request->input('search', '')));

        $blockedIds = UserBlock::where('blocker_id', $userId)
            ->pluck('blocked_user_id')
            ->merge(UserBlock::where('blocked_user_id', $userId)->pluck('blocker_id'))
            ->unique();

        $query = UserMatch::where(function ($q) use ($userId) {
                $q->where('user_1_id', $userId)->orWhere('user_2_id', $userId);
            })
            ->whereNotIn('user_1_id', $blockedIds)
            ->whereNotIn('user_2_id', $blockedIds);

        if (!empty($search)) {
            // Escape special wildcards % and _ to prevent wildcard injection
            $escapedSearch = addcslashes($search, '%_');
            $query->where(function ($q) use ($userId, $escapedSearch) {
                $q->whereHas('user1', function ($u) use ($userId, $escapedSearch) {
                    $u->where('id', '!=', $userId)
                      ->where(function ($sub) use ($escapedSearch) {
                          $sub->where('name', 'LIKE', "%{$escapedSearch}%")
                              ->orWhere('display_name', 'LIKE', "%{$escapedSearch}%")
                              ->orWhere('bio', 'LIKE', "%{$escapedSearch}%");
                      });
                })->orWhereHas('user2', function ($u) use ($userId, $escapedSearch) {
                    $u->where('id', '!=', $userId)
                      ->where(function ($sub) use ($escapedSearch) {
                          $sub->where('name', 'LIKE', "%{$escapedSearch}%")
                              ->orWhere('display_name', 'LIKE', "%{$escapedSearch}%")
                              ->orWhere('bio', 'LIKE', "%{$escapedSearch}%");
                      });
                });
            });
        }

        $matches = $query->orderByDesc('matched_at')
            ->orderByDesc('id')
            ->with(['user1.photos', 'user2.photos'])
            ->get()
            ->map(function ($match) use ($userId) {
                $otherUser = $match->user_1_id === $userId ? $match->user2 : $match->user1;
                if (!$otherUser) return null;
                return [
                    'id'          => $match->id,
                    'matched_at'  => $match->matched_at,
                    'user'        => $otherUser,
                ];
            })
            ->filter()
            ->values();

        return response()->json([
            'matches' => $matches,
        ]);
    }

    public function unmatch(Request $request)
    {
        $rawId = $request->input('matched_user_id');
        if ($rawId !== null) {
            $rawId = (int) preg_replace('/[^0-9]/', '', (string) $rawId);
            $request->merge(['matched_user_id' => $rawId]);
        }

        $validated = $request->validate([
            'matched_user_id' => 'required|integer|exists:users,id',
        ]);

        $userId = $request->user()->id;
        $otherId = (int) $validated['matched_user_id'];

        // 1. Delete match records in both directions
        UserMatch::where(function ($q) use ($userId, $otherId) {
            $q->where('user_1_id', $userId)->where('user_2_id', $otherId);
        })->orWhere(function ($q) use ($userId, $otherId) {
            $q->where('user_1_id', $otherId)->where('user_2_id', $userId);
        })->delete();

        // 2. Delete all swipe records between both users in both directions
        Swipe::where(function ($q) use ($userId, $otherId) {
            $q->where('swiper_id', $userId)->where('swiped_user_id', $otherId);
        })->orWhere(function ($q) use ($userId, $otherId) {
            $q->where('swiper_id', $otherId)->where('swiped_user_id', $userId);
        })->delete();

        // 3. Delete all notification records between both users in both directions
        \App\Models\Notification::where(function ($q) use ($userId, $otherId) {
            $q->where('user_id', $userId)->where('from_user_id', $otherId);
        })->orWhere(function ($q) use ($userId, $otherId) {
            $q->where('user_id', $otherId)->where('from_user_id', $userId);
        })->delete();

        // 4. Delete all date proposals/bookings between both users in both directions
        \App\Models\DateBooking::where(function ($q) use ($userId, $otherId) {
            $q->where('proposer_id', $userId)->where('partner_id', $otherId);
        })->orWhere(function ($q) use ($userId, $otherId) {
            $q->where('proposer_id', $otherId)->where('partner_id', $userId);
        })->delete();

        return response()->json([
            'message' => 'Unmatched and deleted successfully',
        ]);
    }

    public function requests(Request $request)
    {
        $userId = $request->user()->id;

        $blockedIds = UserBlock::where('blocker_id', $userId)
            ->pluck('blocked_user_id')
            ->merge(UserBlock::where('blocked_user_id', $userId)->pluck('blocker_id'))
            ->filter()
            ->unique()
            ->toArray();

        $matchedIds = UserMatch::where('user_1_id', $userId)
            ->pluck('user_2_id')
            ->merge(UserMatch::where('user_2_id', $userId)->pluck('user_1_id'))
            ->filter(fn($id) => $id !== $userId)
            ->unique()
            ->toArray();

        // 1. Incoming Pending Swipes
        $swipes = Swipe::where('swiped_user_id', $userId)
            ->whereIn('type', ['like', 'super_like'])
            ->whereNotIn('swiper_id', $blockedIds)
            ->whereNotIn('swiper_id', $matchedIds)
            ->where('is_declined_by_receiver', false)
            ->orderBy('id', 'desc')
            ->get()
            ->unique('swiper_id')
            ->keyBy('swiper_id');

        // 2. Outgoing Declined Swipes
        $outgoingDeclinedSwipes = Swipe::where('swiper_id', $userId)
            ->where('is_declined_by_receiver', true)
            ->whereNotIn('swiped_user_id', $blockedIds)
            ->whereNotIn('swiped_user_id', $matchedIds)
            ->orderBy('id', 'desc')
            ->get()
            ->unique('swiped_user_id')
            ->keyBy('swiped_user_id');

        // 3. Incoming Swipes Declined by me
        $incomingDeclinedSwipes = Swipe::where('swiped_user_id', $userId)
            ->where('is_declined_by_receiver', true)
            ->whereNotIn('swiper_id', $blockedIds)
            ->whereNotIn('swiper_id', $matchedIds)
            ->orderBy('id', 'desc')
            ->get()
            ->unique('swiper_id')
            ->keyBy('swiper_id');

        // 4. Accepted Matches
        $matches = UserMatch::where(function ($q) use ($userId) {
                $q->where('user_1_id', $userId)->orWhere('user_2_id', $userId);
            })
            ->whereNotIn('user_1_id', $blockedIds)
            ->whereNotIn('user_2_id', $blockedIds)
            ->orderByDesc('matched_at')
            ->get();

        // 5. Date Proposals
        $dateBookings = \App\Models\DateBooking::where(function ($q) use ($userId) {
                $q->where('partner_id', $userId)->orWhere('proposer_id', $userId);
            })
            ->whereNotIn('proposer_id', $blockedIds)
            ->whereNotIn('partner_id', $blockedIds)
            ->with('restaurant')
            ->orderBy('id', 'desc')
            ->get();

        // Batch load all target Users in a single query
        $allUserIds = collect()
            ->concat($swipes->keys())
            ->concat($outgoingDeclinedSwipes->keys())
            ->concat($incomingDeclinedSwipes->keys())
            ->concat($matches->pluck('user_1_id'))
            ->concat($matches->pluck('user_2_id'))
            ->concat($dateBookings->pluck('proposer_id'))
            ->concat($dateBookings->pluck('partner_id'))
            ->filter(fn($id) => $id && (int)$id !== (int)$userId)
            ->unique()
            ->values();

        $usersMap = User::whereIn('id', $allUserIds)
            ->with('photos')
            ->get()
            ->keyBy('id');

        // Format 1: Like requests
        $likeRequests = $swipes->map(function ($swipe) use ($usersMap) {
            $u = $usersMap->get($swipe->swiper_id);
            if (!$u) return null;

            $isBoosted = ($swipe->type === 'super_like') || (bool) ($u->is_boosted ?? false);
            $dateSent = $swipe->created_at ? $swipe->created_at->format('M d, Y') : now()->format('M d, Y');
            $timestamp = $swipe->created_at ? $swipe->created_at->timestamp : time();

            return [
                'id'             => 'swipe_' . $u->id,
                'user_id'        => $u->id,
                'type'           => 'match_request',
                'request_type'   => 'match_request',
                'is_outgoing'    => false,
                'name'           => $u->name,
                'display_name'   => $u->display_name ?: $u->name,
                'avatar'         => $u->avatar ?: ($u->photos[0]->photo_url ?? null),
                'user'           => $u,
                'request_status' => 'pending',
                'is_boosted'     => $isBoosted,
                'swipe_type'     => $swipe->type,
                'date_sent'      => $dateSent,
                'timestamp'      => $timestamp,
            ];
        })->filter();

        // Format 2: Accepted matches
        $acceptedMatches = $matches->map(function ($match) use ($userId, $usersMap) {
            $otherId = $match->user_1_id === $userId ? $match->user_2_id : $match->user_1_id;
            $otherUser = $usersMap->get($otherId);
            if (!$otherUser) return null;

            $dateSent = $match->matched_at ? \Carbon\Carbon::parse($match->matched_at)->format('M d, Y') : now()->format('M d, Y');
            $timestamp = $match->matched_at ? \Carbon\Carbon::parse($match->matched_at)->timestamp : time();

            return [
                'id'             => 'match_' . $match->id,
                'user_id'        => $otherUser->id,
                'type'           => 'match_request',
                'request_type'   => 'match_request',
                'is_outgoing'    => false,
                'name'           => $otherUser->name,
                'display_name'   => $otherUser->display_name ?: $otherUser->name,
                'avatar'         => $otherUser->avatar ?: ($otherUser->photos[0]->photo_url ?? null),
                'user'           => $otherUser,
                'request_status' => 'accepted',
                'message'        => ($otherUser->display_name ?: $otherUser->name) . " accepted your request!",
                'is_boosted'     => false,
                'date_sent'      => $dateSent,
                'timestamp'      => $timestamp,
            ];
        })->filter();

        // Format 3: Outgoing declined notifications
        $declinedNotifications = $outgoingDeclinedSwipes->map(function ($swipe) use ($usersMap) {
            $u = $usersMap->get($swipe->swiped_user_id);
            if (!$u) return null;

            $dateSent = $swipe->created_at ? $swipe->created_at->format('M d, Y') : now()->format('M d, Y');
            $timestamp = $swipe->created_at ? $swipe->created_at->timestamp : time();

            return [
                'id'             => 'declined_swipe_' . $u->id,
                'user_id'        => $u->id,
                'type'           => 'declined_notification',
                'request_type'   => 'declined_notification',
                'is_outgoing'    => true,
                'name'           => $u->name,
                'display_name'   => $u->display_name ?: $u->name,
                'avatar'         => $u->avatar ?: ($u->photos[0]->photo_url ?? null),
                'user'           => $u,
                'request_status' => 'declined_by_other',
                'message'        => ($u->display_name ?: $u->name) . " has declined your match request.",
                'is_boosted'     => false,
                'date_sent'      => $dateSent,
                'timestamp'      => $timestamp,
            ];
        })->filter();

        // Format 4: Incoming declined notifications by me
        $declinedByMeNotifications = $incomingDeclinedSwipes->map(function ($swipe) use ($usersMap) {
            $u = $usersMap->get($swipe->swiper_id);
            if (!$u) return null;

            $dateSent = $swipe->created_at ? $swipe->created_at->format('M d, Y') : now()->format('M d, Y');
            $timestamp = $swipe->created_at ? $swipe->created_at->timestamp : time();

            return [
                'id'             => 'declined_by_me_' . $u->id,
                'user_id'        => $u->id,
                'type'           => 'declined_notification',
                'request_type'   => 'declined_notification',
                'is_outgoing'    => false,
                'name'           => $u->name,
                'display_name'   => $u->display_name ?: $u->name,
                'avatar'         => $u->avatar ?: ($u->photos[0]->photo_url ?? null),
                'user'           => $u,
                'request_status' => 'declined_by_me',
                'message'        => "You declined " . ($u->display_name ?: $u->name) . "'s match request.",
                'is_boosted'     => false,
                'date_sent'      => $dateSent,
                'timestamp'      => $timestamp,
            ];
        })->filter();

        // Format 5: Date proposals
        $dateProposals = $dateBookings->map(function ($b) use ($userId, $usersMap) {
            $isOutgoing = (int)$b->proposer_id === (int)$userId;
            $otherId = $isOutgoing ? $b->partner_id : $b->proposer_id;
            $userObj = $usersMap->get($otherId);
            if (!$userObj) return null;

            return [
                'id'               => 'proposal_' . $b->id,
                'booking_id'       => $b->id,
                'type'             => 'date_proposal',
                'request_type'     => 'date_proposal',
                'is_outgoing'      => $isOutgoing,
                'name'             => $userObj->name,
                'display_name'     => $userObj->display_name ?: $userObj->name,
                'avatar'           => $userObj->avatar ?: ($userObj->photos[0]->photo_url ?? null),
                'user'             => $userObj,
                'restaurant'       => $b->restaurant,
                'booking_date'     => $b->booking_date,
                'booking_time'     => $b->booking_time,
                'request_status'   => $b->status,
                'is_boosted'       => false,
                'date_sent'        => $b->created_at ? $b->created_at->format('M d, Y') : now()->format('M d, Y'),
                'timestamp'        => $b->created_at ? $b->created_at->timestamp : time(),
            ];
        })->filter();

        $merged = $likeRequests
            ->concat($acceptedMatches)
            ->concat($declinedNotifications)
            ->concat($declinedByMeNotifications)
            ->concat($dateProposals)
            ->sort(function ($a, $b) {
                $aPending = ($a['request_status'] ?? 'pending') === 'pending';
                $bPending = ($b['request_status'] ?? 'pending') === 'pending';

                if ($aPending !== $bPending) {
                    return $aPending ? -1 : 1;
                }

                if ($aPending && $bPending) {
                    $isBoostedA = (bool) ($a['is_boosted'] ?? false);
                    $isBoostedB = (bool) ($b['is_boosted'] ?? false);
                    if ($isBoostedA !== $isBoostedB) {
                        return $isBoostedA ? -1 : 1;
                    }
                }

                return ($b['timestamp'] ?? 0) - ($a['timestamp'] ?? 0);
            })->values();

        return response()->json([
            'requests' => $merged,
        ]);
    }
}
