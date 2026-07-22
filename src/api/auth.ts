/**
 * Mobil uygulama kimlik doğrulama — yalnızca `api/mobile/v1` uçları.
 *
 * Web hekim paneli (/hekim/*) session kullanır; buraya karışmaz.
 * Hasta API’si ( /v1/auth/* veya patient ) bu uygulamada kullanılmaz.
 *
 *   Hekim  → POST /doctor/auth/login|two-factor|logout  GET /doctor/auth/me
 *   Personel → POST /staff/auth/login|logout             GET /staff/auth/me
 *   Klinik  → hekim token’ı ile /doctor/clinic/* (ayrı login yok; sahip = hekim)
 */

import { Platform } from 'react-native';
import { API_URL, ApiError, tokenStore, type AuthRole } from './client';

/** Mobil hekim auth base (klinik sahibi de bu endpoint ile girer) */
export const DOCTOR_AUTH = {
  login: '/doctor/auth/login',
  twoFactor: '/doctor/auth/two-factor',
  me: '/doctor/auth/me',
  logout: '/doctor/auth/logout',
  device: '/doctor/auth/device',
} as const;

/** Mobil personel (klinik sekreter vb.) — hekim token’ı ile ASLA karışmaz */
export const STAFF_AUTH = {
  login: '/staff/auth/login',
  me: '/staff/auth/me',
  logout: '/staff/auth/logout',
  device: '/staff/auth/device',
} as const;

export type DoctorAuthUser = {
  id: number;
  ad_soyad: string;
  unvan: string | null;
  e_posta: string;
  profil_resmi: string | null;
  uzmanlik_alani: string | null;
  branslar: string[];
  meslek_dogrulama_durumu?: string | null;
  paket_id?: number | null;
  platformda_gorunur?: boolean;
};

export type StaffAuthUser = {
  id: number;
  ad_soyad: string;
  e_posta: string;
  rol?: string | null;
  yetkiler?: Record<string, boolean> | string[] | null;
  klinik?: { id: number; ad: string } | null;
  [key: string]: unknown;
};

export type DoctorLoginResult =
  | {
      kind: 'ok';
      token: string;
      doktor: DoctorAuthUser;
      expires_at?: string | null;
    }
  | {
      kind: 'two_factor';
      challenge_token: string;
    };

export type StaffLoginResult = {
  token: string;
  personel: StaffAuthUser;
};

function doctorDeviceLabel(): string {
  return `Randevu Ajandam Doktor (${Platform.OS})`;
}

function staffDeviceLabel(): string {
  return `Randevu Ajandam Personel (${Platform.OS})`;
}

async function parseBody(response: Response): Promise<Record<string, any>> {
  const text = await response.text();
  if (!text || !text.trim()) {
    throw new ApiError(
      response.ok
        ? 'Sunucu boş yanıt döndü.'
        : `Sunucuya ulaşılamadı (${response.status || 'ağ'}). API adresini kontrol edin.`,
      response.status || 0,
    );
  }
  try {
    return JSON.parse(text) as Record<string, any>;
  } catch {
    // HTML / gateway error page
    throw new ApiError(
      response.status >= 500
        ? 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.'
        : 'Geçersiz sunucu yanıtı. Mobil API (api/mobile/v1) çalışıyor mu?',
      response.status || 0,
    );
  }
}

function validationMessage(payload: Record<string, any>, fallback: string): string {
  if (typeof payload.message === 'string' && payload.message.trim()) {
    return payload.message;
  }
  const errors = payload.errors;
  if (errors && typeof errors === 'object') {
    const first = Object.values(errors as Record<string, string[]>)[0];
    if (Array.isArray(first) && first[0]) return String(first[0]);
  }
  return fallback;
}

async function postJson(path: string, body: Record<string, unknown>): Promise<{
  response: Response;
  payload: Record<string, any>;
}> {
  const url = `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      `Ağ hatası. Mobil API’ye bağlanılamadı:\n${API_URL}`,
      0,
    );
  }
  const payload = await parseBody(response);
  return { response, payload };
}

async function getAuthed(path: string, role: AuthRole, token: string): Promise<{
  response: Response;
  payload: Record<string, any>;
}> {
  const url = `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };
  if (role === 'staff') {
    headers['X-Personel-Token'] = token;
  } else {
    headers['X-Doktor-Token'] = token;
  }
  let response: Response;
  try {
    response = await fetch(url, { method: 'GET', headers });
  } catch {
    throw new ApiError(`Ağ hatası. Mobil API’ye bağlanılamadı:\n${API_URL}`, 0);
  }
  const payload = await parseBody(response);
  return { response, payload };
}

/** Hekim (ve klinik sahibi hekim) girişi — /doctor/auth/login */
export async function doctorLogin(email: string, password: string): Promise<DoctorLoginResult> {
  const { response, payload } = await postJson(DOCTOR_AUTH.login, {
    e_posta: email.trim().toLowerCase(),
    sifre: password,
    device: doctorDeviceLabel(),
  });

  if (!response.ok || !payload.success || !payload.data) {
    throw new ApiError(
      validationMessage(payload, 'Hekim girişi yapılamadı. E-posta veya şifreyi kontrol edin.'),
      response.status,
    );
  }

  const data = payload.data;
  if (data.requires_two_factor) {
    if (!data.challenge_token) {
      throw new ApiError('Doğrulama oturumu başlatılamadı.', response.status);
    }
    return { kind: 'two_factor', challenge_token: String(data.challenge_token) };
  }

  if (!data.token || !data.doktor) {
    throw new ApiError('Oturum başlatılamadı. Lütfen tekrar deneyin.', response.status);
  }

  return {
    kind: 'ok',
    token: String(data.token),
    doktor: data.doktor as DoctorAuthUser,
    expires_at: data.expires_at ?? null,
  };
}

/** Hekim 2FA — /doctor/auth/two-factor */
export async function doctorVerifyTwoFactor(
  challengeToken: string,
  code: string,
): Promise<Extract<DoctorLoginResult, { kind: 'ok' }>> {
  const { response, payload } = await postJson(DOCTOR_AUTH.twoFactor, {
    challenge_token: challengeToken,
    code: code.trim(),
  });

  if (!response.ok || !payload.success || !payload.data?.token || !payload.data?.doktor) {
    throw new ApiError(
      validationMessage(payload, 'Doğrulama başarısız. Kodu kontrol edin.'),
      response.status,
    );
  }

  return {
    kind: 'ok',
    token: String(payload.data.token),
    doktor: payload.data.doktor as DoctorAuthUser,
    expires_at: payload.data.expires_at ?? null,
  };
}

/** Personel girişi — /staff/auth/login (hekim hesabı buraya gitmez) */
export async function staffLogin(email: string, password: string): Promise<StaffLoginResult> {
  const { response, payload } = await postJson(STAFF_AUTH.login, {
    e_posta: email.trim().toLowerCase(),
    sifre: password,
    device: staffDeviceLabel(),
  });

  if (!response.ok || !payload.success || !payload.data?.token || !payload.data?.personel) {
    throw new ApiError(
      validationMessage(
        payload,
        'Personel girişi yapılamadı. Klinik personel e-posta/şifrenizi kullanın (hekim hesabı değil).',
      ),
      response.status,
    );
  }

  return {
    token: String(payload.data.token),
    personel: payload.data.personel as StaffAuthUser,
  };
}

export async function doctorMe(token: string): Promise<DoctorAuthUser | null> {
  try {
    const { response, payload } = await getAuthed(DOCTOR_AUTH.me, 'doctor', token);
    if (response.ok && payload.success && payload.data?.id && payload.data?.e_posta) {
      return payload.data as DoctorAuthUser;
    }
    if (response.status === 401 || response.status === 403) {
      return null;
    }
    return null;
  } catch (e) {
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) return null;
    throw e;
  }
}

export async function staffMe(token: string): Promise<StaffAuthUser | null> {
  try {
    const { response, payload } = await getAuthed(STAFF_AUTH.me, 'staff', token);
    if (response.ok && payload.success && payload.data?.id) {
      return payload.data as StaffAuthUser;
    }
    if (response.status === 401 || response.status === 403) {
      return null;
    }
    return null;
  } catch (e) {
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) return null;
    throw e;
  }
}

export async function doctorLogout(token: string | null): Promise<void> {
  if (!token) return;
  try {
    await fetch(`${API_URL}${DOCTOR_AUTH.logout}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Doktor-Token': token,
      },
    });
  } catch {
    // yerel temizlik yine yapılacak
  }
}

export async function staffLogout(token: string | null): Promise<void> {
  if (!token) return;
  try {
    await fetch(`${API_URL}${STAFF_AUTH.logout}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Personel-Token': token,
      },
    });
  } catch {
    //
  }
}

/** Aktif API tabanı (debug / hata mesajı) */
export function mobileApiBase(): string {
  return API_URL;
}

export { tokenStore };
export type { AuthRole };
