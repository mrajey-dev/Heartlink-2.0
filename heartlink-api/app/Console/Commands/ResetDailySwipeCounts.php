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

        $now = now()->toDateTimeString();
        $updated = DB::table('users')
            ->where(function ($q) {
                $q->where('daily_likes_count', '>', 0)->orWhere('daily_passes_count', '>', 0);
            })->update(['daily_likes_count' => 0, 'daily_passes_count' => 0, 'last_swipe_reset_at' => $now, 'updated_at' => $now]);

        $this->info("Reset {$updated} user(s).");
        Log::info("[HeartLink] Daily swipe reset: {$updated} users reset at {$now}.");
        return self::SUCCESS;
    }
}
