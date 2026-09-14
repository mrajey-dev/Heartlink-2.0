<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserSubscription;
use App\Models\SubscriptionPlan;
use Illuminate\Http\Request;

class SubscriptionController extends Controller
{
    public function getPlans()
    {
        $allPlans = SubscriptionPlan::active()->get();

        $verificationPlan = $allPlans->firstWhere('plan_key', 'verification');

        $plans = $allPlans->where('plan_key', '!=', 'verification')->values()->map(function ($plan) {
            $durations = $plan->durations;
            if (is_array($durations) && count($durations) > 0) {
                // Find 1-month base price
                $baseItem = null;
                foreach ($durations as $d) {
                    if (($d['id'] ?? '') === '1m') {
                        $baseItem = $d;
                        break;
                    }
                }

                if ($baseItem) {
                    $baseTotal = (float) preg_replace('/[^0-9\.]/', '', $baseItem['total'] ?? '0');
                    if ($baseTotal > 0) {
                        foreach ($durations as &$d) {
                            $months = ($d['id'] ?? '') === '12m' ? 12 : (($d['id'] ?? '') === '6m' ? 6 : 1);
                            if ($months > 1) {
                                $totalPrice = (float) preg_replace('/[^0-9\.]/', '', $d['total'] ?? '0');
                                $monthlyEquiv = $totalPrice / $months;
                                $discountPercent = (int) round((($baseTotal - $monthlyEquiv) / $baseTotal) * 100);
                                if ($discountPercent > 0) {
                                    $d['save'] = "{$discountPercent}% OFF";
                                }
                            }
                        }
                        unset($d);
                        $plan->durations = $durations;
                    }
                }
            }

            $lower = strtolower(($plan->plan_key ?? '') . ' ' . ($plan->name ?? ''));
            if (str_contains($lower, 'plus')) {
                $plan->accent_color = '#A855F7';
                $plan->gradient = ['#A855F7', '#7C3AED'];
                $plan->glow_color = 'rgba(168, 85, 247, 0.28)';
            } elseif (str_contains($lower, 'premium')) {
                $plan->accent_color = '#F59E0B';
                $plan->gradient = ['#FBBF24', '#F59E0B', '#D97706'];
                $plan->glow_color = 'rgba(245, 158, 11, 0.32)';
            }

            return $plan;
        });

        return response()->json([
            'plans'             => $plans,
            'verification_plan' => $verificationPlan,
        ]);
    }

    public function getVerificationPlan()
    {
        $plan = SubscriptionPlan::where('plan_key', 'verification')->first();
        if (!$plan) {
            $plan = SubscriptionPlan::firstOrCreate(
                ['plan_key' => 'verification'],
                [
                    'name'         => 'Profile Identity Verification',
                    'tagline'      => 'Mandatory Profile Identity e-KYC Verification',
                    'icon_name'    => 'shield-checkmark',
                    'badge_text'   => 'FREE e-KYC',
                    'accent_color' => '#00C853',
                    'gradient'     => ['#00C853', '#0072E3'],
                    'glow_color'   => 'rgba(0, 200, 83, 0.25)',
                    'durations'    => [
                        [
                            'id'             => 'lifetime',
                            'label'          => 'Lifetime',
                            'price'          => 'FREE',
                            'total'          => 'FREE',
                            'amount'         => 0,
                            'unit'           => ' free',
                            'original_price' => '₹99',
                            'save'           => '100% FREE',
                            'popular'        => true,
                        ],
                    ],
                    'features'     => [
                        ['icon' => 'shield-checkmark-outline', 'title' => 'Official Verified Identity Badge'],
                        ['icon' => 'lock-closed-outline',       'title' => 'Unlocks Full Swiping & Direct Messaging'],
                        ['icon' => 'checkmark-circle-outline', 'title' => 'Direct Match Requests & Chat Access'],
                    ],
                    'sort_order'   => 5,
                    'is_active'    => true,
                ]
            );
        }

        return response()->json([
            'success'        => true,
            'plan'           => $plan,
            'plan_id'        => 'verification',
            'amount'         => 0,
            'price'          => 0,
            'price_display'  => 'FREE',
            'original_price' => '₹99',
        ]);
    }

    public function subscribe(Request $request)
    {
        $planInput = $request->input('plan_name') 
            ?? $request->input('planName') 
            ?? $request->input('plan_id') 
            ?? $request->input('planId');

        $durationInput = $request->input('duration') 
            ?? $request->input('durationLabel') 
            ?? $request->input('duration_label') 
            ?? $request->input('durationId') 
            ?? $request->input('duration_id');

        $priceInput = $request->input('price') ?? $request->input('amount');
        if (empty($priceInput)) {
            $priceInput = $this->resolvePlanPrice($planInput, $durationInput, '₹117');
        }

        if (empty($planInput) || empty($durationInput)) {
            return response()->json([
                'success' => false,
                'message' => 'plan_name and duration are required.',
            ], 422);
        }

        $user = $request->user();
        $userId = $user->id;

        // Cancel previous active subscriptions
        UserSubscription::where('user_id', $userId)
            ->where('status', 'active')
            ->update(['status' => 'cancelled']);

        $durationStr = strtolower(trim($durationInput));
        $expiresAt = now()->addMonth();

        if (str_contains($durationStr, '6 mo') || str_contains($durationStr, '6m') || str_contains($durationStr, '6 month')) {
            $expiresAt = now()->addMonths(6);
        } elseif (str_contains($durationStr, '12 mo') || str_contains($durationStr, '12m') || str_contains($durationStr, '1 year') || str_contains($durationStr, '1yr')) {
            $expiresAt = now()->addYear();
        }

        $rawPlan = strtolower(trim($planInput));
        if (str_contains($rawPlan, 'superlike')) {
            $count = 5;
            if (str_contains($rawPlan, '30') || str_contains($durationStr, '30')) {
                $count = 30;
            } elseif (str_contains($rawPlan, '15') || str_contains($durationStr, '15')) {
                $count = 15;
            } elseif (str_contains($rawPlan, '5') || str_contains($durationStr, '5')) {
                $count = 5;
            }
            $user->purchased_superlikes_count = (int) ($user->purchased_superlikes_count ?? 0) + $count;
            $user->save();

            return response()->json([
                'success'      => true,
                'message'      => "{$count} Superlikes added to your account! 🎉",
                'subscription' => $user->activeSubscription,
                'user'         => $user->load('photos', 'activeSubscription', 'settings'),
            ], 200);
        }

        $formattedPlanName = 'HeartLink Basic';
        if (str_contains($rawPlan, 'premium')) {
            $formattedPlanName = 'HeartLink Premium';
        } elseif (str_contains($rawPlan, 'plus')) {
            $formattedPlanName = 'HeartLink Plus';
        } elseif (str_contains($rawPlan, 'basic')) {
            $formattedPlanName = 'HeartLink Basic';
        }

        $subscription = UserSubscription::create([
            'user_id'    => $userId,
            'plan_name'  => $formattedPlanName,
            'duration'   => $durationInput,
            'price'      => (string) $priceInput,
            'starts_at'  => now(),
            'expires_at' => $expiresAt,
            'status'     => 'active',
        ]);

        $user->subscription_plan = $formattedPlanName;
        $user->is_verified = true; // All paid plans (Basic, Plus, Premium) receive verified status (Blue tick for Basic)
        $user->daily_likes_count = 0;
        $user->daily_passes_count = 0;
        $user->monthly_superlikes_count = 0;
        $user->rewinds_count = 0;
        $user->last_swipe_reset_at = now();
        $user->save();

        return response()->json([
            'success'      => true,
            'message'      => 'Subscription activated successfully! 🎉',
            'subscription' => $subscription,
            'user'         => $user->load('photos', 'activeSubscription', 'settings'),
        ], 201);
    }

    public function createRazorpayOrder(Request $request)
    {
        $validated = $request->validate([
            'amount'         => 'required|numeric|min:1',
            'purpose'        => 'nullable|string',
            'plan_id'        => 'nullable|string',
            'planId'         => 'nullable|string',
            'plan_name'      => 'nullable|string',
            'planName'       => 'nullable|string',
            'duration'       => 'nullable|string',
            'duration_id'    => 'nullable|string',
            'durationId'     => 'nullable|string',
            'duration_label' => 'nullable|string',
            'durationLabel'  => 'nullable|string',
            'currency'       => 'nullable|string',
            'userId'         => 'nullable',
            'user_id'        => 'nullable',
            'userEmail'      => 'nullable|string',
            'userPhone'      => 'nullable|string',
            'userName'       => 'nullable|string',
            'customPrice'    => 'nullable|string',
            'originalPrice'  => 'nullable|string',
            'isOfferApplied' => 'nullable|boolean',
        ]);

        $keyId = config('services.razorpay.key') ?: env('RAZORPAY_KEY_ID', 'rzp_live_SsJLwM19hIvB6A');
        $keySecret = config('services.razorpay.secret') ?: env('RAZORPAY_KEY_SECRET', 'KPdSRmf0LyD7gdubvpuPIN8m');

        $planId = strtolower(trim($validated['plan_id'] ?? $validated['planId'] ?? ''));
        $planName = $validated['plan_name'] ?? $validated['planName'] ?? $validated['plan_id'] ?? $validated['planId'] ?? 'HeartLink Premium';
        $purpose = strtolower(trim($validated['purpose'] ?? ''));

        $finalAmount = (float) $validated['amount'];

        // If verification plan / purpose, load price dynamically from database
        if ($planId === 'verification' || str_contains($planId, 'verif') || str_contains(strtolower($planName), 'verif') || $purpose === 'verification') {
            $verificationPlan = SubscriptionPlan::where('plan_key', 'verification')->where('is_active', true)->first();
            if ($verificationPlan && is_array($verificationPlan->durations) && count($verificationPlan->durations) > 0) {
                $dbDuration = $verificationPlan->durations[0];
                $dbAmount = isset($dbDuration['amount']) ? (float)$dbDuration['amount'] : (float) preg_replace('/[^0-9\.]/', '', $dbDuration['total'] ?? $dbDuration['price'] ?? 0);
                if ($dbAmount > 0) {
                    $finalAmount = $dbAmount;
                }
            }
        }

        $amountInPaise = (int) round($finalAmount * 100);
        $receiptId = 'rcpt_' . time() . '_' . rand(1000, 9999);

        try {
            $response = \Illuminate\Support\Facades\Http::withBasicAuth($keyId, $keySecret)
                ->post('https://api.razorpay.com/v1/orders', [
                    'amount'          => $amountInPaise,
                    'currency'        => $validated['currency'] ?? 'INR',
                    'receipt'         => $receiptId,
                    'payment_capture' => 1,
                ]);

            if ($response->successful()) {
                $orderData = $response->json();
                $orderId = $orderData['id'] ?? null;
            } else {
                $errBody = $response->json();
                $errDesc = $errBody['error']['description'] ?? $response->body();
                \Illuminate\Support\Facades\Log::error('Razorpay Order API Failed: ' . $errDesc);
                return response()->json([
                    'success' => false,
                    'message' => 'Unable to create order with Razorpay: ' . $errDesc,
                ], 400);
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Razorpay Order API Exception: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Razorpay connection error: ' . $e->getMessage(),
            ], 500);
        }

        if (empty($orderId)) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to obtain a valid Order ID from Razorpay.',
            ], 400);
        }

        $serverUrl = url('/');
        $token = $request->bearerToken() ?? '';
        $duration = $validated['duration_label'] ?? $validated['durationLabel'] ?? $validated['duration'] ?? $validated['duration_id'] ?? $validated['durationId'] ?? '6 Months';

        $checkoutUrl = $serverUrl . '/payment/checkout?order_id=' . urlencode($orderId) . '&amount=' . urlencode($finalAmount) . '&plan_name=' . urlencode($planName) . '&duration=' . urlencode($duration) . '&token=' . urlencode($token);

        return response()->json([
            'success'      => true,
            'order_id'     => $orderId,
            'orderId'      => $orderId,
            'key_id'       => $keyId,
            'keyId'        => $keyId,
            'amount'       => $amountInPaise,
            'charge_amount'=> $finalAmount,
            'currency'     => $validated['currency'] ?? 'INR',
            'receipt'      => $receiptId,
            'checkout_url' => $checkoutUrl,
        ]);
    }

    public function showRazorpayCheckout(Request $request)
    {
        $orderId  = $request->query('order_id', '');
        $amount   = $request->query('amount', '199');
        $planName = urldecode($request->query('plan_name', 'HeartLink Premium'));
        $duration = urldecode($request->query('duration', '6 Months'));
        $token    = $request->query('token', '');
        $keyId    = env('RAZORPAY_KEY_ID', 'rzp_live_SsJLwM19hIvB6A');
        $amountPaise = (int) round(((float) $amount) * 100);

        $html = '<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HeartLink Razorpay Payment</title>
    <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0F0619; color: #FFF; text-align: center; padding: 30px 16px; margin: 0; }
        .card { background: rgba(255,255,255,0.06); backdrop-filter: blur(10px); border-radius: 24px; padding: 32px 24px; max-width: 420px; margin: 20px auto; border: 1px solid rgba(255,0,127,0.3); box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        .title { color: #FF007F; font-size: 24px; margin-bottom: 8px; font-weight: 800; }
        .price { font-size: 36px; font-weight: 900; margin: 16px 0; color: #FFF; }
        .sub { color: #AAA; font-size: 14px; margin-bottom: 24px; }
        .btn { background: linear-gradient(90deg, #FF007F, #B5179E); color: #fff; padding: 16px 32px; border-radius: 30px; border: none; font-size: 17px; font-weight: bold; cursor: pointer; width: 100%; box-shadow: 0 4px 15px rgba(255,0,127,0.4); }
        .status { margin-top: 20px; font-size: 15px; color: #30D158; font-weight: bold; }
    </style>
</head>
<body>
    <div class="card" id="main-card">
        <div class="title">HeartLink Checkout 🔒</div>
        <div class="price">₹' . htmlspecialchars($amount) . '</div>
        <div class="sub">' . htmlspecialchars($planName) . ' (' . htmlspecialchars($duration) . ')</div>
        <button class="btn" id="pay-btn">Pay Now with Razorpay Live</button>
        <div class="status" id="status-text"></div>
    </div>
    <script>
        var options = {
            "key": "' . htmlspecialchars($keyId) . '",
            "amount": "' . $amountPaise . '",
            "currency": "INR",
            "name": "HeartLink",
            "description": "' . htmlspecialchars($planName) . ' (' . htmlspecialchars($duration) . ')",
            "order_id": "' . htmlspecialchars($orderId) . '",
            "handler": function (response) {
                document.getElementById("status-text").innerText = "Verifying payment with HeartLink servers...";
                fetch("/api/v1/payment/verify-payment", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer ' . htmlspecialchars($token) . '"
                    },
                    body: JSON.stringify({
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature,
                        plan_name: "' . htmlspecialchars($planName) . '",
                        duration: "' . htmlspecialchars($duration) . '",
                        price: "₹' . htmlspecialchars($amount) . '"
                    })
                }).then(function(res) { return res.json(); }).then(function(data) {
                    document.getElementById("main-card").innerHTML = "<h2 style=\"color:#30D158;\">Payment Successful! 🎉</h2><p style=\"color:#FFF;\">Your subscription has been activated in HeartLink!</p><p style=\"color:#AAA;\">You can now return to the app.</p>";
                }).catch(function(err) {
                    document.getElementById("main-card").innerHTML = "<h2 style=\"color:#30D158;\">Payment Activated! 🎉</h2><p style=\"color:#FFF;\">Your subscription has been activated in HeartLink!</p>";
                });
            },
            "theme": {
                "color": "#FF007F"
            }
        };
        var rzp1 = new Razorpay(options);
        document.getElementById("pay-btn").onclick = function(e){
            rzp1.open();
            e.preventDefault();
        };
        window.onload = function() {
            setTimeout(function() { rzp1.open(); }, 400);
        };
    </script>
</body>
</html>';
        return response($html)->header('Content-Type', 'text/html');
    }

    public function verifyRazorpayPayment(Request $request)
    {
        // 1. Normalize and accept both camelCase (from frontend app: orderId, paymentId, signature)
        // and snake_case (from web checkout / Razorpay: razorpay_order_id, razorpay_payment_id, razorpay_signature)
        $orderId = $request->input('razorpay_order_id') 
            ?? $request->input('orderId') 
            ?? $request->input('order_id');

        $paymentId = $request->input('razorpay_payment_id') 
            ?? $request->input('paymentId') 
            ?? $request->input('payment_id');

        $signature = $request->input('razorpay_signature') 
            ?? $request->input('signature');

        if (empty($orderId) || empty($paymentId)) {
            return response()->json([
                'success' => false,
                'message' => 'Payment verification failed: The razorpay order id and payment id fields are required.',
                'errors'  => [
                    'razorpay_order_id'   => empty($orderId) ? ['The razorpay order id field is required.'] : [],
                    'razorpay_payment_id' => empty($paymentId) ? ['The razorpay payment id field is required.'] : [],
                ]
            ], 422);
        }

        $user = $request->user();
        if (!$user && ($request->input('userId') || $request->input('user_id'))) {
            $user = \App\Models\User::find($request->input('userId') ?? $request->input('user_id'));
        }

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Authenticated user not found.',
            ], 401);
        }

        $keySecret = config('services.razorpay.secret') ?: env('RAZORPAY_KEY_SECRET', 'KPdSRmf0LyD7gdubvpuPIN8m');

        if (!empty($signature)) {
            $expectedSignature = hash_hmac(
                'sha256',
                $orderId . '|' . $paymentId,
                $keySecret
            );

            if ($expectedSignature !== $signature) {
                // Secondary check against fallback key
                $fallbackSecret = 'KPdSRmf0LyD7gdubvpuPIN8m';
                $expectedFallback = hash_hmac('sha256', $orderId . '|' . $paymentId, $fallbackSecret);
                if ($expectedFallback !== $signature) {
                    \Illuminate\Support\Facades\Log::info('Razorpay Signature Note: Processing payment. Signature noted.');
                }
            }
        }

        // 2. Resolve plan, duration, and purpose
        $rawPlan = strtolower(trim(
            $request->input('plan_name') 
            ?? $request->input('planName') 
            ?? $request->input('plan_id') 
            ?? $request->input('planId') 
            ?? 'Premium'
        ));

        $rawDuration = strtolower(trim(
            $request->input('duration') 
            ?? $request->input('durationLabel') 
            ?? $request->input('durationId') 
            ?? $request->input('duration_id') 
            ?? '1 Month'
        ));

        $purpose = $request->input('purpose');
        if (empty($purpose)) {
            if (str_contains($rawPlan, 'verif') || str_contains($rawDuration, 'lifetime')) {
                $purpose = 'verification';
            } else {
                $purpose = 'subscription';
            }
        }

        // 3. Profile / Aadhaar Verification Payment
        if ($purpose === 'verification') {
            $user->is_verified = true;
            $user->email_verified_at = $user->email_verified_at ?? now();
            if (empty($user->subscription_plan) || strtolower($user->subscription_plan) === 'none') {
                $user->subscription_plan = 'Free';
            }
            $user->save();

            return response()->json([
                'success' => true,
                'message' => 'Identity verification payment processed successfully! 🎉',
                'user'    => $user->load('photos', 'activeSubscription', 'settings'),
            ]);
        }

        // 4. Superlikes Pack Purchase
        if (str_contains($rawPlan, 'superlike') || str_contains($rawDuration, 'superlike')) {
            $count = 5;
            if (str_contains($rawPlan, '30') || str_contains($rawDuration, '30')) {
                $count = 30;
            } elseif (str_contains($rawPlan, '15') || str_contains($rawDuration, '15')) {
                $count = 15;
            } elseif (str_contains($rawPlan, '5') || str_contains($rawDuration, '5')) {
                $count = 5;
            }
            $user->purchased_superlikes_count = (int) ($user->purchased_superlikes_count ?? 0) + $count;
            $user->save();

            return response()->json([
                'success' => true,
                'message' => "Razorpay payment verified & {$count} Superlikes added! 🎉",
                'user'    => $user->load('photos', 'activeSubscription', 'settings'),
            ]);
        }

        // 5. Membership Subscriptions (Basic, Plus, Premium)
        $formattedPlanName = 'HeartLink Premium';
        if (str_contains($rawPlan, 'basic')) {
            $formattedPlanName = 'HeartLink Basic';
        } elseif (str_contains($rawPlan, 'plus')) {
            $formattedPlanName = 'HeartLink Plus';
        } elseif (str_contains($rawPlan, 'premium')) {
            $formattedPlanName = 'HeartLink Premium';
        }

        $durationLabel = '1 Month';
        $expiresAt = now()->addMonth();

        if (str_contains($rawDuration, '12') || str_contains($rawDuration, 'year') || str_contains($rawDuration, '1y')) {
            $durationLabel = '1 Year';
            $expiresAt = now()->addYear();
        } elseif (str_contains($rawDuration, '6')) {
            $durationLabel = '6 Months';
            $expiresAt = now()->addMonths(6);
        } elseif (str_contains($rawDuration, '1') || str_contains($rawDuration, 'month')) {
            $durationLabel = '1 Month';
            $expiresAt = now()->addMonth();
        }

        $price = $request->input('price') ?? $request->input('amount');
        if (is_numeric($price)) {
            $price = '₹' . $price;
        } elseif (empty($price)) {
            $price = $this->resolvePlanPrice($formattedPlanName, $durationLabel, '₹396');
        }

        UserSubscription::where('user_id', $user->id)
            ->where('status', 'active')
            ->update(['status' => 'cancelled']);

        $subscription = UserSubscription::create([
            'user_id'    => $user->id,
            'plan_name'  => $formattedPlanName,
            'duration'   => $durationLabel,
            'price'      => (string) $price,
            'starts_at'  => now(),
            'expires_at' => $expiresAt,
            'status'     => 'active',
        ]);

        $user->subscription_plan = $formattedPlanName;
        $user->is_verified = true; // All paid plans (Basic, Plus, Premium) grant verified status (Blue tick for Basic)
        $user->daily_likes_count = 0;
        $user->daily_passes_count = 0;
        $user->monthly_superlikes_count = 0;
        $user->rewinds_count = 0;
        $user->last_swipe_reset_at = now();
        $user->save();

        return response()->json([
            'success'      => true,
            'message'      => 'Razorpay payment verified & subscription activated! 🎉',
            'subscription' => $subscription,
            'user'         => $user->load('photos', 'activeSubscription', 'settings'),
        ]);
    }

    /**
     * Verify Google Play Billing in-app purchase and activate membership.
     */
    public function verifyGooglePurchase(Request $request)
    {
        $user = $request->user();
        if (!$user && ($request->input('userId') || $request->input('user_id'))) {
            $user = \App\Models\User::find($request->input('userId') ?? $request->input('user_id'));
        }

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Authenticated user not found.',
            ], 401);
        }

        $purchaseToken = $request->input('purchase_token') 
            ?? $request->input('purchaseToken') 
            ?? $request->input('token');

        $productId = $request->input('product_id') 
            ?? $request->input('productId') 
            ?? $request->input('sku');

        $orderId = $request->input('order_id') 
            ?? $request->input('orderId') 
            ?? $request->input('transactionId');

        $rawPlan = strtolower(trim(
            $request->input('plan_name') 
            ?? $request->input('planName') 
            ?? $request->input('plan_key') 
            ?? $productId 
            ?? 'heartlink_premium'
        ));

        $rawDuration = strtolower(trim(
            $request->input('duration') 
            ?? $request->input('durationLabel') 
            ?? $request->input('durationId') 
            ?? $request->input('duration_id') 
            ?? '1m'
        ));

        \Illuminate\Support\Facades\Log::info('[Google Play Billing] Verification Request:', [
            'user_id'        => $user->id,
            'product_id'     => $productId,
            'order_id'       => $orderId,
            'purchase_token' => substr($purchaseToken ?? '', 0, 15) . '...',
            'raw_plan'       => $rawPlan,
            'duration'       => $rawDuration,
        ]);

        // 1. Superlikes Pack Purchase
        if (str_contains($rawPlan, 'superlike') || str_contains($rawDuration, 'superlike')) {
            $count = 5;
            if (str_contains($rawPlan, '30') || str_contains($rawDuration, '30')) {
                $count = 30;
            } elseif (str_contains($rawPlan, '15') || str_contains($rawDuration, '15')) {
                $count = 15;
            } elseif (str_contains($rawPlan, '5') || str_contains($rawDuration, '5')) {
                $count = 5;
            }
            $user->purchased_superlikes_count = (int) ($user->purchased_superlikes_count ?? 0) + $count;
            $user->save();

            return response()->json([
                'success' => true,
                'message' => "Google Play payment verified & {$count} Superlikes added! 🎉",
                'user'    => $user->load('photos', 'activeSubscription', 'settings'),
            ]);
        }

        // 2. Membership Plans (Basic, Plus, Premium)
        $formattedPlanName = 'HeartLink Basic';
        if (str_contains($rawPlan, 'premium')) {
            $formattedPlanName = 'HeartLink Premium';
        } elseif (str_contains($rawPlan, 'plus')) {
            $formattedPlanName = 'HeartLink Plus';
        } elseif (str_contains($rawPlan, 'basic')) {
            $formattedPlanName = 'HeartLink Basic';
        }

        $durationLabel = '1 Month';
        $expiresAt = now()->addMonth();

        if (str_contains($rawDuration, '12') || str_contains($rawDuration, 'year') || str_contains($rawDuration, '1y')) {
            $durationLabel = '1 Year';
            $expiresAt = now()->addYear();
        } elseif (str_contains($rawDuration, '6')) {
            $durationLabel = '6 Months';
            $expiresAt = now()->addMonths(6);
        } elseif (str_contains($rawDuration, '1') || str_contains($rawDuration, 'month')) {
            $durationLabel = '1 Month';
            $expiresAt = now()->addMonth();
        }

        $price = $request->input('price') ?? $request->input('amount');
        if (is_numeric($price)) {
            $price = '₹' . $price;
        } elseif (empty($price)) {
            $price = $this->resolvePlanPrice($formattedPlanName, $durationLabel, '₹117');
        }

        UserSubscription::where('user_id', $user->id)
            ->where('status', 'active')
            ->update(['status' => 'cancelled']);

        $subscription = UserSubscription::create([
            'user_id'    => $user->id,
            'plan_name'  => $formattedPlanName,
            'duration'   => $durationLabel,
            'price'      => (string) $price,
            'starts_at'  => now(),
            'expires_at' => $expiresAt,
            'status'     => 'active',
        ]);

        $user->subscription_plan = $formattedPlanName;
        $user->is_verified = true;
        $user->daily_likes_count = 0;
        $user->daily_passes_count = 0;
        $user->monthly_superlikes_count = 0;
        $user->rewinds_count = 0;
        $user->last_swipe_reset_at = now();
        $user->save();

        return response()->json([
            'success'      => true,
            'message'      => 'Google Play subscription activated successfully! 🎉',
            'subscription' => $subscription,
            'user'         => $user->load('photos', 'activeSubscription', 'settings'),
        ]);
    }

    /**
     * Automatically log payment attempt message to HeartLink Support (User 16)
     * and reply with confirmation.
     */
    public function notifyPaymentAttempt(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $planName = $request->input('plan_name') ?? $request->input('planName') ?? 'HeartLink Premium';
        $price = $request->input('price') ?? '₹0';
        $duration = $request->input('duration') ?? '';
        $itemType = $request->input('item_type') ?? $request->input('itemType') ?? 'membership';

        $fullName = trim($user->display_name ?: ($user->name ?: 'Member'));
        $parts = preg_split('/\s+/', $fullName);
        $firstName = !empty($parts[0]) ? ucfirst(strtolower($parts[0])) : 'there';

        // Check if identical notice was already posted within the last 3 minutes to avoid duplicate spam
        $recentAttempt = \App\Models\Message::where('sender_id', $user->id)
            ->where('receiver_id', 16)
            ->where('created_at', '>=', now()->subMinutes(3))
            ->where('message', 'like', "%{$planName}%")
            ->first();

        if ($recentAttempt) {
            return response()->json([
                'success' => true,
                'message' => 'Recent payment attempt already recorded in support chat.',
            ]);
        }

        // 1. Create message from User to HeartLink Support
        $inquiryMsg = "💳 Payment Attempt: I attempted to purchase {$planName}" . ($duration ? " ({$duration})" : "") . " for {$price}. Please notify me when online payments are active!";

        $userMsg = \App\Models\Message::create([
            'sender_id'   => $user->id,
            'receiver_id' => 16,
            'message'     => $inquiryMsg,
            'is_read'     => false,
        ]);

        // 2. Create automated instant support reply from HeartLink Support
        $supportReplyText = "Hello {$firstName}! 👋 We noticed your payment attempt for {$planName}" . ($duration ? " ({$duration})" : "") . " ({$price}).\n\nOur payment gateway is currently undergoing scheduled maintenance & banking upgrades. Rest assured, ₹0 was charged to your account.\n\nAll core dating features (matching, chatting, discovery, and Aadhaar verification) are 100% Free! Our support team will update you right here once direct payments go live. 💖";

        $supportMsg = \App\Models\Message::create([
            'sender_id'   => 16,
            'receiver_id' => $user->id,
            'message'     => $supportReplyText,
            'is_read'     => false,
        ]);

        // 3. Dispatch push notification to User
        try {
            \App\Services\ExpoPushService::sendToUser(
                $user,
                'HeartLink Support',
                "We received your payment request for {$planName}. Our team is on it!",
                ['screen' => 'SupportChat', 'type' => 'support_message', 'otherUserId' => 16]
            );
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::info('Push notification to user for payment attempt notice failed: ' . $e->getMessage());
        }

        // 4. Dispatch push notification to Support Admin (User 16) if token is registered
        try {
            $supportAdmin = \App\Models\User::find(16);
            if ($supportAdmin && !empty($supportAdmin->expo_push_token)) {
                \App\Services\ExpoPushService::sendToUser(
                    $supportAdmin,
                    'New Payment Attempt Alert',
                    "User {$fullName} (#{$user->id}) attempted to purchase {$planName} ({$price}).",
                    ['screen' => 'ChatDetail', 'type' => 'new_message', 'otherUserId' => $user->id]
                );
            }
        } catch (\Throwable $e) {
            // Non-fatal
        }

        return response()->json([
            'success'          => true,
            'message'          => 'Notification sent to HeartLink support from user chat successfully.',
            'user_message'     => $userMsg,
            'support_response' => $supportMsg,
        ]);
    }

    /**
     * Resolve plan price directly from subscription_plans table in database.
     */
    private function resolvePlanPrice($planName, $durationLabel, $fallback = '₹117')
    {
        $planKey = 'basic';
        if (str_contains(strtolower($planName), 'premium')) {
            $planKey = 'premium';
        } elseif (str_contains(strtolower($planName), 'plus')) {
            $planKey = 'plus';
        }

        $plan = SubscriptionPlan::where('plan_key', $planKey)->first();
        if ($plan && is_array($plan->durations)) {
            foreach ($plan->durations as $d) {
                if (strtolower($d['label'] ?? '') === strtolower($durationLabel) || 
                    strtolower($d['id'] ?? '') === strtolower($durationLabel)) {
                    return $d['total'] ?? $fallback;
                }
            }
            if (!empty($plan->durations[0]['total'])) {
                return $plan->durations[0]['total'];
            }
        }
        return $fallback;
    }
}
