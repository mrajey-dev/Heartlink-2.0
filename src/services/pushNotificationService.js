// src/services/pushNotificationService.js — Expo Remote & Local Phone Notifications Service
import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { apiSavePushToken } from './api';

// Detect if app is running inside Expo Go client app (where remote push notifications are disabled by Expo in SDK 53+)
export const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  Constants.appOwnership === 'expo';

// Dynamically load expo-notifications
// NOTE: expo-notifications throws in Expo Go on Android (SDK 53+)
// Both remote AND local notifications require a development build on Android.
export let Notifications = null;
export let notificationsUnavailableInExpoGo = false;

try {
  Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch (err) {
  notificationsUnavailableInExpoGo = true;
  console.warn('[PushNotificationService] expo-notifications not available (Expo Go Android SDK 53+ limitation):', err?.message?.split('\n')[0]);
}

/**
 * Setup default Android notification channels for high priority popups
 */
export async function setupNotificationChannelsAsync() {
  if (!Notifications || Platform.OS !== 'android') return;

  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'HeartLink Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF007F',
      sound: 'default',
      enableLights: true,
      enableVibrate: true,
      showBadge: true,
    });
  } catch (error) {
    console.warn('[PushNotificationService] Error creating notification channel:', error?.message || error);
  }
}

/**
 * Request runtime notification permissions from the user.
 * Returns { granted: boolean, canAskAgain: boolean }
 */
export async function ensureNotificationPermissionsAsync() {
  if (!Notifications) {
    console.warn('[PushPerm] ❌ Notifications module not loaded');
    return { granted: false, canAskAgain: false };
  }

  try {
    // Step 1: check current permission status
    const current = await Notifications.getPermissionsAsync();
    console.log('[PushPerm] getPermissionsAsync result:', JSON.stringify(current));

    if (current.granted === true || current.status === 'granted') {
      console.log('[PushPerm] ✅ Already granted');
      return { granted: true, canAskAgain: true };
    }

    // Step 2: request permission
    console.log('[PushPerm] Not granted yet, calling requestPermissionsAsync...');
    const requested = await Notifications.requestPermissionsAsync();
    console.log('[PushPerm] requestPermissionsAsync result:', JSON.stringify(requested));

    const granted = requested.granted === true || requested.status === 'granted';
    console.log('[PushPerm] Final granted status:', granted);
    return {
      granted,
      canAskAgain: requested.canAskAgain ?? true,
    };
  } catch (err) {
    console.error('[PushPerm] ❌ Exception in permission check:', err);
    return { granted: false, canAskAgain: false };
  }
}

/**
 * Instantly triggers a native phone notification (system tray, lock screen, banner)
 * @param {Object} param0
 * @param {string} param0.title Notification title
 * @param {string} param0.body Notification message body
 * @param {Object} [param0.data] Additional payload/navigation data
 */
export async function displayPhoneNotification({ title, body, data = {} }) {
  if (!Notifications) {
    console.warn('[PushNotificationService] Notifications module not available');
    return false;
  }

  try {
    await setupNotificationChannelsAsync();

    // Check / request permissions
    const { granted } = await ensureNotificationPermissionsAsync();
    if (!granted) {
      console.warn('[PushNotificationService] Notification permission denied by user.');
      return false;
    }

    // Build trigger safely — SchedulableTriggerInputTypes may not exist on all SDK builds
    let trigger = null; // null = fire immediately
    try {
      if (Notifications.SchedulableTriggerInputTypes?.TIME_INTERVAL !== undefined) {
        trigger = {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 1,
        };
      }
    } catch (_) {}

    await Notifications.scheduleNotificationAsync({
      content: {
        title: title || 'HeartLink',
        body: body || '',
        data,
        sound: 'default',
        channelId: 'default',
      },
      trigger,
    });

    console.log('[PushNotificationService] ✅ Local phone notification fired successfully.');
    return true;
  } catch (error) {
    // Log full error so we can see EXACTLY what is failing
    console.error('[PushNotificationService] ❌ scheduleNotificationAsync failed:', error);
    return false;
  }
}

/**
 * Registers device for remote push notifications, gets Expo Push Token, and uploads it to Laravel backend.
 */
export async function registerForPushNotificationsAsync() {
  if (isExpoGo || !Notifications) {
    return null;
  }

  let token = null;

  try {
    await setupNotificationChannelsAsync();

    // Request notification permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[PushNotificationService] Push notification permission not granted.');
      return null;
    }

    if (Device.isDevice) {
      // Extract EAS Project ID from Expo Constants or fallback
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ||
        Constants.easConfig?.projectId ||
        '5474961b-4bf2-4879-b71d-8ab015526254';

      try {
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId,
        });
        token = tokenData?.data;
        console.log('[PushNotificationService] Obtained Expo Push Token:', token);
      } catch (expoErr) {
        console.warn('[PushNotificationService] Expo push token failed, attempting direct device FCM token:', expoErr?.message || expoErr);
        try {
          const deviceTokenData = await Notifications.getDevicePushTokenAsync();
          token = deviceTokenData?.data;
          console.log('[PushNotificationService] Obtained Direct Device Push Token:', token);
        } catch (deviceErr) {
          console.warn('[PushNotificationService] Device push token error:', deviceErr?.message || deviceErr);
        }
      }

      if (token) {
        // Send push token to Hostinger Laravel backend
        await apiSavePushToken(token).catch((err) =>
          console.warn('[PushNotificationService] Failed to upload push token to Laravel:', err?.message || err)
        );
      }
    } else {
      console.log('[PushNotificationService] Physical device required for remote push token registration.');
    }
  } catch (error) {
    console.warn('[PushNotificationService] Error registering push notifications:', error?.message || error);
  }

  return token;
}

