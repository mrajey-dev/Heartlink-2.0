<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SubscriptionPlan extends Model
{
    protected $fillable = [
        'plan_key',
        'name',
        'tagline',
        'icon_name',
        'badge_text',
        'accent_color',
        'gradient',
        'glow_color',
        'durations',
        'features',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'gradient'  => 'array',
        'durations' => 'array',
        'features'  => 'array',
        'is_active' => 'boolean',
    ];

    /**
     * Scope to only return active plans ordered by sort_order.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true)->orderBy('sort_order');
    }

    /**
     * Return camelCase aliases so the frontend (PlansScreen.jsx) works without changes.
     * Maps: plan_key → id, icon_name → iconName, badge_text → badgeText,
     *       accent_color → accentColor, glow_color → glowColor
     */
    public function toArray()
    {
        $array = parent::toArray();

        $array['id']          = $array['plan_key'];
        $array['iconName']    = $array['icon_name'];
        $array['badgeText']   = $array['badge_text'];
        $array['accentColor'] = $array['accent_color'];
        $array['glowColor']   = $array['glow_color'];

        // Remove redundant snake_case keys from response
        unset(
            $array['plan_key'],
            $array['icon_name'],
            $array['badge_text'],
            $array['accent_color'],
            $array['glow_color'],
            $array['sort_order'],
            $array['is_active'],
            $array['created_at'],
            $array['updated_at']
        );

        return $array;
    }
}
