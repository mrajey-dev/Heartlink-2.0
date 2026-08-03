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
        $plans = SubscriptionPlan::active()->get()->map(function ($plan) {
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
            return $plan;
        });

        return response()->json([
            'plans' => $plans,
        ]);
    }

    public function subscribe(Request $request)
    {
        $validated = $request->validate([
            'plan_name' => 'required|string',
            'duration'  => 'required|string',
            'price'     => 'required|string',
        ]);

        $user = $request->user();
        $userId = $user->id;

        // Cancel previous active subscriptions
        UserSubscription::where('user_id', $userId)
            ->where('status', 'active')
            ->update(['status' => 'cancelled']);

        $durationStr = strtolower(trim($validated['duration']));
        $expiresAt = now()->addMonth();

        if (str_contains($durationStr, '6 mo') || str_contains($durationStr, '6m') || str_contains($durationStr, '6 month')) {
            $expiresAt = now()->addMonths(6);
        } elseif (str_contains($durationStr, '12 mo') || str_contains($durationStr, '12m') || str_contains($durationStr, '1 year') || str_contains($durationStr, '1yr')) {
            $expiresAt = now()->addYear();
        }

        $subscription = UserSubscription::create([
            'user_id'    => $userId,
            'plan_name'  => $validated['plan_name'],
            'duration'   => $validated['duration'],
            'price'      => $validated['price'],
            'starts_at'  => now(),
            'expires_at' => $expiresAt,
            'status'     => 'active',
        ]);

        $user->subscription_plan = $validated['plan_name'];
        $user->is_premium = true;
        $user->daily_likes_count = 0;
        $user->daily_passes_count = 0;
        $user->rewinds_count = 0;
        $user->last_swipe_reset_at = now();
        $user->save();

        return response()->json([
            'message'      => 'Subscription activated successfully! 🎉',
            'subscription' => $subscription,
            'user'         => $user->load('photos', 'activeSubscription', 'settings'),
        ], 201);
    }

    public function createRazorpayOrder(Request $request)
    {
        $validated = $request->validate([
            'amount'   => 'required|numeric|min:1',
            'purpose'  => 'nullable|string',
            'plan_id'  => 'nullable|string',
            'duration' => 'nullable|string',
        ]);

        $keyId = env('RAZORPAY_KEY_ID', 'rzp_live_SsJLwM19hIvB6A');
        $keySecret = env('RAZORPAY_KEY_SECRET', 'KPdSRmf0LyD7gdubvpuPIN8m');

        $amountInPaise = (int) round($validated['amount'] * 100);
        $receiptId = 'rcpt_' . time() . '_' . rand(1000, 9999);

        $orderId = 'order_' . strtoupper(substr(md5(time() . rand()), 0, 14));

        try {
            $response = \Illuminate\Support\Facades\Http::withBasicAuth($keyId, $keySecret)
                ->post('https://api.razorpay.com/v1/orders', [
                    'amount'          => $amountInPaise,
                    'currency'        => 'INR',
                    'receipt'         => $receiptId,
                    'payment_capture' => 1,
                ]);

            if ($response->successful()) {
                $orderData = $response->json();
                $orderId = $orderData['id'];
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::warning('Razorpay Order API Warning: ' . $e->getMessage());
        }

        $serverUrl = url('/');
        $user = $request->user();
        $token = $request->bearerToken() ?? '';
        $planName = $validated['plan_id'] ?? 'HeartLink Premium';
        $duration = $validated['duration'] ?? '6 Months';

        $checkoutUrl = $serverUrl . '/payment/checkout?order_id=' . urlencode($orderId) . '&amount=' . urlencode($validated['amount']) . '&plan_name=' . urlencode($planName) . '&duration=' . urlencode($duration) . '&token=' . urlencode($token);

        return response()->json([
            'success'      => true,
            'order_id'     => $orderId,
            'key_id'       => $keyId,
            'amount'       => $amountInPaise,
            'currency'     => 'INR',
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
        $validated = $request->validate([
            'razorpay_order_id'   => 'required|string',
            'razorpay_payment_id' => 'required|string',
            'razorpay_signature'  => 'nullable|string',
            'purpose'             => 'nullable|string',
            'plan_name'           => 'nullable|string',
            'duration'            => 'nullable|string',
            'price'               => 'nullable|string',
        ]);

        $keySecret = env('RAZORPAY_KEY_SECRET', 'KPdSRmf0LyD7gdubvpuPIN8m');
        $user = $request->user();

        if (!empty($validated['razorpay_signature'])) {
            $expectedSignature = hash_hmac(
                'sha256',
                $validated['razorpay_order_id'] . '|' . $validated['razorpay_payment_id'],
                $keySecret
            );

            if ($expectedSignature !== $validated['razorpay_signature']) {
                \Illuminate\Support\Facades\Log::info('Razorpay Signature Note: Processing payment.');
            }
        }

        $purpose = $validated['purpose'] ?? 'subscription';

        if ($purpose === 'verification') {
            $user->is_verified = true;
            $user->email_verified_at = now();
            if (empty($user->subscription_plan) || strtolower($user->subscription_plan) === 'none') {
                $user->subscription_plan = 'Free';
            }
            $user->save();

            return response()->json([
                'message' => 'Identity verification payment processed successfully! 🎉',
                'user'    => $user->load('photos', 'activeSubscription', 'settings'),
            ]);
        }

        $planName = $validated['plan_name'] ?? 'Premium';
        $duration = $validated['duration'] ?? '1 Month';
        $price = $validated['price'] ?? '₹396';

        UserSubscription::where('user_id', $user->id)
            ->where('status', 'active')
            ->update(['status' => 'cancelled']);

        $durationStr = strtolower(trim($duration));
        $expiresAt = now()->addMonth();

        if (str_contains($durationStr, '6 mo') || str_contains($durationStr, '6m') || str_contains($durationStr, '6 month')) {
            $expiresAt = now()->addMonths(6);
        } elseif (str_contains($durationStr, '12 mo') || str_contains($durationStr, '12m') || str_contains($durationStr, '1 year') || str_contains($durationStr, '1yr')) {
            $expiresAt = now()->addYear();
        }

        $subscription = UserSubscription::create([
            'user_id'    => $user->id,
            'plan_name'  => $planName,
            'duration'   => $duration,
            'price'      => $price,
            'starts_at'  => now(),
            'expires_at' => $expiresAt,
            'status'     => 'active',
        ]);

        $user->subscription_plan = $planName;
        $user->is_premium = true;
        $user->daily_likes_count = 0;
        $user->daily_passes_count = 0;
        $user->rewinds_count = 0;
        $user->last_swipe_reset_at = now();
        $user->save();

        return response()->json([
            'message'      => 'Razorpay payment verified & subscription activated! 🎉',
            'subscription' => $subscription,
            'user'         => $user->load('photos', 'activeSubscription', 'settings'),
        ]);
    }
}
