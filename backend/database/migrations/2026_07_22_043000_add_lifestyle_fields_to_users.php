<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('zodiac_sign')->nullable()->after('relationship_type');
            $table->string('drinking')->nullable()->after('zodiac_sign');
            $table->string('smoking')->nullable()->after('drinking');
            $table->string('exercise')->nullable()->after('smoking');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['zodiac_sign', 'drinking', 'smoking', 'exercise']);
        });
    }
};
