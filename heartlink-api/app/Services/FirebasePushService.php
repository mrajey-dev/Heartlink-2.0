<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FirebasePushService
{
    /**
     * Get or cache Google OAuth2 Access Token for Firebase Cloud Messaging HTTP v1.
     */
    public static function getAccessToken(): ?string
    {
        return Cache::remember('firebase_fcm_access_token', 3500, function () {
            $keyPath = storage_path('app/firebase-service-account.json');
            if (!file_exists($keyPath)) {
                $keyPath = base_path('../firebase-service-account.json');
            }

            if (!file_exists($keyPath)) {
                Log::error('[FirebasePushService] Service account JSON not found at: ' . $keyPath);
                return null;
            }

            $sa = json_decode(file_get_contents($keyPath), true);
            if (!$sa || empty($sa['client_email']) || empty($sa['private_key'])) {
                Log::error('[FirebasePushService] Invalid service account JSON content.');
                return null;
            }

            $now = time();
            $header = rtrim(strtr(base64_encode(json_encode(['alg' => 'RS256', 'typ' => 'JWT'])), '+/', '-_'), '=');
            $payload = rtrim(strtr(base64_encode(json_encode([
                'iss'   => $sa['client_email'],
                'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
                'aud'   => 'https://oauth2.googleapis.com/token',
                'exp'   => $now + 3600,
                'iat'   => $now,
            ])), '+/', '-_'), '=');

            $signature = '';
            $success = openssl_sign($header . '.' . $payload, $signature, $sa['private_key'], 'SHA256');
            if (!$success) {
                Log::error('[FirebasePushService] OpenSSL failed to sign Firebase JWT.');
                return null;
            }

            $jwt = $header . '.' . $payload . '.' . rtrim(strtr(base64_encode($signature), '+/', '-_'), '=');

            $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion'  => $jwt,
            ]);

            if ($response->successful()) {
                return $response->json('access_token');
            }

            Log::error('[FirebasePushService] Failed to obtain OAuth2 token from Google: ' . $response->body());
            return null;
        });
    }

    /**
     * Send direct Firebase Cloud Messaging (HTTP v1) notification to an FCM device token.
     *
     * @param string $deviceToken Raw FCM device registration token
     * @param string $title
     * @param string $body
     * @param array $data
     * @return bool
     */
    public static function sendToFcmToken(string $deviceToken, string $title, string $body, array $data = []): bool
    {
        try {
            $accessToken = self::getAccessToken();
            if (!$accessToken) {
                Log::error('[FirebasePushService] Cannot send FCM message: No valid access token.');
                return false;
            }

            $keyPath = storage_path('app/firebase-service-account.json');
            if (!file_exists($keyPath)) {
                $keyPath = base_path('../firebase-service-account.json');
            }
            $sa = json_decode(file_get_contents($keyPath), true);
            $projectId = $sa['project_id'] ?? 'heartlink-dating';

            // Stringify any non-string data values as required by FCM v1
            $stringData = [];
            foreach ($data as $k => $v) {
                $stringData[(string)$k] = is_array($v) ? json_encode($v) : (string)$v;
            }

            $payload = [
                'message' => [
                    'token'        => $deviceToken,
                    'notification' => [
                        'title' => $title,
                        'body'  => $body,
                    ],
                    'data'         => $stringData,
                    'android'      => [
                        'priority'     => 'high',
                        'notification' => [
                            'sound'                   => 'default',
                            'channel_id'              => 'default',
                            'color'                   => '#FF007F',
                            'default_sound'           => true,
                            'default_vibrate_timings' => true,
                            'notification_priority'   => 'PRIORITY_HIGH',
                            'visibility'              => 'PUBLIC',
                        ],
                    ],
                ],
            ];

            $url = "https://fcm.googleapis.com/v1/projects/{$projectId}/messages:send";

            $response = Http::withToken($accessToken)
                ->withHeaders(['Content-Type' => 'application/json'])
                ->post($url, $payload);

            if ($response->successful()) {
                Log::info("[FirebasePushService] FCM notification delivered successfully to token: " . substr($deviceToken, 0, 15) . '...');
                return true;
            }

            Log::error("[FirebasePushService] FCM API error: " . $response->body());
            return false;
        } catch (\Throwable $e) {
            Log::error("[FirebasePushService] Exception sending FCM push: " . $e->getMessage());
            return false;
        }
    }
}
