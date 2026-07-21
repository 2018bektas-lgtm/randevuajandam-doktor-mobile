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
| Hastalar | Arama, ekle, detay + geçmiş |
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
- Safe area: geri butonu, modal ve alt menü status bar / home indicator’a göre kaydırıldı
