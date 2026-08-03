<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('user_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->onDelete('cascade');
            
            // Notifications & Privacy Toggles
            $table->boolean('notifications_on')->default(true);
            $table->boolean('show_age')->default(true);
            $table->boolean('show_distance')->default(true);
            $table->boolean('show_online_status')->default(true);
            $table->boolean('show_occupation')->default(true);
            $table->boolean('hide_education')->default(false);
            $table->boolean('hide_last_seen')->default(false);
            
            // Access & Visibility Control
            $table->string('profile_visibility')->default('Public');
            $table->string('who_can_message')->default('Matches Only');
            
            // Discovery & Preference Filters
            $table->string('distance_filter')->default('50 km');
            $table->string('age_range_filter')->default('18 - 35');
            $table->boolean('verified_only')->default(false);
            $table->boolean('has_bio_only')->default(false);
            $table->boolean('common_interests_only')->default(false);
            $table->string('education_filter')->default('Any');
            $table->string('religion_filter')->default('Any');
            $table->string('language_filter')->default('Any');
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_settings');
    }
};
