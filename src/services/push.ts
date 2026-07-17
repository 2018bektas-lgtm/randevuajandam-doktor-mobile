import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { apiPost, getAuthRole } from '../api/client';

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
 * Safe permission-only request (onboarding / settings).
 * Never throws; returns skipped on Expo Go Android / web / missing module.
 */
export async function requestNotificationPermission(): Promise<
  'granted' | 'denied' | 'skipped'
> {
  if (Platform.OS === 'web') {
    return 'skipped';
  }
  if (isExpoGo() && Platform.OS === 'android') {
    return 'skipped';
  }

  const Notifications = getNotifications();
  if (!Notifications) {
    return 'skipped';
  }

  try {
    ensureHandler();
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') {
      return 'granted';
    }
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'skipped';
  }
}

async function obtainExpoPushToken(): Promise<string | null> {
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
    return tokenResponse.data || null;
  } catch {
    return null;
  }
}

/**
 * Register Expo push token with doctor or staff API (based on auth role).
 */
export async function registerForPushNotifications(): Promise<string | null> {
  const token = await obtainExpoPushToken();
  if (!token) {
    return null;
  }

  const role = await getAuthRole();
  const path = role === 'staff' ? '/staff/auth/device' : '/doctor/auth/device';
  const body = {
    push_token: token,
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    provider: 'expo',
    device_name: Device.modelName ?? Device.deviceName ?? 'mobile',
    app_version: Constants.expoConfig?.version ?? '1.0.0',
  };

  try {
    await apiPost(path, body);
  } catch {
    /* offline / endpoint missing — token still obtained */
  }

  return token;
}

export type NotificationOpenPayload = {
  screen?: string;
  appointment_id?: number | string;
  url?: string;
  [key: string]: unknown;
};

/**
 * Listen for notification taps → navigate (deep link style data.screen).
 * Returns unsubscribe. No-op if notifications module unavailable.
 */
export function addNotificationResponseListener(
  onOpen: (data: NotificationOpenPayload) => void,
): () => void {
  const Notifications = getNotifications();
  if (!Notifications) {
    return () => undefined;
  }
  try {
    ensureHandler();
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = (response.notification.request.content.data ?? {}) as NotificationOpenPayload;
      onOpen(data);
    });
    return () => {
      try {
        sub.remove();
      } catch {
        /* ignore */
      }
    };
  } catch {
    return () => undefined;
  }
}
