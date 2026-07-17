import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { apiPost, getAuthRole } from '../api/client';

/**
 * Expo Go only — standalone / preview / production EAS builds must register push.
 * storeClient = Expo Go; standalone = EAS/production binary.
 */
function isExpoGo(): boolean {
  if (Constants.appOwnership === 'expo') return true;
  // SDK: storeClient = Expo Go client
  const env = Constants.executionEnvironment as string | undefined;
  return env === 'storeClient';
}

type NotificationsModule = typeof import('expo-notifications');

let notificationsModule: NotificationsModule | null | undefined;
let handlerReady = false;

function getNotifications(): NotificationsModule | null {
  if (notificationsModule !== undefined) {
    return notificationsModule;
  }
  // Android Expo Go: remote push removed — skip module load
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
  if (handlerReady) return;
  const Notifications = getNotifications();
  if (!Notifications) return;
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
    /* ignore */
  }
}

export type PushRegisterResult = {
  ok: boolean;
  token: string | null;
  /** permission | no_module | expo_go | token_failed | api_failed | ok */
  reason: string;
  detail?: string;
};

export async function requestNotificationPermission(): Promise<
  'granted' | 'denied' | 'skipped'
> {
  if (Platform.OS === 'web') return 'skipped';
  if (isExpoGo() && Platform.OS === 'android') return 'skipped';

  const Notifications = getNotifications();
  if (!Notifications) return 'skipped';

  try {
    ensureHandler();
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return 'granted';
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'skipped';
  }
}

function resolveProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    // hard fallback from app.json (must match EAS project)
    'd08e9f79-bad1-4343-a31b-a6de02116ca9'
  );
}

/**
 * Full push registration with diagnostics (permission → Expo token → API).
 */
export async function registerForPushNotificationsDetailed(): Promise<PushRegisterResult> {
  if (Platform.OS === 'web') {
    return { ok: false, token: null, reason: 'web' };
  }
  if (isExpoGo() && Platform.OS === 'android') {
    return {
      ok: false,
      token: null,
      reason: 'expo_go',
      detail: 'Android Expo Go push desteklemiyor. EAS APK kullanın.',
    };
  }

  const Notifications = getNotifications();
  if (!Notifications) {
    return { ok: false, token: null, reason: 'no_module' };
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
      return {
        ok: false,
        token: null,
        reason: 'permission',
        detail: 'Telefon ayarlarından bildirim iznini açın.',
      };
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Randevu Ajandam',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#F58A45',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
      // High-priority channel for appointment alerts
      await Notifications.setNotificationChannelAsync('randevu', {
        name: 'Randevular',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#F58A45',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
    }

    const projectId = resolveProjectId();
    let token: string | null = null;
    try {
      const tokenResponse = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined,
      );
      token = tokenResponse.data || null;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        ok: false,
        token: null,
        reason: 'token_failed',
        detail:
          msg.includes('Firebase') || msg.includes('FCM') || msg.includes('fcm')
            ? 'Android FCM kimlik bilgisi EAS’e yüklenmemiş. Expo dashboard → Credentials → FCM.'
            : msg,
      };
    }

    if (!token) {
      return { ok: false, token: null, reason: 'token_failed', detail: 'Boş token' };
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
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'API hatası';
      return {
        ok: false,
        token,
        reason: 'api_failed',
        detail: `Token alındı ama sunucuya yazılamadı: ${msg}. Site deploy / migration kontrol edin.`,
      };
    }

    return { ok: true, token, reason: 'ok' };
  } catch (e) {
    return {
      ok: false,
      token: null,
      reason: 'token_failed',
      detail: e instanceof Error ? e.message : String(e),
    };
  }
}

/** Back-compat: returns token or null */
export async function registerForPushNotifications(): Promise<string | null> {
  const r = await registerForPushNotificationsDetailed();
  return r.token;
}

export type NotificationOpenPayload = {
  screen?: string;
  appointment_id?: number | string;
  randevu_id?: number | string;
  type?: string;
  url?: string;
  [key: string]: unknown;
};

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
