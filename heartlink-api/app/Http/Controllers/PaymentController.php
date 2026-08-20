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
            config('services.razorpay.key'),
            config('services.razorpay.secret')
        );
    }
    
   public function createOrder(Request $request)
{
    try {
        Log::info('[Razorpay] Create order request:', $request->all());
        
        $validated = $request->validate([
            'amount' => 'required|integer|min:1', // Now receiving in RUPEES
            'currency' => 'required|string|size:3',
            'planId' => 'required|string',
            'planName' => 'required|string',
            'durationId' => 'required|string',
            'durationLabel' => 'required|string',
            'userId' => 'nullable|string',
            'userEmail' => 'nullable|email',
            'userPhone' => 'nullable|string',
            'userName' => 'nullable|string',
            'customPrice' => 'nullable|string',
            'originalPrice' => 'nullable|string',
            'isOfferApplied' => 'nullable|boolean'
        ]);
        
        // IMPORTANT: Convert rupees to paise for Razorpay
        $amountInPaise = $validated['amount'] * 100; // 480 * 100 = 48000 paise
        
        Log::info('[Razorpay] Converting to paise:', [
            'rupees' => $validated['amount'],
            'paise' => $amountInPaise
        ]);
        
        $orderData = [
            'receipt' => 'receipt_' . time(),
            'amount' => $amountInPaise, // Send in paise to Razorpay
            'currency' => $validated['currency'],
            'payment_capture' => 1,
            'notes' => [
                'planId' => $validated['planId'],
                'planName' => $validated['planName'],
                'durationId' => $validated['durationId'],
                'durationLabel' => $validated['durationLabel'],
                'userId' => $validated['userId'] ?? $request->user()?->id,
                'customPrice' => $validated['customPrice'] ?? '',
                'originalPrice' => $validated['originalPrice'] ?? '',
                'isOfferApplied' => $validated['isOfferApplied'] ? 'true' : 'false'
            ]
        ];
        
        Log::info('[Razorpay] Creating order with data:', $orderData);
        
        $order = $this->razorpay->order->create($orderData);
        
        Log::info('[Razorpay] Order created:', (array)$order);
        
        // Store order in database - store amount in rupees
        $dbOrder = Order::create([
            'order_id' => $order->id,
            'amount' => $validated['amount'], // Store in rupees
            'currency' => $order->currency,
            'plan_id' => $validated['planId'],
            'plan_name' => $validated['planName'],
            'duration_id' => $validated['durationId'],
            'duration_label' => $validated['durationLabel'],
            'user_id' => $validated['userId'] ?? $request->user()?->id,
            'user_email' => $validated['userEmail'] ?? $request->user()?->email,
            'user_phone' => $validated['userPhone'] ?? $request->user()?->phone,
            'user_name' => $validated['userName'] ?? $request->user()?->name,
            'custom_price' => $validated['customPrice'],
            'original_price' => $validated['originalPrice'],
            'is_offer_applied' => $validated['isOfferApplied'] ?? false,
            'status' => 'created'
        ]);
        
        $serverUrl = url('/');
        $checkoutUrl = $serverUrl . '/payment/checkout?order_id=' . urlencode($order->id) . '&amount=' . urlencode($validated['amount']) . '&plan_name=' . urlencode($validated['planName']) . '&duration=' . urlencode($validated['durationLabel']) . '&token=' . urlencode($request->bearerToken() ?? '');

        return response()->json([
            'orderId' => $order->id,
            'amount' => $order->amount, // Returns in paise
            'currency' => $order->currency,
            'key_id' => config('services.razorpay.key'),
            'checkout_url' => $checkoutUrl
        ]);
        
    } catch (\Exception $e) {
        Log::error('[Razorpay] Create order error:', [
            'message' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        
        return response()->json([
            'error' => 'Failed to create order',
            'message' => $e->getMessage()
        ], 500);
    }
}
    public function verifyPayment(Request $request)
    {
        try {
            Log::info('[Razorpay] Verify payment request:', $request->all());
            
            $validated = $request->validate([
                'orderId' => 'required|string',
                'paymentId' => 'required|string',
                'signature' => 'required|string',
                'planId' => 'required|string',
                'durationId' => 'required|string',
                'userId' => 'nullable|string'
            ]);
            
            // Verify signature
            $generatedSignature = hash_hmac(
                'sha256',
                $validated['orderId'] . '|' . $validated['paymentId'],
                config('services.razorpay.secret')
            );
            
            Log::info('[Razorpay] Signature verification:', [
                'generated' => $generatedSignature,
                'received' => $validated['signature']
            ]);
            
            if ($generatedSignature !== $validated['signature']) {
                Log::warning('[Razorpay] Invalid signature');
                
                // Update order status
                Order::where('order_id', $validated['orderId'])->update([
                    'status' => 'failed',
                    'error' => 'Invalid signature'
                ]);
                
                return response()->json([
                    'success' => false,
                    'error' => 'Invalid signature'
                ], 400);
            }
            
            // Payment verified successfully
            $order = Order::where('order_id', $validated['orderId'])->first();
            
            if ($order) {
                $order->update([
                    'status' => 'completed',
                    'payment_id' => $validated['paymentId'],
                    'verified_at' => now()
                ]);
                
                // Activate subscription
                $this->activateSubscription(
                    $order->user_id,
                    $validated['planId'],
                    $validated['durationId'],
                    $order->duration_label,
                    $order->amount,
                    $validated['paymentId']
                );
            }
            
            return response()->json(['success' => true]);
            
        } catch (\Exception $e) {
            Log::error('[Razorpay] Verify payment error:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    private function activateSubscription($userId, $planId, $durationId, $durationLabel, $amount, $paymentId)
    {
        // Calculate expiry date based on duration
        $expiryMap = [
            '1 Month' => 30,
            '6 Months' => 180,
            '1 Year' => 365
        ];
        
        $days = $expiryMap[$durationLabel] ?? 30;
        $expiresAt = now()->addDays($days);
        
        // Update or create subscription
        Subscription::updateOrCreate(
            [
                'user_id' => $userId,
                'plan_id' => $planId
            ],
            [
                'status' => 'active',
                'duration' => $durationLabel,
                'price' => $amount,
                'activated_at' => now(),
                'expires_at' => $expiresAt,
                'payment_id' => $paymentId
            ]
        );
        
        $rawPlan = strtolower(trim(($planId ?? '') . ' ' . ($durationLabel ?? '')));
        if (str_contains($rawPlan, 'superlike')) {
            $addedCount = 5;
            if (str_contains($rawPlan, '30')) {
                $addedCount = 30;
            } elseif (str_contains($rawPlan, '15')) {
                $addedCount = 15;
            } elseif (str_contains($rawPlan, '5')) {
                $addedCount = 5;
            }
            User::where('id', $userId)->increment('purchased_superlikes_count', $addedCount);
            return;
        }

        // Handle verification payment without changing subscription plan
        if (str_contains($rawPlan, 'verify') || str_contains($rawPlan, 'verification')) {
            return;
        }

        $formattedPlanName = 'HeartLink Basic';
        if (str_contains($rawPlan, 'premium')) {
            $formattedPlanName = 'HeartLink Premium';
        } elseif (str_contains($rawPlan, 'plus')) {
            $formattedPlanName = 'HeartLink Plus';
        } elseif (str_contains($rawPlan, 'basic')) {
            $formattedPlanName = 'HeartLink Basic';
        }

        // Update user's subscription status
        User::where('id', $userId)->update([
            'subscription_plan' => $formattedPlanName,
            'monthly_superlikes_count' => 0,
            'daily_likes_count' => 0,
            'daily_passes_count' => 0,
            'last_swipe_reset_at' => now(),
            'subscription_status' => 'active',
            'subscription_expires_at' => $expiresAt
        ]);
    }
}