/**
 * Mağaza / yasal linkler / RevenueCat.
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { SITE_URL } from '../api/client';

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;

function envOrExtra(envKey: string, extraKey: string, fallback = ''): string {
  const fromEnv = process.env[envKey]?.trim();
  if (fromEnv) return fromEnv;
  const fromExtra = extra[extraKey]?.trim();
  if (fromExtra) return fromExtra;
  return fallback;
}

/** Apple App Store numeric ID — boşsa iOS mağaza puan linki devre dışı */
export const APP_STORE_ID = envOrExtra('EXPO_PUBLIC_APP_STORE_ID', 'appStoreId', '');

export const PLAY_PACKAGE_ID = envOrExtra(
  'EXPO_PUBLIC_PLAY_PACKAGE_ID',
  'playPackageId',
  'com.randevuajandam.doktor',
);

const DEFAULT_PRIVACY = 'https://randevuajandam.com/gizlilik-politikasi';
const DEFAULT_TERMS = 'https://randevuajandam.com/kullanim-kosullari';
const DEFAULT_KVKK = 'https://randevuajandam.com/kvkk';

/**
 * Prefer explicit env. Otherwise use public site host (not LAN API IP).
 * Final fallback: production absolute URLs so links always work.
 */
function resolveLegalUrl(envKey: string, extraKey: string, path: string, fallback: string): string {
  const explicit = envOrExtra(envKey, extraKey, '');
  if (explicit) return explicit;
  try {
    const host = new URL(SITE_URL).hostname;
    if (host && !/^\d+\.\d+\.\d+\.\d+$/.test(host) && host !== 'localhost') {
      return `${SITE_URL.replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
    }
  } catch {
    /* fallback */
  }
  return fallback;
}

export const PRIVACY_URL = resolveLegalUrl(
  'EXPO_PUBLIC_PRIVACY_URL',
  'privacyUrl',
  '/gizlilik-politikasi',
  DEFAULT_PRIVACY,
);

export const TERMS_URL = resolveLegalUrl(
  'EXPO_PUBLIC_TERMS_URL',
  'termsUrl',
  '/kullanim-kosullari',
  DEFAULT_TERMS,
);

export const KVKK_URL = resolveLegalUrl('EXPO_PUBLIC_KVKK_URL', 'kvkkUrl', '/kvkk', DEFAULT_KVKK);

export const REVENUECAT_IOS_KEY = envOrExtra(
  'EXPO_PUBLIC_REVENUECAT_IOS_KEY',
  'revenueCatIosKey',
  '',
);

export const REVENUECAT_ANDROID_KEY = envOrExtra(
  'EXPO_PUBLIC_REVENUECAT_ANDROID_KEY',
  'revenueCatAndroidKey',
  '',
);

export function revenueCatApiKey(): string | null {
  if (Platform.OS === 'ios') {
    return REVENUECAT_IOS_KEY || null;
  }
  if (Platform.OS === 'android') {
    return REVENUECAT_ANDROID_KEY || null;
  }
  return null;
}

export function storeReviewUrl(): string | null {
  if (Platform.OS === 'ios') {
    if (!APP_STORE_ID || APP_STORE_ID === '000000000') {
      return null;
    }
    return `https://apps.apple.com/app/id${APP_STORE_ID}?action=write-review`;
  }
  if (Platform.OS === 'android') {
    return `https://play.google.com/store/apps/details?id=${PLAY_PACKAGE_ID}&showAllReviews=true`;
  }
  return null;
}

export function appVersion(): string {
  return Constants.expoConfig?.version ?? '1.0.0';
}

export function isIapConfigured(): boolean {
  return Boolean(revenueCatApiKey());
}
