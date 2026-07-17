# Site’de var, mobilde yok / kısmi

**Tarih:** 2026-07-17 (eksikler turu)  
**Web hekim paneli:** `randevuajandam-site` (`/hekim/*`)  
**Mobil:** `randevuajandam-doktor-mobile` (Expo)

**Kural:** Site HTML’i uygulamaya **WebView / gömülü sayfa** olarak çekilmez. Akışlar native ekran + `/api/mobile/v1` ile yapılır.

---

## Bu turda kapatılanlar

| Madde | Durum |
|-------|--------|
| Onboarding paket → **login/register sonrası uygula** | ✅ `applyPendingPackageAfterAuth` |
| Ücretsiz paket otomatik subscribe | ✅ |
| Ücretli → Paket ekranı + banner / highlight | ✅ |
| Klinik paket → tercih kaydı + net mesaj (abone yok) | ✅ `POST /packages/prefer` |
| IAP product ID hizası (`pkg.{id}.monthly`) | ✅ |
| IAP confirm API iskeleti | ✅ `POST /packages/iap-confirm` (501 paid) |
| Session restore: ağ hatasında token silme | ✅ sadece 401/403 |
| Staff push register | ✅ `POST /staff/auth/device` |
| Bildirim tıklama → ekran | ✅ |
| Gizlilik / kullanım koşulları linkleri | ✅ |
| App Store ID config (env/extra) | ✅ placeholder boş → sahte link yok |
| Responsive genişlik + yükseklik | ✅ |
| Klinik + bireysel paket önerisi onboarding | ✅ |

---

## Hâlâ sizin anahtarlarınız / mağaza konsolu

| # | Konu | Not |
|---|------|-----|
| 1 | **RevenueCat public + secret keys** | Kod hazır; `.env` / EAS doldurun — `STORE_IAP_SETUP.md` |
| 2 | **App Store numeric ID** | `EXPO_PUBLIC_APP_STORE_ID` |
| 3 | **Store product’ları oluştur** | `pkg.{id}.monthly/yearly` |
| 4 | **FCM / APNs** | EAS credentials |
| 5 | **Kart / iyzico** | Web panel |
| 6 | **Klinik paket aktivasyonu** | Web |
| 7 | **react-native-webrtc / özel TURN** | MVP WebView oda |
| 8 | Hasta mobil | Ayrı proje |

**Kod tarafı hazır:** RevenueCat SDK, `iap-confirm`, webhook, gizlilik/kullanım/KVKK sayfaları, Paketler’de “Mağazadan satın al”.
---

## Akış özeti (paket)

1. Onboarding’de paket seç → `pending.iap` AsyncStorage  
2. Kayıt / giriş → `prefer` + free ise `subscribe`  
3. Ücretli bireysel → Paket & Abonelik ekranı (havale)  
4. Klinik → tercih cache; aktivasyon web  

---

## Notlar

- Görüşme: yerel `meetingRoomHtml` + signal API  
- Personel: `staff/*` + push device cache  
- Prod API: `https://randevuajandam.com/api/mobile/v1`
