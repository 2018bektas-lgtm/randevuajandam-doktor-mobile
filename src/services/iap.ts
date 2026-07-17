/**
 * In-app purchases via RevenueCat (react-native-purchases).
 * Product IDs: com.randevuajandam.doktor.pkg.{backendPaketId}.monthly|yearly
 *
 * Requires production / dev-client build (not Expo Go).
 * Configure EXPO_PUBLIC_REVENUECAT_IOS_KEY / ANDROID_KEY + store products.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isIapConfigured, revenueCatApiKey } from '../config/store';
import { apiPost } from '../api/client';

export const PENDING_IAP_KEY = 'randevuajandam.pending.iap.v1';

export type IapPeriod = 'aylik' | 'yillik';

export type PendingIap = {
  packageKey: string;
  packageName: string;
  period: IapPeriod;
  productId: string;
  paketId?: number | null;
  tur?: 'bireysel' | 'klinik';
  createdAt: string;
};

export const PACKAGE_DB_IDS: Record<string, number> = {
  demo: 1,
  starter: 2,
  plus: 3,
  vip: 4,
  web: 5,
  klinik_baslangic: 6,
  klinik_profesyonel: 7,
  klinik_kurumsal: 8,
};

export function productIdForDbId(dbId: number, period: IapPeriod): string {
  const suffix = period === 'aylik' ? 'monthly' : 'yearly';
  return `com.randevuajandam.doktor.pkg.${dbId}.${suffix}`;
}

export function productIdFor(
  packageKey: string,
  period: IapPeriod,
  paketId?: number | null,
): string | null {
  const id = paketId ?? PACKAGE_DB_IDS[packageKey] ?? null;
  if (id == null) return null;
  return productIdForDbId(id, period);
}

export const IAP_PRODUCT_IDS: Record<string, { aylik: string; yillik: string }> = Object.fromEntries(
  Object.entries(PACKAGE_DB_IDS).map(([key, id]) => [
    key,
    {
      aylik: productIdForDbId(id, 'aylik'),
      yillik: productIdForDbId(id, 'yillik'),
    },
  ]),
);

export async function savePendingIap(p: PendingIap): Promise<void> {
  await AsyncStorage.setItem(PENDING_IAP_KEY, JSON.stringify(p));
}

export async function loadPendingIap(): Promise<PendingIap | null> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_IAP_KEY);
    return raw ? (JSON.parse(raw) as PendingIap) : null;
  } catch {
    return null;
  }
}

export async function clearPendingIap(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_IAP_KEY);
}

export type PurchaseResult =
  | { ok: true; free?: boolean; pending?: boolean; message: string; activated?: boolean }
  | { ok: false; message: string };

export type ApplyPendingResult = {
  applied: boolean;
  action: 'none' | 'free_activated' | 'open_packages' | 'klinik_preference' | 'preferred_saved' | 'error';
  message?: string;
  paketId?: number | null;
  packageName?: string;
  packageKey?: string;
  period?: IapPeriod;
};

/** RevenueCat Purchases default export (typed loosely for SDK version drift) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PurchasesSDK = any;

let purchasesMod: PurchasesSDK | null | undefined;
let configuredForUser: string | null = null;

function getPurchases(): PurchasesSDK | null {
  if (purchasesMod !== undefined) return purchasesMod;
  if (Platform.OS === 'web') {
    purchasesMod = null;
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-purchases');
    purchasesMod = mod?.default ?? mod;
    return purchasesMod;
  } catch {
    purchasesMod = null;
    return null;
  }
}

/** Configure RevenueCat once per doctor session (app_user_id = doktor_{id}) */
export async function configurePurchases(doktorId?: number | null): Promise<boolean> {
  const key = revenueCatApiKey();
  const Purchases = getPurchases();
  if (!key || !Purchases) {
    return false;
  }
  const appUserId = doktorId ? `doktor_${doktorId}` : undefined;
  const cacheKey = `${key}:${appUserId ?? 'anon'}`;
  if (configuredForUser === cacheKey) {
    return true;
  }
  try {
    if (Purchases.LOG_LEVEL?.WARN != null) {
      Purchases.setLogLevel?.(Purchases.LOG_LEVEL.WARN);
    }
    if (appUserId) {
      await Purchases.configure({ apiKey: key, appUserID: appUserId });
    } else {
      await Purchases.configure({ apiKey: key });
    }
    configuredForUser = cacheKey;
    return true;
  } catch {
    return false;
  }
}

export async function loginPurchasesUser(doktorId: number): Promise<void> {
  const Purchases = getPurchases();
  if (!Purchases || !isIapConfigured()) return;
  try {
    await configurePurchases(doktorId);
    await Purchases.logIn(`doktor_${doktorId}`);
    configuredForUser = `${revenueCatApiKey()}:doktor_${doktorId}`;
  } catch {
    /* ignore */
  }
}

/**
 * Purchase store product by backend paket id + period, then confirm on API.
 */
export async function purchaseStorePackage(opts: {
  paketId: number;
  packageName: string;
  period: IapPeriod;
  doktorId?: number | null;
}): Promise<PurchaseResult> {
  if (Platform.OS === 'web') {
    return { ok: false, message: 'Mağaza satın alma yalnızca iOS / Android.' };
  }

  const productId = productIdForDbId(opts.paketId, opts.period);
  const ready = await configurePurchases(opts.doktorId ?? null);
  const Purchases = getPurchases();

  if (!ready || !Purchases || !isIapConfigured()) {
    await savePendingIap({
      packageKey: `pkg_${opts.paketId}`,
      packageName: opts.packageName,
      period: opts.period,
      productId,
      paketId: opts.paketId,
      tur: 'bireysel',
      createdAt: new Date().toISOString(),
    });
    return {
      ok: true,
      pending: true,
      message:
        'Mağaza IAP bu derlemede yapılandırılmamış (RevenueCat anahtarı veya production build gerekir). Seçim kaydedildi; havale ile de tamamlayabilirsiniz.',
    };
  }

  try {
    if (opts.doktorId) {
      await loginPurchasesUser(opts.doktorId);
    }

    const products = await Purchases.getProducts([productId]);
    const product = products?.[0];
    if (!product) {
      return {
        ok: false,
        message: `Mağaza ürünü bulunamadı: ${productId}. App Store / Play Console ve RevenueCat ürün eşlemesini kontrol edin.`,
      };
    }

    const result = await Purchases.purchaseStoreProduct(product);
    const customerInfo = result?.customerInfo ?? result;
    const transactionId =
      customerInfo?.nonSubscriptionTransactions?.[0]?.transactionIdentifier ||
      customerInfo?.originalAppUserId ||
      `${productId}_${Date.now()}`;

    try {
      const appUserId = opts.doktorId ? `doktor_${opts.doktorId}` : undefined;
      const res = await apiPost('/doctor/packages/iap-confirm', {
        paket_id: opts.paketId,
        odeme_periyodu: opts.period,
        product_id: productId,
        transaction_id: String(transactionId),
        app_user_id: appUserId,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
      });
      await clearPendingIap();
      return {
        ok: true,
        activated: true,
        message: res.message ?? `${opts.packageName} aktifleştirildi.`,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Backend aktivasyonu başarısız.';
      // Purchase succeeded at store — keep pending for retry
      await savePendingIap({
        packageKey: `pkg_${opts.paketId}`,
        packageName: opts.packageName,
        period: opts.period,
        productId,
        paketId: opts.paketId,
        tur: 'bireysel',
        createdAt: new Date().toISOString(),
      });
      return {
        ok: true,
        pending: true,
        message: `Ödeme alındı ancak sunucu aktivasyonu: ${msg}. Destek ile iletişime geçin veya Paketler ekranından tekrar deneyin.`,
      };
    }
  } catch (e: unknown) {
    const err = e as { userCancelled?: boolean; code?: string; message?: string };
    if (err?.userCancelled || err?.code === '1' || String(err?.message ?? '').includes('cancelled')) {
      return { ok: false, message: 'Satın alma iptal edildi.' };
    }
    return {
      ok: false,
      message: err?.message ?? 'Mağaza satın alma başarısız.',
    };
  }
}

export async function restorePurchases(doktorId?: number | null): Promise<PurchaseResult> {
  const Purchases = getPurchases();
  if (!Purchases || !isIapConfigured()) {
    return { ok: false, message: 'IAP yapılandırılmamış.' };
  }
  try {
    await configurePurchases(doktorId ?? null);
    await Purchases.restorePurchases();
    return { ok: true, message: 'Satın almalar geri yüklendi. Aktif abonelik varsa paket ekranından doğrulayın.' };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Geri yükleme başarısız.' };
  }
}

export async function applyPendingPackageAfterAuth(
  post: <T = unknown>(
    path: string,
    body?: Record<string, unknown>,
  ) => Promise<{ success?: boolean; message?: string; data?: T }>,
  doktorId?: number | null,
): Promise<ApplyPendingResult> {
  const pending = await loadPendingIap();
  if (!pending) {
    return { applied: false, action: 'none' };
  }

  const paketId = pending.paketId ?? PACKAGE_DB_IDS[pending.packageKey] ?? null;
  const isKlinik = pending.tur === 'klinik' || pending.packageKey.startsWith('klinik_');
  const isFree =
    pending.productId === 'free' ||
    pending.packageKey === 'demo' ||
    pending.productId.endsWith('.pkg.1.monthly') ||
    pending.productId.endsWith('.pkg.1.yearly');

  try {
    if (doktorId) {
      void loginPurchasesUser(doktorId);
    }

    if (paketId) {
      try {
        await post('/doctor/packages/prefer', {
          paket_id: paketId,
          odeme_periyodu: pending.period,
          package_key: pending.packageKey,
          tur: isKlinik ? 'klinik' : 'bireysel',
        });
      } catch {
        /* best-effort */
      }
    }

    if (isKlinik) {
      return {
        applied: true,
        action: 'klinik_preference',
        message: `${pending.packageName} klinik paketi tercih olarak kaydedildi.\n\nKlinik paketleri mobil abonelikle açılamaz; klinik kaydı web panelinden yapılır.`,
        paketId,
        packageName: pending.packageName,
        packageKey: pending.packageKey,
        period: pending.period,
      };
    }

    if (isFree && paketId) {
      const res = await post('/doctor/packages/subscribe', {
        paket_id: paketId,
        odeme_periyodu: pending.period,
        odeme_yontemi: 'ucretsiz',
      });
      await clearPendingIap();
      return {
        applied: true,
        action: 'free_activated',
        message: res.message ?? `${pending.packageName} aktifleştirildi.`,
        paketId,
        packageName: pending.packageName,
        packageKey: pending.packageKey,
        period: pending.period,
      };
    }

    return {
      applied: true,
      action: 'open_packages',
      message: `${pending.packageName} seçiminiz hazır.\n\nPaket & Abonelik ekranından mağaza satın alma veya havale ile tamamlayın.`,
      paketId,
      packageName: pending.packageName,
      packageKey: pending.packageKey,
      period: pending.period,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Paket tercihi uygulanamadı.';
    return {
      applied: false,
      action: 'error',
      message: msg,
      paketId,
      packageName: pending.packageName,
      packageKey: pending.packageKey,
      period: pending.period,
    };
  }
}

export async function purchasePackageInApp(opts: {
  packageKey: string;
  packageName: string;
  period: IapPeriod;
  isFree: boolean;
  paketId?: number | null;
  tur?: 'bireysel' | 'klinik';
  doktorId?: number | null;
}): Promise<PurchaseResult> {
  const paketId = opts.paketId ?? PACKAGE_DB_IDS[opts.packageKey] ?? null;
  const tur = opts.tur ?? (opts.packageKey.startsWith('klinik_') ? 'klinik' : 'bireysel');

  if (opts.isFree) {
    await savePendingIap({
      packageKey: opts.packageKey,
      packageName: opts.packageName,
      period: opts.period,
      productId: 'free',
      paketId,
      tur,
      createdAt: new Date().toISOString(),
    });
    return {
      ok: true,
      free: true,
      message: 'Ücretsiz paket seçildi. Kayıt / giriş sonrası otomatik aktifleştirilir.',
    };
  }

  if (tur === 'klinik') {
    const productId =
      productIdFor(opts.packageKey, opts.period, paketId) ?? `pending.klinik.${opts.packageKey}`;
    await savePendingIap({
      packageKey: opts.packageKey,
      packageName: opts.packageName,
      period: opts.period,
      productId,
      paketId,
      tur,
      createdAt: new Date().toISOString(),
    });
    return {
      ok: true,
      pending: true,
      message:
        'Klinik paketi tercih olarak kaydedildi. Aktivasyon klinik kaydı ile web panelinden yapılır.',
    };
  }

  if (paketId && isIapConfigured() && opts.doktorId) {
    return purchaseStorePackage({
      paketId,
      packageName: opts.packageName,
      period: opts.period,
      doktorId: opts.doktorId,
    });
  }

  // Guest onboarding or no RC key: queue only
  const productId =
    productIdFor(opts.packageKey, opts.period, paketId) ??
    `pending.${opts.packageKey}`;
  await savePendingIap({
    packageKey: opts.packageKey,
    packageName: opts.packageName,
    period: opts.period,
    productId,
    paketId,
    tur,
    createdAt: new Date().toISOString(),
  });

  return {
    ok: true,
    pending: true,
    message:
      'Paket seçildi. Giriş sonrası mağaza satın alma veya havale ile tamamlanır.',
  };
}
