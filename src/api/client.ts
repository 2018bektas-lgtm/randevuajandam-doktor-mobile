import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { cacheGet, cacheKeyFromUrl, cacheSet } from './offlineCache';
import { enqueueMutation, getMutationQueue, setMutationQueue } from './mutationQueue';

/** Production mobile API. Local/LAN only if EXPO_PUBLIC_USE_LOCAL_API=1 is set. */
const PROD_API = 'https://randevuajandam.com/api/mobile/v1';
const envApi = (process.env.EXPO_PUBLIC_API_URL ?? '').trim();
const useLocal = process.env.EXPO_PUBLIC_USE_LOCAL_API === '1';

function isLocalHost(url: string): boolean {
  return /localhost|127\.0\.0\.1|192\.168\.|10\.\d+\.|172\.(1[6-9]|2\d|3[0-1])\./i.test(url);
}

export const API_URL = (() => {
  if (!envApi) return PROD_API;
  // Refuse accidental local API in production builds / default runs
  if (isLocalHost(envApi) && !useLocal) {
    return PROD_API;
  }
  return envApi.replace(/\/+$/, '');
})();

/** Public website origin (legal pages, marketing). Always production host for legal. */
export const SITE_URL = 'https://randevuajandam.com';

const DOCTOR_TOKEN_KEY = 'randevuajandam.doctor.token';
const STAFF_TOKEN_KEY = 'randevuajandam.staff.token';
const AUTH_ROLE_KEY = 'randevuajandam.auth.role';

/** @deprecated use DOCTOR_TOKEN_KEY — kept for any external refs */
const TOKEN_KEY = DOCTOR_TOKEN_KEY;

export type AuthRole = 'doctor' | 'staff';

export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  message?: string;
  meta?: Record<string, unknown>;
  /** true when response served from local cache after network failure */
  fromCache?: boolean;
};

async function storageGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
  }
  return SecureStore.getItemAsync(key);
}

async function storageSet(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function storageRemove(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function getAuthRole(): Promise<AuthRole | null> {
  const r = await storageGet(AUTH_ROLE_KEY);
  return r === 'staff' || r === 'doctor' ? r : null;
}

export async function setAuthRole(role: AuthRole | null): Promise<void> {
  if (!role) {
    await storageRemove(AUTH_ROLE_KEY);
    return;
  }
  await storageSet(AUTH_ROLE_KEY, role);
}

/** Global offline flag for UI banner (simple pub-sub). */
let offlineListeners: Array<(v: boolean) => void> = [];
let lastOffline = false;

export function subscribeOffline(listener: (offline: boolean) => void): () => void {
  offlineListeners.push(listener);
  listener(lastOffline);
  return () => {
    offlineListeners = offlineListeners.filter((l) => l !== listener);
  };
}

function setOffline(v: boolean) {
  if (lastOffline === v) return;
  lastOffline = v;
  offlineListeners.forEach((l) => l(v));
}

export function isOfflineFlag(): boolean {
  return lastOffline;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// Active session token (doctor or staff based on AUTH_ROLE_KEY).
export const tokenStore = {
  async get(): Promise<string | null> {
    const role = await getAuthRole();
    if (role === 'staff') return storageGet(STAFF_TOKEN_KEY);
    // default doctor (also legacy sessions without role key)
    return storageGet(DOCTOR_TOKEN_KEY);
  },
  async set(value: string, role: AuthRole = 'doctor'): Promise<void> {
    await setAuthRole(role);
    if (role === 'staff') {
      await storageSet(STAFF_TOKEN_KEY, value);
      return;
    }
    await storageSet(DOCTOR_TOKEN_KEY, value);
  },
  async remove(): Promise<void> {
    const role = await getAuthRole();
    if (role === 'staff') {
      await storageRemove(STAFF_TOKEN_KEY);
    } else {
      await storageRemove(DOCTOR_TOKEN_KEY);
    }
    await setAuthRole(null);
  },
  async clearAll(): Promise<void> {
    await storageRemove(DOCTOR_TOKEN_KEY);
    await storageRemove(STAFF_TOKEN_KEY);
    await setAuthRole(null);
  },
};

export const staffTokenStore = {
  async get(): Promise<string | null> {
    return storageGet(STAFF_TOKEN_KEY);
  },
  async set(value: string): Promise<void> {
    await setAuthRole('staff');
    await storageSet(STAFF_TOKEN_KEY, value);
  },
  async remove(): Promise<void> {
    await storageRemove(STAFF_TOKEN_KEY);
    const role = await getAuthRole();
    if (role === 'staff') await setAuthRole(null);
  },
};

async function authHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
  const token = await tokenStore.get();
  const role = await getAuthRole();
  return {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(token && role === 'staff' ? { 'X-Personel-Token': token } : {}),
    ...(token && role !== 'staff' ? { 'X-Doktor-Token': token } : {}),
    ...extra,
  };
}

function resolveUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${API_URL}${normalized}`;
}

async function parseJsonResponse<T>(response: Response): Promise<ApiResponse<T>> {
  let payload: ApiResponse<T> = { success: false };
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    throw new ApiError(
      response.ok ? 'Geçersiz sunucu yanıtı.' : `İstek başarısız (${response.status}).`,
      response.status,
    );
  }

  if (!response.ok || payload.success === false) {
    throw new ApiError(
      payload.message ?? `İstek başarısız (${response.status}).`,
      response.status,
    );
  }

  return payload;
}

export async function apiGet<T = unknown>(
  path: string,
  query?: Record<string, string | number | boolean | null | undefined>,
): Promise<ApiResponse<T>> {
  let url = resolveUrl(path);
  if (query) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        return;
      }
      params.append(key, String(value));
    });
    const qs = params.toString();
    if (qs) {
      url += (url.includes('?') ? '&' : '?') + qs;
    }
  }

  const cacheKey = cacheKeyFromUrl(url);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: await authHeaders(),
    });
    const payload = await parseJsonResponse<T>(response);
    setOffline(false);
    void cacheSet(cacheKey, payload);
    return payload;
  } catch (e) {
    const cached = await cacheGet<ApiResponse<T>>(cacheKey);
    if (cached && cached.success !== false) {
      setOffline(true);
      return { ...cached, fromCache: true, message: cached.message ?? 'Çevrimdışı önbellek' };
    }
    setOffline(true);
    throw e instanceof ApiError
      ? e
      : new ApiError('Sunucuya ulaşılamadı (çevrimdışı ve önbellek yok).', 0);
  }
}

async function mutateJson<T>(
  method: 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: Record<string, unknown> | null,
  queueable = true,
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(resolveUrl(path), {
      method,
      headers: await authHeaders(
        method === 'DELETE' ? {} : { 'Content-Type': 'application/json' },
      ),
      body: method === 'DELETE' || body == null ? undefined : JSON.stringify(body),
    });
    const payload = await parseJsonResponse<T>(response);
    setOffline(false);
    // Flush any queued mutations when back online
    void flushMutationQueue();
    return payload;
  } catch (e) {
    if (!queueable) {
      setOffline(true);
      throw e instanceof ApiError ? e : new ApiError('Sunucuya ulaşılamadı.', 0);
    }
    // Don't queue auth-critical or file-ish paths
    const skipQueue =
      path.includes('/auth/') ||
      path.includes('/notifications/read') ||
      path.includes('/device');
    if (skipQueue) {
      setOffline(true);
      throw e instanceof ApiError ? e : new ApiError('Sunucuya ulaşılamadı.', 0);
    }
    await enqueueMutation({ method, path, body: body ?? null });
    setOffline(true);
    return {
      success: true,
      fromCache: true,
      message: 'İstek çevrimdışı kuyruğa alındı. Bağlantı gelince gönderilecek.',
      data: undefined,
    } as ApiResponse<T>;
  }
}

let flushing = false;

/** Replay queued mutations when network is available. */
export async function flushMutationQueue(): Promise<number> {
  if (flushing) return 0;
  flushing = true;
  let sent = 0;
  try {
    const queue = await getMutationQueue();
    if (queue.length === 0) return 0;
    const remaining = [];
    for (const item of queue) {
      try {
        const response = await fetch(resolveUrl(item.path), {
          method: item.method,
          headers: await authHeaders(
            item.method === 'DELETE' ? {} : { 'Content-Type': 'application/json' },
          ),
          body:
            item.method === 'DELETE' || item.body == null
              ? undefined
              : JSON.stringify(item.body),
        });
        await parseJsonResponse(response);
        sent += 1;
      } catch {
        remaining.push(item);
      }
    }
    await setMutationQueue(remaining);
    if (remaining.length === 0) setOffline(false);
  } finally {
    flushing = false;
  }
  return sent;
}

export async function apiPost<T = unknown>(
  path: string,
  body?: Record<string, unknown> | null,
): Promise<ApiResponse<T>> {
  return mutateJson<T>('POST', path, body);
}

export async function apiPut<T = unknown>(
  path: string,
  body?: Record<string, unknown> | null,
): Promise<ApiResponse<T>> {
  return mutateJson<T>('PUT', path, body);
}

export async function apiDelete<T = unknown>(path: string): Promise<ApiResponse<T>> {
  // Bildirim silme gibi anlık işlemlerde offline kuyruk yanıltıcı; doğrudan dene.
  const immediate =
    path.includes('/notifications') || path.includes('/auth/') || path.includes('/device');
  return mutateJson<T>('DELETE', path, null, !immediate);
}

/** Multipart upload (gallery, etc.) — do not set Content-Type (boundary is set by fetch).
 *  PUT+multipart is unreliable on PHP; spoof as POST + _method=PUT for updates. */
export async function apiUpload<T = unknown>(
  path: string,
  formData: FormData,
  method: 'POST' | 'PUT' = 'POST',
): Promise<ApiResponse<T>> {
  let httpMethod: 'POST' | 'PUT' = method;
  if (method === 'PUT') {
    formData.append('_method', 'PUT');
    httpMethod = 'POST';
  }
  const response = await fetch(resolveUrl(path), {
    method: httpMethod,
    headers: await authHeaders(),
    body: formData,
  });
  return parseJsonResponse<T>(response);
}
