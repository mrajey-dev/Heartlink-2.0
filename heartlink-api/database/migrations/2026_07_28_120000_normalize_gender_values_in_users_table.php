<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement("UPDATE users SET gender = 'Male' WHERE LOWER(gender) IN ('male', 'man')");
        DB::statement("UPDATE users SET gender = 'Female' WHERE LOWER(gender) IN ('female', 'woman')");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No reversal needed
    }
};
