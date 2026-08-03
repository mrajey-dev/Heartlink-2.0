<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserSettings extends Model
{
    protected $table = 'user_settings';

    protected $fillable = [
        'user_id',
        'notifications_on',
        'show_age',
        'show_distance',
        'show_online_status',
        'show_occupation',
        'hide_education',
        'hide_last_seen',
        'profile_visibility',
        'who_can_message',
        'distance_filter',
        'age_range_filter',
        'verified_only',
        'has_bio_only',
        'common_interests_only',
        'education_filter',
        'religion_filter',
        'language_filter',
    ];

    protected $casts = [
        'notifications_on'      => 'boolean',
        'show_age'              => 'boolean',
        'show_distance'         => 'boolean',
        'show_online_status'    => 'boolean',
        'show_occupation'       => 'boolean',
        'hide_education'        => 'boolean',
        'hide_last_seen'        => 'boolean',
        'verified_only'         => 'boolean',
        'has_bio_only'          => 'boolean',
        'common_interests_only' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
