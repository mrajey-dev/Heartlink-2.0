<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Mobile App Version & Force Update Configuration
    |--------------------------------------------------------------------------
    |
    | Control compulsory updates and app version requirements dynamically
    | without having to modify frontend code for future releases.
    |
    */

    'android' => [
        // The minimum versionCode required to use the app. Any client with a lower versionCode will be blocked.
        'min_version_code' => (int) env('HEARTLINK_MIN_ANDROID_VERSION_CODE', 45),

        // The latest released version
        'latest_version_code' => (int) env('HEARTLINK_LATEST_ANDROID_VERSION_CODE', 45),
        'latest_version_name' => env('HEARTLINK_LATEST_ANDROID_VERSION_NAME', '1.0.45'),

        // Whether compulsory (force) update is actively turned on
        'force_update' => (bool) env('HEARTLINK_FORCE_UPDATE', true),

        // Whether to keep showing the popup until the user clicks "Update on Google Play"
        'dismiss_on_update_click' => (bool) env('HEARTLINK_UPDATE_DISMISS_ON_CLICK', true),

        'title' => env('HEARTLINK_UPDATE_TITLE', 'Update HeartLink'),

        'message' => env(
            'HEARTLINK_UPDATE_MESSAGE',
            'A new and improved version of HeartLink is now available on Google Play with enhanced performance, real-time messaging, and new safety features. Please update now to continue.'
        ),

        'release_notes' => [
            '⚡ Faster real-time messaging & instant chat',
            '🔒 Enhanced account safety & verification',
            '✨ Smoother swiping and vibe matchmaking',
            '🛡️ New Block & Report safety controls',
            '🛠️ Critical performance & stability fixes',
        ],

        'play_store_url' => env(
            'HEARTLINK_PLAY_STORE_URL',
            'https://play.google.com/store/apps/details?id=com.heartlinkdatingapp.app'
        ),

        'market_url' => env(
            'HEARTLINK_MARKET_URL',
            'market://details?id=com.heartlinkdatingapp.app'
        ),
    ],
];
