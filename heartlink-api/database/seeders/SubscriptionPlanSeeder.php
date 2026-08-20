<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\SubscriptionPlan;

class SubscriptionPlanSeeder extends Seeder
{
    public function run(): void
    {
        // Clear existing plans before re-seeding
        SubscriptionPlan::truncate();

        $plans = [
            [
                'plan_key'     => 'basic',
                'name'         => 'HeartLink Basic',
                'tagline'      => 'Essential Match & Profile Tools',
                'icon_name'    => 'flash-outline',
                'badge_text'   => 'BASIC PLAN',
                'accent_color' => '#06B6D4',
                'gradient'     => ['#06B6D4', '#3B82F6'],
                'glow_color'   => 'rgba(6, 182, 212, 0.22)',
                'durations'    => [
                    ['id' => '12m', 'label' => '1 Year',   'price' => '₹18',   'unit' => '/wk', 'total' => '₹864', 'save' => '38% OFF'],
                    ['id' => '6m',  'label' => '6 Months', 'price' => '₹25',   'unit' => '/wk', 'total' => '₹600', 'save' => '15% OFF', 'popular' => true],
                    ['id' => '1m',  'label' => '1 Month',  'price' => '₹29.2',  'unit' => '/wk', 'total' => '₹117', 'save' => 'STANDARD'],
                ],
                'features'     => [
                    ['icon' => 'heart-outline',        'title' => '10 Profile Likes Daily (24h Reset)'],
                    ['icon' => 'close-outline',        'title' => '20 Profile Passes Daily (24h Reset)'],
                    ['icon' => 'reload-outline',       'title' => 'Recheck Up to 3 Passed Profiles'],
                    ['icon' => 'chatbubbles-outline',  'title' => 'Unlimited Chatting with Matches'],
                    ['icon' => 'mail-unread-outline',  'title' => 'Unlimited Incoming Match Requests'],
                    ['icon' => 'rocket-outline',       'title' => '3 Profile Priority Boosts per Month'],
                    ['icon' => 'options-outline',      'title' => 'Access to Preference Filters in Discover'],
                ],
                'sort_order'   => 1,
                'is_active'    => true,
            ],
            [
                'plan_key'     => 'plus',
                'name'         => 'HeartLink Plus',
                'tagline'      => 'Expanded Reach & Superlikes',
                'icon_name'    => 'star-outline',
                'badge_text'   => 'MOST POPULAR',
                'accent_color' => '#F59E0B',
                'gradient'     => ['#F59E0B', '#D97706'],
                'glow_color'   => 'rgba(245, 158, 11, 0.25)',
                'durations'    => [
                    ['id' => '12m', 'label' => '1 Year',   'price' => '₹43',   'unit' => '/wk', 'total' => '₹2,064', 'save' => '20% OFF'],
                    ['id' => '6m',  'label' => '6 Months', 'price' => '₹49',   'unit' => '/wk', 'total' => '₹1,176', 'save' => '8% OFF', 'popular' => true],
                    ['id' => '1m',  'label' => '1 Month',  'price' => '₹53.5', 'unit' => '/wk', 'total' => '₹214',   'save' => 'FLEX'],
                ],
                'features'     => [
                    ['icon' => 'heart-outline',        'title' => '20 Profile Likes Daily (24h Reset)'],
                    ['icon' => 'close-outline',        'title' => '30 Profile Passes Daily (24h Reset)'],
                    ['icon' => 'reload-outline',       'title' => 'Recheck Up to 10 Passed Profiles'],
                    ['icon' => 'chatbubbles-outline',  'title' => 'Unlimited Chatting with Matches'],
                    ['icon' => 'flash-outline',        'title' => '5 Superlikes per Month'],
                    ['icon' => 'mail-unread-outline',  'title' => 'Unlimited Incoming Match Requests'],
                    ['icon' => 'rocket-outline',       'title' => '5 Profile Priority Boosts per Month'],
                    ['icon' => 'options-outline',      'title' => 'Access to Preference Filters in Discover'],
                ],
                'sort_order'   => 2,
                'is_active'    => true,
            ],
            [
                'plan_key'     => 'premium',
                'name'         => 'HeartLink Premium',
                'tagline'      => 'Unlimited Swipes, Golden Tick & Daily Boost',
                'icon_name'    => 'sparkles-outline',
                'badge_text'   => 'ULTIMATE PREMIUM',
                'accent_color' => '#FF007F',
                'gradient'     => ['#FF007F', '#8B5CF6'],
                'glow_color'   => 'rgba(255, 0, 127, 0.28)',
                'durations'    => [
                    ['id' => '12m', 'label' => '1 Year',   'price' => '₹70',   'unit' => '/wk', 'total' => '₹3,360', 'save' => '29% OFF'],
                    ['id' => '6m',  'label' => '6 Months', 'price' => '₹83',   'unit' => '/wk', 'total' => '₹1,992', 'save' => '16% OFF', 'popular' => true],
                    ['id' => '1m',  'label' => '1 Month',  'price' => '₹99',   'unit' => '/wk', 'total' => '₹396',   'save' => 'ULTIMATE'],
                ],
                'features'     => [
                    ['icon' => 'infinite-outline',     'title' => 'Unlimited Daily Likes & Passes'],
                    ['icon' => 'reload-outline',       'title' => 'Recheck Unlimited Passed Profiles'],
                    ['icon' => 'chatbubbles-outline',  'title' => 'Unlimited Chatting with Matches'],
                    ['icon' => 'checkmark-circle-outline','title' => 'Special Golden Tick Badge on Profile'],
                    ['icon' => 'flash-outline',        'title' => '15 Superlikes per Month'],
                    ['icon' => 'rocket-outline',       'title' => 'Daily Top Feed Profile Priority Boost'],
                    ['icon' => 'mail-unread-outline',  'title' => 'Unlimited Incoming Match Requests'],
                    ['icon' => 'options-outline',      'title' => 'Access to Preference Filters in Discover'],
                ],
                'sort_order'   => 3,
                'is_active'    => true,
            ],
            [
                'plan_key'     => 'superlike_pack',
                'name'         => 'Superlike Booster Pack',
                'tagline'      => 'Instant Superlikes (No Monthly Wait)',
                'icon_name'    => 'flash',
                'badge_text'   => 'INSTANT TOP-UP',
                'accent_color' => '#FF007F',
                'gradient'     => ['#FF007F', '#9D4EDD'],
                'glow_color'   => 'rgba(255, 0, 127, 0.3)',
                'durations'    => [
                    ['id' => '30_superlikes', 'label' => '30 Superlikes', 'price' => '₹199', 'unit' => ' pack', 'total' => '₹199', 'save' => '35% OFF'],
                    ['id' => '15_superlikes', 'label' => '15 Superlikes', 'price' => '₹119', 'unit' => ' pack', 'total' => '₹119', 'save' => '20% OFF', 'popular' => true],
                    ['id' => '5_superlikes',  'label' => '5 Superlikes',  'price' => '₹49',  'unit' => ' pack', 'total' => '₹49',  'save' => 'STANDARD'],
                ],
                'features'     => [
                    ['icon' => 'flash-outline',        'title' => 'Instant Superlikes Added to Balance'],
                    ['icon' => 'time-outline',         'title' => 'No Waiting for Monthly Plan Reset'],
                    ['icon' => 'sparkles-outline',     'title' => '3x Higher Match Rate & Priority Inbox'],
                ],
                'sort_order'   => 4,
                'is_active'    => true,
            ],
        ];

        foreach ($plans as $plan) {
            SubscriptionPlan::create($plan);
        }

        $this->command->info('✅ Subscription plans seeded: ' . count($plans) . ' plans created.');
    }
}
