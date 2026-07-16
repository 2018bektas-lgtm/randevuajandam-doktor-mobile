import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const PREFIX = 'ra.doctor.cache.';

async function storageGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    return localStorage.getItem(key);
  }
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

async function storageSet(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    localStorage.setItem(key, value);
    return;
  }
  try {
    await AsyncStorage.setItem(key, value);
  } catch {
    // ignore quota
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await storageGet(PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown): Promise<void> {
  try {
    await storageSet(PREFIX + key, JSON.stringify(value));
  } catch {
    //
  }
}

export function cacheKeyFromUrl(url: string): string {
  // strip host, keep path+query
  try {
    const u = url.replace(/^https?:\/\/[^/]+/i, '');
    return u.slice(0, 180);
  } catch {
    return url.slice(0, 180);
  }
}
