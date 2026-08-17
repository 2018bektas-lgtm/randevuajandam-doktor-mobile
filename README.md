# Randevu Ajandam — Doktor Mobil Uygulaması

Expo (SDK 57) ile hekim paneli mobil istemcisi.

## Kurulum

```bash
npm install
npx expo start
```

Ortam değişkeni (`.env`):

```
# Production (APK / canlı)
EXPO_PUBLIC_API_URL=https://randevuajandam.com/api/mobile/v1

# Local (örnek)
# EXPO_PUBLIC_API_URL=http://10.0.2.2:8003/api/mobile/v1
```

API kaynağı: `randevuajandam-site` → `https://randevuajandam.com/api/mobile/v1/doctor/*`

## IAP / mağaza abonelikleri

App Store, Google Play ve RevenueCat:

- **Sıfırdan ne yapacağım?** → **[docs/IAP-SIFIRDAN-ADIM-ADIM.md](docs/IAP-SIFIRDAN-ADIM-ADIM.md)**  
- **Product ID / teknik tablo** → **[docs/IAP-URUN-ESLEME.md](docs/IAP-URUN-ESLEME.md)**

## Canlıya alma (kod tarafı hazır)

| Adım | Komut / not |
|------|-------------|
| Tip kontrol | `npm run typecheck` |
| Config kontrol | `npm run config:check` |
| Test APK | `npm run build:apk` (`preview` → production API) |
| Play AAB | `npm run build:aab` (`production`, autoIncrement) |
| Play gönder | `npm run submit:android` (internal track draft) |
| iOS prod | `GoogleService-Info.plist` ekle → `npm run build:ios:prod` |

### EAS secrets (opsiyonel ama önerilir)

```bash
eas secret:create --name EXPO_PUBLIC_SENTRY_DSN --value "https://...@....ingest.sentry.io/..."
eas secret:create --name EXPO_PUBLIC_REVENUECAT_ANDROID_KEY --value "goog_..."
eas secret:create --name EXPO_PUBLIC_REVENUECAT_IOS_KEY --value "appl_..."
eas secret:create --name EXPO_PUBLIC_APP_STORE_ID --value "1234567890"
```

`app.config.js` bu env değerlerini binary `extra` alanına basar.  
RevenueCat / App Store ID yoksa uygulama çalışır; IAP ve iOS review linki kapalı kalır.

### iOS push

1. Firebase Console → iOS app (`com.randevuajandam.doktor`)
2. `GoogleService-Info.plist` dosyasını proje köküne koy
3. `app.config.js` dosyayı otomatik bağlar

### Kodda production korumaları

- Local API yalnızca `EXPO_PUBLIC_USE_LOCAL_API=1` ile (EAS’te `0`)
- Paket yetkileri = site `paket.yetki` / `package-features`
- Splash, adaptive icon, photo/camera/document izin metinleri
- Sürüm: `1.2.1` / Android `versionCode` 5 / iOS `buildNumber` 5

## Android APK (EAS)

```bash
npm i -g eas-cli
eas login
eas build:configure
npm run build:apk
```

`eas.json` → `preview` profili imzalı **APK** üretir (API: randevuajandam.com).

## Modüller

| Alan | Özellikler |
|------|------------|
| Özet | Dashboard istatistikleri, klinik davet kabul/red, hızlı işlemler |
| Takvim | Haftalık şerit, randevu ekle/ertele/durum, detay (hekim notu, hizmet, sil, online join) |
| Talepler | Bekleyen randevular |
| Hastalar | Arama, ekle, detay + geçmiş, dosya yükle/sil, onam imzala |
| Onam formları | Form CRUD, aktif/pasif, hasta detayından imza |
| Bekleme listesi | Durum, bildir, sil |
| İzin / hızlı kapat | Uzun izin + günlük slot kapatma |
| Çalışma saatleri / ayarlar | Tam düzenleme |
| Hizmetler, blog, yorum, galeri, SSS, eğitim | CRUD (galeri/blog görsel yükleme) |
| Finans | Özet, gelir (kalem ekle/sil), gider, kategori (düzenle), bakiye |
| Klinik | Üye + sahip: hekim, mesai özeti, personel, talepler, takvim, finans özeti, gider, hakediş, rapor/PDF, logo/SEO/çalışma saatleri, website |
| Referans | Davet kodu/link, kota, davet listesi |
| Personel | Randevu, erteleme, talep, hasta, ödeme |
| Profil / şifre / hakkımda / 2FA / web sitesi / paket | Kurulum ve yönetim (klinik sahibi havale ile paket yükseltebilir) |

## Notlar

- 2FA: giriş challenge + ayarlardan kurulum (QR / secret)
- Galeri / blog / profil: `expo-image-picker` (galeri + kamera)
- Hasta ve randevu detayından ara / SMS / e-posta
- Klinik sahibi paneli mobil sekme menüsünde; üye rolünde kısıtlı
- Web paneli ile aynı Laravel API’yi kullanır
- Paket yetkileri: `package-features` allowlist = site `paket.yetki` kodları (menü, tab, ekran, iCal, online görüşme, hasta dosya/onam, finans rapor, yorum yanıt)
- Safe area: geri butonu, modal ve alt menü status bar / home indicator’a göre kaydırıldı
