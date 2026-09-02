<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ExpoPushService
{
    /**
     * Send remote push notification to a user via Expo Push API.
     *
     * @param User|int $recipient Target User instance or User ID
     * @param string $title Push notification header title
     * @param string $body Push notification body message
     * @param array $data Navigation & custom parameters, e.g. ['screen' => 'ChatDetail', 'params' => ['userId' => 5]]
     * @return bool
     */
    public static function sendToUser($recipient, string $title, string $body, array $data = []): bool
    {
        try {
            $user = $recipient instanceof User ? $recipient : User::find($recipient);
            if (!$user || empty($user->expo_push_token)) {
                Log::info("[ExpoPushService] No push token found for user ID: " . ($user ? $user->id : $recipient));
                return false;
            }

            // Check if user turned off notifications in settings
            $settings = $user->settings;
            if ($settings && isset($settings->notifications_on) && !$settings->notifications_on) {
                Log::info("[ExpoPushService] Push notifications are disabled in settings for user ID {$user->id}");
                return false;
            }

            $token = trim($user->expo_push_token);

            // If token is a native FCM device token (does not start with Expo), use Firebase Cloud Messaging v1 directly
            if (!str_starts_with($token, 'ExponentPushToken') && !str_starts_with($token, 'ExpoPushToken')) {
                Log::info("[ExpoPushService] Token is a direct FCM token. Delegating to FirebasePushService for user {$user->id}");
                return FirebasePushService::sendToFcmToken($token, $title, $body, $data);
            }

            $payload = [
                'to'       => $token,
                'sound'    => 'default',
                'title'    => $title,
                'body'     => $body,
                'data'     => $data,
                'priority' => 'high',
                'channelId' => 'default',
            ];

            Log::info("[ExpoPushService] Sending push notification via Expo Push API to user {$user->id} ({$token}): {$title}");

            $response = Http::withHeaders([
                'Accept'          => 'application/json',
                'Accept-Encoding' => 'gzip, deflate',
                'Content-Type'    => 'application/json',
            ])->post('https://exp.host/--/api/v2/push/send', $payload);

            if ($response->successful()) {
                Log::info("[ExpoPushService] Push delivered successfully to user {$user->id}");
                return true;
            } else {
                Log::error("[ExpoPushService] Expo API returned error for user {$user->id}: " . $response->body());
                return false;
            }
        } catch (\Throwable $e) {
            Log::error("[ExpoPushService] Exception sending push to user: " . $e->getMessage());
            return false;
        }
    }
}
