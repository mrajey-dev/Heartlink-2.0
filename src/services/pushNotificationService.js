// src/services/pushNotificationService.js — Expo Remote & Local Phone Notifications Service
import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { apiSavePushToken } from './api';

// Detect if app is running inside Expo Go client app (where remote push notifications are disabled by Expo in SDK 53+)
export const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  Constants.appOwnership === 'expo';

// Dynamically and lazily load expo-notifications ONLY outside Expo Go (Development Build / Standalone APK)
export let Notifications = null;

if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (err) {
    console.warn('[PushNotificationService] Failed to load expo-notifications:', err?.message || err);
  }
}

/**
 * Setup default Android notification channels for high priority popups
 */
export async function setupNotificationChannelsAsync() {
  if (isExpoGo || !Notifications || Platform.OS !== 'android') return;

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
 * Instantly triggers a native phone notification (system tray, lock screen, banner)
 * @param {Object} param0
 * @param {string} param0.title Notification title
 * @param {string} param0.body Notification message body
 * @param {Object} [param0.data] Additional payload/navigation data
 */
export async function displayPhoneNotification({ title, body, data = {} }) {
  if (isExpoGo || !Notifications) return;

  try {
    await setupNotificationChannelsAsync();

    await Notifications.scheduleNotificationAsync({
      content: {
        title: title || 'HeartLink',
        body: body || '',
        data,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        color: '#FF007F',
      },
      trigger: null, // null trigger means trigger immediately
    });
  } catch (error) {
    console.warn('[PushNotificationService] Error displaying phone notification:', error?.message || error);
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

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      token = tokenData?.data;
      console.log('[PushNotificationService] Obtained Expo Push Token:', token);

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

