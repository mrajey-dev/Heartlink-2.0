<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Razorpay\Api\Api;
use Illuminate\Support\Facades\Log;
use App\Models\Order;
use App\Models\User;
use App\Models\Subscription;

class PaymentController extends Controller
{
    private $razorpay;
    
    public function __construct()
    {
        $this->razorpay = new Api(
            config('services.razorpay.key') ?: env('RAZORPAY_KEY_ID', 'rzp_live_SsJLwM19hIvB6A'),
            config('services.razorpay.secret') ?: env('RAZORPAY_KEY_SECRET', 'KPdSRmf0LyD7gdubvpuPIN8m')
        );
    }
    
    public function createOrder(Request $request)
    {
        return app(\App\Http\Controllers\Api\SubscriptionController::class)->createRazorpayOrder($request);
    }

    public function verifyPayment(Request $request)
    {
        return app(\App\Http\Controllers\Api\SubscriptionController::class)->verifyRazorpayPayment($request);
    }
}