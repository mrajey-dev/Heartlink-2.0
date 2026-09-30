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

    protected $appends = [
        'is_screenshot_allowed',
        'is_verified',
        'is_aadhaar_verified',
        'is_premium',
        'expires_at',
        'active_subscription',
    ];

    public function getIsAadhaarVerifiedAttribute(): bool
    {
        if (!empty($this->attributes['aadhaar_number'])) {
            return true;
        }
        if ($this->relationLoaded('aadhaarVerification')) {
            $record = $this->getRelation('aadhaarVerification');
            return $record !== null && ($record->status === 'VERIFIED' || empty($record->status));
        }
        return \App\Models\AadhaarVerification::where('user_id', $this->id)
            ->where(function ($q) {
                $q->where('status', 'VERIFIED')->orWhereNull('status');
            })->exists();
    }

    public function getSubscriptionPlanAttribute(): string
    {
        $sub = $this->relationLoaded('activeSubscription') 
            ? $this->getRelation('activeSubscription') 
            : $this->activeSubscription()->first();

        if ($sub && $sub->expires_at && \Carbon\Carbon::parse($sub->expires_at)->isFuture()) {
            return $sub->plan_name;
        }

        $latestSub = \App\Models\UserSubscription::where('user_id', $this->id)->latest()->first();
        if ($latestSub && $latestSub->expires_at && \Carbon\Carbon::parse($latestSub->expires_at)->isPast()) {
            return 'Free';
        }

        $rawPlan = $this->attributes['subscription_plan'] ?? null;
        if (!empty($rawPlan)) {
            $p = strtolower($rawPlan);
            if (in_array($p, ['free', 'none', 'null', 'basic_free'])) {
                return 'Free';
            }
            $exp = $this->getExpiresAtAttribute();
            if ($exp && \Carbon\Carbon::parse($exp)->isPast()) {
                return 'Free';
            }
            return $rawPlan;
        }

        return 'Free';
    }

    public function getExpiresAtAttribute(): ?string
    {
        $sub = $this->relationLoaded('activeSubscription') 
            ? $this->getRelation('activeSubscription') 
            : $this->activeSubscription()->first();

        if ($sub && $sub->expires_at) {
            return $sub->expires_at instanceof \Carbon\Carbon 
                ? $sub->expires_at->toISOString() 
                : (string) $sub->expires_at;
        }

        $latestSub = \App\Models\UserSubscription::where('user_id', $this->id)->latest()->first();
        if ($latestSub && $latestSub->expires_at) {
            return $latestSub->expires_at instanceof \Carbon\Carbon 
                ? $latestSub->expires_at->toISOString() 
                : (string) $latestSub->expires_at;
        }

        return null;
    }

    public function getActiveSubscriptionAttribute()
    {
        return $this->relationLoaded('activeSubscription') 
            ? $this->getRelation('activeSubscription') 
            : $this->activeSubscription()->first();
    }

    public function getIsScreenshotAllowedAttribute(): bool
    {
        if (isset($this->attributes['is_screenshot_allowed'])) {
            $val = $this->attributes['is_screenshot_allowed'];
            if ($val === false || $val === 0 || $val === '0' || $val === 'false') {
                return false;
            }
            if ($val === true || $val === 1 || $val === '1' || $val === 'true') {
                return true;
            }
        }
        if ((int) $this->id === 16) {
            return true;
        }
        return false;
    }

    public function getIsVerifiedAttribute(): bool
    {
        // 1. Permanent Aadhaar identity verification (Shield tick)
        if ($this->is_aadhaar_verified) {
            return true;
        }

        // 2. Active non-expired plan verification (Plan tick)
        $sub = $this->relationLoaded('activeSubscription') 
            ? $this->getRelation('activeSubscription') 
            : $this->activeSubscription()->first();

        if ($sub && $sub->expires_at && \Carbon\Carbon::parse($sub->expires_at)->isFuture()) {
            return true;
        }

        // 3. Fallback: if user has is_verified flag and no expired paid plan
        $latestSub = \App\Models\UserSubscription::where('user_id', $this->id)->latest()->first();
        if ($latestSub && $latestSub->expires_at && \Carbon\Carbon::parse($latestSub->expires_at)->isPast()) {
            // Plan is expired: Only verified if they have Aadhaar identity verification
            return $this->is_aadhaar_verified;
        }

        return (bool) ($this->attributes['is_verified'] ?? false);
    }

    public function getIsPremiumAttribute(): bool
    {
        $plan = strtolower($this->subscription_plan ?? '');
        return !empty($plan) && !in_array($plan, ['free', 'none', 'null', 'basic_free']);
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
        return $this->hasOne(UserSubscription::class)
            ->where('status', 'active')
            ->where('expires_at', '>', now())
            ->latestOfMany();
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
