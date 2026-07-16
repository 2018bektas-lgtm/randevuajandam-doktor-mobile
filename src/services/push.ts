import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { apiPost } from '../api/client';

/**
 * Expo Go (SDK 53+) removes Android remote push from expo-notifications and
 * throws at runtime if those APIs are used. Skip push registration there.
 * Development builds / production keep full support.
 */
function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient';
}

type NotificationsModule = typeof import('expo-notifications');

let notificationsModule: NotificationsModule | null | undefined;
let handlerReady = false;

function getNotifications(): NotificationsModule | null {
  if (notificationsModule !== undefined) {
    return notificationsModule;
  }
  if (isExpoGo() && Platform.OS === 'android') {
    notificationsModule = null;
    return null;
  }
  try {
    // Lazy require — avoid evaluating expo-notifications on Expo Go Android.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    notificationsModule = require('expo-notifications') as NotificationsModule;
    return notificationsModule;
  } catch {
    notificationsModule = null;
    return null;
  }
}

function ensureHandler() {
  if (handlerReady) {
    return;
  }
  const Notifications = getNotifications();
  if (!Notifications) {
    return;
  }
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    handlerReady = true;
  } catch {
    // Unsupported environment
  }
}

/**
 * Request permissions and register Expo push token with the API.
 * No-ops on web, Expo Go Android, or when native module is unavailable.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return null;
  }
  if (isExpoGo() && Platform.OS === 'android') {
    return null;
  }

  const Notifications = getNotifications();
  if (!Notifications) {
    return null;
  }

  ensureHandler();

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      finalStatus = req.status;
    }
    if (finalStatus !== 'granted') {
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId ??
      undefined;

    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    const token = tokenResponse.data;
    if (!token) {
      return null;
    }

    await apiPost('/doctor/auth/device', {
      push_token: token,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      provider: 'expo',
      device_name: Device.modelName ?? Device.deviceName ?? 'mobile',
      app_version: Constants.expoConfig?.version ?? '1.0.0',
    });

    return token;
  } catch {
    return null;
  }
}
