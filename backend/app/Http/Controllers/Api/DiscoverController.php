<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Swipe;
use App\Models\UserMatch;
use Illuminate\Http\Request;

class DiscoverController extends Controller
{
    public function feed(Request $request)
    {
        $user = $request->user();

        // 1. Exclude ALL profiles that the CURRENT USER actively swiped on (whether like, pass, or super_like)
        // so that once you swipe on a profile, they never appear again in Discover feed!
        $swipedByMeIds = Swipe::where('swiper_id', $user->id)
            ->pluck('swiped_user_id');

        // 2. Exclude users already matched with
        $matchedIds = \App\Models\UserMatch::where('user_1_id', $user->id)
            ->orWhere('user_2_id', $user->id)
            ->get()
            ->flatMap(fn($m) => [$m->user_1_id, $m->user_2_id])
            ->filter(fn($id) => $id !== $user->id)
            ->unique();

        // 3. Exclude ONLY explicitly blocked users (from UserBlock table)
        $blockedIds = \App\Models\UserBlock::where('blocker_id', $user->id)
            ->pluck('blocked_user_id');

        $excludeIds = $swipedByMeIds->merge($matchedIds)->merge($blockedIds)->unique();

        $query = User::where('id', '!=', $user->id)
            ->whereNotIn('id', $excludeIds);

        // Enforce strict opposite gender filtering:
        // Male -> Female profiles only
        // Female -> Male profiles only
        $userGender = strtolower(trim($user->gender ?? 'male'));
        if (in_array($userGender, ['male', 'man', 'm'])) {
            $query->whereIn(\Illuminate\Support\Facades\DB::raw('LOWER(gender)'), ['female', 'woman', 'f']);
        } else {
            $query->whereIn(\Illuminate\Support\Facades\DB::raw('LOWER(gender)'), ['male', 'man', 'm']);
        }

        // Apply user preference filters from user_settings table
        $userSettings = \App\Models\UserSettings::where('user_id', $user->id)->first();

        if ($userSettings) {
            // Target Age Range Filter
            if ($userSettings->age_range_filter && $userSettings->age_range_filter !== 'Any') {
                $range = explode('-', str_replace(' ', '', $userSettings->age_range_filter));
                if (count($range) === 2) {
                    $query->whereBetween('age', [(int)$range[0], (int)$range[1]]);
                }
            }

            // Must Have Profile Bio Filter
            if ($userSettings->has_bio_only) {
                $query->whereNotNull('bio')->where('bio', '!=', '');
            }

            // Education Filter
            if ($userSettings->education_filter && $userSettings->education_filter !== 'Any') {
                $query->where('education', $userSettings->education_filter);
            }

            // Religion Filter
            if ($userSettings->religion_filter && $userSettings->religion_filter !== 'Any') {
                $query->where('religion', $userSettings->religion_filter);
            }

            // Language Filter
            if ($userSettings->language_filter && $userSettings->language_filter !== 'Any') {
                $lang = $userSettings->language_filter;
                $query->where(function ($q) use ($lang) {
                    $q->where('mother_tongue', 'LIKE', "%{$lang}%")
                      ->orWhere('languages_spoken', 'LIKE', "%{$lang}%");
                });
            }
        }

        $userLat = $user->latitude ?? 19.0760;
        $userLng = $user->longitude ?? 72.8777;

        $profiles = $query->with(['photos', 'settings'])->orderBy('id', 'desc')->get()->map(function ($p, $index) use ($userLat, $userLng) {
            $pLat = $p->latitude;
            $pLng = $p->longitude;

            if (empty($pLat) || empty($pLng)) {
                // Realistic nearby offsets around user location for demo profiles (1 to 15 km away)
                $offsetLat = (($index * 7 + 3) % 11 - 5) * 0.015;
                $offsetLng = (($index * 13 + 5) % 13 - 6) * 0.015;
                $pLat = $userLat + $offsetLat;
                $pLng = $userLng + $offsetLng;
            }

            $p->display_name = !empty($p->display_name) ? $p->display_name : $p->name;
            $dist = $this->calculateDistanceInKm($userLat, $userLng, $pLat, $pLng);
            $distKm = max(1, (int)round($dist ?? (($index * 3 + 2) % 12 + 1)));
            $p->distance_km = $distKm;
            $p->distance = "{$distKm} km away";
            return $p;
        });

        return response()->json([
            'profiles' => $profiles,
        ]);
    }

    public function vibeFeed(Request $request)
    {
        $user = $request->user();
        $rawVibeParam = trim($request->query('vibe', ''));
        $vibeParam = strtolower($rawVibeParam);

        // Keyword dictionary for vibe matching
        $vibeKeywordsMap = [
            'tech'        => ['tech', 'coding', 'programming', 'ai', 'startup', 'developer', 'software', 'dev', 'code'],
            'music'       => ['music', 'vinyl', 'lo-fi', 'concert', 'jazz', 'beats', 'song', 'dj'],
            'cafe'        => ['coffee', 'cafe', 'book', 'reading', 'tea', 'brew', 'espresso', 'latte'],
            'nature'      => ['hiking', 'nature', 'camping', 'trail', 'outdoor', 'climbing', 'mountain', 'trek'],
            'gamer'       => ['gaming', 'game', 'esport', 'anime', 'console', 'retro', 'ps5', 'steam'],
            'art'         => ['art', 'gallery', 'painting', 'sculpture', 'design', 'canvas', 'sketch'],
            'food'        => ['food', 'cooking', 'foodie', 'chef', 'restaurant', 'baking', 'cuisine', 'dinner'],
            'fitness'     => ['fitness', 'gym', 'yoga', 'running', 'workout', 'sport', 'exercise', 'crossfit'],
            'movie'       => ['movie', 'cinema', 'film', 'series', 'netflix', 'watch', 'theatre', 'acting'],
            'travel'      => ['travel', 'wanderlust', 'backpacking', 'adventure', 'flight', 'road', 'trip', 'explore'],
            'pet'         => ['pet', 'dog', 'cat', 'animal', 'pup', 'foster', 'kitten'],
            'star'        => ['star', 'astronomy', 'space', 'galaxy', 'telescope', 'cosmos', 'stargazing'],
        ];

        // Determine keywords for the requested vibe
        $keywords = [$vibeParam];
        foreach ($vibeKeywordsMap as $key => $kwList) {
            if (str_contains($vibeParam, $key)) {
                $keywords = array_merge($keywords, $kwList);
            }
        }
        $keywords = array_unique(array_filter($keywords));

        // Exclude swiped, matched, blocked
        $swipedByMeIds = Swipe::where('swiper_id', $user->id)->pluck('swiped_user_id');
        $matchedIds = \App\Models\UserMatch::where('user_1_id', $user->id)
            ->orWhere('user_2_id', $user->id)
            ->get()
            ->flatMap(fn($m) => [$m->user_1_id, $m->user_2_id])
            ->filter(fn($id) => $id !== $user->id)
            ->unique();
        $blockedIds = \App\Models\UserBlock::where('blocker_id', $user->id)->pluck('blocked_user_id');

        $excludeIds = $swipedByMeIds->merge($matchedIds)->merge($blockedIds)->unique();

        $query = User::where('id', '!=', $user->id)
            ->whereNotIn('id', $excludeIds);

        // Enforce strict opposite gender
        $userGender = strtolower(trim($user->gender ?? 'male'));
        if (in_array($userGender, ['male', 'man', 'm'])) {
            $query->whereIn(\Illuminate\Support\Facades\DB::raw('LOWER(gender)'), ['female', 'woman', 'f']);
        } else {
            $query->whereIn(\Illuminate\Support\Facades\DB::raw('LOWER(gender)'), ['male', 'man', 'm']);
        }

        // Query STRICTLY matching vibe column in users table
        if (!empty($vibeParam)) {
            $words = explode(' ', str_replace(['&', '-'], ' ', $vibeParam));
            $cleanWords = array_filter(array_map('trim', $words));
            $searchKeywords = array_merge([$vibeParam], $keywords, $cleanWords);
            $searchKeywords = array_unique(array_filter($searchKeywords));

            $query->where(function ($q) use ($vibeParam, $searchKeywords) {
                $q->where(\Illuminate\Support\Facades\DB::raw('LOWER(vibe)'), 'LIKE', "%{$vibeParam}%");
                foreach ($searchKeywords as $kw) {
                    if (strlen($kw) >= 2) {
                        $q->orWhere(\Illuminate\Support\Facades\DB::raw('LOWER(vibe)'), 'LIKE', "%{$kw}%");
                    }
                }
            });

            // Order so exact matches on users.vibe column appear first
            $query->orderByRaw("CASE 
                WHEN LOWER(vibe) = ? THEN 0 
                WHEN LOWER(vibe) LIKE ? THEN 1 
                ELSE 2 
            END", [$vibeParam, "%{$vibeParam}%"]);
        }

        $userLat = $user->latitude ?? 19.0760;
        $userLng = $user->longitude ?? 72.8777;

        $vibeProfiles = $query->with(['photos', 'settings'])->orderBy('id', 'desc')->take(20)->get();

        $formatted = $vibeProfiles->map(function ($p, $index) use ($userLat, $userLng) {
            $pLat = $p->latitude;
            $pLng = $p->longitude;
            if (empty($pLat) || empty($pLng)) {
                $offsetLat = (($index * 7 + 3) % 11 - 5) * 0.015;
                $offsetLng = (($index * 13 + 5) % 13 - 6) * 0.015;
                $pLat = $userLat + $offsetLat;
                $pLng = $userLng + $offsetLng;
            }
            $p->display_name = !empty($p->display_name) ? $p->display_name : $p->name;
            $dist = $this->calculateDistanceInKm($userLat, $userLng, $pLat, $pLng);
            $distKm = max(1, (int)round($dist ?? (($index * 3 + 2) % 12 + 1)));
            $p->distance_km = $distKm;
            $p->distance = "{$distKm} km away";
            return $p;
        });

        return response()->json([
            'profiles' => $formatted,
            'vibe'     => $rawVibeParam,
        ]);
    }

    private function calculateDistanceInKm($lat1, $lon1, $lat2, $lon2)
    {
        if (empty($lat1) || empty($lon1) || empty($lat2) || empty($lon2)) {
            return null;
        }

        $earthRadius = 6371; // km
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);

        $a = sin($dLat / 2) * sin($dLat / 2) +
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
             sin($dLon / 2) * sin($dLon / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
        return round($earthRadius * $c, 1);
    }

    public function reset(Request $request)
    {
        $user = $request->user();
        $planName = strtolower($user->subscription_plan ?? 'free');

        $maxRewinds = 0;
        if (str_contains($planName, 'basic')) {
            $maxRewinds = 3;
        } elseif (str_contains($planName, 'plus')) {
            $maxRewinds = 10;
        } elseif (str_contains($planName, 'premium')) {
            $maxRewinds = 999999;
        }

        if ($maxRewinds > 0 && $user->rewinds_count >= $maxRewinds) {
            return response()->json([
                'error' => 'UPGRADE_PLAN_REQUIRED',
                'message' => "You have reached your limit of {$maxRewinds} profile rewinds for your plan. Upgrade your plan to unlock more rewinds!",
                'requires_upgrade' => true,
            ], 403);
        }

        Swipe::where('swiper_id', $user->id)->where('type', 'pass')->delete();
        $user->increment('rewinds_count');

        return response()->json([
            'message' => 'Pass swipes reset successfully',
        ]);
    }

    public function swipe(Request $request)
    {
        $request->validate([
            'swiped_user_id' => 'required|exists:users,id',
            'type'           => 'required|in:like,pass,super_like',
        ]);

        $swiper = $request->user();
        $swiperId = $swiper->id;
        $targetId = (int) $request->input('swiped_user_id');
        $type     = $request->input('type');

        if ($swiperId === $targetId) {
            return response()->json(['message' => 'Cannot swipe on yourself.'], 422);
        }

        // 1. 24-Hour Reset Check
        $lastReset = $swiper->last_swipe_reset_at;
        if (empty($lastReset) || now()->diffInHours($lastReset) >= 24) {
            $swiper->daily_likes_count = 0;
            $swiper->daily_passes_count = 0;
            $swiper->last_swipe_reset_at = now();
            $swiper->save();
        }

        // 2. Determine Plan Limits
        $planName = strtolower($swiper->subscription_plan ?? 'free');
        $isVerified = (bool) $swiper->is_verified;

        $maxLikes = $isVerified ? 999999 : 5;
        $maxPasses = $isVerified ? 999999 : 5;
        $maxSuperlikes = 0;

        if (str_contains($planName, 'basic')) {
            $maxLikes = max($maxLikes, 10);
            $maxPasses = max($maxPasses, 20);
            $maxSuperlikes = 0;
        } elseif (str_contains($planName, 'plus')) {
            $maxLikes = max($maxLikes, 50);
            $maxPasses = max($maxPasses, 50);
            $maxSuperlikes = 5;
        } elseif (str_contains($planName, 'premium')) {
            $maxLikes = 999999;
            $maxPasses = 999999;
            $maxSuperlikes = 15;
        }

        // 3. Enforce Plan Limits
        if ($type === 'like' && $swiper->daily_likes_count >= $maxLikes) {
            return response()->json([
                'error' => 'UPGRADE_PLAN_REQUIRED',
                'message' => "You have reached your daily limit of {$maxLikes} likes for your current plan. Upgrade your plan to unlock more swipes!",
                'requires_upgrade' => true,
                'limit_type' => 'like',
            ], 403);
        }

        if ($type === 'pass' && $swiper->daily_passes_count >= $maxPasses) {
            return response()->json([
                'error' => 'UPGRADE_PLAN_REQUIRED',
                'message' => "You have reached your daily limit of {$maxPasses} passes for your current plan. Upgrade your plan to unlock more swipes!",
                'requires_upgrade' => true,
                'limit_type' => 'pass',
            ], 403);
        }

        if ($type === 'super_like') {
            if ($maxSuperlikes === 0 || $swiper->monthly_superlikes_count >= $maxSuperlikes) {
                $msg = $maxSuperlikes === 0
                    ? "Superlikes are not included in your Basic plan. Upgrade your plan to Plus or Premium to send superlikes!"
                    : "You have used all {$maxSuperlikes} monthly superlikes for your plan. Upgrade your plan for more superlikes!";
                return response()->json([
                    'error' => 'UPGRADE_PLAN_REQUIRED',
                    'message' => $msg,
                    'requires_upgrade' => true,
                    'limit_type' => 'super_like',
                ], 403);
            }
        }

        // Increment usage counters
        if ($type === 'like') {
            $swiper->increment('daily_likes_count');
        } elseif ($type === 'pass') {
            $swiper->increment('daily_passes_count');
        } elseif ($type === 'super_like') {
            $swiper->increment('monthly_superlikes_count');
        }

        // Check if either user is blocked
        $isBlocked = \App\Models\UserBlock::where(function ($q) use ($swiperId, $targetId) {
            $q->where('blocker_id', $swiperId)->where('blocked_user_id', $targetId);
        })->orWhere(function ($q) use ($swiperId, $targetId) {
            $q->where('blocker_id', $targetId)->where('blocked_user_id', $swiperId);
        })->exists();

        if ($isBlocked) {
            return response()->json([
                'message' => 'Cannot interact with blocked user.',
            ], 403);
        }

        // Record or update swipe
        $swipe = Swipe::updateOrCreate(
            ['swiper_id' => $swiperId, 'swiped_user_id' => $targetId],
            ['type' => $type, 'is_declined_by_receiver' => false]
        );

        $isMatch = false;
        $matchRecord = null;

        // Check if mutual like or super_like exists and send notification
        if (in_array($type, ['like', 'super_like'])) {
            $userObj = $request->user();
            \App\Models\Notification::firstOrCreate([
                'user_id'      => $targetId,
                'from_user_id' => $swiperId,
                'type'         => 'like',
            ], [
                'message'      => "{$userObj->name} liked your profile!",
                'is_read'      => false,
            ]);

            $reciprocalSwipe = Swipe::where('swiper_id', $targetId)
                ->where('swiped_user_id', $swiperId)
                ->whereIn('type', ['like', 'super_like'])
                ->first();

            if ($reciprocalSwipe) {
                $isMatch = true;

                // Create match record if not existing
                $matchRecord = UserMatch::firstOrCreate([
                    'user_1_id' => min($swiperId, $targetId),
                    'user_2_id' => max($swiperId, $targetId),
                ], [
                    'matched_at' => now(),
                ]);

                // Create request_accepted notifications for both users
                \App\Models\Notification::firstOrCreate([
                    'user_id'      => $targetId,
                    'from_user_id' => $swiperId,
                    'type'         => 'request_accepted',
                ], [
                    'message'      => "You matched with {$userObj->name}!",
                    'is_read'      => false,
                ]);

                \App\Models\Notification::firstOrCreate([
                    'user_id'      => $swiperId,
                    'from_user_id' => $targetId,
                    'type'         => 'request_accepted',
                ], [
                    'message'      => "You matched with someone!",
                    'is_read'      => true,
                ]);
            }
        }

        $targetUserObj = User::with('photos')->find($targetId);
        if ($targetUserObj) {
            $img = $targetUserObj->avatar;
            if ($targetUserObj->photos && count($targetUserObj->photos) > 0) {
                $p0 = $targetUserObj->photos[0];
                $img = is_string($p0) ? $p0 : ($p0->photo_url ?? $img);
            }
            $targetUserObj->image = $img;
        }

        return response()->json([
            'message'     => 'Swipe recorded',
            'is_match'    => $isMatch,
            'match'       => $matchRecord,
            'target_user' => $targetUserObj,
        ]);
    }
}
