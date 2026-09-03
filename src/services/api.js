// src/services/api.js — HeartLink API Service Client Bridge for Laravel Backend
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

import Constants from 'expo-constants';

const TOKEN_STORAGE_KEY = '@heartlink_token_session';
let userToken = null;
let activeWorkingHost = null;

const getHostCandidates = () => {
  const hosts = [];

  // If we already know a working host from previous successful requests, try it first
  if (activeWorkingHost) {
    hosts.push(activeWorkingHost);
  }

  // 1. Dynamic host IP provided by Expo CLI (resolves exact PC IP for LAN/physical phone/emulator)
  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      hosts.push(`https://support.ajaywatpade.in/api/v1`);
    }
  }

  // 2. Android Emulator standard loopback
  if (Platform.OS === 'android') {
    hosts.push('https://support.ajaywatpade.in/api/v1');
  }

  // 3. Fallbacks
  hosts.push('https://support.ajaywatpade.in/api/v1');
  hosts.push('https://support.ajaywatpade.in/api/v1');

  // Deduplicate array preserving order
  return Array.from(new Set(hosts));
};

export const getActiveServerBaseUrl = () => {
  if (activeWorkingHost) {
    return activeWorkingHost.replace('/api/v1', '');
  }
  const candidates = getHostCandidates();
  if (candidates.length > 0) {
    return candidates[0].replace('/api/v1', '');
  }
  return 'https://support.ajaywatpade.in';
};

export const setAuthToken = (token) => {
  userToken = token;
};

export const getAuthToken = () => userToken;

// Eagerly load the token from storage once on startup
const _preloadToken = async () => {
  try {
    const saved = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
    if (saved && !userToken) {
      userToken = saved;
    }
  } catch (_) { }
};
_preloadToken();

export const apiFetch = async (endpoint, options = {}) => {
  const isFormData = options.body instanceof FormData;
  const headers = {
    'Accept': 'application/json',
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(userToken ? { 'Authorization': `Bearer ${userToken}` } : {}),
    ...options.headers,
  };

  if (isFormData && headers['Content-Type']) {
    delete headers['Content-Type'];
  }

  const config = {
    ...options,
    headers,
  };

  if (options.body && typeof options.body === 'object' && !isFormData) {
    config.body = JSON.stringify(options.body);
  } else if (isFormData) {
    config.body = options.body;
  }

  const hosts = getHostCandidates();
  let lastError = null;

  for (const host of hosts) {
    try {
      const response = await fetch(`${host}${endpoint}`, config);
      const data = await response.json();

      if (!response.ok) {
        // Successful network connection to host, even if server returned HTTP error status
        activeWorkingHost = host;
        throw new Error(data.message || 'API request failed');
      }

      // Record successful host for subsequent fast requests
      activeWorkingHost = host;
      return data;
    } catch (error) {
      lastError = error;
      // If server responded with status code / application error, don't attempt other hosts
      if (error.message && !error.message.includes('fetch failed') && !error.message.includes('Network request failed') && !error.message.includes('ConnectException')) {
        throw error;
      }
    }
  }

  console.warn(`[HeartLink API Error] ${endpoint}:`, lastError?.message);
  throw lastError || new Error('Unable to connect to Laravel backend');
};

// ─── Image Upload Helper ─────────────────────────────────────────────
export const apiUploadImage = async (imageUri, extraParams = {}) => {
  if (!imageUri || typeof imageUri !== 'string') return imageUri;

  // If already an HTTP / HTTPS URL, return as is
  if (imageUri.startsWith('http://') || imageUri.startsWith('https://')) {
    return imageUri;
  }

  // Web browser security prevents fetch() on native device file:// or content:// URIs
  if (Platform.OS === 'web' && (imageUri.startsWith('file://') || imageUri.startsWith('content://'))) {
    console.warn('[Upload Image]: Web browser cannot access native device file:// URI directly:', imageUri);
    return null;
  }

  // If already a Base64 Data URI (e.g. data:image/jpeg;base64,...), post directly as JSON payload!
  if (imageUri.startsWith('data:image/')) {
    try {
      const bodyPayload = { image: imageUri, ...extraParams };
      const res = await apiFetch('/upload-image', {
        method: 'POST',
        body: bodyPayload,
      });

      if (res?.url) {
        console.log('[Upload Image Base64 Data Success]:', res.url);
        return res.url;
      }
    } catch (b64Err) {
      if (b64Err?.message?.includes('Inappropriate') || b64Err?.message?.includes('NSFW')) {
        throw b64Err;
      }
      console.warn('[Upload Image Base64 Data Error]:', b64Err?.message);
    }
  }

  // Strategy 1: On Native Mobile (Android / iOS), try FormData multipart upload first
  if (Platform.OS !== 'web') {
    try {
      const formData = new FormData();
      const filename = imageUri.split('/').pop()?.split('?')[0] || `photo_${Date.now()}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const ext = match ? match[1].toLowerCase() : 'jpeg';
      const type = `image/${ext === 'jpg' ? 'jpeg' : ext}`;

      formData.append('image', {
        uri: Platform.OS === 'android' ? imageUri : imageUri.replace('file://', ''),
        name: filename,
        type: type,
      });

      if (extraParams.user_id) formData.append('user_id', extraParams.user_id);
      if (extraParams.email) formData.append('email', extraParams.email);

      const res = await apiFetch('/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (res?.url) {
        console.log('[Upload Image FormData Success]:', res.url);
        return res.url;
      }
    } catch (fdErr) {
      if (fdErr?.message?.includes('Inappropriate') || fdErr?.message?.includes('NSFW')) {
        throw fdErr;
      }
      console.warn('[Upload Image FormData Warning, trying base64]:', fdErr?.message);
    }
  }

  // Strategy 2: Base64 Upload (for Web, or as fallback on Native)
  try {
    let base64Data = null;

    if (Platform.OS === 'web') {
      if (imageUri.startsWith('blob:') || imageUri.startsWith('data:')) {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        return imageUri;
      }
    } else {
      try {
        if (imageUri.startsWith('data:')) {
          base64Data = imageUri;
        } else {
          const base64Str = await FileSystem.readAsStringAsync(imageUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          const rawExt = (imageUri.split('.').pop() || 'jpg').split('?')[0].toLowerCase();
          const ext = (rawExt === 'png' || rawExt === 'webp') ? rawExt : 'jpeg';
          base64Data = `data:image/${ext};base64,${base64Str}`;
        }
      } catch (fsErr) {
        console.warn('[Upload Image FS Warning]:', fsErr?.message);
        if (imageUri.startsWith('data:')) {
          base64Data = imageUri;
        } else {
          try {
            const response = await fetch(imageUri);
            const blob = await response.blob();
            base64Data = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          } catch (fetchErr) {
            console.warn('[Upload Image Fetch Warning]:', fetchErr?.message);
          }
        }
      }
    }

    if (!base64Data) return null;

    const bodyPayload = { image: base64Data, ...extraParams };

    const res = await apiFetch('/upload-image', {
      method: 'POST',
      body: bodyPayload,
    });

    if (res?.url) {
      console.log('[Upload Image Base64 Success]:', res.url);
      return res.url;
    }

    console.warn('[Upload Image]: Server response missing image url');
    return null;
  } catch (err) {
    if (err?.message?.includes('Inappropriate') || err?.message?.includes('NSFW')) {
      throw err;
    }
    console.warn('[Upload Image Warning]:', err?.message);
    return null;
  }
};

export const apiDeleteImage = (imageUrl) => apiFetch('/user/delete-image', {
  method: 'POST',
  body: { image_url: imageUrl },
});

// ─── Auth API ────────────────────────────────────────────────────────
export const apiRegister = (userData) => apiFetch('/auth/register', { method: 'POST', body: userData });
export const apiLogin = (credentials) => apiFetch('/auth/login', { method: 'POST', body: credentials });
export const apiLogout = () => apiFetch('/auth/logout', { method: 'POST' });
export const apiForgotPassword = async (email) => {
  try {
    return await apiFetch('/auth/forgot-password', { method: 'POST', body: { email } });
  } catch (err) {
    const errMsg = err?.message || '';
    if (errMsg.includes('404') || errMsg.toLowerCase().includes('not found') || errMsg.toLowerCase().includes('could not be found')) {
      console.warn('[apiForgotPassword] Endpoint not deployed on live server yet:', errMsg);
      return { status: 'mock_success', isMock: true, message: 'Password reset link requested.' };
    }
    throw err;
  }
};
export const apiGetProfile = () => apiFetch('/user/profile');
export const apiUpdateProfile = (data) => apiFetch('/user/profile', { method: 'POST', body: data });
export const apiVerifyUserProfile = () => apiFetch('/user/verify', { method: 'POST' });
export const apiSendAadhaarOtp = (aadhaarNumber) => apiFetch('/aadhaar/send-otp', {
  method: 'POST',
  body: { aadhaar_number: aadhaarNumber },
});
export const apiVerifyAadhaarOtp = (otp, refId, aadhaarNumber) => apiFetch('/aadhaar/verify-otp', {
  method: 'POST',
  body: { otp, ref_id: refId, aadhaar_number: aadhaarNumber },
});

// ─── Discovery & Swiping API ─────────────────────────────────────────
export const apiGetDiscoveryFeed = () => apiFetch('/discover');
export const apiGetVibeFeed = (vibe) => apiFetch(`/discover/vibes?vibe=${encodeURIComponent(vibe)}`);
export const apiGetUserCount = () => apiFetch('/user-count');
export const apiGetUnreadCounts = () => apiFetch('/user/unread-counts');
export const apiResetDiscovery = () => apiFetch('/discover/reset', { method: 'POST' });
export const apiSwipeUser = (swipedUserId, type) => apiFetch('/discover/swipe', {
  method: 'POST',
  body: { swiped_user_id: swipedUserId, type },
});

// ─── Matches & Requests API ──────────────────────────────────────────
export const apiGetMatches = (search = '') => apiFetch(search ? `/matches?q=${encodeURIComponent(search)}` : '/matches');
export const apiGetRequests = () => apiFetch('/requests');
export const apiGetSentRequests = () => apiFetch('/sent-requests');
export const apiCancelSentRequest = (targetUserId) => apiFetch('/sent-requests/cancel', {
  method: 'POST',
  body: { target_user_id: targetUserId },
});
export const apiAcceptRequest = (userId) => apiFetch(`/requests/${userId}/accept`, { method: 'POST' });
export const apiDeclineRequest = (userId) => apiFetch(`/requests/${userId}/decline`, { method: 'POST' });

// ─── Notifications API ───────────────────────────────────────────────
export const apiGetNotifications = () => apiFetch('/notifications');
export const apiMarkNotificationsRead = () => apiFetch('/notifications/mark-read', { method: 'POST' });
export const apiSavePushToken = (pushToken) => apiFetch('/user/push-token', {
  method: 'POST',
  body: { push_token: pushToken },
});
export const apiTestPushNotification = (title, body) => apiFetch('/user/test-push', {
  method: 'POST',
  body: { title, body },
});

// ─── Chat & Moderation API ───────────────────────────────────────────
export const apiGetConversations = () => apiFetch('/chats');
export const apiGetMessages = (otherUserId) => apiFetch(`/chats/${otherUserId}`);
export const apiSendMessage = (receiverId, message, extraData = {}) => apiFetch('/chats/send', {
  method: 'POST',
  body: { receiver_id: receiverId, message, ...extraData },
});
export const apiReactMessage = (receiverId, emoji, messageId) => apiFetch('/chats/react', {
  method: 'POST',
  body: { receiver_id: receiverId, emoji, message_id: messageId },
});
export const apiDeleteMessage = (messageId) => apiFetch(`/chats/message/${messageId}`, {
  method: 'DELETE',
});
export const apiClearChat = (otherUserId) => apiFetch(`/chats/clear/${otherUserId}`, {
  method: 'POST',
});
export const apiGetBlockedUsers = () => apiFetch('/users/blocked');
export const apiBlockUser = (blockedUserId) => apiFetch('/users/block', {
  method: 'POST',
  body: { blocked_user_id: blockedUserId },
});
export const apiUnblockUser = (blockedUserId) => apiFetch('/users/unblock', {
  method: 'POST',
  body: { blocked_user_id: blockedUserId },
});
export const apiUnmatchUser = (matchedUserId) => apiFetch('/matches/unmatch', {
  method: 'POST',
  body: { matched_user_id: matchedUserId },
});
export const apiReportUser = (reportedUserId, reason) => apiFetch('/users/report', {
  method: 'POST',
  body: { reported_user_id: reportedUserId, reason },
});

// ─── Account & Settings Management API ────────────────────────────────
export const apiDeactivateAccount = () => apiFetch('/user/deactivate', { method: 'POST' });
export const apiDeleteAccount = () => apiFetch('/user/account', { method: 'DELETE' });
export const apiGetUserSettings = () => apiFetch('/user/settings');
export const apiUpdateUserSettings = (settingsData) => apiFetch('/user/settings', {
  method: 'POST',
  body: settingsData,
});

// ─── Date Planner API ────────────────────────────────────────────────
export const apiGetRestaurants = () => apiFetch('/restaurants');
export const apiCreateDateProposal = (proposalData) => apiFetch('/date-bookings', {
  method: 'POST',
  body: proposalData,
});
export const apiRespondDateProposal = (bookingId, status) => apiFetch('/date-bookings/respond', {
  method: 'POST',
  body: { booking_id: bookingId, status },
});

// ─── Subscriptions API ───────────────────────────────────────────────
export const apiGetSubscriptionPlans = () => apiFetch('/subscriptions/plans');
export const apiSubscribePlan = (planData) => apiFetch('/subscriptions/subscribe', {
  method: 'POST',
  body: planData,
});
// src/services/api.js - Update the payment-related functions

export const apiCreateRazorpayOrder = async (data) => {
  try {
    console.log('[Razorpay] Creating order with data:', data);

    const response = await apiFetch('/payment/create-order', {
      method: 'POST',
      body: data,
    });

    console.log('[Razorpay] Order response:', response);
    return response;
  } catch (error) {
    console.error('[Razorpay] Create order error:', error);
    console.error('[Razorpay] Error details:', error.message);
    throw error;
  }
};

export const apiVerifyRazorpayPayment = async (data) => {
  try {
    console.log('[Razorpay] Verifying payment with data:', data);

    const response = await apiFetch('/payment/verify-payment', {
      method: 'POST',
      body: data,
    });

    console.log('[Razorpay] Verification response:', response);
    return response;
  } catch (error) {
    console.error('[Razorpay] Verify payment error:', error);
    throw error;
  }
};

// ─── App Version & Compulsory Update Check ───────────────────────────
export const apiCheckAppUpdate = async ({ platform = 'android', versionCode = 0, versionName = '' } = {}) => {
  try {
    const query = new URLSearchParams({
      platform,
      version_code: String(versionCode),
      version_name: String(versionName),
    }).toString();
    return await apiFetch(`/app/check-update?${query}`);
  } catch (error) {
    console.warn('[AppUpdate] Check update network error:', error?.message);
    return null;
  }
};

