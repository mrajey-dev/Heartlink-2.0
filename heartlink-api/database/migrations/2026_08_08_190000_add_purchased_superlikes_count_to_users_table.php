<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'purchased_superlikes_count')) {
                $table->integer('purchased_superlikes_count')->default(0)->after('monthly_superlikes_count');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'purchased_superlikes_count')) {
                $table->dropColumn('purchased_superlikes_count');
            }
        });
    }
};
