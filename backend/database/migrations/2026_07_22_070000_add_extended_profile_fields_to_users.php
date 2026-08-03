<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('display_name')->nullable()->after('name');
            $table->string('country_code', 10)->nullable()->after('email');
            $table->string('mother_tongue')->nullable()->after('gender');
            $table->json('languages_spoken')->nullable()->after('mother_tongue');
            $table->string('religion')->nullable()->after('languages_spoken');
            $table->string('marital_status')->nullable()->after('religion');
            $table->string('education')->nullable()->after('marital_status');
            $table->string('occupation')->nullable()->after('education');
            $table->string('diet')->nullable()->after('occupation');
            $table->string('pincode', 20)->nullable()->after('country');
            $table->string('video_intro_url')->nullable()->after('avatar');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'display_name',
                'country_code',
                'mother_tongue',
                'languages_spoken',
                'religion',
                'marital_status',
                'education',
                'occupation',
                'diet',
                'pincode',
                'video_intro_url',
            ]);
        });
    }
};
