<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DiscoverController;
use App\Http\Controllers\Api\MatchController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\DatePlannerController;
use App\Http\Controllers\Api\SubscriptionController;
use App\Http\Controllers\Api\RequestController;
use App\Http\Controllers\Api\SettingsController;

// API v1 Routes
Route::prefix('v1')->group(function () {
    // Public Auth & Upload Routes
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login',    [AuthController::class, 'login']);
    Route::post('/upload-image',  [AuthController::class, 'uploadImage']);
    Route::get('/user-count',     [AuthController::class, 'getUserCount']);

    // Protected API Routes (Sanctum Auth)
    Route::middleware('auth:sanctum')->group(function () {
        // Auth & Profile
        Route::get('/user/profile',      [AuthController::class, 'profile']);
        Route::post('/user/profile',     [AuthController::class, 'updateProfile']);
        Route::post('/user/verify',      [AuthController::class, 'verifyProfile']);
        Route::post('/aadhaar/send-otp',   [AuthController::class, 'sendAadhaarOtp']);
        Route::post('/aadhaar/verify-otp', [AuthController::class, 'verifyAadhaarOtp']);
        Route::post('/auth/logout',      [AuthController::class, 'logout']);

        // Settings & Preferences
        Route::get('/user/settings',   [SettingsController::class, 'getSettings']);
        Route::post('/user/settings',  [SettingsController::class, 'updateSettings']);

        // Discovery & Swiping
        Route::get('/discover',        [DiscoverController::class, 'feed']);
        Route::get('/discover/vibes',  [DiscoverController::class, 'vibeFeed']);
        Route::post('/discover/swipe', [DiscoverController::class, 'swipe']);
        Route::post('/discover/reset', [DiscoverController::class, 'reset']);

        // Matches & Requests
        Route::get('/matches',                         [MatchController::class, 'index']);
        Route::post('/matches/unmatch',                [MatchController::class, 'unmatch']);
        Route::get('/requests',                        [MatchController::class, 'requests']);
        Route::post('/requests/{userId}/accept',       [RequestController::class, 'accept']);
        Route::post('/requests/{userId}/decline',      [RequestController::class, 'decline']);

        // Notifications
        Route::get('/notifications',                   [RequestController::class, 'notifications']);
        Route::post('/notifications/mark-read',        [RequestController::class, 'markRead']);


        // Messaging & Safety
        Route::get('/user/unread-counts',         [ChatController::class, 'getUnreadCounts']);
        Route::get('/chats',                     [ChatController::class, 'conversations']);
        Route::get('/chats/{otherUserId}',       [ChatController::class, 'getMessages']);
        Route::post('/chats/send',               [ChatController::class, 'sendMessage']);
        Route::post('/chats/react',              [ChatController::class, 'reactMessage']);
        Route::delete('/chats/message/{messageId}', [ChatController::class, 'deleteMessage']);
        Route::post('/chats/clear/{otherUserId}',   [ChatController::class, 'clearChat']);
        Route::get('/users/blocked',       [ChatController::class, 'getBlockedUsers']);
        Route::post('/users/block',        [ChatController::class, 'blockUser']);
        Route::post('/users/unblock',      [ChatController::class, 'unblockUser']);
        Route::post('/users/report',       [ChatController::class, 'reportUser']);

        // Account Management
        Route::post('/user/deactivate',    [AuthController::class, 'deactivateAccount']);
        Route::delete('/user/account',     [AuthController::class, 'deleteAccount']);
        Route::post('/user/delete-image',  [AuthController::class, 'deleteImage']);

        // Date Planner
        Route::get('/restaurants',          [DatePlannerController::class, 'getRestaurants']);
        Route::post('/date-bookings',       [DatePlannerController::class, 'createProposal']);
        Route::post('/date-bookings/respond', [DatePlannerController::class, 'respondProposal']);

        // Subscriptions & Razorpay Payments
        Route::get('/subscriptions/plans',         [SubscriptionController::class, 'getPlans']);
        Route::post('/subscriptions/subscribe',    [SubscriptionController::class, 'subscribe']);
        Route::post('/payment/create-order',       [SubscriptionController::class, 'createRazorpayOrder']);
        Route::post('/payment/verify-payment',     [SubscriptionController::class, 'verifyRazorpayPayment']);
    });
});
