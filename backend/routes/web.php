<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\SubscriptionController;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/payment/checkout', [SubscriptionController::class, 'showRazorpayCheckout']);
