# Randevu Ajandam Doktor — IAP Ürün Eşleme ve Canlı Kurulum

> **Uygulama:** Randevu Ajandam Doktor (`com.randevuajandam.doktor`)  
> **Stack:** Expo / React Native · RevenueCat (`react-native-purchases`) · App Store + Google Play  
> **Backend:** `randevuajandam-site` → `/api/mobile/v1`  
> **Son katalog kaynağı:** `GET https://randevuajandam.com/api/mobile/v1/app/packages-catalog`  
> **Güncelleme:** Bu dosya product ID kuralı kodla sabittir; fiyatlar canlı katalogdan alınmalıdır.  
>
> **Sıfırdan adım adım rehber (hesap aç → tık tık):** [IAP-SIFIRDAN-ADIM-ADIM.md](./IAP-SIFIRDAN-ADIM-ADIM.md)

---

## 1. Ne satılıyor? (kavram)

| Kanal | Açıklama | Para kime gider? |
|--------|----------|------------------|
| **App Store / Play IAP** | Uygulama içi abonelik (bu doküman) | Apple / Google → sizin developer hesabı |
| **Havale / EFT** | Mobil paket ekranından talep | Banka hesabınız |
| **Web kart (PayTR vb.)** | Hekim web paneli | Sizin ödeme sağlayıcınız |

**Apple Pay / Google Pay:** Ayrı bir “cüzdan API” entegrasyonu yok. Kullanıcı mağaza ödeme ekranında (StoreKit / Play Billing) bu yöntemleri seçebilir; teknik olarak işlem **IAP aboneliğidir**.

**Klinik paketler:** Mobil kodda IAP ile **aktifleştirilmez**. Havale veya web panel kullanılır.

**Ücretsiz Vitrin:** IAP yok; uygulama ücretsiz abonelik yolu ile aktifleştirir.

---

## 2. Product ID kuralı (değiştirme)

Kod ve API aynı formatı kullanır:

```text
com.randevuajandam.doktor.pkg.{PAKET_ID}.monthly
com.randevuajandam.doktor.pkg.{PAKET_ID}.yearly
```

| Parça | Anlam |
|--------|--------|
| `com.randevuajandam.doktor` | Uygulama paket / bundle kimliği |
| `pkg` | Sabit segment |
| `{PAKET_ID}` | Veritabanı `paketler.id` (sayı) |
| `monthly` / `yearly` | Aylık / yıllık (İngilizce sabit; Türkçe değil) |

**Kaynaklar:**

| Katman | Dosya / endpoint |
|--------|------------------|
| Mobil | `src/services/iap.ts` → `productIdForDbId()` |
| API katalog | `MobileAppPublicController::packagesCatalog` → `iap_product_aylik` / `iap_product_yillik` |
| Backend parse | `App\Services\MobileIapService::productIdFor` / `parseProductId` |
| Prefix config | `MOBILE_IAP_PRODUCT_PREFIX` (varsayılan: `com.randevuajandam.doktor.pkg.`) |

### RevenueCat app user id

```text
doktor_{hekim_id}
```

Örnek: hekim id `42` → `doktor_42`

---

## 3. Canlı paket ↔ product ID tablosu

Fiyatlar katalogdaki **gösterim / indirimli** tutarlardır (₺). Mağaza fiyatı güncellenirken site paneli ile hizalayın.

### 3.1 Mağazada OLUŞTUR — bireysel ücretli (IAP)

| DB id | Paket adı | Tür | Aylık ₺ | Yıllık ₺ | Product ID — aylık | Product ID — yıllık |
|------:|-----------|-----|--------:|---------:|--------------------|---------------------|
| **2** | Başlangıç | bireysel | 1.000 | 9.600 | `com.randevuajandam.doktor.pkg.2.monthly` | `com.randevuajandam.doktor.pkg.2.yearly` |
| **3** | Profesyonel | bireysel | 1.750 | 16.800 | `com.randevuajandam.doktor.pkg.3.monthly` | `com.randevuajandam.doktor.pkg.3.yearly` |
| **4** | VIP | bireysel | 2.500 | 24.000 | `com.randevuajandam.doktor.pkg.4.monthly` | `com.randevuajandam.doktor.pkg.4.yearly` |
| **5** | Özel Web | bireysel | 3.750 | 36.000 | `com.randevuajandam.doktor.pkg.5.monthly` | `com.randevuajandam.doktor.pkg.5.yearly` |

**Toplam abonelik ürünü:** 4 paket × 2 periyot = **8 product**  
(iOS ve Android’de **aynı Product ID string** kullanılır.)

### 3.2 Mağazada OLUŞTURMA — ücretsiz

| DB id | Paket | Neden |
|------:|--------|--------|
| **12** | Vitrin | `ucretsiz_mi: true` — IAP gerekmez |

> Not: Katalog API yine de `pkg.12.monthly/yearly` üretir; bunları mağazaya **eklemeyin**. Uygulama ücretsiz yolu kullanır.

### 3.3 Mağazada OLUŞTURMA — klinik (IAP kapalı)

| DB id | Paket | Aylık ₺ (ind.) | Yıllık ₺ (ind.) | Satış kanalı |
|------:|--------|---------------:|----------------:|--------------|
| **6** | Klinik Başlangıç | 2.400 | 22.900 | Havale / web |
| **7** | Klinik Plus | 4.200 | 39.900 | Havale / web |
| **8** | Klinik Profesyonel | 5.500 | 52.500 | Havale / web |
| **9** | Klinik Özel Web Sitesi | 8.500 | 79.900 | Havale / web |

Mobil mesaj: *“Klinik paketleri mağaza IAP ile satılmaz.”*

### 3.4 Kopyala-yapıştır listesi (sadece IAP)

```text
com.randevuajandam.doktor.pkg.2.monthly
com.randevuajandam.doktor.pkg.2.yearly
com.randevuajandam.doktor.pkg.3.monthly
com.randevuajandam.doktor.pkg.3.yearly
com.randevuajandam.doktor.pkg.4.monthly
com.randevuajandam.doktor.pkg.4.yearly
com.randevuajandam.doktor.pkg.5.monthly
com.randevuajandam.doktor.pkg.5.yearly
```

---

## 4. Google Play Console

### 4.1 Önkoşullar

- [ ] Developer hesabı açık
- [ ] Uygulama paketi: `com.randevuajandam.doktor`
- [ ] Play App Signing yapılandırılmış
- [ ] Merchant / payments profili (abonelik satışı için)

### 4.2 Abonelik oluşturma

Her product için:

1. **Monetize with Play → Products → Subscriptions → Create subscription**
2. **Product ID** = yukarıdaki string (**değiştirilemez**, bir kez doğru yazın)
3. **Name** (ör.): `Başlangıç Aylık` / `Profesyonel Yıllık`
4. **Base plan**
   - `monthly` → 1 month billing period  
   - `yearly` → 1 year billing period  
5. **Price:** Turkey (TRY), site fiyatına yakın
6. (Opsiyonel) Free trial — örn. Başlangıç için 14 gün (site metniyle uyumlu)
7. Subscription **Active**

### 4.3 Test

- [ ] **License testing** e-postaları ekle
- [ ] Internal testing track’e APK/AAB yükle
- [ ] Test hesabıyla satın al → anında ücret yansımadan test

### 4.4 Sık hatalar

| Hata | Sonuç |
|------|--------|
| Product ID yazım hatası | App: “Mağaza ürünü bulunamadı” |
| Base plan yok / inactive | Satın alma sheet boş |
| Sadece AAB yok, imzasız APK | Play test kısıtlı |

---

## 5. App Store Connect

### 5.1 Önkoşullar

- [ ] Apple Developer Program
- [ ] App kaydı: Bundle ID `com.randevuajandam.doktor`
- [ ] **Paid Applications Agreement** + banka / vergi bilgisi onaylı
- [ ] App Store Connect API key (RevenueCat için önerilir)

### 5.2 Subscription Group

Öneri grup adı: `randevu_ajandam_hekim`

Aynı gruptaki abonelikler yükseltme/düşürme için birlikte yönetilir.

### 5.3 Her product

1. **Subscriptions → Create**
2. **Product ID** = tablodaki string (küçük harf `monthly` / `yearly`)
3. Reference Name: `Baslangic Monthly` vb.
4. Duration: 1 Month / 1 Year
5. Subscription Prices → Turkey
6. Localizations (TR + EN kısa açıklama)
7. Review notes: *“Unlocks doctor panel features matching website package {ad}.”*
8. Review screenshot (paket ekranı)

### 5.4 Sandbox

- [ ] **Users and Access → Sandbox → Testers** ekle
- [ ] Cihazda: Settings → App Store → Sandbox Account
- [ ] Test satın alma (ücret kesilmez)

### 5.5 App Store ID

Yayın sonrası numeric Apple ID’yi not et:

```env
EXPO_PUBLIC_APP_STORE_ID=xxxxxxxxxx
```

Uygulama “değerlendir” linki için kullanılır (`src/config/store.ts`).

---

## 6. RevenueCat

### 6.1 Proje ve uygulamalar

1. [RevenueCat](https://app.revenuecat.com) proje oluştur  
2. **iOS app:** Bundle `com.randevuajandam.doktor`  
3. **Android app:** Package `com.randevuajandam.doktor`  
4. Store credentials:
   - iOS: App Store Connect API Key  
   - Android: Google Play service account JSON  

### 6.2 Products

- [ ] Yukarıdaki **8 product ID**’yi ekle / import et  
- [ ] Store’daki ürünlerle **birebir** eşleşsin  

### 6.3 Entitlements (önerilen isimlendirme)

Backend asıl olarak **product_id parse** eder; entitlement isimleri esnek. Öneri:

| Entitlement identifier | Bağlı product’lar |
|------------------------|-------------------|
| `paket_baslangic` | `pkg.2.monthly`, `pkg.2.yearly` |
| `paket_profesyonel` | `pkg.3.monthly`, `pkg.3.yearly` |
| `paket_vip` | `pkg.4.monthly`, `pkg.4.yearly` |
| `paket_web` | `pkg.5.monthly`, `pkg.5.yearly` |

Alternatif: tek entitlement `hekim_ucretli` + 8 ürün (daha basit; backend yine product_id kullanır).

### 6.4 Offerings (opsiyonel)

Uygulama şu an çoğunlukla **doğrudan product id** ile satın alır (`purchaseStorePackage`). Offering şart değil; isterseniz:

- Offering: `default`
- Packages: `$rc_monthly` / custom per plan  

### 6.5 API keys

| Key tipi | Nerede | Env / secret |
|----------|--------|----------------|
| Public iOS (`appl_...`) | Mobil EAS | `EXPO_PUBLIC_REVENUECAT_IOS_KEY` |
| Public Android (`goog_...`) | Mobil EAS | `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` |
| Secret (`sk_...`) | **Sadece sunucu** | `REVENUECAT_SECRET_KEY` |

```bash
# EAS (mobil binary)
eas secret:create --name EXPO_PUBLIC_REVENUECAT_IOS_KEY --value "appl_..."
eas secret:create --name EXPO_PUBLIC_REVENUECAT_ANDROID_KEY --value "goog_..."
```

`app.config.js` bu env’leri `extra` alanına basar. **Key yoksa** IAP devre dışı; havale yolu çalışır.

### 6.6 Webhook

| Alan | Değer |
|------|--------|
| URL | `https://randevuajandam.com/api/mobile/v1/app/revenuecat-webhook` |
| Auth | `Authorization: Bearer {REVENUECAT_WEBHOOK_SECRET}` |
| Route | `routes/mobile.php` → `MobileAppPublicController::revenueCatWebhook` |

**Önerilen event’ler:**

- `INITIAL_PURCHASE`
- `RENEWAL`
- `PRODUCT_CHANGE`
- `CANCELLATION` (bilgi)
- `EXPIRATION` / `SUBSCRIPTION_PAUSED` (süre bitince paket düşürme politikasına göre)

Site `.env`:

```env
REVENUECAT_SECRET_KEY=sk_...
REVENUECAT_WEBHOOK_SECRET=uzun_rastgele_string
REVENUECAT_PROJECT_ID=  # opsiyonel
```

`config/services.php`:

```php
'revenuecat' => [
    'secret_key' => env('REVENUECAT_SECRET_KEY'),
    'webhook_secret' => env('REVENUECAT_WEBHOOK_SECRET'),
    'project_id' => env('REVENUECAT_PROJECT_ID'),
],
```

Webhook secret **boşsa** endpoint `503` döner.

---

## 7. Backend API akışları

### 7.1 Satın alma sonrası (istemci)

```http
POST /api/mobile/v1/doctor/packages/iap-confirm
Authorization: Bearer {doktor_mobile_token}
Content-Type: application/json
```

```json
{
  "paket_id": 3,
  "odeme_periyodu": "aylik",
  "product_id": "com.randevuajandam.doktor.pkg.3.monthly",
  "transaction_id": "GPA.xxxx-veya-Apple-tx",
  "app_user_id": "doktor_42",
  "platform": "android"
}
```

`odeme_periyodu`: `aylik` | `yillik` (Türkçe; product id’deki `monthly`/`yearly` ile eşlenir).

**Controller:** `MobileDoctorController::confirmIapPurchase`  
**Servis:** `MobileIapService::verifyPurchase` + `activate`

Production’da `REVENUECAT_SECRET_KEY` set ise RevenueCat subscriber API ile doğrulama yapılır.  
`MOBILE_IAP_TRUST_CLIENT=true` **yalnızca staging** için client’a güvenme bayrağıdır — production’da açmayın.

### 7.2 Katalog (onboarding / UI)

```http
GET /api/mobile/v1/app/packages-catalog
```

Her item: `iap_product_aylik`, `iap_product_yillik`, fiyatlar, `ucretsiz_mi`, `tur`.

### 7.3 Havale (IAP alternatifi)

```http
POST /api/mobile/v1/doctor/packages/subscribe
```

```json
{
  "paket_id": 3,
  "odeme_periyodu": "aylik",
  "odeme_yontemi": "havale",
  "havale_referans": "EFT-REF-123"
}
```

Ücretli pakette mobilde kart yok; mesaj: web panelden kart.

### 7.4 Tercih (ödeme öncesi)

```http
POST /api/mobile/v1/doctor/packages/prefer
```

Onboarding seçimini kaydeder; aktif üyelik açmaz.

### 7.5 Activate sonucu (DB)

`MobileIapService::activate` özetle:

- `doktor.paket_id` = paket  
- `odeme_periyodu` = aylik/yillik  
- `uyelik_baslangic` / `uyelik_bitis` (+1 ay veya +1 yıl)  
- `iyzico_subscription_status` = `ACTIVE` (alan adı tarihsel; IAP da buraya yazar)  
- `platformda_gorunur` = true  
- İsteğe bağlı `UyelikOdeme` kaydı (`odeme_yontemi: iap`, `provider: revenuecat`) + referans ödülü  

---

## 8. Mobil uygulama akışı

```text
Login
  → configurePurchases(doktorId)     // app_user_id = doktor_{id}
  → Paket & Abonelik ekranı
  → purchaseStorePackage({ paketId, period, packageName })
       │
       ├─ RevenueCat key yok → pending kaydet + “havale ile tamamla”
       ├─ Product yok → hata mesajı
       └─ purchaseStoreProduct
            → POST /doctor/packages/iap-confirm
            → paket özellikleri (package-features) yenilenir
```

**Dosyalar:**

| Dosya | Rol |
|--------|-----|
| `src/services/iap.ts` | Satın alma, product id, pending, restore |
| `src/config/store.ts` | RevenueCat public key okuma |
| `src/screens/Modules.tsx` | Paketler UI (mağaza / havale) |
| `app.config.js` | EAS env → `extra.revenueCat*` |

**Build şartı:** Production veya preview **EAS binary**. Expo Go’da IAP çalışmaz.

**İptal:** Kullanıcı App Store / Play abonelik ayarlarından iptal eder. Uygulama sunucudan mağaza aboneliğini “iptal edemez”; UI mağaza yönetim URL’sine yönlendirebilir (`getStoreSubscriptionInfo`).

---

## 9. Uçtan uca test checklist

### Ortam

- [ ] Preview/production APK veya IPA (EAS)
- [ ] `EXPO_PUBLIC_REVENUECAT_*` binary’de dolu
- [ ] Site `REVENUECAT_SECRET_KEY` + webhook secret
- [ ] Sandbox / license test hesabı

### Senaryolar

| # | Senaryo | Beklenen |
|---|---------|----------|
| 1 | Başlangıç aylık satın al | `paket_id=2`, özellikler açılır |
| 2 | Profesyonel yıllık | `paket_id=3`, `odeme_periyodu=yillik` |
| 3 | Aynı transaction tekrar | Idempotent / “already used” |
| 4 | Klinik pakette IAP | UI engeller |
| 5 | Vitrin | Ücretsiz yol; mağaza sheet yok |
| 6 | Havale | Talep oluşur; onay sonrası paket (admin) |
| 7 | Restore purchases | RevenueCat restore + gerekirse tekrar confirm |
| 8 | Webhook RENEWAL | Bitiş tarihi uzar |
| 9 | Yanlış product id | 4xx + anlamlı mesaj |

### Log / debug

- Site: `storage/logs` → `mobile_iap_activated`, `revenuecat_*`
- RevenueCat dashboard → Customer `doktor_{id}`
- Play / App Store order history (sandbox)

---

## 10. Kurulum sırası (özet)

```text
1. [ ] Play Console: 8 subscription (pkg 2–5 × monthly/yearly)
2. [ ] App Store Connect: aynı 8 product + agreement
3. [ ] RevenueCat: apps + products + credentials
4. [ ] RevenueCat webhook → site URL + Bearer secret
5. [ ] Site .env: REVENUECAT_SECRET_KEY, REVENUECAT_WEBHOOK_SECRET
6. [ ] EAS secrets: EXPO_PUBLIC_REVENUECAT_IOS_KEY / ANDROID_KEY
7. [ ] Yeni EAS build (apk/aab/ipa)
8. [ ] Sandbox test (en az pkg.2 + pkg.3)
9. [ ] Production track / App Review notları
```

---

## 11. Mağaza inceleme notları (kopyala)

**Kısa (TR):**

> Randevu Ajandam Doktor, hekimlerin randevu, hasta ve finans yönetimini sağlar.  
> Ücretli abonelikler hekim paneli özelliklerini (takvim, hasta kartı, SMS kotası vb.) paket seviyesine göre açar.  
> Demo hesap: [destek e-posta] / test hekim bilgisi.  
> Abonelik yönetimi: App Store / Play abonelik ayarları.

**İngilizce:**

> Subscription unlocks doctor practice features (calendar, patients, SMS quota, etc.) matching the selected plan on randevuajandam.com.  
> Cancel anytime in store subscription settings. No physical goods.

---

## 12. Fiyat güncelleme prosedürü

1. Site admin → paket aylık/yıllık fiyat  
2. Play / App Store base plan fiyat güncelle (yeni dönem)  
3. Katalog API otomatik yeni fiyatı gösterir  
4. **Product ID değiştirilmez** (yeni id = yeni ürün + kod/deploy)

Yeni paket (yeni `paketler.id`) eklenirse:

1. Mağazada `com.randevuajandam.doktor.pkg.{YENİ_ID}.monthly|yearly` oluştur  
2. RevenueCat’e ekle  
3. Kod kuralı zaten `{id}` kullandığı için **prefix doğruysa ek mobil kod gerekmez**  
4. Klinik ise IAP’ye ekleme  

---

## 13. İlgili env özeti

### Mobil (EAS / `.env`)

```env
EXPO_PUBLIC_API_URL=https://randevuajandam.com/api/mobile/v1
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_...
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_...
EXPO_PUBLIC_APP_STORE_ID=
EXPO_PUBLIC_PLAY_PACKAGE_ID=com.randevuajandam.doktor
```

### Site (`randevuajandam-site/.env`)

```env
REVENUECAT_SECRET_KEY=sk_...
REVENUECAT_WEBHOOK_SECRET=...
REVENUECAT_PROJECT_ID=
MOBILE_IAP_PRODUCT_PREFIX=com.randevuajandam.doktor.pkg.
MOBILE_IAP_TRUST_CLIENT=false
```

---

## 14. Referans linkler

| Kaynak | URL / path |
|--------|------------|
| Canlı katalog | `GET /api/mobile/v1/app/packages-catalog` |
| IAP confirm | `POST /api/mobile/v1/doctor/packages/iap-confirm` |
| Webhook | `POST /api/mobile/v1/app/revenuecat-webhook` |
| Mobil IAP | `src/services/iap.ts` |
| Backend IAP | `app/Services/MobileIapService.php` |
| Services config | `config/services.php` → `mobile_iap`, `revenuecat` |
| Canlı build | `README.md` (proje kökü) |

---

## 15. Sürüm notu

| Alan | Değer |
|------|--------|
| Doküman | `docs/IAP-URUN-ESLEME.md` |
| Uygulama | Randevu Ajandam Doktor |
| IAP paket id’leri (canlı) | 2, 3, 4, 5 |
| IAP dışı | 12 (ücretsiz), 6–9 (klinik) |

Katalog fiyatları değişirse **bölüm 3 tablosundaki ₺ sütunlarını** `packages-catalog` yanıtına göre güncelleyin; product ID satırları id değişmedikçe sabittir.
