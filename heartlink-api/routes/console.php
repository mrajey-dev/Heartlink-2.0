<?php

use App\Console\Commands\ResetDailySwipeCounts;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
|--------------------------------------------------------------------------
| HeartLink Scheduled Tasks
|--------------------------------------------------------------------------
|
| Reset daily_likes_count and daily_passes_count to 0 for all users
| every day at 12:00 AM IST (Asia/Kolkata).
|
| The scheduler runs via:  php artisan schedule:run
| To test locally:         php artisan schedule:run --verbose
|
*/

Schedule::command(ResetDailySwipeCounts::class)
    ->dailyAt('00:00')
    ->timezone('Asia/Kolkata')
    ->withoutOverlapping()
    ->runInBackground()
    ->appendOutputTo(storage_path('logs/daily-swipe-reset.log'));

