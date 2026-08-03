<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            // Who receives the notification
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            // Who triggered it
            $table->foreignId('from_user_id')->constrained('users')->onDelete('cascade');
            // Type: 'request_accepted' | 'request_declined' | 'new_match' | 'new_like'
            $table->string('type');
            $table->string('message');
            $table->boolean('is_read')->default(false);
            $table->timestamps();
        });

        // Add a 'declined' swipes tracking without polluting the swipes table
        // We use a separate column on swipes to mark if the receiver explicitly declined
        Schema::table('swipes', function (Blueprint $table) {
            $table->boolean('is_declined_by_receiver')->default(false)->after('type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
        Schema::table('swipes', function (Blueprint $table) {
            $table->dropColumn('is_declined_by_receiver');
        });
    }
};
