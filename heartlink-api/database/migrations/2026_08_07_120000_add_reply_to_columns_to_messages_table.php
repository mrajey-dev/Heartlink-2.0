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
        Schema::table('messages', function (Blueprint $table) {
            $table->unsignedBigInteger('reply_to_id')->nullable()->after('receiver_reaction');
            $table->text('reply_to_text')->nullable()->after('reply_to_id');
            $table->string('reply_to_sender')->nullable()->after('reply_to_text');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropColumn(['reply_to_id', 'reply_to_text', 'reply_to_sender']);
        });
    }
};
