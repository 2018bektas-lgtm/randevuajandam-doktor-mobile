# Mağaza + IAP kurulum rehberi

## 1. Yasal sayfalar (hazır)

| Sayfa | URL |
|-------|-----|
| Gizlilik | https://randevuajandam.com/gizlilik-politikasi |
| Kullanım | https://randevuajandam.com/kullanim-kosullari |
| KVKK | https://randevuajandam.com/kvkk |

Site deploy sonrası tarayıcıda açıldığını doğrulayın.

---

## 2. App Store ID

1. [App Store Connect](https://appstoreconnect.apple.com) → Apps → Randevu Ajandam Doktor  
2. **App Information** → **Apple ID** (sayısal)  
3. Mobil:

```bash
# .env veya EAS secrets
EXPO_PUBLIC_APP_STORE_ID=647xxxxxxx
```

veya `app.json` → `extra.appStoreId`.

---

## 3. Store product ID’leri

Her ücretli **bireysel** paket için (ör. id=2 Starter):

| Periyot | Product ID |
|---------|------------|
| Aylık | `com.randevuajandam.doktor.pkg.2.monthly` |
| Yıllık | `com.randevuajandam.doktor.pkg.2.yearly` |

Aynı şema: `com.randevuajandam.doktor.pkg.{paketler.id}.monthly|yearly`

- Demo (id=1) ücretsiz → mağaza ürünü gerekmez  
- Klinik paketler (6–8) IAP ile satılmaz  

App Store Connect + Google Play Console’da **subscription** olarak oluşturun.

---

## 4. RevenueCat

1. [app.revenuecat.com](https://app.revenuecat.com) proje oluştur  
2. iOS / Android app bağla (`com.randevuajandam.doktor`)  
3. Products’ı store’dan import et  
4. Entitlement örn. `premium` veya paket bazlı  
5. Public SDK keys → mobil env:

```
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_xxx
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxx
```

6. Server secret (Laravel `.env`):

```
REVENUECAT_SECRET_KEY=sk_xxx
REVENUECAT_WEBHOOK_SECRET=whsec_or_random_string
```

7. Webhook URL:

```
https://randevuajandam.com/api/mobile/v1/app/revenuecat-webhook
```

Authorization: `Bearer {REVENUECAT_WEBHOOK_SECRET}`  
Event: INITIAL_PURCHASE, RENEWAL, …

App User ID formatı uygulamada: `doktor_{id}`

---

## 5. EAS build (IAP Expo Go’da çalışmaz)

```bash
# development client
eas build -p android --profile development

# production AAB
eas build -p android --profile production
```

`eas.json` env alanlarına RC keys ve APP_STORE_ID ekleyin (veya EAS Secrets).

---

## 6. Laravel (site)

```env
REVENUECAT_SECRET_KEY=
REVENUECAT_WEBHOOK_SECRET=
# Sadece staging: client transaction'a güven (production'da false)
MOBILE_IAP_TRUST_CLIENT=false
```

Client `POST /doctor/packages/iap-confirm` + webhook ile paket aktifleşir.

---

## 7. Kontrol listesi

- [ ] Gizlilik / kullanım URL mağaza listing’te  
- [ ] Apple ID numeric set  
- [ ] Product ID’ler store + RC  
- [ ] RC public keys mobilde  
- [ ] RC secret + webhook sitede  
- [ ] Production / dev-client APK’da satın alma testi  
- [ ] Havale yedek akışı çalışıyor  
