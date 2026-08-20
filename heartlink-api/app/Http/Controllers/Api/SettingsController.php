<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserSettings;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    /**
     * Get user settings (or create default row if none exists).
     */
    public function getSettings(Request $request)
    {
        $user = $request->user();

        $settings = UserSettings::firstOrCreate(
            ['user_id' => $user->id],
            [
                'notifications_on'      => true,
                'show_age'              => true,
                'show_distance'         => true,
                'show_online_status'    => true,
                'show_occupation'       => true,
                'hide_education'        => false,
                'hide_last_seen'        => false,
                'profile_visibility'    => 'Public',
                'who_can_message'       => 'Everyone',
                'distance_filter'       => '50 km',
                'age_range_filter'      => '18 - 35',
                'verified_only'         => false,
                'has_bio_only'          => false,
                'common_interests_only' => false,
                'education_filter'      => 'Any',
                'religion_filter'       => 'Any',
                'language_filter'       => 'Any',
            ]
        );

        return response()->json([
            'settings' => $settings,
        ]);
    }

    /**
     * Update user settings in the user_settings table.
     */
    public function updateSettings(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'notifications_on'      => 'sometimes|boolean',
            'show_age'              => 'sometimes|boolean',
            'show_distance'         => 'sometimes|boolean',
            'show_online_status'    => 'sometimes|boolean',
            'show_occupation'       => 'sometimes|boolean',
            'hide_education'        => 'sometimes|boolean',
            'hide_last_seen'        => 'sometimes|boolean',
            'profile_visibility'    => 'sometimes|string|in:Public,Members Only,Hidden',
            'who_can_message'       => 'sometimes|string|in:Everyone,Matches Only,Verified Only',
            'distance_filter'       => 'sometimes|string',
            'age_range_filter'      => 'sometimes|string',
            'verified_only'         => 'sometimes|boolean',
            'has_bio_only'          => 'sometimes|boolean',
            'common_interests_only' => 'sometimes|boolean',
            'education_filter'      => 'sometimes|string',
            'religion_filter'       => 'sometimes|string',
            'language_filter'       => 'sometimes|string',
        ]);

        $settings = UserSettings::updateOrCreate(
            ['user_id' => $user->id],
            $validated
        );

        return response()->json([
            'message'  => 'Settings updated successfully',
            'settings' => $settings,
        ]);
    }
}
