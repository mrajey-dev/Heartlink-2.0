<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\ExpoPushService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AppUpdateController extends Controller
{
    /**
     * Check if a compulsory or optional update is available for the mobile app.
     * Accessible by both guests and authenticated users.
     */
    public function checkUpdate(Request $request)
    {
        $platform = strtolower($request->input('platform', 'android'));
        $clientVersionCode = (int) $request->input('version_code', 0);
        $clientVersionName = trim((string) $request->input('version_name', ''));

        $config = config('app_update.android', []);

        $minVersionCode = (int) ($config['min_version_code'] ?? 44);
        $latestVersionCode = (int) ($config['latest_version_code'] ?? 44);
        $latestVersionName = $config['latest_version_name'] ?? '1.0.44';
        $forceUpdateConfig = (bool) ($config['force_update'] ?? true);

        // If client reported a versionCode:
        // Update is required if client versionCode < minVersionCode and force_update is enabled
        $updateRequired = false;
        $updateAvailable = false;

        if ($clientVersionCode > 0) {
            $updateRequired = $forceUpdateConfig && ($clientVersionCode < $minVersionCode);
            $updateAvailable = ($clientVersionCode < $latestVersionCode);
        } else if (!empty($clientVersionName)) {
            // Fallback comparison by version name
            $isOlder = version_compare($clientVersionName, $latestVersionName, '<');
            $updateRequired = $forceUpdateConfig && $isOlder;
            $updateAvailable = $isOlder;
        }

        return response()->json([
            'success'               => true,
            'update_required'       => $updateRequired,
            'update_available'      => $updateAvailable,
            'force_update'          => $forceUpdateConfig,
            'client_version_code'   => $clientVersionCode,
            'client_version_name'   => $clientVersionName,
            'min_version_code'      => $minVersionCode,
            'latest_version_code'   => $latestVersionCode,
            'latest_version_name'   => $latestVersionName,
            'title'                 => $config['title'] ?? 'Update Required',
            'message'               => $config['message'] ?? 'A new version of HeartLink is available with important improvements. Please update to continue using the app.',
            'release_notes'         => $config['release_notes'] ?? [
                '⚡ Faster real-time messaging & instant chat',
                '🔒 Enhanced account safety & verification',
                '✨ Smoother swiping and vibe matchmaking',
                '🛠️ Critical performance & stability fixes',
            ],
            'play_store_url'        => $config['play_store_url'] ?? 'https://play.google.com/store/apps/details?id=com.heartlinkdatingapp.app',
            'market_url'            => $config['market_url'] ?? 'market://details?id=com.heartlinkdatingapp.app',
        ]);
    }

    /**
     * Broadcast an update push notification to all users with active push tokens.
     */
    public function broadcastUpdateNotification(Request $request)
    {
        $config = config('app_update.android', []);
        $latestVersionName = $config['latest_version_name'] ?? '1.0.44';
        $playStoreUrl = $config['play_store_url'] ?? 'https://play.google.com/store/apps/details?id=com.heartlinkdatingapp.app';

        $title = $request->input('title', "HeartLink Update Available!");
        $body = $request->input('body', "A mandatory update is live with new features and security fixes. Tap to update now on Google Play.");

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
