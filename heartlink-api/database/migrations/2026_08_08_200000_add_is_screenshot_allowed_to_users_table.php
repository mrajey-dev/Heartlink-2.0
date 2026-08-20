<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'is_screenshot_allowed')) {
                $table->boolean('is_screenshot_allowed')->default(false)->after('is_verified');
            }
        });

        // Set is_screenshot_allowed = true for user ID = 16
        DB::table('users')->where('id', 16)->update(['is_screenshot_allowed' => true]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'is_screenshot_allowed')) {
                $table->dropColumn('is_screenshot_allowed');
            }
        });
    }
};
