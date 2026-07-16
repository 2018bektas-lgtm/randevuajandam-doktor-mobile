# Hekim Web Panel ↔ Mobil Uygulama Karşılaştırması

**Tarih:** 2026-07-16 (son güncelleme: eğitim SEO/etiket + içerik parity, markdown toolbar, Share link, push Expo Go güvenli)  
**Web panel:** `randevuajandam-site` (`/hekim/*`)  
**Mobil:** `randevuajandam-doktor-mobile` (Expo)  
**API:** `/api/mobile/v1/doctor/*` (`routes/mobile.php`)

**İşaretler:** ✅ / `[x]` = yapıldı · ⚠️ = kısmi · ❌ = yapılmadı / bilerek web’de

---

## 1. Kontrol özeti (API smoke test)

Test hesabı: `ahmet@test.com` / `sifre123`  
Sunucu: `http://127.0.0.1:8003`

| Kontrol | Sonuç |
|--------|--------|
| `POST /doctor/auth/login` | ✅ OK (200) |
| `GET /doctor/auth/me` | ✅ OK |
| `GET /doctor/dashboard` | ✅ OK |
| `GET /doctor/calendar` | ✅ OK |
| `GET /doctor/calendar/ical?json=1` | ✅ OK |
| `GET /doctor/appointments` | ✅ OK |
| `GET /doctor/requests` | ✅ OK |
| `GET /doctor/patients` | ✅ OK |
| `GET /doctor/services` | ✅ OK |
| `GET /doctor/working-hours` | ✅ OK |
| `GET /doctor/appointment-settings` | ✅ OK |
| `GET /doctor/leaves` | ✅ OK |
| `GET /doctor/quick-close/slots` | ✅ OK |
| `GET /doctor/waitlist` | ✅ OK |
| `GET /doctor/blogs` | ✅ OK |
| `GET /doctor/reviews` | ✅ OK |
| `GET /doctor/gallery` | ✅ OK |
| `GET /doctor/faqs` | ✅ OK |
| `GET /doctor/educations` | ✅ OK |
| `GET /doctor/education-applications` | ✅ OK |
| `GET /doctor/finance/*` | ✅ OK |
| `GET /doctor/finance/report` | ✅ OK |
| `GET /doctor/profile`, `/about`, `/website`, `/two-factor` | ✅ OK |
| `GET /doctor/meta`, `/package-features` | ✅ OK |
| `GET /doctor/clinic` | ✅ OK |
| `GET /doctor/clinic/invites` | ✅ OK |
| TypeScript `tsc --noEmit` | ✅ Temiz |

---

## 2. Mobilde YAPILAN işlemler

### Auth & oturum
- [x] Giriş (e-posta / şifre)
- [x] 2FA doğrulama (challenge)
- [x] Oturum geri yükleme (`auth/me`)
- [x] Çıkış
- [x] Şifremi unuttum → web linki
- [x] Hekim kayıt ol → web linki
- [x] Paket seç / yükselt → web linki

### Panel özeti
- [x] Günlük istatistikler (dashboard)
- [x] Bugünkü randevu listesi
- [x] Klinik daveti kabul / red
- [x] Randevu alımı aç/kapat (hızlı toggle)
- [x] Hızlı menü: takvim, talepler, yeni randevu, hastalar, bekleme, finans

### Takvim & randevular
- [x] Haftalık takvim şeridi + gün listesi
- [x] Ay görünümü (ızgara) + Hafta/Ay geçişi
- [x] iCal dışa aktarım + e-posta paylaş
- [x] Randevu oluştur (hasta ara / yeni hasta, hizmet, yüz yüze–online, not)
- [x] Durum: onayla / tamamla / iptal
- [x] Ertele (yeniden planla) + boş slot chip
- [x] Detay: hekim notu, hizmet seçimi, sil
- [x] Ara / SMS (cihaz)
- [x] Online görüşme `join_url` + `platform_join_url` + Share/kopyala
- [x] Tarih/saat seçici (DateField / TimeField)

### Talepler & bekleme & hastalar
- [x] Bekleyen talepleri listele / onayla / red
- [x] Bekleme listesi filtre, durum, bilgilendir, sil
- [x] Hasta listesi, arama, detay + geçmiş, yeni hasta ekle, düzenle, kaldır

### Ayarlar
- [x] Randevu ayarları
- [x] Çalışma saatleri (7 gün, mola)
- [x] İzin / tatil ekle–sil
- [x] Hızlı saat kapat (slot seç + kaydet)

### İçerik
- [x] Hizmet CRUD + görsel + SEO
- [x] Blog CRUD + kapak + SEO + markdown araç çubuğu
- [x] Yorum listele + onay/red + sil + yanıt
- [x] Galeri yükle / başlık / sil / sıralama
- [x] SSS CRUD + aktif toggle
- [x] Eğitim: tip, kontenjan, tarih, mekan, online URL, kapak, durum, **içerik**, **ödeme notu**, **başvuru bitiş**, **SEO/etiketler**
- [x] Eğitim başvuru form alanları + başvurular (durum + ödeme)
- [x] Hakkımda kaydet

### Finans (kişisel)
- [x] Özet, gelir, gider (+ belge), kategori, bakiye, rapor (metin + PDF base64)

### Hesap
- [x] Profil, şifre, 2FA, web sitesi, paket kilitli menü

### Klinik
- [x] Üyelik + sahip admin sekmeleri (davet, personel, talep, takvim, gider, hakediş, rapor, ayar, site, duyuru)

---

## 3. Web ↔ mobil madde listesi (tamamı)

### 3.1 Hesap, kayıt, paket

| # | Web işlemi | Durum | Not |
|---|------------|--------|-----|
| 1 | Hekim kayıt ol | ✅ | Login → web `/hekim/kayit-ol` |
| 2 | Paket seç | ✅ | Login → web `/hekim/paket-sec` |
| 3 | Paket ödeme (iyzico) | ✅ | Paket listesi + web ödeme URL |
| 4 | Demo / üyelik süre detayı | ✅ | baslangic/bitis/kalan_gun/demo + özellik listesi |
| 5 | Klinik paketine geçiş | ✅ | Menü / paket ekranı web link |
| 6 | Şifremi unuttum | ✅ | Login → web `/sifremi-unuttum` |

### 3.2 Takvim & randevu

| # | Web işlemi | Durum | Not |
|---|------------|--------|-----|
| 7 | Ay/hafta görünüm | ✅ | Ay ızgarası + hafta şeridi |
| 8 | Boş slota tıklayarak randevu | ✅ | `GET /slots` + slot chip’leri |
| 9 | Erteleme (slot seçerek) | ✅ | Ertele modalında boş slot chip’leri |
| 10 | Takvimden periyot değiştir | ✅ | Takvim toolbar “Periyot” |
| 11 | iCal dışa aktar | ✅ | API + Takvim iCal butonu |
| 12 | Online görüşme | ✅ | join_url tarayıcı + **Share/kopyala** (native WebRTC bilinçli olarak yok) |
| 13 | Tarih/saat seçici | ✅ | DateField / TimeField |
| 14 | Özet kartında hızlı aksiyon | ✅ | Onay/ertele/tamam/iptal |

### 3.3 Hastalar

| # | Web işlemi | Durum | Not |
|---|------------|--------|-----|
| 15 | Hasta kaydını düzenle | ✅ | `PUT /patients/{id}` |
| 16 | Hasta sil / kaldır | ✅ | `DELETE /patients/{id}` |
| 17 | Sunucu sayfalama | ✅ | page / per_page + UI |

### 3.4 Hizmetler & içerik

| # | Web işlemi | Durum | Not |
|---|------------|--------|-----|
| 18 | Hizmet görseli | ✅ | |
| 19 | Hizmet SEO | ✅ | |
| 20 | Blog SEO | ✅ | |
| 21 | Zengin metin | ✅ | Markdown araç çubuğu (B/I/H2/H3/liste/alıntı/kod/link) — tam HTML WYSIWYG yok |
| 22 | Galeri sıralama | ✅ | ↑↓ + reorder API |
| 23 | Yorum silme / moderasyon | ✅ | Filtre + onay/red + sil + yanıt |

### 3.5 Eğitimler

| # | Web işlemi | Durum | Not |
|---|------------|--------|-----|
| 24 | Eğitim tipi tam form | ✅ | yuz_yuze / online / hibrit (etiketli) |
| 25 | Tarih, kapasite, online_url, kapak, **etiketler** | ✅ | + icerik, odeme_notu, basvuru_bitis_at, meta_* |
| 26 | Özel başvuru form alanları | ✅ | GET/PUT form-fields |
| 27 | Eğitim bazlı başvuru listesi | ✅ | Chip filtre `egitim_id` |
| 28 | Ödeme alındı + finans | ✅ | |

### 3.6 Finans

| # | Web işlemi | Durum | Not |
|---|------------|--------|-----|
| 29–34 | Gelir/gider CRUD, fiş, PDF, kategori, tarih filtresi | ✅ | |

### 3.7 Profil & web

| # | Web işlemi | Durum | Not |
|---|------------|--------|-----|
| 35–38 | Unvan, il/ilçe, koordinat, DNS adımları | ✅ | |

### 3.8–3.9 Klinik

| # | Web işlemi | Durum | Not |
|---|------------|--------|-----|
| 39–53 | Duyuru, hasta notu, dashboard, takvim, hekim/personel, hakediş, gider, rapor, ayar, site | ✅ | |

### 3.10 UX / platform

| # | Konu | Durum | Not |
|---|------|--------|-----|
| 54 | Push bildirim (Expo Push) | ✅ | Device token + ExpoPushService; **Expo Go Android’de no-op** (SDK 53 kısıtı) |
| 55 | Uygulama içi bildirim merkezi | ✅ | Menü → Bildirimler |
| 56 | Offline / önbellek | ✅ | GET cache + mutation kuyruk + banner |
| 57 | Paket kilitli menü | ✅ | |
| 58 | Deep link | ✅ | `randevuajandam-doktor://…` |

---

## 4. Öncelik kuyruğu (tikli)

### P0 — Klinik sahibi
- [x] 1–6. Hakediş, rapor, ayar, site, duyuru, takvim aksiyonları  

### P1 — Bireysel hekim
- [x] 1–9. Picker, eğitim form parity (+ SEO/etiket/içerik), ödeme, gider, finans rapor, hizmet görseli, blog SEO, galeri sıralama, paket  

### P2 — Konfor
- [x] 1–7. iCal, ay görünümü, profil alanları, push, kayıt/şifre web, online link Share, paket kilit  

---

## 5. Mobil ekran envanteri

| ScreenId | Ekran | Durum |
|----------|-------|--------|
| `overview` | Günlük özet | ✅ Tam |
| `calendar` | Takvim | ✅ Hafta + ay + iCal + slot |
| `menu` | Yönetim menüsü | ✅ + paket kilit |
| `requests` … `website` | Modüller | ✅ |
| `education` | Eğitimler | ✅ **İçerik + SEO/etiket + ödeme notu + başvuru bitiş** |
| `educationApps` | Başvurular | ✅ + ödeme |
| `clinic` | Klinik | ✅ Admin sekmeleri |
| `notifications` | Bildirimler | ✅ |
| `packages` | Paket & abonelik | ✅ + üyelik detayı |

---

## 6. Bilinçli olarak mobil dışı / kısmi kalanlar

| Özellik | Karar | Not |
|---------|--------|-----|
| Uygulama içi iyzico SDK | ❌ Web | Güvenlik + mağaza kuralları; web ödeme URL yeterli |
| Native WebRTC (in-app call) | ❌ Web | join_url tarayıcı + Share; sinyal sunucusu yok |
| Tam HTML WYSIWYG | ⚠️ Markdown | Mobil için markdown toolbar; web’de zengin editör kalır |
| Sürükle-bırak takvim | ⚠️ Slot | Slot chip ile erteleme/oluşturma var |
| Push Expo Go Android | ⚠️ No-op | SDK 53+ kısıtı; dev build / production’da çalışır |

---

## 7. Bu turda tamamlananlar (yarım kalanlar)

1. **Eğitim form parity** — `icerik`, `odeme_notu`, `basvuru_bitis_at`, `meta_baslik` / `meta_aciklama` / `meta_anahtar_kelimeler` (etiketler)  
2. **API** — `validateEducation` yeni alanları kabul ediyor  
3. **Markdown toolbar** — H3, numaralı liste, alıntı, kod eklendi  
4. **Online görüşme** — `Share.share` ile link paylaş / kopyala  
5. **Push** — Expo Go Android güvenli no-op; diğer ortamlarda token kaydı  
6. **Yorum / eğitim UI metinleri** — Türkçe imla düzeltmeleri  

---

## 8. Sonuç

| Kategori | Değerlendirme |
|----------|----------------|
| Bireysel hekim günlük iş | ✅ Tamam |
| Web parity (picker, SEO, ay takvim, iCal, eğitim etiket) | ✅ Tamam |
| Klinik admin | ✅ Tamam |
| Hesap (kayıt/şifre/paket link) | ✅ Web deep-link |
| Push + bildirim + offline | ✅ (Expo Go Android push hariç) |
| In-app iyzico / WebRTC | ❌ Bilinçli web |

**Pratik özet:** Hekim panel parity tamamlandı. Kalanlar bilinçli platform kararları: **native iyzico**, **in-app WebRTC**, **tam HTML WYSIWYG**.

---

*Güncelleme: eğitim SEO/etiket/içerik/ödeme notu, markdown genişletme, Share link, push Expo Go güvenli, karşılaştırma tablosu senkron.*
