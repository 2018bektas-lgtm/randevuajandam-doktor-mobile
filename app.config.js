/**
 * Dynamic Expo config for production builds.
 * - Injects EXPO_PUBLIC_* (RevenueCat, App Store ID, Sentry) into `extra`
 * - Attaches Firebase plist/json only when files exist (iOS optional until ready)
 * - Forces production defaults on EAS (no local API leakage)
 */
const fs = require('fs');
const path = require('path');

/** @param {string} p */
function exists(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

module.exports = () => {
  const appJson = require('./app.json');
  const expo = { ...appJson.expo };

  const root = __dirname;
  const androidGoogle = path.join(root, 'google-services.json');
  const iosGoogle = path.join(root, 'GoogleService-Info.plist');

  // Android FCM
  expo.android = {
    ...expo.android,
    ...(exists(androidGoogle) ? { googleServicesFile: './google-services.json' } : {}),
  };

  // iOS FCM / APNs via Firebase (optional until file is added)
  expo.ios = {
    ...expo.ios,
    ...(exists(iosGoogle) ? { googleServicesFile: './GoogleService-Info.plist' } : {}),
  };

  // EAS / CI injects secrets as env; never hardcode keys in app.json
  const extra = { ...(expo.extra || {}) };
  extra.appStoreId =
    process.env.EXPO_PUBLIC_APP_STORE_ID?.trim() || extra.appStoreId || '';
  extra.playPackageId =
    process.env.EXPO_PUBLIC_PLAY_PACKAGE_ID?.trim() ||
    extra.playPackageId ||
    'com.randevuajandam.doktor';
  extra.privacyUrl =
    process.env.EXPO_PUBLIC_PRIVACY_URL?.trim() ||
    extra.privacyUrl ||
    'https://randevuajandam.com/gizlilik-politikasi';
  extra.termsUrl =
    process.env.EXPO_PUBLIC_TERMS_URL?.trim() ||
    extra.termsUrl ||
    'https://randevuajandam.com/kullanim-kosullari';
  extra.kvkkUrl =
    process.env.EXPO_PUBLIC_KVKK_URL?.trim() ||
    extra.kvkkUrl ||
    'https://randevuajandam.com/kvkk';
  extra.revenueCatIosKey =
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY?.trim() || extra.revenueCatIosKey || '';
  extra.revenueCatAndroidKey =
    process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY?.trim() ||
    extra.revenueCatAndroidKey ||
    '';
  extra.sentryDsn =
    process.env.EXPO_PUBLIC_SENTRY_DSN?.trim() || extra.sentryDsn || '';
  extra.siteUrl =
    process.env.EXPO_PUBLIC_SITE_URL?.trim() ||
    extra.siteUrl ||
    'https://randevuajandam.com';
  extra.apiUrl =
    process.env.EXPO_PUBLIC_API_URL?.trim() ||
    extra.apiUrl ||
    'https://randevuajandam.com/api/mobile/v1';

  // Production / EAS: never bake local API into binary
  const easBuild = process.env.EAS_BUILD === 'true' || process.env.CI === 'true';
  if (easBuild) {
    extra.useLocalApi = '0';
  }

  expo.extra = extra;

  // Runtime version for future OTA (expo-updates) if enabled later
  if (!expo.runtimeVersion) {
    expo.runtimeVersion = { policy: 'appVersion' };
  }

  return { expo };
};
