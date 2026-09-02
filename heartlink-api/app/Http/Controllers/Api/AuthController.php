<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\ProfilePhoto;
use App\Models\AadhaarVerification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function forgotPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email|exists:users,email',
        ], [
            'email.exists' => 'No account found with this email address.',
        ]);
        $token = Str::random(60);
        // Save token to database
        DB::table('password_resets')->updateOrInsert(
            ['email' => $request->email],
            ['token' => $token, 'created_at' => now()]
        );
        // Reset URL
        $resetUrl = "https://support.ajaywatpade.in/reset-password?token=" . $token . "&email=" . urlencode($request->email);
        // Send styled HTML email
        Mail::send('emails.forgot_password', ['resetUrl' => $resetUrl], function($message) use ($request) {
            $message->to($request->email);
            $message->subject('💖 HeartLink - Password Reset Request');
        });
        return response()->json([
            'status' => 'success',
            'message' => 'Password reset link sent to your email address.'
        ], 200);
    }

    public function register(Request $request)
    {
        $validated = $request->validate([
            'name'              => 'required|string|max:25',
            'email'             => 'required|string|email|max:255|unique:users',
            'phone'             => 'nullable|string',
            'phone_number'      => 'nullable|string',
            'password'          => 'required|string|min:6',
            'display_name'      => 'nullable|string|max:25',
            'country_code'      => 'nullable|string',
            'mother_tongue'     => 'nullable|string',
            'languages_spoken'   => 'nullable|array',
            'religion'          => 'nullable|string',
            'marital_status'    => 'nullable|string',
            'education'         => 'nullable|string',
            'occupation'        => 'nullable|string',
            'diet'              => 'nullable|string',
            'zodiac_sign'       => 'nullable|string',
            'drinking'          => 'nullable|string',
            'smoking'           => 'nullable|string',
            'clubbing'          => 'nullable|string',
            'exercise'          => 'nullable|string',
            'pincode'           => 'nullable|string',
            'video_intro_url'   => 'nullable|string',
            'age'               => 'nullable|integer',
            'dob'               => 'nullable|date',
            'gender'            => 'nullable|string',
            'bio'               => 'nullable|string',
            'job'               => 'nullable|string',
            'avatar'            => 'nullable|string',
            'city'              => 'nullable|string',
            'state'             => 'nullable|string',
            'country'           => 'nullable|string',
            'relationship_type' => 'nullable|string',
            'interests'         => 'nullable|array',
            'photos'            => 'nullable|array',
        ]);

        $rawGender = $validated['gender'] ?? null;
        $normalizedGender = null;
        if ($rawGender) {
            $g = strtolower(trim($rawGender));
            $normalizedGender = in_array($g, ['male', 'man', 'm']) ? 'Male' : (in_array($g, ['female', 'woman', 'f']) ? 'Female' : ucfirst($g));
        }

        $userFolderSlug = \Illuminate\Support\Str::slug(explode('@', $validated['email'])[0]);
        $avatarUrl = isset($validated['avatar']) ? $this->processImageInput($validated['avatar'], $userFolderSlug) : null;

        $user = User::create([
            'name'              => $validated['name'],
            'display_name'      => $validated['display_name'] ?? null,
            'email'             => $validated['email'],
            'phone'             => $request->phone ?? $request->phone_number ?? null,
            'phone_number'      => $request->phone_number ?? $request->phone ?? null,
            'country_code'      => $validated['country_code'] ?? null,
            'password'          => Hash::make($validated['password']),
            'age'               => $validated['age'] ?? null,
            'dob'               => $validated['dob'] ?? null,
            'gender'            => $normalizedGender,
            'bio'               => $validated['bio'] ?? null,
            'job'               => $validated['job'] ?? null,
            'avatar'            => $avatarUrl,
            'video_intro_url'   => $validated['video_intro_url'] ?? null,
            'city'              => $validated['city'] ?? null,
            'state'             => $validated['state'] ?? null,
            'country'           => $validated['country'] ?? null,
            'pincode'           => $validated['pincode'] ?? null,
            'mother_tongue'     => $validated['mother_tongue'] ?? null,
            'languages_spoken'   => $validated['languages_spoken'] ?? [],
            'religion'          => $validated['religion'] ?? null,
            'marital_status'    => $validated['marital_status'] ?? null,
            'education'         => $validated['education'] ?? null,
            'occupation'        => $validated['occupation'] ?? null,
            'diet'              => $validated['diet'] ?? null,
            'zodiac_sign'       => $validated['zodiac_sign'] ?? null,
            'drinking'          => $validated['drinking'] ?? null,
            'smoking'           => $validated['smoking'] ?? null,
            'clubbing'          => $validated['clubbing'] ?? null,
            'exercise'          => $validated['exercise'] ?? null,
            'relationship_type' => $validated['relationship_type'] ?? null,
            'interests'         => $validated['interests'] ?? [],
        ]);

        if (!empty($validated['photos'])) {
            $photoIdx = 0;
            foreach ($validated['photos'] as $photoInput) {
                $processedUrl = $this->processImageInput($photoInput, 'user_' . $user->id);
                if ($processedUrl) {
                    ProfilePhoto::create([
                        'user_id'    => $user->id,
                        'photo_url'  => $processedUrl,
                        'is_primary' => $photoIdx === 0,
                        'sort_order' => $photoIdx,
                    ]);
                    $photoIdx++;
                }
            }
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message'      => 'User registered successfully',
            'access_token' => $token,
            'token_type'   => 'Bearer',
            'user'         => $user->load('photos'),
        ], 201);
    }

    public function login(Request $request)
    {
        $validated = $request->validate([
            'email'    => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (!$user || !Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Invalid login credentials.'],
            ]);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message'      => 'Login successful',
            'access_token' => $token,
            'token_type'   => 'Bearer',
            'user'         => $user->load('photos', 'activeSubscription', 'settings'),
        ]);
    }

    public function profile(Request $request)
    {
        $user = $request->user();
        $activeSub = \App\Models\UserSubscription::where('user_id', $user->id)
            ->where('status', 'active')
            ->where('expires_at', '>', now())
            ->first();

        if (!$activeSub && $user->subscription_plan !== null) {
            $user->subscription_plan = null;
            $user->save();
        } elseif ($activeSub && $user->subscription_plan !== $activeSub->plan_name) {
            $user->subscription_plan = $activeSub->plan_name;
            $user->save();
        }

        return response()->json([
            'user' => $user->load('photos', 'activeSubscription', 'settings'),
        ]);
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name'              => 'sometimes|string|max:25',
            'age'               => 'sometimes|nullable|integer',
            'gender'            => 'sometimes|nullable|string',
            'display_name'      => 'sometimes|nullable|string|max:25',
            'country_code'      => 'sometimes|nullable|string',
            'mother_tongue'     => 'sometimes|nullable|string',
            'languages_spoken'   => 'sometimes|nullable|array',
            'religion'          => 'sometimes|nullable|string',
            'marital_status'    => 'sometimes|nullable|string',
            'education'         => 'sometimes|nullable|string',
            'occupation'        => 'sometimes|nullable|string',
            'diet'              => 'sometimes|nullable|string',
            'zodiac_sign'       => 'sometimes|nullable|string',
            'drinking'          => 'sometimes|nullable|string',
            'smoking'           => 'sometimes|nullable|string',
            'clubbing'          => 'sometimes|nullable|string',
            'exercise'          => 'sometimes|nullable|string',
            'pincode'           => 'sometimes|nullable|string',
            'video_intro_url'   => 'sometimes|nullable|string',
            'bio'               => 'sometimes|nullable|string',
            'vibe'              => 'sometimes|nullable|string',
            'job'               => 'sometimes|nullable|string',
            'avatar'            => 'sometimes|nullable|string',
            'city'              => 'sometimes|nullable|string',
            'state'             => 'sometimes|nullable|string',
            'country'           => 'sometimes|nullable|string',
            'relationship_type' => 'sometimes|nullable|string',
            'age_min'           => 'sometimes|integer',
            'age_max'           => 'sometimes|integer',
            'interests'         => 'sometimes|nullable|array',
            'photos'            => 'sometimes|nullable|array',
            'is_screenshot_allowed' => 'sometimes|boolean',
        ]);

        if ($user->is_verified) {
            unset($validated['name'], $validated['dob'], $validated['age'], $validated['gender']);
        }

        if (isset($validated['gender']) && !empty($validated['gender'])) {
            $g = strtolower(trim($validated['gender']));
            $validated['gender'] = in_array($g, ['male', 'man', 'm']) ? 'Male' : (in_array($g, ['female', 'woman', 'f']) ? 'Female' : ucfirst($g));
        }

        if (isset($validated['avatar'])) {
            $validated['avatar'] = $this->processImageInput($validated['avatar'], 'user_' . $user->id);
        }

        $user->update($validated);

        if ($request->has('avatar') && !empty($request->avatar)) {
            $avatarUrl = $this->processImageInput($request->avatar, 'user_' . $user->id);
            if ($avatarUrl) {
                $photoExists = ProfilePhoto::where('user_id', $user->id)
                    ->where('photo_url', $avatarUrl)
                    ->exists();

                if (!$photoExists) {
                    ProfilePhoto::where('user_id', $user->id)->update(['is_primary' => false]);
                    ProfilePhoto::create([
                        'user_id'    => $user->id,
                        'photo_url'  => $avatarUrl,
                        'is_primary' => true,
                        'sort_order' => 0,
                    ]);
                }
            }
        }

        if ($request->has('photos') && is_array($request->photos)) {
            $processedPhotos = [];
            foreach ($request->photos as $p) {
                $rawUrl = is_string($p) ? $p : ($p['photo_url'] ?? $p['uri'] ?? null);
                $cleanedUrl = $this->processImageInput($rawUrl, 'user_' . $user->id);
                if ($cleanedUrl) {
                    $processedPhotos[] = $cleanedUrl;
                }
            }

            // Find existing photos in database to unlink removed files from public/uploads
            $existingPhotoUrls = ProfilePhoto::where('user_id', $user->id)->pluck('photo_url')->toArray();
            $removedPhotoUrls = array_diff($existingPhotoUrls, $processedPhotos);
            foreach ($removedPhotoUrls as $removedUrl) {
                $path = parse_url($removedUrl, PHP_URL_PATH);
                if ($path) {
                    $relativePath = ltrim($path, '/');
                    $fullPath = public_path($relativePath);
                    $uploadsDir = public_path('uploads');
                    if (str_starts_with(realpath($fullPath) ?: $fullPath, realpath($uploadsDir) ?: $uploadsDir)) {
                        if (file_exists($fullPath)) {
                            @unlink($fullPath);
                        }
                    }
                }
            }

            if (count($processedPhotos) > 0) {
                ProfilePhoto::where('user_id', $user->id)->delete();
                $idx = 0;
                foreach ($processedPhotos as $photoUrl) {
                    ProfilePhoto::create([
                        'user_id'    => $user->id,
                        'photo_url'  => $photoUrl,
                        'is_primary' => $idx === 0,
                        'sort_order' => $idx,
                    ]);
                    $idx++;
                }
            }
        }

        return response()->json([
            'message' => 'Profile updated successfully',
            'user'    => $user->load('photos', 'activeSubscription', 'settings'),
        ]);
    }

public function savePushToken(Request $request)
    {
        $request->validate([
            'push_token' => 'required|string',
        ]);

        $user = $request->user();
        $user->expo_push_token = trim($request->input('push_token'));
        $user->save();

        \Illuminate\Support\Facades\Log::info("[PushToken] Saved push token for user {$user->id}: {$user->expo_push_token}");

        return response()->json([
            'message' => 'Push token saved successfully',
            'push_token' => $user->expo_push_token,
        ]);
    }

    private function processImageInput($imageInput, $folderIdentifier = 'guest')
    {
        try {
            if (empty($imageInput) || !is_string($imageInput)) {
                return null;
            }

            // Ignore native un-uploaded local device paths
            if (str_starts_with($imageInput, 'file://') || str_starts_with($imageInput, 'content://')) {
                return null;
            }

            // If already an HTTP / HTTPS URL, return as-is
            if (str_starts_with($imageInput, 'http://') || str_starts_with($imageInput, 'https://')) {
                return $imageInput;
            }

            // If it's a Base64 string, decode & save to server disk and return file URL
            if (str_starts_with($imageInput, 'data:image') || str_contains($imageInput, ';base64,')) {
                $folderStr = (string) $folderIdentifier;
                $folderName = str_starts_with($folderStr, 'user_') ? $folderStr : 'user_' . $folderStr;
                $uploadPath = public_path('uploads/' . $folderName);
                if (!file_exists($uploadPath)) {
                    @mkdir($uploadPath, 0777, true);
                }

                $raw = trim($imageInput);
                $ext = 'jpg';
                if (preg_match('/^data:image\/([a-zA-Z0-9\+\-]+);base64,/', $raw, $type)) {
                    $raw = substr($raw, strpos($raw, ',') + 1);
                    $ext = strtolower($type[1]);
                    if ($ext === 'jpeg') $ext = 'jpg';
                } elseif (str_contains($raw, ',')) {
                    $raw = substr($raw, strpos($raw, ',') + 1);
                }

                $cleanData = preg_replace('/\s+/', '', $raw);
                $data = base64_decode($cleanData);
                if ($data !== false && strlen($data) > 0) {
                    $filename = time() . '_' . \Illuminate\Support\Str::random(10) . '.' . $ext;
                    $savedFilePath = $uploadPath . '/' . $filename;
                    @file_put_contents($savedFilePath, $data);

                    $baseUrl = request() ? request()->schemeAndHttpHost() : url('/');
                    return rtrim($baseUrl, '/') . '/uploads/' . $folderName . '/' . $filename;
                }
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('processImageInput error: ' . $e->getMessage());
        }

        return null;
    }

    public function uploadImage(Request $request)
    {
        try {
            $imageUrl = null;

            // Determine specific user folder name safely
            $user = null;
            try {
                $user = $request->user('sanctum') ?? $request->user();
            } catch (\Throwable $e) {
                $user = null;
            }

            if ($user && isset($user->id)) {
                $folderName = 'user_' . $user->id;
            } elseif ($request->has('user_id') && !empty($request->input('user_id'))) {
                $folderName = 'user_' . preg_replace('/[^a-zA-Z0-9_-]/', '', (string)$request->input('user_id'));
            } elseif ($request->has('email') && !empty($request->input('email'))) {
                $folderName = 'user_' . \Illuminate\Support\Str::slug(explode('@', (string)$request->input('email'))[0]);
            } else {
                $folderName = 'user_guest';
            }

            $uploadPath = public_path('uploads/' . $folderName);
            if (!file_exists($uploadPath)) {
                @mkdir($uploadPath, 0777, true);
            }

            if ($request->hasFile('image')) {
                $file = $request->file('image');
                $extension = strtolower($file->getClientOriginalExtension() ?: 'jpg');
                if (!in_array($extension, ['jpeg', 'jpg', 'png', 'webp', 'heic'])) {
                    $extension = 'jpg';
                }
                if ($extension === 'jpeg') $extension = 'jpg';
                $filename = time() . '_' . \Illuminate\Support\Str::random(10) . '.' . $extension;
                $file->move($uploadPath, $filename);

                $imageUrl = $request->schemeAndHttpHost() . '/uploads/' . $folderName . '/' . $filename;
            } elseif ($request->has('image') && is_string($request->input('image'))) {
                $raw = trim($request->input('image'));
                $ext = 'jpg';

                if (preg_match('/^data:image\/([a-zA-Z0-9\+\-]+);base64,/', $raw, $type)) {
                    $raw = substr($raw, strpos($raw, ',') + 1);
                    $ext = strtolower($type[1]);
                    if ($ext === 'jpeg') $ext = 'jpg';
                } elseif (str_contains($raw, ',')) {
                    $raw = substr($raw, strpos($raw, ',') + 1);
                }

                $cleanData = preg_replace('/\s+/', '', $raw);
                $data = base64_decode($cleanData);
                if ($data !== false && strlen($data) > 0) {
                    $filename = time() . '_' . \Illuminate\Support\Str::random(10) . '.' . $ext;
                    $savedFilePath = $uploadPath . '/' . $filename;
                    @file_put_contents($savedFilePath, $data);

                    $imageUrl = $request->schemeAndHttpHost() . '/uploads/' . $folderName . '/' . $filename;
                }
            }

            if (!$imageUrl) {
                return response()->json(['message' => 'No image file provided'], 422);
            }

            return response()->json([
                'message' => 'Image uploaded successfully',
                'url'     => $imageUrl,
                'folder'  => $folderName,
            ]);
        } catch (\Throwable $err) {
            \Illuminate\Support\Facades\Log::error('uploadImage controller error: ' . $err->getMessage());
            return response()->json([
                'message' => 'Failed to upload image: ' . $err->getMessage(),
            ], 500);
        }
    }

    private function checkIsNsfwImage(string $filePath): bool
    {
        return false;
    }

    public function deleteImage(Request $request)
    {
        $validated = $request->validate([
            'image_url' => 'required|string',
        ]);

        $imageUrl = $validated['image_url'];
        $user = $request->user('sanctum') ?? auth('sanctum')->user() ?? $request->user();

        // 1. Physically remove image file from public/uploads folder on server disk
        $path = parse_url($imageUrl, PHP_URL_PATH);
        if ($path) {
            $relativePath = ltrim($path, '/');
            $fullPath = public_path($relativePath);
            $uploadsDir = public_path('uploads');

            $realFullPath = realpath($fullPath) ?: $fullPath;
            $realUploadsDir = realpath($uploadsDir) ?: $uploadsDir;

            if (str_starts_with($realFullPath, $realUploadsDir)) {
                if (file_exists($fullPath)) {
                    @unlink($fullPath);
                }
            }
        }

        // 2. Remove profile_photo database entry for this user
        if ($user) {
            ProfilePhoto::where('user_id', $user->id)
                ->where('photo_url', $imageUrl)
                ->delete();

            if ($user->avatar === $imageUrl) {
                $nextPhoto = ProfilePhoto::where('user_id', $user->id)->orderBy('sort_order', 'asc')->first();
                $user->avatar = $nextPhoto ? $nextPhoto->photo_url : null;
                $user->save();
            }
        }

        return response()->json([
            'message' => 'Image deleted successfully from server disk',
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully',
        ]);
    }

    public function deactivateAccount(Request $request)
    {
        $user = $request->user();
        $user->is_online = false;
        $user->save();
        $user->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Account deactivated successfully',
        ]);
    }

    public function deleteAccount(Request $request)
    {
        $user = $request->user();
        $userId = $user->id;

        \App\Models\Message::where('sender_id', $userId)->orWhere('receiver_id', $userId)->delete();
        \App\Models\UserMatch::where('user_1_id', $userId)->orWhere('user_2_id', $userId)->delete();
        \App\Models\Swipe::where('swiper_id', $userId)->orWhere('swiped_user_id', $userId)->delete();
        \App\Models\UserBlock::where('blocker_id', $userId)->orWhere('blocked_user_id', $userId)->delete();
        \App\Models\ProfilePhoto::where('user_id', $userId)->delete();

        $user->tokens()->delete();
        $user->delete();

        return response()->json([
            'message' => 'Account deleted permanently',
        ]);
    }

    public function sendAadhaarOtp(Request $request)
    {
        $validated = $request->validate([
            'aadhaar_number' => 'required|string|min:12|max:14',
        ]);

        $aadhaarNumber = preg_replace('/[^0-9]/', '', $validated['aadhaar_number']);
        if (strlen($aadhaarNumber) !== 12) {
            return response()->json(['message' => 'Please enter a valid 12-digit Aadhaar number.'], 422);
        }

        $currentUser = $request->user();
        $existingUser = User::where('aadhaar_number', $aadhaarNumber)
            ->where('id', '!=', $currentUser ? $currentUser->id : 0)
            ->first();

        if ($existingUser) {
            return response()->json([
                'message' => 'This Aadhaar number is already linked to another verified account.'
            ], 422);
        }

        $apiKey = env('AADHAAR_API_KEY', 'key_live_783f76d90ff64cb384d36e96ec626fe0');
        $apiSecret = env('AADHAAR_API_SECRET', 'secret_live_7a33a67a0c524eff8b94b8a156a413bd');

        $refId = 'REF_' . time() . '_' . rand(1000, 9999);
        $message = 'OTP sent successfully to your Aadhaar registered mobile number.';

        try {
            $authRes = \Illuminate\Support\Facades\Http::withHeaders([
                'x-api-key'     => $apiKey,
                'x-api-secret'  => $apiSecret,
                'x-api-version' => '1.0',
            ])->post('https://api.sandbox.co.in/authenticate');

            if ($authRes->successful()) {
                $tokenData = $authRes->json();
                $accessToken = $tokenData['access_token'] ?? $tokenData['data']['access_token'] ?? null;

                if ($accessToken) {
                    $otpRes = \Illuminate\Support\Facades\Http::withHeaders([
                        'Authorization' => $accessToken,
                        'x-api-key'     => $apiKey,
                        'x-api-version' => '1.0',
                        'Content-Type'  => 'application/json',
                    ])->post('https://api.sandbox.co.in/kyc/aadhaar/okyc/otp', [
                        '@entity'        => 'in.co.sandbox.kyc.aadhaar.okyc.otp.request',
                        'aadhaar_number' => $aadhaarNumber,
                        'consent'        => 'Y',
                        'reason'         => 'Identity Verification',
                    ]);

                    if ($otpRes->successful()) {
                        $otpData = $otpRes->json();
                        $extractedRef = $otpData['data']['reference_id'] ?? $otpData['data']['ref_id'] ?? $otpData['reference_id'] ?? $otpData['ref_id'] ?? $refId;
                        $refId = (string) $extractedRef;
                        $message = $otpData['data']['message'] ?? $otpData['message'] ?? $message;
                    } else {
                        $errData = $otpRes->json();
                        $errMsg = $errData['message'] ?? $errData['data']['message'] ?? 'Sandbox API failed to send OTP.';
                        \Illuminate\Support\Facades\Log::warning('Aadhaar Sandbox OTP error response: ', $errData ?? []);
                        return response()->json(['message' => $errMsg], 422);
                    }
                } else {
                    return response()->json(['message' => 'Failed to obtain access token from Aadhaar provider.'], 422);
                }
            } else {
                $authErr = $authRes->json();
                $authErrMsg = $authErr['message'] ?? $authErr['data']['message'] ?? 'Aadhaar API authentication failed. Check API Key/Secret.';
                return response()->json(['message' => $authErrMsg], 422);
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::warning('Aadhaar Sandbox API exception: ' . $e->getMessage());
        }

        return response()->json([
            'message' => $message,
            'ref_id'  => (string) $refId,
            'aadhaar_number' => $aadhaarNumber,
        ]);
    }

    public function verifyAadhaarOtp(Request $request)
    {
        $validated = $request->validate([
            'otp'            => 'required|string|min:4|max:8',
            'ref_id'         => 'nullable',
            'aadhaar_number' => 'nullable|string',
        ]);

        $otp = trim($validated['otp']);
        $refId = $request->input('ref_id') !== null ? (string) $request->input('ref_id') : null;
        $aadhaarNumber = $request->input('aadhaar_number') ? preg_replace('/[^0-9]/', '', $request->input('aadhaar_number')) : null;
        $user = $request->user();

        if ($aadhaarNumber && strlen($aadhaarNumber) === 12) {
            $existingUser = User::where('aadhaar_number', $aadhaarNumber)
                ->where('id', '!=', $user->id)
                ->first();
            if ($existingUser) {
                return response()->json([
                    'message' => 'This Aadhaar number is already linked to another verified account.'
                ], 422);
            }
        }

        $apiKey = env('AADHAAR_API_KEY', 'key_live_783f76d90ff64cb384d36e96ec626fe0');
        $apiSecret = env('AADHAAR_API_SECRET', 'secret_live_7a33a67a0c524eff8b94b8a156a413bd');
        $extractedKycData = null;

        if (!empty($refId)) {
            try {
                $authRes = \Illuminate\Support\Facades\Http::withHeaders([
                    'x-api-key'     => $apiKey,
                    'x-api-secret'  => $apiSecret,
                    'x-api-version' => '1.0',
                ])->post('https://api.sandbox.co.in/authenticate');

                if ($authRes->successful()) {
                    $tokenData = $authRes->json();
                    $accessToken = $tokenData['access_token'] ?? $tokenData['data']['access_token'] ?? null;

                    if ($accessToken) {
                        $verifyRes = \Illuminate\Support\Facades\Http::withHeaders([
                            'Authorization' => $accessToken,
                            'x-api-key'     => $apiKey,
                            'x-api-version' => '1.0',
                            'Content-Type'  => 'application/json',
                        ])->post('https://api.sandbox.co.in/kyc/aadhaar/okyc/otp/verify', [
                            '@entity'      => 'in.co.sandbox.kyc.aadhaar.okyc.request',
                            'reference_id' => $refId,
                            'otp'          => $otp,
                        ]);

                        if ($verifyRes->successful()) {
                            $resJson = $verifyRes->json();
                            $extractedKycData = $resJson['data'] ?? $resJson;
                        } else {
                            $errData = $verifyRes->json();
                            $errMsg = $errData['message'] ?? $errData['data']['message'] ?? 'Invalid OTP entered. Please try again.';
                            return response()->json(['message' => $errMsg], 422);
                        }
                    }
                }
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::warning('Aadhaar Sandbox API verify OTP error: ' . $e->getMessage());
            }
        }

        // Auto-update user name, DOB, age, and gender from verified Aadhaar e-KYC data
        if ($extractedKycData) {
            if (!empty($extractedKycData['name'])) {
                $user->name = trim($extractedKycData['name']);
                $user->display_name = trim($extractedKycData['name']);
            }
            if (!empty($extractedKycData['date_of_birth'])) {
                try {
                    $carbonDob = \Carbon\Carbon::parse(trim($extractedKycData['date_of_birth']));
                    $user->dob = $carbonDob->format('Y-m-d');
                    $user->age = $carbonDob->age;
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::warning('Error parsing Aadhaar DOB: ' . $e->getMessage());
                }
            }
            // Map Aadhaar gender code (M/F) to full gender string
            if (!empty($extractedKycData['gender'])) {
                $aadhaarGender = strtoupper(trim($extractedKycData['gender']));
                if ($aadhaarGender === 'M' || $aadhaarGender === 'MALE') {
                    $user->gender = 'Male';
                } elseif ($aadhaarGender === 'F' || $aadhaarGender === 'FEMALE') {
                    $user->gender = 'Female';
                } else {
                    $user->gender = ucfirst(strtolower($aadhaarGender));
                }
            }
        }

        if ($aadhaarNumber) {
            $user->aadhaar_number = $aadhaarNumber;
        }

        $user->is_verified = true;
        $user->email_verified_at = now();

        if (empty($user->subscription_plan) || strtolower($user->subscription_plan) === 'none') {
            $user->subscription_plan = 'Free';
        }
        $user->save();

        // Store complete Aadhaar verification record in database table
        try {
            $addr = is_array($extractedKycData['address'] ?? null) ? $extractedKycData['address'] : [];

            // Derive year_of_birth from DOB if API didn't return it
            $yearOfBirth = $extractedKycData['year_of_birth'] ?? null;
            if (!$yearOfBirth && $user->dob) {
                try {
                    $yearOfBirth = \Carbon\Carbon::parse($user->dob)->year;
                } catch (\Exception $e) {}
            }

            // Map gender code for aadhaar record (store as M/F)
            $aadhaarGenderCode = $extractedKycData['gender'] ?? null;
            if (!$aadhaarGenderCode && $user->gender) {
                $g = strtolower(trim($user->gender));
                $aadhaarGenderCode = ($g === 'male' || $g === 'm') ? 'M' : (($g === 'female' || $g === 'f') ? 'F' : strtoupper(substr($user->gender, 0, 1)));
            }

            AadhaarVerification::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'aadhaar_number' => $user->aadhaar_number ?? $aadhaarNumber ?? ('AADHAAR_' . $user->id),
                    'reference_id'   => $refId,
                    'full_name'      => $extractedKycData['name'] ?? $user->name,
                    'gender'         => $aadhaarGenderCode,
                    'date_of_birth'  => !empty($extractedKycData['date_of_birth'])
                                          ? $extractedKycData['date_of_birth']
                                          : ($user->dob ? \Carbon\Carbon::parse($user->dob)->format('d-m-Y') : null),
                    'year_of_birth'  => $yearOfBirth,
                    'care_of'        => $extractedKycData['care_of'] ?? null,
                    'full_address'   => $extractedKycData['full_address'] ?? null,
                    'house'          => $addr['house'] ?? null,
                    'street'         => $addr['street'] ?? null,
                    'vtc'            => $addr['vtc'] ?? ($user->city ?? null),
                    'district'       => $addr['district'] ?? ($user->city ?? null),
                    'state'          => $addr['state'] ?? ($user->state ?? null),
                    'pincode'        => $addr['pincode'] ?? ($user->pincode ?? null),
                    'country'        => $addr['country'] ?? 'India',
                    'photo'          => $extractedKycData['photo'] ?? null,
                    'raw_response'   => $extractedKycData,
                    'status'         => 'VERIFIED',
                    'verified_at'    => now(),
                ]
            );
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::warning('Failed to save Aadhaar verification record: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Aadhaar identity verified successfully! Profile name, DOB, gender updated & locked.',
            'user'    => $user->load('photos', 'activeSubscription', 'settings', 'aadhaarVerification'),
        ]);
    }

    public function verifyProfile(Request $request)
    {
        $user = $request->user();
        $user->is_verified = true;
        $user->email_verified_at = now();

        if (empty($user->subscription_plan) || strtolower($user->subscription_plan) === 'none') {
            $user->subscription_plan = 'Free';
        }

        $user->save();

        return response()->json([
            'message' => 'Profile verified successfully',
            'user'    => $user->load('photos', 'activeSubscription', 'settings'),
        ]);
    }

    public function getUserCount()
    {
        $count = User::count();
        return response()->json([
            'user_count'  => $count,
            'target_goal' => 5000,
        ]);
    }
}