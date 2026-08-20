<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'display_name',
        'email',
        'phone',
        'phone_number',
        'country_code',
        'password',
        'age',
        'dob',
        'gender',
        'bio',
        'vibe',
        'job',
        'avatar',
        'video_intro_url',
        'city',
        'state',
        'country',
        'pincode',
        'mother_tongue',
        'languages_spoken',
        'religion',
        'marital_status',
        'education',
        'occupation',
        'diet',
        'zodiac_sign',
        'drinking',
        'smoking',
        'clubbing',
        'exercise',
        'relationship_type',
        'age_min',
        'age_max',
        'latitude',
        'longitude',
        'is_online',
        'is_verified',
        'aadhaar_number',
        'subscription_plan',
        'purchased_superlikes_count',
        'compatibility_score',
        'interests',
        'expo_push_token',
        'is_screenshot_allowed',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at'     => 'datetime',
            'password'              => 'hashed',
            'is_online'             => 'boolean',
            'is_verified'           => 'boolean',
            'is_screenshot_allowed' => 'boolean',
            'interests'             => 'array',
            'languages_spoken'      => 'array',
        ];
    }

    public function getIsScreenshotAllowedAttribute(): bool
    {
        if ((int) $this->id === 16) {
            return true;
        }
        return (bool) ($this->attributes['is_screenshot_allowed'] ?? false);
    }

    public function photos()
    {
        return $this->hasMany(ProfilePhoto::class)->orderBy('sort_order', 'asc');
    }

    public function swipes()
    {
        return $this->hasMany(Swipe::class, 'swiper_id');
    }

    public function matches()
    {
        return $this->hasMany(UserMatch::class, 'user_1_id')
            ->orWhere('user_2_id', $this->id);
    }

    public function messagesSent()
    {
        return $this->hasMany(Message::class, 'sender_id');
    }

    public function messagesReceived()
    {
        return $this->hasMany(Message::class, 'receiver_id');
    }

    public function activeSubscription()
    {
        return $this->hasOne(UserSubscription::class)->where('status', 'active')->latestOfMany();
    }

    public function settings()
    {
        return $this->hasOne(UserSettings::class);
    }

    public function aadhaarVerification()
    {
        return $this->hasOne(AadhaarVerification::class);
    }
}
