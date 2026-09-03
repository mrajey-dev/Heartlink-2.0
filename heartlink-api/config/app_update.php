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
        'min_version_code' => (int) env('HEARTLINK_MIN_ANDROID_VERSION_CODE', 44),

        // The latest released version
        'latest_version_code' => (int) env('HEARTLINK_LATEST_ANDROID_VERSION_CODE', 44),
        'latest_version_name' => env('HEARTLINK_LATEST_ANDROID_VERSION_NAME', '1.0.44'),

        // Whether compulsory (force) update is actively turned on
        'force_update' => (bool) env('HEARTLINK_FORCE_UPDATE', true),

        'title' => env('HEARTLINK_UPDATE_TITLE', 'Update Required'),

        'message' => env(
            'HEARTLINK_UPDATE_MESSAGE',
            'A new version of HeartLink is available with important performance improvements and security updates. Please update to continue using the app.'
        ),

        'release_notes' => [
            '⚡ Faster real-time messaging & instant chat',
            '🔒 Enhanced account safety & verification',
            '✨ Smoother swiping and vibe matchmaking',
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
