<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\ExpoPushService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class AppUpdateController extends Controller
{
    /**
     * Helper to compute tracking cache key for a user / device.
     */
    protected function getTrackingKey(Request $request, int $versionCode): string
    {
        $uid = $request->input('uid') ?? $request->input('user_id');
        $user = $uid ? User::find($uid) : ($request->user() ?? auth('sanctum')->user());
        $token = $request->input('token') ?? $request->bearerToken();
        $ip = $request->ip() ?? 'unknown_ip';

        if ($user) {
            return "app_update_clicked_user_{$user->id}_v{$versionCode}";
        } elseif (!empty($token)) {
            return "app_update_clicked_token_" . md5($token) . "_v{$versionCode}";
        } else {
            return "app_update_clicked_ip_" . md5($ip) . "_v{$versionCode}";
        }
    }

    /**
     * Check if an update popup should be displayed for the mobile app.
     * Keeps showing until the user taps "Update on Google Play".
     */
    public function checkUpdate(Request $request)
    {
        $platform = strtolower($request->input('platform', 'android'));
        $clientVersionCode = (int) $request->input('version_code', 0);
        $clientVersionName = trim((string) $request->input('version_name', ''));

        $config = config('app_update.android', []);

        $minVersionCode = (int) ($config['min_version_code'] ?? 45);
        $latestVersionCode = (int) ($config['latest_version_code'] ?? 45);
        $latestVersionName = $config['latest_version_name'] ?? '1.0.45';
        $forceUpdateConfig = (bool) ($config['force_update'] ?? true);
        $dismissOnUpdateClick = (bool) ($config['dismiss_on_update_click'] ?? true);

        $trackingKey = $this->getTrackingKey($request, $latestVersionCode);
        $alreadyServed = $dismissOnUpdateClick && Cache::has($trackingKey);

        // Check if client is on an older version
        $isOutdated = false;
        if ($clientVersionCode > 0) {
            $isOutdated = ($clientVersionCode < $minVersionCode);
        } elseif (!empty($clientVersionName)) {
            $isOutdated = version_compare($clientVersionName, $latestVersionName, '<');
        } else {
            $isOutdated = true;
        }

        $updateRequired = false;
        $forceUpdate = false;

        if ($isOutdated) {
            if ($dismissOnUpdateClick) {
                if (!$alreadyServed) {
                    // First time showing to this user: Display popup on screen
                    $updateRequired = true;
                    $forceUpdate = true;
                    // Mark as served so once they tap "Update on Google Play" and return, popup will not block them again
                    Cache::put($trackingKey, true, now()->addDays(180));
                } else {
                    // Already displayed & acknowledged: Do not show again
                    $updateRequired = false;
                    $forceUpdate = false;
                }
            } else {
                $updateRequired = $forceUpdateConfig;
                $forceUpdate = $forceUpdateConfig;
            }
        }

        $playStoreUrl = $config['play_store_url'] ?? 'https://play.google.com/store/apps/details?id=com.heartlinkdatingapp.app';
        $marketUrl = $config['market_url'] ?? 'market://details?id=com.heartlinkdatingapp.app';

        return response()->json([
            'success'               => true,
            'update_required'       => $updateRequired,
            'update_available'      => $isOutdated,
            'force_update'          => $forceUpdate,
            'client_version_code'   => $clientVersionCode,
            'client_version_name'   => $clientVersionName,
            'min_version_code'      => $minVersionCode,
            'latest_version_code'   => $latestVersionCode,
            'latest_version_name'   => $latestVersionName,
            'title'                 => $config['title'] ?? 'Update HeartLink',
            'message'               => $config['message'] ?? 'A new version of HeartLink is available on Google Play with important performance improvements and new features. Please update now to continue.',
            'release_notes'         => $config['release_notes'] ?? [
                '⚡ Faster real-time messaging & instant chat',
                '🔒 Enhanced account safety & verification',
                '✨ Smoother swiping and vibe matchmaking',
                '🛡️ New Block & Report safety controls',
                '🛠️ Critical performance & stability fixes',
            ],
            'play_store_url'        => $playStoreUrl,
            'market_url'            => $marketUrl,
        ]);
    }

    /**
     * Redirect to Google Play Store and record that user has clicked update.
     */
    public function redirectPlayStore(Request $request)
    {
        $config = config('app_update.android', []);
        $latestVersionCode = (int) ($config['latest_version_code'] ?? 45);
        $playStoreUrl = $config['play_store_url'] ?? 'https://play.google.com/store/apps/details?id=com.heartlinkdatingapp.app';

        $trackingKey = $this->getTrackingKey($request, $latestVersionCode);
        Cache::put($trackingKey, true, now()->addDays(180));

        // Also record by IP as a safety fallback
        $ip = $request->ip();
        if ($ip) {
            Cache::put("app_update_clicked_ip_" . md5($ip) . "_v{$latestVersionCode}", true, now()->addDays(180));
        }

        return redirect()->away($playStoreUrl);
    }

    /**
     * Acknowledge/dismiss update notification so it does not show again.
     */
    public function acknowledgeUpdate(Request $request)
    {
        $config = config('app_update.android', []);
        $latestVersionCode = (int) ($config['latest_version_code'] ?? 45);

        $trackingKey = $this->getTrackingKey($request, $latestVersionCode);
        Cache::put($trackingKey, true, now()->addDays(180));

        $ip = $request->ip();
        if ($ip) {
            Cache::put("app_update_clicked_ip_" . md5($ip) . "_v{$latestVersionCode}", true, now()->addDays(180));
        }

        return response()->json([
            'success' => true,
            'message' => 'Update popup marked as clicked for this version.',
        ]);
    }

    /**
     * Broadcast an update push notification to all users with active push tokens.
     */
    public function broadcastUpdateNotification(Request $request)
    {
        $config = config('app_update.android', []);
        $latestVersionName = $config['latest_version_name'] ?? '1.0.45';
        $playStoreUrl = $config['play_store_url'] ?? 'https://play.google.com/store/apps/details?id=com.heartlinkdatingapp.app';

        $title = $request->input('title', "HeartLink Update Available!");
        $body = $request->input('body', "A new version of HeartLink is live on Google Play. Tap to update now.");

        // Query all users who have an expo push token registered
        $users = User::whereNotNull('expo_push_token')
            ->where('expo_push_token', '!=', '')
            ->get(['id', 'expo_push_token']);

        $sentCount = 0;
        foreach ($users as $user) {
            try {
                $sent = ExpoPushService::sendToUser(
                    $user,
                    $title,
                    $body,
                    [
                        'action' => 'open_url',
                        'url'    => $playStoreUrl,
                        'type'   => 'force_update',
                    ]
                );
                if ($sent) {
                    $sentCount++;
                }
            } catch (\Throwable $e) {
                Log::warning("[BroadcastUpdate] Failed for user {$user->id}: " . $e->getMessage());
            }
        }

        return response()->json([
            'success'    => true,
            'message'    => "Broadcast notification sent to {$sentCount} of {$users->count()} registered users.",
            'total_users' => $users->count(),
            'delivered'  => $sentCount,
        ]);
    }
}
