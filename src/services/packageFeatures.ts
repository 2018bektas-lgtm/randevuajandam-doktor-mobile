/**
 * Package feature allowlist — same codes as randevuajandam-site paket.yetki / package-features.
 */
import { Alert, Platform } from 'react-native';
import { apiGet } from '../api/client';
import type { ScreenId } from '../navigation/types';

export type PackageFeaturesData = {
  features: string[];
  restrict: boolean;
  paketAd: string | null;
  paketId: number | null;
};

const EMPTY: PackageFeaturesData = {
  features: [],
  restrict: true,
  paketAd: null,
  paketId: null,
};

let cache: PackageFeaturesData | null = null;
let inflight: Promise<PackageFeaturesData> | null = null;
const listeners = new Set<(d: PackageFeaturesData) => void>();

export function subscribePackageFeatures(fn: (d: PackageFeaturesData) => void): () => void {
  listeners.add(fn);
  if (cache) fn(cache);
  return () => {
    listeners.delete(fn);
  };
}

function emit(data: PackageFeaturesData) {
  cache = data;
  listeners.forEach((fn) => fn(data));
}

export function getCachedPackageFeatures(): PackageFeaturesData | null {
  return cache;
}

export function clearPackageFeaturesCache(): void {
  cache = null;
  inflight = null;
  emit(EMPTY);
}

/** OR: any listed code unlocks access (matches PaketYetkiKontrol). */
export function hasAnyFeature(
  features: string[] | null | undefined,
  codes: string | string[] | null | undefined,
  restrict = true,
): boolean {
  if (!restrict) return true;
  if (codes == null) return true;
  const need = (Array.isArray(codes) ? codes : [codes]).map((c) => c.trim()).filter(Boolean);
  if (need.length === 0) return true;
  const have = features ?? [];
  if (have.length === 0) return false;
  return need.some((c) => have.includes(c));
}

/**
 * Screen → package feature codes (site/mobile.php parity).
 * null = always allowed (çekirdek).
 */
export const SCREEN_FEATURES: Partial<Record<ScreenId, string | string[]>> = {
  calendar: 'online_takvim',
  requests: ['randevu_talepleri', 'randevu_talebi_goruntule'],
  waitlist: 'bekleme_listesi',
  patients: 'hasta_kartlari',
  workingHours: 'online_takvim',
  settings: 'online_takvim',
  leaves: 'online_takvim',
  quickClose: 'hizli_slot',
  blogs: 'blog',
  // reviews list is core; reply gated separately via FEATURE_YORUM_YANIT
  gallery: 'galeri',
  finance: 'finans',
  financeIncomes: 'finans',
  financeExpenses: 'finans',
  financeCategories: 'finans',
  financeBalances: 'hasta_bakiyeleri',
  financePatientAccount: 'hasta_bakiyeleri',
  faq: 'faq',
  consentForms: 'onam_formu',
  education: 'egitimler',
  educationApps: 'egitimler',
  about: 'hakkimda',
  website: 'web_sitesi',
  asistan: 'ai_asistan',
  smsCredits: 'sms_hatirlatma',
};

export const FEATURE_AI_ASISTAN = 'ai_asistan';

/** Sub-features used inside screens (not always a ScreenId). */
export const FEATURE_HASTA_DOSYA = 'hasta_not_dosya';
export const FEATURE_ONAM = 'onam_formu';
export const FEATURE_YORUM_YANIT = 'yorum_yanit';
export const FEATURE_FINANS_RAPOR = 'finans_rapor';
export const FEATURE_ICAL = 'ical_export';
export const FEATURE_ONLINE_GORUSME = 'online_gorusme';
export const FEATURE_ONLINE_TAKVIM = 'online_takvim';
export const FEATURE_HIZLI_SLOT = 'hizli_slot';
export const FEATURE_SERI_RANDEVU = 'seri_randevu';
export const FEATURE_HASTA_EXPORT = 'hasta_export';
export const FEATURE_TEDAVI_GECMISI = 'tedavi_gecmisi';
export const FEATURE_SMS_HATIRLATMA = 'sms_hatirlatma';
export const FEATURE_SMS_BASLIK = 'sms_baslik';
export const FEATURE_EMAIL_BILDIRIM = 'email_bildirim';
export const FEATURE_DIS_BAGLANTI = 'dis_baglanti';
export const FEATURE_YORUM_DAVET = 'yorum_davet';
export const FEATURE_NO_SHOW = 'no_show_mesaj';

export function featureCodesForScreen(screen: ScreenId): string[] | null {
  const raw = SCREEN_FEATURES[screen];
  if (raw == null) return null;
  return (Array.isArray(raw) ? raw : [raw]).filter(Boolean);
}

export function isScreenLocked(
  screen: ScreenId,
  data: PackageFeaturesData | null | undefined,
): boolean {
  const codes = featureCodesForScreen(screen);
  if (!codes) return false;
  const d = data ?? cache ?? EMPTY;
  return !hasAnyFeature(d.features, codes, d.restrict);
}

export async function loadPackageFeatures(force = false): Promise<PackageFeaturesData> {
  if (!force && cache && (cache.features.length > 0 || cache.paketAd)) {
    return cache;
  }
  if (!force && inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await apiGet<{
        features: string[];
        restrict?: boolean;
        paket: { ad?: string; id?: number } | null;
      }>('/doctor/package-features');
      const data: PackageFeaturesData = {
        features: res.data?.features ?? [],
        restrict: res.data?.restrict !== false,
        paketAd: res.data?.paket?.ad ?? null,
        paketId: res.data?.paket?.id != null ? Number(res.data.paket.id) : null,
      };
      emit(data);
      return data;
    } catch {
      // Fail open for network blips so core UI still works; API still enforces.
      const fallback: PackageFeaturesData = {
        features: cache?.features ?? [],
        restrict: false,
        paketAd: cache?.paketAd ?? null,
        paketId: cache?.paketId ?? null,
      };
      emit(fallback);
      return fallback;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

export function alertPackageRequired(
  codes?: string | string[] | null,
  onGoPackages?: () => void,
): void {
  const label = Array.isArray(codes) ? codes.join(', ') : codes || 'bu özellik';
  const msg =
    `«${label}» mevcut paketinizde yok veya aktif paket seçilmemiş.\n\nPaketinizi yükselterek açabilirsiniz.`;

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const go = window.confirm(`${msg}\n\nPaketlere gitmek ister misiniz?`);
    if (go) onGoPackages?.();
    return;
  }

  Alert.alert('Paket gerekli', msg, [
    { text: 'Tamam', style: 'cancel' },
    ...(onGoPackages
      ? [{ text: 'Paketlere git', onPress: onGoPackages }]
      : []),
  ]);
}

/**
 * Returns true if allowed. If locked, shows upgrade alert and returns false.
 */
export function ensureFeature(
  data: PackageFeaturesData | null | undefined,
  codes: string | string[] | null | undefined,
  onGoPackages?: () => void,
): boolean {
  const d = data ?? cache ?? EMPTY;
  if (hasAnyFeature(d.features, codes, d.restrict)) return true;
  alertPackageRequired(codes, onGoPackages);
  return false;
}

export function ensureScreen(
  screen: ScreenId,
  data: PackageFeaturesData | null | undefined,
  onGoPackages?: () => void,
): boolean {
  const codes = featureCodesForScreen(screen);
  if (!codes) return true;
  return ensureFeature(data, codes, onGoPackages);
}
