import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { cacheGet, cacheKeyFromUrl, cacheSet } from './offlineCache';
import { enqueueMutation, getMutationQueue, setMutationQueue } from './mutationQueue';

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'https://randevuajandam.com/api/mobile/v1';

export const SITE_URL = API_URL.replace(/\/api\/mobile\/v1$/, '');

const TOKEN_KEY = 'randevuajandam.doctor.token';

export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  message?: string;
  meta?: Record<string, unknown>;
  /** true when response served from local cache after network failure */
  fromCache?: boolean;
};

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

// expo-secure-store doesn't support web — fall back to localStorage.
export const tokenStore = {
  async get(): Promise<string | null> {
    if (Platform.OS === 'web') {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
    }
    return SecureStore.getItemAsync(TOKEN_KEY);
  },
  async set(value: string): Promise<void> {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(TOKEN_KEY, value);
      }
      return;
    }
    await SecureStore.setItemAsync(TOKEN_KEY, value);
  },
  async remove(): Promise<void> {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(TOKEN_KEY);
      }
      return;
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  },
};

async function authHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
  const token = await tokenStore.get();
  return {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
  return mutateJson<T>('DELETE', path, null);
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
