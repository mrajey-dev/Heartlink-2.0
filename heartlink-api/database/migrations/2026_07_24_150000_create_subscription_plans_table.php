<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscription_plans', function (Blueprint $table) {
            $table->id();
            $table->string('plan_key')->unique();   // 'basic', 'plus', 'premium'
            $table->string('name');                 // 'HeartLink Basic'
            $table->string('tagline');
            $table->string('icon_name');            // Ionicons name
            $table->string('badge_text');
            $table->string('accent_color');
            $table->json('gradient');               // ["#06B6D4", "#3B82F6"]
            $table->string('glow_color');
            $table->json('durations');              // [{id, label, price, unit, total, save, popular?}]
            $table->json('features');               // [{icon, title}]
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_plans');
    }
};
