<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Swipe;
use App\Models\UserMatch;
use Illuminate\Http\Request;
use App\Services\ExpoPushService;

class DiscoverController extends Controller
{
    public function feed(Request $request)
    {
        $user = $request->user();

        // Midnight Reset Check (12:00 AM IST)
        $tz = 'Asia/Kolkata';
        $nowTz = now()->timezone($tz);
        $lastReset = $user->last_swipe_reset_at;
        $lastResetTz = $lastReset ? \Carbon\Carbon::parse($lastReset)->timezone($tz) : null;

        if (!$lastResetTz || !$lastResetTz->isSameDay($nowTz)) {
            $user->daily_likes_count = 0;
            $user->daily_passes_count = 0;
            if (!$lastResetTz || $nowTz->diffInDays($lastResetTz) >= 30) {
                $user->monthly_superlikes_count = 0;
            }
            $user->last_swipe_reset_at = $nowTz;
            $user->save();
        }

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

        // 3. Exclude explicitly blocked users in BOTH directions (users I blocked & users who blocked me)
        $blockedIds = \App\Models\UserBlock::where('blocker_id', $user->id)
            ->pluck('blocked_user_id')
            ->merge(\App\Models\UserBlock::where('blocked_user_id', $user->id)->pluck('blocker_id'))
            ->filter()
            ->unique();

        $excludeIds = $swipedByMeIds->merge($matchedIds)->merge($blockedIds)->push(16)->unique();

        $query = User::where('id', '!=', $user->id)
            ->where('id', '!=', 16)
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

        // Verified Profiles Only Filter (is_verified = 1)
        $reqVerifiedOnly = $request->query('verified_only');
        if ($reqVerifiedOnly !== null) {
            if (filter_var($reqVerifiedOnly, FILTER_VALIDATE_BOOLEAN) || $reqVerifiedOnly == '1' || $reqVerifiedOnly === 'true') {
                $query->where('is_verified', 1);
            }
        } elseif ($userSettings && ($userSettings->verified_only === true || $userSettings->verified_only == 1 || $userSettings->verified_only === '1' || $userSettings->verified_only === 'true')) {
            $query->where('is_verified', 1);
        }

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

        $reqCity = trim($request->query('city', ''));
        $reqState = trim($request->query('state', ''));
        $reqLat = $request->query('latitude');
        $reqLng = $request->query('longitude');

        // Resolve current user's location
        $userCity = !empty($reqCity) ? $reqCity : trim($user->city ?? '');
        $userState = !empty($reqState) ? $reqState : trim($user->state ?? '');
        $userLat = is_numeric($reqLat) ? (float)$reqLat : (is_numeric($user->latitude) ? (float)$user->latitude : null);
        $userLng = is_numeric($reqLng) ? (float)$reqLng : (is_numeric($user->longitude) ? (float)$user->longitude : null);

        // If coordinates missing, look up from city dictionary
        if (($userLat === null || $userLng === null || ($userLat == 0 && $userLng == 0)) && !empty($userCity)) {
            $cityCoords = $this->getCityCoordinates($userCity);
            if ($cityCoords) {
                $userLat = $cityCoords[0];
                $userLng = $cityCoords[1];
            }
        }

        // Default fallback if still unresolved: Nashik (19.9975, 73.7898)
        if ($userLat === null || $userLng === null) {
            $userLat = 19.9975;
            $userLng = 73.7898;
        }

        // Auto-save user location if provided via request and not yet stored
        if (is_numeric($reqLat) && is_numeric($reqLng)) {
            $hasChange = false;
            if (abs((float)($user->latitude ?? 0) - (float)$reqLat) > 0.0001 || abs((float)($user->longitude ?? 0) - (float)$reqLng) > 0.0001) {
                $user->latitude = $reqLat;
                $user->longitude = $reqLng;
                $hasChange = true;
            }
            if (!empty($reqCity) && empty($user->city)) {
                $user->city = $reqCity;
                $hasChange = true;
            }
            if (!empty($reqState) && empty($user->state)) {
                $user->state = $reqState;
                $hasChange = true;
            }
            if ($hasChange) {
                $user->save();
            }
        }

        // SQL level: Prioritize user's exact city, then same state
        if (!empty($userCity)) {
            $cleanUserCity = strtolower(trim($userCity));
            $cleanUserState = strtolower(trim($userState));
            $query->orderByRaw("CASE 
                WHEN LOWER(TRIM(city)) = ? THEN 0 
                WHEN LOWER(TRIM(city)) LIKE ? THEN 1 
                WHEN ? != '' AND LOWER(TRIM(state)) = ? THEN 2 
                ELSE 3 
            END ASC", [$cleanUserCity, "%{$cleanUserCity}%", $cleanUserState, $cleanUserState]);
        }

        $rawProfiles = $query->with(['photos', 'settings'])->get();
        $profiles = $this->sortProfilesByProximity($rawProfiles, $userCity, $userState, $userLat, $userLng);

        return response()->json([
            'profiles' => $profiles,
            'daily_likes_count' => (int) $user->daily_likes_count,
            'daily_passes_count' => (int) $user->daily_passes_count,
            'daily_swipes_limit' => 5,
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

        // Exclude swiped, matched, blocked (in both directions)
        $swipedByMeIds = Swipe::where('swiper_id', $user->id)->pluck('swiped_user_id');
        $matchedIds = \App\Models\UserMatch::where('user_1_id', $user->id)
            ->orWhere('user_2_id', $user->id)
            ->get()
            ->flatMap(fn($m) => [$m->user_1_id, $m->user_2_id])
            ->filter(fn($id) => $id !== $user->id)
            ->unique();
        $blockedIds = \App\Models\UserBlock::where('blocker_id', $user->id)
            ->pluck('blocked_user_id')
            ->merge(\App\Models\UserBlock::where('blocked_user_id', $user->id)->pluck('blocker_id'))
            ->filter()
            ->unique();
        $excludeIds = $swipedByMeIds->merge($matchedIds)->merge($blockedIds)->push(16)->unique();

        $query = User::where('id', '!=', $user->id)
            ->where('id', '!=', 16)
            ->whereNotIn('id', $excludeIds);

        // Enforce strict opposite gender
        $userGender = strtolower(trim($user->gender ?? 'male'));
        if (in_array($userGender, ['male', 'man', 'm'])) {
            $query->whereIn(\Illuminate\Support\Facades\DB::raw('LOWER(gender)'), ['female', 'woman', 'f']);
        } else {
            $query->whereIn(\Illuminate\Support\Facades\DB::raw('LOWER(gender)'), ['male', 'man', 'm']);
        }

        // Apply user preference filters from user_settings table
        $userSettings = \App\Models\UserSettings::where('user_id', $user->id)->first();

        // Verified Profiles Only Filter (is_verified = 1)
        $reqVerifiedOnly = $request->query('verified_only');
        if ($reqVerifiedOnly !== null) {
            if (filter_var($reqVerifiedOnly, FILTER_VALIDATE_BOOLEAN) || $reqVerifiedOnly == '1' || $reqVerifiedOnly === 'true') {
                $query->where('is_verified', 1);
            }
        } elseif ($userSettings && ($userSettings->verified_only === true || $userSettings->verified_only == 1 || $userSettings->verified_only === '1' || $userSettings->verified_only === 'true')) {
            $query->where('is_verified', 1);
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

        $reqCity = trim($request->query('city', ''));
        $reqState = trim($request->query('state', ''));
        $reqLat = $request->query('latitude');
        $reqLng = $request->query('longitude');

        $userCity = !empty($reqCity) ? $reqCity : trim($user->city ?? '');
        $userState = !empty($reqState) ? $reqState : trim($user->state ?? '');
        $userLat = is_numeric($reqLat) ? (float)$reqLat : (is_numeric($user->latitude) ? (float)$user->latitude : null);
        $userLng = is_numeric($reqLng) ? (float)$reqLng : (is_numeric($user->longitude) ? (float)$user->longitude : null);

        if (($userLat === null || $userLng === null || ($userLat == 0 && $userLng == 0)) && !empty($userCity)) {
            $cityCoords = $this->getCityCoordinates($userCity);
            if ($cityCoords) {
                $userLat = $cityCoords[0];
                $userLng = $cityCoords[1];
            }
        }

        if ($userLat === null || $userLng === null) {
            $userLat = 19.9975;
            $userLng = 73.7898;
        }

        $vibeProfiles = $query->with(['photos', 'settings'])->take(50)->get();
        $formatted = $this->sortProfilesByProximity($vibeProfiles, $userCity, $userState, $userLat, $userLng);

        return response()->json([
            'profiles' => $formatted,
            'vibe'     => $rawVibeParam,
        ]);
    }

    /**
     * Proximity-based sort:
     * 1. Exact city match first (Priority 1)
     * 2. Closest distance in km (Priority 2)
     * 3. Same state match (Priority 3)
     * 4. Compatibility score / ID desc
     */
    private function sortProfilesByProximity($profiles, $userCity, $userState, $userLat, $userLng)
    {
        $cleanUserCity = strtolower(trim($userCity ?? ''));
        $cleanUserState = strtolower(trim($userState ?? ''));

        $formatted = $profiles->map(function ($p, $index) use ($userLat, $userLng, $cleanUserCity, $cleanUserState) {
            $pCity = strtolower(trim($p->city ?? ''));
            $pState = strtolower(trim($p->state ?? ''));
            $isSameCity = (!empty($cleanUserCity) && ($pCity === $cleanUserCity || str_contains($pCity, $cleanUserCity) || str_contains($cleanUserCity, $pCity)));
            $isSameState = (!empty($cleanUserState) && ($pState === $cleanUserState || str_contains($pState, $cleanUserState)));

            $pLat = is_numeric($p->latitude) ? (float)$p->latitude : null;
            $pLng = is_numeric($p->longitude) ? (float)$p->longitude : null;

            if ($pLat === null || $pLng === null) {
                $coords = $this->getCityCoordinates($p->city);
                if ($coords) {
                    $pLat = $coords[0];
                    $pLng = $coords[1];
                }
            }

            if ($isSameCity) {
                // If same city, calculate distance or assign close neighborhood offset (1 to 10 km)
                if ($pLat !== null && $pLng !== null && (abs($pLat - $userLat) > 0.0001 || abs($pLng - $userLng) > 0.0001)) {
                    $dist = $this->calculateDistanceInKm($userLat, $userLng, $pLat, $pLng);
                    $distKm = max(1, (int)round($dist));
                } else {
                    $distKm = max(1, (($index * 3 + 2) % 9) + 1); // 1 to 10 km within city
                }
            } elseif ($pLat !== null && $pLng !== null) {
                $dist = $this->calculateDistanceInKm($userLat, $userLng, $pLat, $pLng);
                $distKm = max(1, (int)round($dist));
            } elseif ($isSameState) {
                // Same state but unknown coords: ~60 to 180 km
                $distKm = 75 + (($index * 17) % 80);
            } else {
                // Other state
                $distKm = 450 + (($index * 29) % 500);
            }

            $p->display_name = !empty($p->display_name) ? $p->display_name : $p->name;
            $p->distance_km = $distKm;
            $p->distance = "{$distKm} km away";
            $p->is_same_city = $isSameCity ? 1 : 0;
            $p->is_same_state = $isSameState ? 1 : 0;

            return $p;
        });

        return $formatted->sort(function ($a, $b) {
            // 1. Same city match first
            if ($a->is_same_city !== $b->is_same_city) {
                return $b->is_same_city <=> $a->is_same_city;
            }
            // 2. Ascending distance (closest km first)
            if ($a->distance_km !== $b->distance_km) {
                return $a->distance_km <=> $b->distance_km;
            }
            // 3. Same state
            if ($a->is_same_state !== $b->is_same_state) {
                return $b->is_same_state <=> $a->is_same_state;
            }
            // 4. Compatibility score or ID desc
            $compA = (int)($a->compatibility_score ?? 0);
            $compB = (int)($b->compatibility_score ?? 0);
            if ($compA !== $compB) {
                return $compB <=> $compA;
            }
            return $b->id <=> $a->id;
        })->values();
    }

    /**
     * Known Indian city coordinate dictionary for accurate fallbacks
     */
    private function getCityCoordinates($cityName)
    {
        if (empty($cityName)) {
            return null;
        }

        $c = strtolower(trim($cityName));

        $coordsMap = [
            'nashik'                    => [19.9975, 73.7898],
            'nasik'                     => [19.9975, 73.7898],
            'pune'                      => [18.5204, 73.8567],
            'mumbai'                    => [19.0760, 72.8777],
            'navi mumbai'               => [19.0330, 73.0297],
            'thane'                     => [19.2183, 72.9781],
            'chhatrapati sambhajinagar' => [19.8762, 75.3433],
            'chhatrapati sambhaji nagar' => [19.8762, 75.3433],
            'aurangabad'                => [19.8762, 75.3433],
            'ahmednagar'                => [19.0948, 74.7480],
            'ahmadnagar'                => [19.0948, 74.7480],
            'dhule'                     => [20.9042, 74.7749],
            'jalgaon'                   => [21.0077, 75.5626],
            'kolhapur'                  => [16.7050, 74.2433],
            'solapur'                   => [17.6599, 75.9064],
            'satara'                    => [17.6805, 74.0183],
            'sangli'                    => [16.8524, 74.5815],
            'nagpur'                    => [21.1458, 79.0882],
            'amravati'                  => [20.9374, 77.7796],
            'nanded'                    => [19.1383, 77.3210],
            'akola'                     => [20.7002, 77.0082],
            'shirdi'                    => [19.7668, 74.4762],
            'sinnar'                    => [19.8458, 74.0016],
            'malegaon'                  => [20.5579, 74.5287],
            'surat'                     => [21.1702, 72.8311],
            'ahmedabad'                 => [23.0225, 72.5714],
            'vadodara'                  => [22.3072, 73.1812],
            'indore'                    => [22.7196, 75.8577],
            'bhopal'                    => [23.2599, 77.4126],
            'delhi'                     => [28.6139, 77.2090],
            'new delhi'                 => [28.6139, 77.2090],
            'bangalore'                 => [12.9716, 77.5946],
            'bengaluru'                 => [12.9716, 77.5946],
            'hyderabad'                 => [17.3850, 78.4867],
            'chennai'                   => [13.0827, 80.2707],
            'kolkata'                   => [22.5726, 88.3639],
            'jaipur'                    => [26.9124, 75.7873],
            'goa'                       => [15.2993, 74.1240],
            'panaji'                    => [15.4909, 73.8278],
        ];

        foreach ($coordsMap as $key => $coords) {
            if ($c === $key || str_contains($c, $key)) {
                return $coords;
            }
        }

        return null;
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

        // 1. Reset Checks (Reset every day at 12:00 AM midnight, 30 days for superlikes)
        $tz = 'Asia/Kolkata';
        $nowTz = now()->timezone($tz);
        $lastReset = $swiper->last_swipe_reset_at;
        $lastResetTz = $lastReset ? \Carbon\Carbon::parse($lastReset)->timezone($tz) : null;

        if (!$lastResetTz || !$lastResetTz->isSameDay($nowTz)) {
            $swiper->daily_likes_count = 0;
            $swiper->daily_passes_count = 0;
            if (!$lastResetTz || $nowTz->diffInDays($lastResetTz) >= 30) {
                $swiper->monthly_superlikes_count = 0;
            }
            $swiper->last_swipe_reset_at = $nowTz;
            $swiper->save();
        }

        // 2. Determine Active Plan Limits
        $activeSub = \App\Models\UserSubscription::where('user_id', $swiper->id)
            ->where('status', 'active')
            ->where('expires_at', '>', now())
            ->latest()
            ->first();

        $planStr = '';
        if ($activeSub && !empty($activeSub->plan_name)) {
            $planStr = $activeSub->plan_name;
            if ($swiper->subscription_plan !== $planStr) {
                $swiper->subscription_plan = $planStr;
                $swiper->save();
            }
        } else if (!empty($swiper->subscription_plan)) {
            $rawPlan = $swiper->subscription_plan;
            $planStr = is_string($rawPlan) ? $rawPlan : ($rawPlan['name'] ?? '');
        }

        $planName = strtolower($planStr);

        // Free plan default is strictly 5 daily likes & passes, refreshed at 12:00 AM
        $maxLikes = 5;
        $maxPasses = 5;
        $maxSuperlikes = 0;

        if (str_contains($planName, 'premium')) {
            $maxLikes = 999999;
            $maxPasses = 999999;
            $maxSuperlikes = 15;
        } elseif (str_contains($planName, 'plus')) {
            $maxLikes = 50;
            $maxPasses = 50;
            $maxSuperlikes = 5;
        } elseif (str_contains($planName, 'basic')) {
            $maxLikes = 10;
            $maxPasses = 20;
            $maxSuperlikes = 0;
        }

        $totalSuperlikesLimit = $maxSuperlikes + (int) ($swiper->purchased_superlikes_count ?? 0);

        // 3. Enforce Plan Limits
        if ($type === 'like' && $swiper->daily_likes_count >= $maxLikes) {
            return response()->json([
                'error' => 'UPGRADE_PLAN_REQUIRED',
                'message' => "You have reached your daily limit of {$maxLikes} free profiles for today. Your 5 free likes refresh everyday at 12:00 AM midnight, or upgrade your plan now for unlimited swipes!",
                'requires_upgrade' => true,
                'limit_type' => 'like',
                'daily_likes_count' => (int) $swiper->daily_likes_count,
                'max_likes' => $maxLikes,
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
            if ($swiper->monthly_superlikes_count >= $totalSuperlikesLimit) {
                $msg = ($totalSuperlikesLimit === 0)
                    ? "Superlikes are not included in your Basic plan. Upgrade to HeartLink Plus or Premium to send superlikes!"
                    : "You have used all {$totalSuperlikesLimit} monthly superlikes for your plan. Upgrade your plan for more superlikes!";
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
            $swiperDisplayName = $userObj->display_name ?: $userObj->name;
            $notifType = $type === 'super_like' ? 'super_like' : 'like';
            $notifTitle = $type === 'super_like' ? 'Superlike Received! ⚡' : 'New Like! 💕';
            $notifMsg = $type === 'super_like'
                ? "{$swiperDisplayName} sent you a Superlike!"
                : "{$swiperDisplayName} liked your profile!";

            \App\Models\Notification::firstOrCreate([
                'user_id'      => $targetId,
                'from_user_id' => $swiperId,
                'type'         => $notifType,
            ], [
                'message'      => $notifMsg,
                'is_read'      => false,
            ]);

            // Send remote push notification for like or superlike
            ExpoPushService::sendToUser(
                $targetId,
                $notifTitle,
                $notifMsg,
                ['screen' => 'Notifications']
            );
            
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

                $targetUserObj = User::find($targetId);
                $targetDisplayName = $targetUserObj ? ($targetUserObj->display_name ?: $targetUserObj->name) : 'Someone';

                // Create request_accepted notifications for both users
                \App\Models\Notification::firstOrCreate([
                    'user_id'      => $targetId,
                    'from_user_id' => $swiperId,
                    'type'         => 'request_accepted',
                ], [
                    'message'      => "You matched with {$swiperDisplayName}!",
                    'is_read'      => false,
                ]);

                \App\Models\Notification::firstOrCreate([
                    'user_id'      => $swiperId,
                    'from_user_id' => $targetId,
                    'type'         => 'request_accepted',
                ], [
                    'message'      => "You matched with {$targetDisplayName}!",
                    'is_read'      => false,
                ]);

                // Send remote push notification for mutual match to target user
                ExpoPushService::sendToUser(
                    $targetId,
                    "It's a Match! 🎉",
                    "You and {$swiperDisplayName} matched! Start chatting now.",
                    [
                        'screen' => 'ChatDetail',
                        'params' => [
                            'userId' => $swiperId,
                            'user'   => ['id' => $swiperId, 'name' => $swiperDisplayName],
                        ],
                    ]
                );

                // Send remote push notification for mutual match to swiper
                ExpoPushService::sendToUser(
                    $swiperId,
                    "It's a Match! 🎉",
                    "You and {$targetDisplayName} matched! Start chatting now.",
                    [
                        'screen' => 'ChatDetail',
                        'params' => [
                            'userId' => $targetId,
                            'user'   => ['id' => $targetId, 'name' => $targetDisplayName],
                        ],
                    ]
                );
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
