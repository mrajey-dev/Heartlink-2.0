<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ResetDailySwipeCounts extends Command
{
    protected $signature = 'heartlink:reset-daily-swipes {--dry-run : Preview without updating}';

    protected $description = 'Reset daily_likes_count and daily_passes_count to 0 for all users';

    public function handle(): int
    {
        $isDryRun = $this->option('dry-run');
        $this->info('[HeartLink] Daily swipe count reset starting...');

        $count = DB::table('users')
            ->where(function ($q) {
                $q->where('daily_likes_count', '>', 0)->orWhere('daily_passes_count', '>', 0);
            })->count();

        $this->info("Found {$count} user(s) with non-zero counts.");

        if ($count === 0) { $this->info('All counts already 0.'); return self::SUCCESS; }

        if ($isDryRun) { $this->warn("[DRY RUN] Would reset {$count} users."); return self::SUCCESS; }

        $now = now()->timezone('Asia/Kolkata')->toDateTimeString();

        // 1. Reset daily likes and passes to 0 for all users
        $updated = DB::table('users')
            ->where(function ($q) {
                $q->where('daily_likes_count', '>', 0)->orWhere('daily_passes_count', '>', 0);
            })->update(['daily_likes_count' => 0, 'daily_passes_count' => 0, 'last_swipe_reset_at' => $now, 'updated_at' => $now]);

        // 2. Automatically expire subscriptions where expires_at has passed
        $expiredSubs = DB::table('user_subscriptions')
            ->where('status', 'active')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', $now)
            ->update(['status' => 'expired']);

        // 3. Reset users whose subscriptions have expired back to 'Free' plan
        $expiredUsers = DB::table('users')
            ->whereExists(function ($query) {
                $query->select(DB::raw(1))
                    ->from('user_subscriptions')
                    ->whereColumn('user_subscriptions.user_id', 'users.id')
                    ->where('user_subscriptions.status', 'expired');
            })
            ->whereNotExists(function ($query) use ($now) {
                $query->select(DB::raw(1))
                    ->from('user_subscriptions')
                    ->whereColumn('user_subscriptions.user_id', 'users.id')
                    ->where('user_subscriptions.status', 'active')
                    ->where('user_subscriptions.expires_at', '>', $now);
            })
            ->whereNotIn('subscription_plan', ['Free', 'free', 'none'])
            ->update(['subscription_plan' => 'Free', 'updated_at' => $now]);

        $this->info("Reset {$updated} user swipe counts. Expired {$expiredSubs} subscriptions, updated {$expiredUsers} users to Free plan.");
        Log::info("[HeartLink] Daily reset: {$updated} swipe counts reset, {$expiredSubs} subs expired, {$expiredUsers} users set to Free at {$now}.");
        return self::SUCCESS;
    }
}
