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
        Schema::create('aadhaar_verifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->onDelete('cascade');
            $table->string('aadhaar_number')->unique();
            $table->string('reference_id')->nullable();
            $table->string('full_name')->nullable();
            $table->string('gender')->nullable();
            $table->string('date_of_birth')->nullable();
            $table->string('year_of_birth')->nullable();
            $table->string('care_of')->nullable();
            $table->text('full_address')->nullable();
            $table->string('house')->nullable();
            $table->string('street')->nullable();
            $table->string('vtc')->nullable();
            $table->string('district')->nullable();
            $table->string('state')->nullable();
            $table->string('pincode')->nullable();
            $table->string('country')->nullable();
            $table->longText('photo')->nullable(); // Base64 encoded eKYC photo
            $table->json('raw_response')->nullable(); // Full JSON response payload from provider
            $table->string('status')->default('VERIFIED');
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('aadhaar_verifications');
    }
};
