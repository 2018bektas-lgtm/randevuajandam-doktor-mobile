# Sıfırdan mağaza aboneliği — Adım adım ne yapacaksın?

Bu rehber **hiç bilmeyen** için yazıldı.  
Amaç: Hekim uygulamasında **App Store / Google Play üzerinden paket satmak**.

Teknik product ID tablosu: [IAP-URUN-ESLEME.md](./IAP-URUN-ESLEME.md)

---

## Önce şunu bil

| Soru | Cevap |
|------|--------|
| Ne satıyorsun? | Hekim paneli **aboneliği** (aylık/yıllık) |
| Para kime gider? | Önce **Google / Apple**, onlar sana developer hesabından öder |
| PayTR ile aynı mı? | **Hayır.** PayTR = web kart. Bu = mağaza aboneliği |
| Klinik paket satılır mı? | **Mağazadan hayır** (sadece bireysel: Başlangıç, Profesyonel, VIP, Özel Web) |
| Hangi telefon? | Önce **Android** ile başla (daha kolay). iPhone sonra |

### Sana lazım olacak hesaplar (sırayla)

1. **Gmail** (Play için)  
2. **Google Play Console** (~25 USD tek seferlik)  
3. **Expo** (eas.dev — build için; muhtemelen var)  
4. **RevenueCat** (ücretsiz planla başlanır)  
5. **Apple Developer** (~99 USD/yıl) — **sadece iPhone mağazası** için, sonra  
6. Site sunucu **.env** erişimi (Hostinger / cPanel / SSH)

---

# BÖLÜM A — Android ile başla (önerilen yol)

## A1) Google Play Console hesabı aç

1. Bilgisayarda tarayıcıyı aç.  
2. Adrese git: **https://play.google.com/console**  
3. Google hesabınla giriş yap (iş Gmail’i tercih et).  
4. **Developer hesabı oluştur** de.  
5. Kimlik / ödeme adımlarını tamamla (kart + ~25 USD).  
6. Onay e-postası gelebilir; bazen 1–2 gün sürer.  
7. Console ana sayfayı görene kadar bekle.

> “Developer account is being verified” yazıyorsa onay bitene kadar abonelik ekleyemezsin; bekle.

---

## A2) Uygulamayı Play’e kaydet (henüz yayınlama)

1. Play Console → **Create app** / **Uygulama oluştur**.  
2. Doldur:
   - **App name:** `Randevu Ajandam Doktor`
   - **Default language:** Turkish  
   - **App or game:** App  
   - **Free or paid:** Free (uygulama ücretsiz; içinde abonelik satılır)  
3. Beyanları işaretle → **Create app**.  
4. Sol menüden **Dashboard** / **Uygulama panosu** gelsin.

### Package name kontrolü (çok önemli)

Uygulamanın teknik adı sabit:

```text
com.randevuajandam.doktor
```

Bunu **yanlış yazarsan** mağaza ile uygulama eşleşmez.  
Play’de uygulama oluştururken / ayarlarda bu paket adının proje ile aynı olduğundan emin ol (EAS ilk AAB yüklemesinde netleşir).

---

## A3) Mağaza listesi (zorunlu minimum — abonelik için)

Play abonelik eklemeden önce genelde şunlar ister:

1. Sol menü **Grow → Store presence → Main store listing** (veya **Mağaza listesi**):
   - Kısa açıklama  
   - Uzun açıklama  
   - Uygulama ikonu (512×512)  
   - En az 2 telefon ekran görüntüsü  
2. **App content** / **Uygulama içeriği**:
   - Privacy policy: `https://randevuajandam.com/gizlilik-politikasi`  
   - Content rating anketini doldur (basit sorular)  
   - Target audience  
   - Data safety (veri topluyor musun: hesap, randevu — “evet, hesap ile”)  

Hepsi “yeşil / tamam” olmasa bile **Internal testing** ile ilerlenebilir; eksikleri sonra kapatırsın.

---

## A4) 8 abonelik ürününü Play’de oluştur

**Nereye:** Play Console → sol menü **Monetize** (veya **Para kazan**) → **Products** → **Subscriptions** → **Create subscription**.

Aşağıdaki **Product ID’leri harf harf aynı** yaz (kopyala-yapıştır).  
Büyük harf / tire hatası olursa uygulama ürünü bulamaz.

### Oluşturacağın 8 ürün

| Sıra | Product ID (kopyala) | Ekranda görünen ad (örnek) | Süre |
|-----:|----------------------|----------------------------|------|
| 1 | `com.randevuajandam.doktor.pkg.2.monthly` | Başlangıç Aylık | 1 ay |
| 2 | `com.randevuajandam.doktor.pkg.2.yearly` | Başlangıç Yıllık | 1 yıl |
| 3 | `com.randevuajandam.doktor.pkg.3.monthly` | Profesyonel Aylık | 1 ay |
| 4 | `com.randevuajandam.doktor.pkg.3.yearly` | Profesyonel Yıllık | 1 yıl |
| 5 | `com.randevuajandam.doktor.pkg.4.monthly` | VIP Aylık | 1 ay |
| 6 | `com.randevuajandam.doktor.pkg.4.yearly` | VIP Yıllık | 1 yıl |
| 7 | `com.randevuajandam.doktor.pkg.5.monthly` | Özel Web Aylık | 1 ay |
| 8 | `com.randevuajandam.doktor.pkg.5.yearly` | Özel Web Yıllık | 1 yıl |

### Her ürün için tık tık

1. **Create subscription**  
2. **Product ID** alanına tablodaki ID’yi yapıştır → kaydet (sonra değiştirilemez)  
3. **Name / Title:** tablodaki Türkçe ad  
4. **Base plan ekle** (Add base plan):
   - Billing period: Monthly veya Yearly  
   - Price: **Turkey – TRY**  
     - pkg.2 monthly ≈ **1000 ₺**  
     - pkg.2 yearly ≈ **9600 ₺**  
     - pkg.3 monthly ≈ **1750 ₺**  
     - pkg.3 yearly ≈ **16800 ₺**  
     - pkg.4 monthly ≈ **2500 ₺**  
     - pkg.4 yearly ≈ **24000 ₺**  
     - pkg.5 monthly ≈ **3750 ₺**  
     - pkg.5 yearly ≈ **36000 ₺**  
5. Base plan’ı **Activate**  
6. Subscription’ı **Active** yap  

**Oluşturma:** Klinik paketler (6–9) ve ücretsiz Vitrin (12) için product **açma**.

### Lisans test hesabı

1. Play Console → **Settings** (dişli) → **License testing**  
2. Kendi Gmail adresini ekle  
3. Bu Gmail ile telefonda Play’e giriş yapmış ol  

---

## A5) RevenueCat hesabı (ortadaki köprü)

RevenueCat: Play/Apple ile senin sunucun arasında **abone takibi** yapan servis.  
Uygulama kodun zaten buna bağlı.

### Kayıt

1. Git: **https://www.revenuecat.com**  
2. **Sign up** (Google/GitHub ile olabilir)  
3. Yeni **Project** oluştur: isim `Randevu Ajandam`  

### Android uygulamasını ekle

1. Project → **Apps** → **+ New**  
2. **Google Play Store** seç  
3. Package name: `com.randevuajandam.doktor`  
4. Kaydet  

### Play’i RevenueCat’e bağla (service account)

RevenueCat ekranı adım adım ister; genel hat:

1. Google Cloud Console: **https://console.cloud.google.com**  
2. Proje oluştur veya seç  
3. **IAM → Service Accounts → Create**  
4. JSON key indir  
5. Play Console → **Users and permissions** → bu service account’u ekle, **financial / subscriptions** yetkisi ver  
6. JSON’u RevenueCat Android app ayarlarına yükle  

(RevenueCat dokümanı: “Google Play Service Credentials” — ekrandaki linki takip et.)

### 8 ürünü RevenueCat’e ekle

1. RevenueCat → **Product catalog → Products**  
2. Her product ID’yi ekle (Play’dekilerle aynı)  
3. Veya **Import from store** dene  

### Public API Key al (Android)

1. RevenueCat → Project **API keys**  
2. **Google Play app** için **Public app-specific key** kopyala  
3. `goog_` ile başlar  

Bunu sonra EAS’e koyacaksın (Bölüm C).

### Webhook (sunucuya haber)

1. RevenueCat → **Integrations → Webhooks** → Add  
2. **URL:**

```text
https://randevuajandam.com/api/mobile/v1/app/revenuecat-webhook
```

3. **Authorization header:**  
   - RevenueCat’te bir secret yaz (uzun rastgele şifre üret, örn. 32 karakter)  
   - Format genelde: `Bearer SENIN_GIZLI_ANAHTARIN`  
4. Aynı gizli anahtarı site `.env` içine `REVENUECAT_WEBHOOK_SECRET` olarak yazacaksın (Bölüm B)  
5. Event: en azından **Initial Purchase**, **Renewal**, **Cancellation**, **Expiration**  

### Secret key (sadece sunucu)

1. RevenueCat → API keys → **Secret key** (`sk_` ile başlar)  
2. Bunu **asla** telefona koyma  
3. Sadece site `.env` → `REVENUECAT_SECRET_KEY`

---

# BÖLÜM B — Site sunucusu (.env)

SSH veya cPanel File Manager ile `randevuajandam-site` projesinin `.env` dosyasını aç.

**Şunları ekle / güncelle** (değerleri kendi RevenueCat anahtarlarınla değiştir):

```env
REVENUECAT_SECRET_KEY=sk_buraya_yapistir
REVENUECAT_WEBHOOK_SECRET=webhookte_yazdigin_gizli_anahtar
REVENUECAT_PROJECT_ID=
MOBILE_IAP_TRUST_CLIENT=false
MOBILE_IAP_PRODUCT_PREFIX=com.randevuajandam.doktor.pkg.
```

Sonra sunucuda (SSH):

```bash
cd /yol/randevuajandam-site
php artisan config:clear
php artisan config:cache
```

Webhook test: RevenueCat’ten “Send test” varsa dene; site log’da hata var mı bak.

---

# BÖLÜM C — Mobil uygulamaya RevenueCat anahtarını koy + yeni build

Anahtarlar **eski APK’ya sihirli girmez**. Yeni build şart.

### C1) Bilgisayarda terminal

```bash
cd C:\xampp\htdocs\randevuajandam\randevuajandam-doktor-mobile
npm install
npm i -g eas-cli
eas login
```

Expo hesabın yoksa eas.dev’den üye ol, login ol.

### C2) Android public key’i EAS secret yap

```bash
eas secret:create --name EXPO_PUBLIC_REVENUECAT_ANDROID_KEY --value "goog_BURAYA"
```

(İleride iOS için:)

```bash
eas secret:create --name EXPO_PUBLIC_REVENUECAT_IOS_KEY --value "appl_BURAYA"
```

### C3) Test APK al

```bash
npm run build:apk
```

Bitince Expo sitesi link verir → APK indir → telefona kur  
(Play’e koymadan da kurulum için “bilinmeyen kaynaklardan yükle” gerekebilir.)

### C4) Telefonda test

1. APK’yı kur  
2. **Play Store’a giriş yaptığın Gmail = License tester** olmalı  
3. Uygulamada hekim girişi  
4. **Menü → Paket & Abonelik**  
5. **Başlangıç** veya **Profesyonel** → aylık → mağaza ile al  
6. Google ödeme penceresi açılmalı (test: ücret kesilmez / test kartı)  
7. Bittiğinde paket özelliklerin açılmalı  

**Açılmazsa kontrol et:**

- Product ID Play’de birebir mi?  
- RevenueCat’te product var mı?  
- Yeni APK’da `goog_` key var mı? (eski APK işe yaramaz)  
- Site `REVENUECAT_SECRET_KEY` dolu mu?  

---

# BÖLÜM D — Play Store’a gerçekten koymak (isteğe bağlı ama “canlı” bu)

1. Önce production AAB:

```bash
npm run build:aab
```

2. Play Console → **Release → Testing → Internal testing**  
3. Yeni release → AAB yükle → tester e-postaları ekle → Roll out  
4. Internal link ile yükle / dene  
5. Sorun yoksa **Production** track’e çıkar  

---

# BÖLÜM E — iPhone (Android bittikten sonra)

Sıfırdan iOS için ek iş:

### E1) Apple Developer

1. **https://developer.apple.com** → Account  
2. Apple ID ile **Apple Developer Program** (~99 USD/yıl)  
3. Ödeme + bazen kimlik onayı  

### E2) App Store Connect uygulaması

1. **https://appstoreconnect.apple.com**  
2. **My Apps → +** → New App  
3. Bundle ID: `com.randevuajandam.doktor` (Certificates’te App ID oluşturman gerekebilir)  
4. Uygulama kaydı oluşsun  

### E3) 8 abonelik (App Store)

1. App → **Subscriptions**  
2. Subscription Group: `randevu_ajandam_hekim`  
3. Play’deki **aynı 8 Product ID** ile oluştur  
4. Süre: 1 Month / 1 Year  
5. Fiyat: Turkey  
6. Paid Apps Agreement onaylı olmalı  

### E4) RevenueCat iOS

1. RevenueCat → **+ iOS app**  
2. Bundle: `com.randevuajandam.doktor`  
3. App Store Connect API Key bağla  
4. Aynı 8 product  
5. Public key `appl_...` → EAS secret `EXPO_PUBLIC_REVENUECAT_IOS_KEY`  

### E5) Firebase iOS (push için; IAP için şart değil)

1. Firebase Console → proje  
2. iOS app ekle → `GoogleService-Info.plist` indir  
3. Dosyayı koy:

```text
randevuajandam-doktor-mobile/GoogleService-Info.plist
```

4. Yeniden iOS build  

### E6) iOS build

```bash
npm run build:ios:prod
```

Apple hesabı ile EAS credentials sorar → takip et.  
TestFlight ile dene → sonra App Review.

---

# BÖLÜM F — “Bugün ne yapayım?” tek sayfa plan

### 1. gün — hesaplar

- [ ] Play Console hesabı aç / onay bekle  
- [ ] RevenueCat üye ol, proje aç  

### 2. gün — Play ürünleri

- [ ] 8 subscription oluştur (pkg 2–5 monthly/yearly)  
- [ ] Fiyatları gir, Active yap  
- [ ] License tester Gmail ekle  

### 3. gün — RevenueCat + site

- [ ] Play service account bağla  
- [ ] 8 product import  
- [ ] `goog_` key kopyala  
- [ ] Webhook URL + secret  
- [ ] Site `.env` → secret + webhook secret → config cache  

### 4. gün — build + test

- [ ] `eas secret:create` Android key  
- [ ] `npm run build:apk`  
- [ ] Telefonda sandbox satın alma  
- [ ] Hekim panelinde paket açıldı mı bak  

### Sonra

- [ ] Internal testing → production  
- [ ] iOS (Apple hesabı + aynı 8 ürün + `appl_` key)  

---

# BÖLÜM G — Sık sorulanlar (sıfır bilgi)

**“Apple Pay / Google Pay butonu koyacak mıyım?”**  
Hayır. Mağaza kendi ödeme ekranını açar; orada kart / Google Pay / Apple Pay çıkabilir.

**“Para ne zaman bana gelir?”**  
Google/Apple developer payout takvimine göre (genelde aylık, eşik tutar sonrası).

**“Komisyon?”**  
Yaklaşık %15–30 (mağaza kuralları; ülkeye/programa göre değişir).

**“Sadece havale ile de olur mu?”**  
Evet. IAP kurmadan da uygulama yaşar; hekim web veya havale ile paket alır.

**“Klinik satışı?”**  
Mağazadan değil. Web / havale.

**“Product ID’yi yanlış yazdım?”**  
Play’de product id silinip yeniden aynı isimle her zaman kolay olmaz. Çok dikkatli kopyala-yapıştır.

**“Hangi ID’ler kesin?”**  
Sadece:

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

# BÖLÜM H — Yardımcı linkler

| Ne | Link |
|----|------|
| Play Console | https://play.google.com/console |
| RevenueCat | https://app.revenuecat.com |
| Expo / EAS | https://expo.dev |
| App Store Connect | https://appstoreconnect.apple.com |
| Apple Developer | https://developer.apple.com |
| Product ID teknik tablo | [IAP-URUN-ESLEME.md](./IAP-URUN-ESLEME.md) |
| Gizlilik | https://randevuajandam.com/gizlilik-politikasi |
| Canlı paket listesi API | https://randevuajandam.com/api/mobile/v1/app/packages-catalog |

---

## Özet cümle

1. **Play Console**’a üye ol → uygulamayı kaydet  
2. **8 abonelik** product ID’sini birebir oluştur  
3. **RevenueCat**’e üye ol → Play’i bağla → `goog_` key al → webhook kur  
4. **Site .env**’e secret yaz  
5. **EAS secret** + **yeni APK**  
6. Telefonda test et  
7. İstersen Play’de yayınla; iOS’u sonra yap  

Takıldığın adımın numarasını (ör. “A4 product oluştururken”) yazarsan o ekrandan devam ettiririz.
