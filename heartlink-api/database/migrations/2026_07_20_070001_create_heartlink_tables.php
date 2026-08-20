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
        // 1. Profile Photos
        Schema::create('profile_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('photo_url');
            $table->boolean('is_primary')->default(false);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        // 2. Swipes Log
        Schema::create('swipes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('swiper_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('swiped_user_id')->constrained('users')->onDelete('cascade');
            $table->enum('type', ['like', 'pass', 'super_like'])->default('like');
            $table->timestamps();

            $table->unique(['swiper_id', 'swiped_user_id']);
        });

        // 3. Matches
        Schema::create('user_matches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_1_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('user_2_id')->constrained('users')->onDelete('cascade');
            $table->timestamp('matched_at')->useCurrent();
            $table->timestamps();
        });

        // 4. Messages Log
        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sender_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('receiver_id')->constrained('users')->onDelete('cascade');
            $table->text('message');
            $table->boolean('is_read')->default(false);
            $table->timestamps();
        });

        // 5. User Reports
        Schema::create('user_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reporter_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('reported_user_id')->constrained('users')->onDelete('cascade');
            $table->string('reason');
            $table->enum('status', ['pending', 'reviewed', 'dismissed'])->default('pending');
            $table->timestamps();
        });

        // 6. User Blocks
        Schema::create('user_blocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('blocker_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('blocked_user_id')->constrained('users')->onDelete('cascade');
            $table->timestamps();

            $table->unique(['blocker_id', 'blocked_user_id']);
        });

        // 7. Restaurants / Date Spots
        Schema::create('restaurants', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('category');
            $table->decimal('rating', 3, 1)->default(4.5);
            $table->string('location');
            $table->string('image')->nullable();
            $table->text('description')->nullable();
            $table->string('price_range')->default('$$');
            $table->string('map_url')->nullable();
            $table->timestamps();
        });

        // 8. Date Proposals / Bookings
        Schema::create('date_bookings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('proposer_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('partner_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('restaurant_id')->constrained('restaurants')->onDelete('cascade');
            $table->date('booking_date');
            $table->string('booking_time');
            $table->enum('status', ['pending', 'accepted', 'declined', 'cancelled'])->default('pending');
            $table->timestamps();
        });

        // 9. Membership Subscriptions
        Schema::create('user_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('plan_name'); // Access, Platinum, Black
            $table->string('duration');  // 1w, 1m, 3m, 6m, 12m
            $table->string('price');
            $table->timestamp('starts_at')->useCurrent();
            $table->timestamp('expires_at')->nullable();
            $table->enum('status', ['active', 'cancelled', 'expired'])->default('active');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_subscriptions');
        Schema::dropIfExists('date_bookings');
        Schema::dropIfExists('restaurants');
        Schema::dropIfExists('user_blocks');
        Schema::dropIfExists('user_reports');
        Schema::dropIfExists('messages');
        Schema::dropIfExists('user_matches');
        Schema::dropIfExists('swipes');
        Schema::dropIfExists('profile_photos');
    }
};
