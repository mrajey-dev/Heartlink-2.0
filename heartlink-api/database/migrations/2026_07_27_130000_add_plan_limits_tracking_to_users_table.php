<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'daily_likes_count')) {
                $table->integer('daily_likes_count')->default(0)->after('subscription_plan');
            }
            if (!Schema::hasColumn('users', 'daily_passes_count')) {
                $table->integer('daily_passes_count')->default(0)->after('daily_likes_count');
            }
            if (!Schema::hasColumn('users', 'last_swipe_reset_at')) {
                $table->timestamp('last_swipe_reset_at')->nullable()->after('daily_passes_count');
            }
            if (!Schema::hasColumn('users', 'monthly_superlikes_count')) {
                $table->integer('monthly_superlikes_count')->default(0)->after('last_swipe_reset_at');
            }
            if (!Schema::hasColumn('users', 'monthly_boosts_count')) {
                $table->integer('monthly_boosts_count')->default(0)->after('monthly_superlikes_count');
            }
            if (!Schema::hasColumn('users', 'last_boost_reset_at')) {
                $table->timestamp('last_boost_reset_at')->nullable()->after('monthly_boosts_count');
            }
            if (!Schema::hasColumn('users', 'rewinds_count')) {
                $table->integer('rewinds_count')->default(0)->after('last_boost_reset_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'daily_likes_count',
                'daily_passes_count',
                'last_swipe_reset_at',
                'monthly_superlikes_count',
                'monthly_boosts_count',
                'last_boost_reset_at',
                'rewinds_count',
            ]);
        });
    }
};
