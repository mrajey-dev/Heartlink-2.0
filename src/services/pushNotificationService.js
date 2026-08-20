// src/services/pushNotificationService.js — Expo Remote Push Notifications Service
import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { apiSavePushToken } from './api';

// Detect if app is running inside Expo Go client app (where SDK 53+ disabled remote push notifications)
export const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  Constants.appOwnership === 'expo';

// Lazily load expo-notifications ONLY when NOT running in Expo Go to prevent SDK 53+ auto-registration error
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
 * Registers device for remote push notifications, gets Expo Push Token, and uploads it to Laravel backend.
 */
export async function registerForPushNotificationsAsync() {
  if (isExpoGo || !Notifications) {
    console.log(
      '[PushNotificationService] Remote push notifications are disabled in Expo Go (SDK 53+). Use a development build (npx expo run:android or EAS Build) to test remote push notifications.'
    );
    return null;
  }

  let token = null;

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF007F',
        sound: 'default',
      });
    }

    if (Device.isDevice) {
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

      // Extract EAS Project ID from Expo Constants or fallback to hardcoded project ID
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ||
        Constants.easConfig?.projectId ||
        '5474961b-4bf2-4879-b71d-8ab015526254';

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      token = tokenData.data;
      console.log('[PushNotificationService] Obtained Expo Push Token:', token);

      if (token) {
        // Send push token to Hostinger Laravel backend
        await apiSavePushToken(token).catch((err) =>
          console.warn('[PushNotificationService] Failed to upload push token to Laravel:', err?.message || err)
        );
      }
    } else {
      console.log('[PushNotificationService] Physical device required for remote push notifications.');
    }
  } catch (error) {
    console.warn('[PushNotificationService] Error registering push notifications:', error);
  }

  return token;
}
