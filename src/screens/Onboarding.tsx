import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { API_URL } from '../api/client';
import { useLayout } from '../layout';
import { requestNotificationPermission } from '../services/push';
import { purchasePackageInApp, type IapPeriod } from '../services/iap';
import { appVersion, storeReviewUrl } from '../config/store';
import { LegalLinks } from '../components/LegalLinks';

export const ONBOARDING_KEY = 'randevuajandam.onboarding.done.v13';
export const ONBOARDING_ANSWERS_KEY = 'randevuajandam.onboarding.answers.v3';

const LOGO = require('../../assets/logo.png');

export type OnboardingFinishMode = 'login' | 'register' | 'packages';

type Props = { onFinish: (mode: OnboardingFinishMode) => void };

/** Single-value answers */
type Answers = {
  practice?: string;
  city_scale?: string;
  experience?: string;
  branch?: string | string[];
  clinic?: string;
  hekim_sayisi?: string;
  staff?: string;
  staff_count?: string;
  patient_volume?: string;
  appt_volume?: string;
  goal?: string | string[];
  needs?: string | string[];
  online?: string;
  online_share?: string;
  website?: string;
  finans?: string;
  content?: string;
  egitim?: string;
  current_tool?: string | string[];
  start_when?: string;
  source?: string | string[];
  notif?: string;
  rate?: string;
};

type Choice = { id: string; label: string; sub?: string };

/** Onboarding fazı — üstte “Tanıtım / Profil / Paket” rozeti */
type StagePhase = 'intro' | 'profile' | 'offer';

type Stage =
  | {
      kind: 'story';
      key: string;
      stepLabel: string;
      phase: StagePhase;
      eyebrow: string;
      title: string;
      body: string;
      accent: string;
      visual: VisualKind;
      /** Proje tanıtım maddeleri */
      bullets?: string[];
      cta?: string;
    }
  | {
      kind: 'question';
      key: keyof Answers;
      stepLabel: string;
      phase: StagePhase;
      eyebrow: string;
      title: string;
      body: string;
      accent: string;
      choices: Choice[];
      /** true = birden fazla seçenek işaretlenebilir */
      multi?: boolean;
    }
  | {
      kind: 'permission';
      key: 'notif';
      stepLabel: string;
      phase: StagePhase;
      eyebrow: string;
      title: string;
      body: string;
      accent: string;
    }
  | {
      kind: 'rate';
      key: 'rate';
      stepLabel: string;
      phase: StagePhase;
      eyebrow: string;
      title: string;
      body: string;
      accent: string;
    }
  | {
      kind: 'package';
      key: 'package';
      stepLabel: string;
      phase: StagePhase;
      eyebrow: string;
      title: string;
      body: string;
      accent: string;
    };

type VisualKind = 'brand' | 'calendar' | 'modules' | 'video' | 'team' | 'reviews' | 'ready' | 'security';

const STAGES: Stage[] = [
  // ── A) PROJE TANITIMI (premium cinematic) ─────────────────
  {
    kind: 'story',
    key: 's1',
    stepLabel: '01',
    phase: 'intro',
    eyebrow: 'HEKİM İÇİN TASARLANDI',
    title: 'Kliniğinizi cebinizde yönetin',
    body: 'Randevu Ajandam; muayenehane ve kliniklerin operasyonunu tek mobil panelde toplayan premium hekim platformudur.',
    accent: '#F59E55',
    visual: 'brand',
    bullets: [
      'Takvim · talep · hasta · finans',
      'Online görüşme ve web sitesi',
      'Size özel paket önerisi',
    ],
    cta: 'Deneyimi başlat',
  },
  {
    kind: 'story',
    key: 's_cal',
    stepLabel: '02',
    phase: 'intro',
    eyebrow: 'RANDEVU OPERASYONU',
    title: 'Her slot kontrolünüzde',
    body: 'Defter ve WhatsApp karmaşası biter. Hasta talebi gelir, siz onaylarsınız — sekreter aynı ekrandan çalışır.',
    accent: '#60A5FA',
    visual: 'calendar',
    bullets: [
      'Gün / hafta takvim + boş slotlar',
      'Misafir talep & onay',
      'İzin ve hızlı slot kapatma',
    ],
    cta: 'Devam',
  },
  {
    kind: 'story',
    key: 's_mod',
    stepLabel: '03',
    phase: 'intro',
    eyebrow: 'TAM PANEL',
    title: 'Sadece takvim değil, tam işletme',
    body: 'Web paneliyle aynı altyapı. Mobilde hizmet, içerik, yorum ve finans — muayene aralarında bile yönetin.',
    accent: '#34D399',
    visual: 'modules',
    bullets: [
      'Hasta kartı & randevu geçmişi',
      'Hizmet / fiyat tanımları',
      'Gelir–gider · hasta bakiyesi',
    ],
    cta: 'Devam',
  },
  {
    kind: 'story',
    key: 's_online',
    stepLabel: '04',
    phase: 'intro',
    eyebrow: 'ONLINE SEANS',
    title: 'Görüşme odası tek dokunuş',
    body: 'Paketinizde online görüşme açıksa onaylı randevuda oda hazır. Zoom linki peşinde koşmayın.',
    accent: '#A78BFA',
    visual: 'video',
    bullets: [
      'Yüz yüze veya online randevu tipi',
      'Onay sonrası otomatik oda',
      'Hasta & hekim aynı platform',
    ],
    cta: 'Devam',
  },
  {
    kind: 'story',
    key: 's_team',
    stepLabel: '05',
    phase: 'intro',
    eyebrow: 'KLİNİK & EKİP',
    title: 'Büyüyen kliniklere hazır altyapı',
    body: 'Tek hekimden çok hekimli merkeze. Ortak hasta havuzu, personel yetkileri, hakediş ve klinik web sitesi üst paketlerde.',
    accent: '#38BDF8',
    visual: 'team',
    bullets: [
      'Hekim davet & ortak takvim',
      'Sekreter paneli (yetki bazlı)',
      'Merkezi finans & klinik site',
    ],
    cta: 'Profilime geç',
  },

  // ── B) DETAYLI PROFİL ──────────────────────────────────────
  {
    kind: 'question',
    key: 'practice',
    stepLabel: '06',
    phase: 'profile',
    eyebrow: 'Çalışma şekli',
    title: 'Nerede hizmet veriyorsunuz?',
    body: 'Bireysel muayenehane, klinik, hastane veya ağırlıklı online — paket yolu buradan seçilir.',
    accent: '#EE7D31',
    choices: [
      { id: 'muayenehane', label: 'Muayenehane / bireysel', sub: 'Tek hekim odaklı pratik' },
      { id: 'klinik', label: 'Klinik / poliklinik', sub: 'Çok hekimli yapı' },
      { id: 'hastane', label: 'Hastane', sub: 'Kurumsal ortam' },
      { id: 'online', label: 'Ağırlıklı online', sub: 'Uzaktan danışmanlık' },
    ],
  },
  {
    kind: 'question',
    key: 'city_scale',
    stepLabel: '07',
    phase: 'profile',
    eyebrow: 'Konum',
    title: 'Hizmet verdiğiniz şehir ölçeği?',
    body: 'Yoğunluk ve web / görünürlük ihtiyacını anlamak için.',
    accent: '#EE7D31',
    choices: [
      { id: 'buyuk', label: 'Büyükşehir', sub: 'İstanbul, Ankara, İzmir…' },
      { id: 'orta', label: 'Orta ölçekli şehir' },
      { id: 'kucuk', label: 'Küçük şehir / ilçe' },
      { id: 'coklu', label: 'Birden fazla şehir' },
    ],
  },
  {
    kind: 'question',
    key: 'experience',
    stepLabel: '08',
    phase: 'profile',
    eyebrow: 'Deneyim',
    title: 'Kaç yıldır meslektesiniz?',
    body: 'Başlangıç veya ileri paket ihtiyacını ayırır.',
    accent: '#EE7D31',
    choices: [
      { id: '0_3', label: '0–3 yıl', sub: 'Yeni / erken dönem' },
      { id: '3_10', label: '3–10 yıl', sub: 'Büyüyen pratik' },
      { id: '10_plus', label: '10+ yıl', sub: 'Yerleşik portföy' },
    ],
  },
  {
    kind: 'question',
    key: 'branch',
    stepLabel: '09',
    phase: 'profile',
    eyebrow: 'Branş',
    title: 'Branşlarınız neler?',
    body: 'Birden fazla seçebilirsiniz — içerik ve vitrin önerisini etkiler.',
    accent: '#EE7D31',
    multi: true,
    choices: [
      { id: 'dahili', label: 'Dahili / aile / genel' },
      { id: 'cerrahi', label: 'Cerrahi branşlar' },
      { id: 'dis', label: 'Diş hekimliği' },
      { id: 'estetik', label: 'Estetik / dermatoloji' },
      { id: 'psikoloji', label: 'Psikoloji / psikiyatri' },
      { id: 'diger', label: 'Diğer branş' },
    ],
  },
  {
    kind: 'question',
    key: 'clinic',
    stepLabel: '10',
    phase: 'profile',
    eyebrow: 'Klinik yapısı',
    title: 'Kliniğiniz var mı?',
    body: 'Ekip paneli, ortak hasta havuzu ve klinik paket yolu için kritik.',
    accent: '#EE7D31',
    choices: [
      { id: 'yes', label: 'Evet, kliniğim var', sub: 'Aktif çok hekimli yapı' },
      { id: 'planning', label: 'Kurmayı planlıyorum', sub: 'Yakın dönemde ekip' },
      { id: 'no', label: 'Hayır, bireysel çalışıyorum' },
    ],
  },
  {
    kind: 'question',
    key: 'hekim_sayisi',
    stepLabel: '11',
    phase: 'profile',
    eyebrow: 'Hekim sayısı',
    title: 'Kaç hekimle çalışıyorsunuz?',
    body: 'Klinik paket limitleri (3 / 10 / sınırsız) buradan hizalanır.',
    accent: '#EE7D31',
    choices: [
      { id: '1', label: 'Sadece ben', sub: 'Bireysel paket yolu' },
      { id: '2_5', label: '2–5 hekim', sub: 'Küçük–orta ekip' },
      { id: '6_plus', label: '6+ hekim', sub: 'Büyük klinik / merkez' },
    ],
  },
  {
    kind: 'question',
    key: 'staff',
    stepLabel: '12',
    phase: 'profile',
    eyebrow: 'Personel',
    title: 'Personeliniz var mı?',
    body: 'Sekreter aynı uygulamadan, yetkiye göre randevu ve hasta yönetir.',
    accent: '#EE7D31',
    choices: [
      { id: 'yes', label: 'Evet, personelim var' },
      { id: 'soon', label: 'Yakında olacak' },
      { id: 'no', label: 'Hayır' },
    ],
  },
  {
    kind: 'question',
    key: 'staff_count',
    stepLabel: '13',
    phase: 'profile',
    eyebrow: 'Personel sayısı',
    title: 'Kaç personel hesabı gerekir?',
    body: 'Yoksa “Yok” seçin — klinik paket personel limitleri buna göre önerilir.',
    accent: '#EE7D31',
    choices: [
      { id: '0', label: 'Yok' },
      { id: '1', label: '1 kişi' },
      { id: '2_4', label: '2–4 kişi' },
      { id: '5_plus', label: '5+ kişi' },
    ],
  },
  {
    kind: 'question',
    key: 'patient_volume',
    stepLabel: '14',
    phase: 'profile',
    eyebrow: 'Hasta hacmi',
    title: 'Aylık yaklaşık hasta sayınız?',
    body: 'Demo limitleri (10 hasta / 20 randevu) ile sınırsız paket ayrımı.',
    accent: '#EE7D31',
    choices: [
      { id: '0_20', label: '0–20 hasta / ay', sub: 'Düşük hacim · deneme uygun' },
      { id: '20_100', label: '20–100 hasta / ay' },
      { id: '100_300', label: '100–300 hasta / ay' },
      { id: '300_plus', label: '300+ hasta / ay', sub: 'Yoğun pratik' },
    ],
  },
  {
    kind: 'question',
    key: 'appt_volume',
    stepLabel: '15',
    phase: 'profile',
    eyebrow: 'Randevu hacmi',
    title: 'Haftalık yaklaşık randevu sayınız?',
    body: 'Takvim, otomasyon ve online seans ihtiyacını ölçer.',
    accent: '#EE7D31',
    choices: [
      { id: '0_15', label: '0–15 randevu / hafta' },
      { id: '15_40', label: '15–40 randevu / hafta' },
      { id: '40_80', label: '40–80 randevu / hafta' },
      { id: '80_plus', label: '80+ randevu / hafta' },
    ],
  },
  {
    kind: 'question',
    key: 'goal',
    stepLabel: '16',
    phase: 'profile',
    eyebrow: 'Hedefler',
    title: 'Öncelikli amaçlarınız neler?',
    body: 'Birden fazla seçin — paket skoru hedeflerinize göre yükselir.',
    accent: '#EE7D31',
    multi: true,
    choices: [
      { id: 'randevu', label: 'Randevu ve takvim düzeni' },
      { id: 'online', label: 'Online / görüntülü seans' },
      { id: 'marka', label: 'Marka ve web sitesi' },
      { id: 'finans', label: 'Gelir–gider takibi' },
      { id: 'klinik', label: 'Klinik ekip yönetimi' },
      { id: 'buyume', label: 'Hasta / talep artışı' },
    ],
  },
  {
    kind: 'question',
    key: 'needs',
    stepLabel: '17',
    phase: 'profile',
    eyebrow: 'Modül ihtiyaçları',
    title: 'Hangi özellikler sizin için şart?',
    body: 'Birden fazla seçin — önerilen paketin özellik listesi buraya hizalanır.',
    accent: '#EE7D31',
    multi: true,
    choices: [
      { id: 'takvim', label: 'Takvim & randevu talepleri' },
      { id: 'online', label: 'Online görüşme odası' },
      { id: 'web', label: 'Hekim / klinik web sitesi' },
      { id: 'finans', label: 'Finans ve hasta bakiyesi' },
      { id: 'personel', label: 'Personel paneli' },
      { id: 'blog', label: 'Blog / makale' },
      { id: 'yorum', label: 'Hasta yorumları' },
      { id: 'egitim', label: 'Eğitim / kurs satışı' },
      { id: 'galeri', label: 'Galeri / vitrin' },
      { id: 'talep', label: 'Bekleme listesi / talep' },
    ],
  },
  {
    kind: 'question',
    key: 'online',
    stepLabel: '18',
    phase: 'profile',
    eyebrow: 'Online görüşme',
    title: 'Görüntülü seans kullanacak mısınız?',
    body: 'VIP ve üst bireysel / klinik paketlerde online özellik açılır.',
    accent: '#EE7D31',
    choices: [
      { id: 'yes', label: 'Evet, düzenli kullanacağım' },
      { id: 'maybe', label: 'Belki sonra' },
      { id: 'no', label: 'Hayır' },
    ],
  },
  {
    kind: 'question',
    key: 'online_share',
    stepLabel: '19',
    phase: 'profile',
    eyebrow: 'Online pay',
    title: 'Randevuların kaçı online olur?',
    body: 'Online yoğunluğu VIP paket skorunu güçlendirir.',
    accent: '#EE7D31',
    choices: [
      { id: 'none', label: 'Neredeyse hiç', sub: '%0–10' },
      { id: 'low', label: 'Az', sub: '%10–30' },
      { id: 'mid', label: 'Orta', sub: '%30–60' },
      { id: 'high', label: 'Çoğu online', sub: '%60+' },
    ],
  },
  {
    kind: 'question',
    key: 'website',
    stepLabel: '20',
    phase: 'profile',
    eyebrow: 'Web sitesi',
    title: 'Özel web sitesi ister misiniz?',
    body: 'Bireysel: hekim sitesi paketi. Klinik: kurumsal klinik vitrin (üst paket).',
    accent: '#EE7D31',
    choices: [
      { id: 'yes', label: 'Evet, istiyorum', sub: 'Domain + CMS + randevu' },
      { id: 'maybe', label: 'Belki / sonra bakarım' },
      { id: 'no', label: 'Gerek yok' },
    ],
  },
  {
    kind: 'question',
    key: 'finans',
    stepLabel: '21',
    phase: 'profile',
    eyebrow: 'Finans',
    title: 'Gelir–gider takibi ne kadar önemli?',
    body: 'Hasta bakiyesi, tahsilat ve raporlar — bireysel VIP veya klinik profesyonel.',
    accent: '#EE7D31',
    choices: [
      { id: 'yes', label: 'Çok önemli', sub: 'Detaylı finans istiyorum' },
      { id: 'maybe', label: 'Temel yeterli' },
      { id: 'no', label: 'Şimdilik gerek yok' },
    ],
  },
  {
    kind: 'question',
    key: 'content',
    stepLabel: '22',
    phase: 'profile',
    eyebrow: 'İçerik',
    title: 'Blog veya makale yayınlar mısınız?',
    body: 'Marka ve SEO için web / içerik paketlerini öne çıkarır.',
    accent: '#EE7D31',
    choices: [
      { id: 'yes', label: 'Evet, düzenli' },
      { id: 'maybe', label: 'Ara sıra' },
      { id: 'no', label: 'Hayır' },
    ],
  },
  {
    kind: 'question',
    key: 'egitim',
    stepLabel: '23',
    phase: 'profile',
    eyebrow: 'Eğitim',
    title: 'Kurs / webinar satar mısınız?',
    body: 'Eğitim modülü ve başvuru yönetimi için paket skoru artar.',
    accent: '#EE7D31',
    choices: [
      { id: 'yes', label: 'Evet' },
      { id: 'maybe', label: 'Planlıyorum' },
      { id: 'no', label: 'Hayır' },
    ],
  },
  {
    kind: 'question',
    key: 'current_tool',
    stepLabel: '24',
    phase: 'profile',
    eyebrow: 'Mevcut durum',
    title: 'Randevuyu şu an nasıl yönetiyorsunuz?',
    body: 'Birden fazla seçebilirsiniz — geçiş ihtiyacını anlarız.',
    accent: '#EE7D31',
    multi: true,
    choices: [
      { id: 'defter', label: 'Defter / Excel' },
      { id: 'whatsapp', label: 'WhatsApp / telefon' },
      { id: 'baska', label: 'Başka yazılım' },
      { id: 'sekreter', label: 'Sekreter notu' },
      { id: 'yok', label: 'Sistemim yok' },
    ],
  },
  {
    kind: 'question',
    key: 'start_when',
    stepLabel: '25',
    phase: 'profile',
    eyebrow: 'Zamanlama',
    title: 'Ne zaman başlamak istersiniz?',
    body: 'Ücretsiz deneme veya ücretli paket önerisini etkiler.',
    accent: '#EE7D31',
    choices: [
      { id: 'hemen', label: 'Hemen', sub: 'Bugün / bu hafta' },
      { id: '1ay', label: '1 ay içinde' },
      { id: 'deneme', label: 'Önce ücretsiz deneme' },
      { id: 'kesfet', label: 'Sadece inceliyorum' },
    ],
  },
  {
    kind: 'question',
    key: 'source',
    stepLabel: '26',
    phase: 'profile',
    eyebrow: 'Keşif',
    title: 'Bizi nasıl duydunuz?',
    body: 'Birden fazla kanal seçebilirsiniz (analiz için).',
    accent: '#EE7D31',
    multi: true,
    choices: [
      { id: 'google', label: 'Google / arama' },
      { id: 'social', label: 'Instagram / sosyal medya' },
      { id: 'meslek', label: 'Meslektaş önerisi' },
      { id: 'reklam', label: 'Reklam' },
      { id: 'kongre', label: 'Kongre / etkinlik' },
      { id: 'diger', label: 'Diğer' },
    ],
  },
  {
    kind: 'permission',
    key: 'notif',
    stepLabel: '27',
    phase: 'profile',
    eyebrow: 'Bildirimler',
    title: 'Randevu bildirimleri',
    body: 'Yeni talep, iptal ve hatırlatmalar için önerilir. İzni şimdi vermezseniz ayarlardan sonra açabilirsiniz.',
    accent: '#EE7D31',
  },

  // ── C) PAKET ÖNERİSİ ───────────────────────────────────────
  {
    kind: 'package',
    key: 'package',
    stepLabel: '28',
    phase: 'offer',
    eyebrow: 'Size özel öneri',
    title: 'Profilinize uygun paketler',
    body: 'Cevaplarınız skorlandı. Önerilen paket öne çıkarıldı; tüm seçenekleri fiyat, limit ve özellikleriyle karşılaştırın.',
    accent: '#EE7D31',
  },
];

const TOTAL = STAGES.length;

type PkgTur = 'bireysel' | 'klinik';

type Pkg = {
  id: string;
  /** Backend paketler.id */
  dbId: number;
  tur: PkgTur;
  ad: string;
  tagline: string;
  aciklama: string;
  aylik: number;
  yillik: number;
  aylikIndirimli?: number;
  yillikIndirimli?: number;
  features: string[];
  ideal: string;
  limit?: string;
  maxDoktor?: number;
  maxPersonel?: number;
};

/** Site / DB ile hizalı tam katalog: bireysel + klinik */
const PACKAGES: Pkg[] = [
  {
    id: 'demo',
    dbId: 1,
    tur: 'bireysel',
    ad: 'Ücretsiz Deneme (Demo)',
    tagline: 'Risk almadan deneyin',
    aciklama:
      'Sistemi ücretsiz test edin. En fazla 10 hasta ve 20 randevu ile temel takvimi deneyimleyin; istediğiniz zaman ücretli pakete geçin.',
    aylik: 0,
    yillik: 0,
    features: [
      'Online randevu takvimi',
      'Maksimum 10 hasta kaydı (limit)',
      'Maksimum 20 randevu (limit)',
      'Ücretli paketlere tek tıkla yükseltme',
    ],
    ideal: 'Sadece inceleyen veya önce denemek isteyen bireysel hekimler',
    limit: '10 hasta · 20 randevu',
  },
  {
    id: 'starter',
    dbId: 2,
    tur: 'bireysel',
    ad: 'Başlangıç (Starter) Paketi',
    tagline: 'Temel dijitalleşme',
    aciklama:
      'Tek hekim, temel randevu / hasta yönetimi. Takvim, hasta kartı, hizmet tanımlama ve profil.',
    aylik: 1299,
    yillik: 12990,
    aylikIndirimli: 999,
    yillikIndirimli: 9999,
    features: [
      'Online randevu takvimi ve yönetimi',
      'Hasta / danışan kartı (CRM)',
      'Hizmet ve tedavi tanımlama',
      'Çalışma saatleri & öğle arası',
      'Hekim profili (unvan, branş, biyografi)',
      'Arama sonuçlarında standart listeleme',
    ],
    ideal: 'Bireysel muayenehane, düşük–orta randevu hacmi',
  },
  {
    id: 'plus',
    dbId: 3,
    tur: 'bireysel',
    ad: 'Profesyonel (Plus) Paket',
    tagline: 'Görünürlük & talep',
    aciklama:
      'Hasta portföyünü ve görünürlüğünü artırmak isteyen aktif hekimler için. Talep yönetimi, galeri ve öncelikli listeleme.',
    aylik: 1699,
    yillik: 16990,
    aylikIndirimli: 1299,
    yillikIndirimli: 12999,
    features: [
      'Başlangıç paketinin tümü',
      'Detaylı özgeçmiş / hakkımda & mezuniyet',
      'Fotoğraf galerisi',
      'Danışan randevu talepleri yönetimi',
      'Aramada öncelikli listeleme',
      'Hızlı slot kapatma / bloklama',
    ],
    ideal: 'Büyüyen bireysel pratik, talep ve marka görünürlüğü',
  },
  {
    id: 'vip',
    dbId: 4,
    tur: 'bireysel',
    ad: 'VIP (Elite) Paket',
    tagline: 'Tam otomasyon',
    aciklama:
      'Online görüşme, finans, blog, SSS, eğitimler ve VIP listeleme — bireysel hekim için tam panel.',
    aylik: 2099,
    yillik: 20990,
    aylikIndirimli: 1599,
    yillikIndirimli: 15999,
    features: [
      'Profesyonel paketin tümü',
      'Finansal raporlar & gelir–gider',
      'SSS yönetim modülü',
      'Blog & sağlık makalesi paneli',
      'Danışan yorumları yönetimi',
      'Eğitimler & başvuru formu',
      'Online görüntülü görüşme (platform odası)',
      'Aramada en üst VIP listeleme',
    ],
    ideal: 'Online seans, finans veya içerik üreten bireysel hekimler',
  },
  {
    id: 'web',
    dbId: 5,
    tur: 'bireysel',
    ad: 'Özel Web Sitesi Entegrasyon Paketi',
    tagline: 'VIP + kişisel siteniz',
    aciklama:
      'VIP paneli + kişisel hekim web sitesi: kendi domaininiz, CMS, online randevu, SEO, hosting ve SSL.',
    aylik: 2499,
    yillik: 24999,
    aylikIndirimli: 1999,
    yillikIndirimli: 19999,
    features: [
      'Tüm VIP paket özellikleri',
      'Kişiye özel alan adı (.com / .com.tr)',
      'Mobil uyumlu modern hekim sitesi',
      'Premium temalar + 3 ücretsiz tema',
      'Siteden anlık online randevu',
      'Blog / içerik yönetimi',
      'Google Haritalar, SEO, Analytics',
      'Hosting, SSL ve teknik bakım dahil',
    ],
    ideal: 'Kendi marka sitesi ve SEO isteyen bireysel hekimler',
  },
  {
    id: 'klinik_baslangic',
    dbId: 6,
    tur: 'klinik',
    ad: 'Klinik Başlangıç',
    tagline: 'Küçük klinik / ekip',
    aciklama:
      'Küçük klinikler ve ortak muayenehaneler: ortak hasta havuzu, en fazla 3 hekim ve 1 personel hesabı.',
    aylik: 1899,
    yillik: 18990,
    aylikIndirimli: 1399,
    yillikIndirimli: 13990,
    features: [
      'Ortak hasta havuzu ve CRM',
      'Maksimum 3 aktif hekim',
      '1 sekreter / personel hesabı',
      'Hekim çalışma saatleri ve takvim',
      'Temel raporlama',
      'Klinik duyuru sistemi',
    ],
    ideal: '2–3 hekimli küçük klinik, az personel',
    limit: '≤3 hekim · ≤1 personel',
    maxDoktor: 3,
    maxPersonel: 1,
  },
  {
    id: 'klinik_profesyonel',
    dbId: 7,
    tur: 'klinik',
    ad: 'Klinik Profesyonel',
    tagline: 'Orta ölçek & finans',
    aciklama:
      'Orta ölçekli klinikler: 10 hekime kadar, 5 personel, toplu randevu, merkezi finans ve hakediş.',
    aylik: 3699,
    yillik: 36990,
    aylikIndirimli: 2699,
    yillikIndirimli: 26990,
    features: [
      'Klinik Başlangıç özelliklerinin tümü',
      'Maksimum 10 aktif hekim',
      '5 sekreter / personel hesabı',
      'Toplu randevu yönetimi ve bloklama',
      'Merkezi finans & gelir–gider',
      'Hakediş / komisyon hesaplama',
      'Detaylı klinik performans raporları',
    ],
    ideal: 'Çok hekimli klinik, personel ekibi, finans takibi',
    limit: '≤10 hekim · ≤5 personel',
    maxDoktor: 10,
    maxPersonel: 5,
  },
  {
    id: 'klinik_kurumsal',
    dbId: 8,
    tur: 'klinik',
    ad: 'Klinik Kurumsal',
    tagline: 'Sınırsız + klinik web sitesi',
    aciklama:
      'Sınırsız hekim/personel + özel klinik web sitesi: kurumsal domain, çok hekimli vitrin, CMS ve online randevu.',
    aylik: 5499,
    yillik: 54990,
    aylikIndirimli: 3999,
    yillikIndirimli: 39990,
    features: [
      'Klinik Profesyonel özelliklerinin tümü',
      'Sınırsız hekim ekleme',
      'Sınırsız personel tanımlama',
      'Merkezi finans & PDF rapor çıktıları',
      'Şubeler için ortak hasta havuzu',
      'Özel klinik web sitesi (domain + CMS + hosting + SSL)',
      'Çok hekimli vitrin ve hekim seçimli randevu',
      'Öncelikli destek & sekreterya eğitimi',
    ],
    ideal: 'Büyük klinik / tıp merkezi veya klinik marka sitesi isteyenler',
    limit: 'Sınırsız hekim · sınırsız personel',
    maxDoktor: 999,
    maxPersonel: 999,
  },
];

function asList(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function hasAny(v: string | string[] | undefined, ...ids: string[]): boolean {
  const list = asList(v);
  return ids.some((id) => list.includes(id));
}

/** Analiz sonucu: klinik mi bireysel mi, web ihtiyacı, ekip boyutu */
type Profile = {
  track: PkgTur;
  wantsWebsite: boolean;
  wantsOnline: boolean;
  wantsFinans: boolean;
  wantsGrowth: boolean;
  wantsContent: boolean;
  wantsEgitim: boolean;
  multiDoctor: boolean;
  largeTeam: boolean;
  midTeam: boolean;
  hasStaff: boolean;
  trialOnly: boolean;
  reasons: string[];
};

function analyzeProfile(a: Answers): Profile {
  const multiDoctor = a.hekim_sayisi === '2_5' || a.hekim_sayisi === '6_plus';
  const largeTeam =
    a.hekim_sayisi === '6_plus' || a.staff_count === '5_plus' || a.practice === 'hastane';
  const midTeam =
    a.hekim_sayisi === '2_5' || a.staff_count === '2_4' || a.staff_count === '5_plus';
  const hasStaff =
    a.staff === 'yes' ||
    a.staff === 'soon' ||
    hasAny(a.needs, 'personel') ||
    (!!a.staff_count && a.staff_count !== '0');

  const wantsWebsite =
    a.website === 'yes' || hasAny(a.goal, 'marka') || hasAny(a.needs, 'web');
  const wantsOnline =
    a.online === 'yes' ||
    hasAny(a.goal, 'online') ||
    hasAny(a.needs, 'online') ||
    a.practice === 'online' ||
    a.online_share === 'mid' ||
    a.online_share === 'high';
  const wantsFinans =
    a.finans === 'yes' || hasAny(a.goal, 'finans') || hasAny(a.needs, 'finans');
  const wantsGrowth = hasAny(a.goal, 'buyume') || hasAny(a.needs, 'talep', 'galeri');
  const wantsContent = a.content === 'yes' || hasAny(a.needs, 'blog', 'yorum');
  const wantsEgitim = a.egitim === 'yes' || hasAny(a.needs, 'egitim');

  // Klinik yolu: birden fazla hekim, klinik/hastane, klinik hedefi, ekip personeli
  const clinicSignals = [
    multiDoctor,
    a.practice === 'klinik' || a.practice === 'hastane',
    a.clinic === 'yes',
    hasAny(a.goal, 'klinik'),
    hasAny(a.needs, 'personel') && hasStaff,
    a.staff_count === '2_4' || a.staff_count === '5_plus',
    a.staff === 'yes' && multiDoctor,
  ];
  const clinicScore = clinicSignals.filter(Boolean).length;
  const track: PkgTur = clinicScore >= 1 ? 'klinik' : 'bireysel';

  const trialOnly =
    (a.start_when === 'deneme' || a.start_when === 'kesfet') &&
    !wantsWebsite &&
    !wantsOnline &&
    !wantsFinans &&
    !multiDoctor &&
    track === 'bireysel';

  const reasons: string[] = [];
  if (track === 'klinik') {
    reasons.push('Profil: Klinik / ekip paketi yolu');
    if (multiDoctor) reasons.push(`Hekim sayısı: ${labelOf('hekim_sayisi', a.hekim_sayisi!)}`);
    if (hasStaff) {
      reasons.push(
        a.staff_count
          ? `Personel: ${labelOf('staff_count', a.staff_count)}`
          : `Personel: ${labelOf('staff', a.staff ?? 'yes')}`,
      );
    }
    if (a.clinic) reasons.push(`Klinik: ${labelOf('clinic', a.clinic)}`);
    if (a.practice) reasons.push(`Çalışma: ${labelOf('practice', a.practice)}`);
  } else {
    reasons.push('Profil: Bireysel hekim paketi yolu');
    if (a.practice) reasons.push(`Çalışma: ${labelOf('practice', a.practice)}`);
    if (a.hekim_sayisi === '1') reasons.push('Tek hekim');
  }
  if (wantsWebsite) reasons.push('Web sitesi isteniyor → web özellikli paket');
  if (wantsOnline) reasons.push('Online görüşme ihtiyacı');
  if (wantsFinans) reasons.push('Finans / muhasebe ihtiyacı');
  if (wantsGrowth) reasons.push('Büyüme / talep / galeri');
  if (a.goal) reasons.push(`Hedef: ${labelList('goal', a.goal)}`);
  if (a.needs) reasons.push(`Modüller: ${labelList('needs', a.needs)}`);
  if (a.patient_volume) reasons.push(`Hasta: ${labelOf('patient_volume', a.patient_volume)}`);
  if (a.start_when) reasons.push(`Zamanlama: ${labelOf('start_when', a.start_when)}`);
  if (a.branch) reasons.push(`Branş: ${labelList('branch', a.branch)}`);

  return {
    track,
    wantsWebsite,
    wantsOnline,
    wantsFinans,
    wantsGrowth,
    wantsContent,
    wantsEgitim,
    multiDoctor,
    largeTeam,
    midTeam,
    hasStaff,
    trialOnly,
    reasons,
  };
}

/**
 * Kural tabanlı skor: önce yol (klinik/bireysel), sonra özellik uyumu.
 * Yanlış yoldaki paketler güçlü şekilde cezalandırılır.
 */
function scorePackage(id: string, a: Answers, p: Profile): number {
  let s = 0;
  const isKlinik = id.startsWith('klinik_');
  const isBireysel = !isKlinik;

  // ── Yol kilidi ─────────────────────────────────────────────
  if (p.track === 'klinik') {
    if (isBireysel) s -= 80; // bireysel paketler klinik profile uymuyor
    if (isKlinik) s += 40;
  } else {
    if (isKlinik) s -= 80;
    if (isBireysel) s += 25;
  }

  // ── Klinik paketleri ───────────────────────────────────────
  if (id === 'klinik_baslangic') {
    if (p.track === 'klinik') s += 20;
    if (a.hekim_sayisi === '2_5') s += 18;
    if (a.staff_count === '0' || a.staff_count === '1' || !p.hasStaff) s += 10;
    if (a.clinic === 'yes' || a.clinic === 'planning') s += 8;
    if (p.wantsFinans) s -= 8; // finans → profesyonel/kurumsal
    if (p.wantsWebsite) s -= 35; // web yalnız kurumsal
    if (p.largeTeam) s -= 25;
    if (a.hekim_sayisi === '6_plus') s -= 30;
    if (a.staff_count === '5_plus') s -= 20;
    if (a.staff_count === '2_4') s -= 6;
  }

  if (id === 'klinik_profesyonel') {
    if (p.track === 'klinik') s += 22;
    if (a.hekim_sayisi === '2_5') s += 16;
    if (a.hekim_sayisi === '6_plus') s += 8; // 6+ için kurumsal daha iyi ama pro de yakın
    if (a.staff_count === '2_4') s += 18;
    if (a.staff_count === '5_plus') s += 10;
    if (p.wantsFinans) s += 22;
    if (p.midTeam) s += 10;
    if (p.hasStaff) s += 8;
    if (a.patient_volume === '100_300' || a.patient_volume === '300_plus') s += 8;
    if (a.appt_volume === '40_80' || a.appt_volume === '80_plus') s += 6;
    if (p.wantsWebsite) s -= 40; // web → kurumsal
    if (p.largeTeam && !p.wantsWebsite) s += 6;
    if (a.hekim_sayisi === '1' && !p.multiDoctor) s -= 10;
  }

  if (id === 'klinik_kurumsal') {
    if (p.track === 'klinik') s += 24;
    // Klinik web sitesi YALNIZ bu pakette
    if (p.wantsWebsite) s += 55;
    if (p.largeTeam) s += 28;
    if (a.hekim_sayisi === '6_plus') s += 22;
    if (a.staff_count === '5_plus') s += 18;
    if (p.wantsFinans) s += 12;
    if (a.practice === 'hastane') s += 12;
    if (a.city_scale === 'coklu') s += 8;
    if (a.patient_volume === '300_plus') s += 8;
    // Küçük ekip + web yok → aşırı paket
    if (!p.wantsWebsite && !p.largeTeam && a.hekim_sayisi === '2_5' && (a.staff_count === '0' || a.staff_count === '1')) {
      s -= 18;
    }
  }

  // ── Bireysel paketler ──────────────────────────────────────
  if (id === 'demo') {
    if (p.trialOnly) s += 35;
    if (a.start_when === 'deneme' || a.start_when === 'kesfet') s += 12;
    if (a.patient_volume === '0_20' && a.appt_volume === '0_15') s += 6;
    if (hasAny(a.current_tool, 'yok')) s += 4;
    if (p.wantsWebsite || p.wantsOnline || p.wantsFinans || p.multiDoctor || p.hasStaff) s -= 40;
    if (a.start_when === 'hemen' || a.start_when === '1ay') s -= 15;
  }

  if (id === 'starter') {
    if (a.practice === 'muayenehane') s += 10;
    if (a.clinic === 'no') s += 8;
    if (a.hekim_sayisi === '1') s += 12;
    if (!p.hasStaff) s += 6;
    if (hasAny(a.goal, 'randevu') && !p.wantsGrowth) s += 10;
    if (hasAny(a.needs, 'takvim') && asList(a.needs).length <= 2) s += 6;
    if (a.patient_volume === '0_20' || a.patient_volume === '20_100') s += 6;
    if (a.experience === '0_3') s += 6;
    if (p.wantsWebsite) s -= 45;
    if (p.wantsOnline) s -= 25;
    if (p.wantsFinans) s -= 20;
    if (p.wantsContent || p.wantsEgitim) s -= 12;
    if (p.wantsGrowth) s -= 8;
  }

  if (id === 'plus') {
    if (p.wantsGrowth) s += 22;
    if (hasAny(a.needs, 'talep', 'galeri')) s += 14;
    if (a.patient_volume === '100_300') s += 10;
    if (a.appt_volume === '40_80') s += 8;
    if (a.city_scale === 'buyuk') s += 6;
    if (a.experience === '3_10') s += 6;
    if (a.online === 'maybe') s += 4;
    if (p.wantsWebsite) s -= 40;
    if (p.wantsOnline && a.online === 'yes') s -= 12; // VIP daha doğru
    if (p.wantsFinans) s -= 10;
    if (p.wantsContent || p.wantsEgitim) s -= 8;
  }

  if (id === 'vip') {
    if (p.wantsOnline) s += 24;
    if (a.online === 'yes') s += 10;
    if (p.wantsFinans) s += 18;
    if (p.wantsContent) s += 14;
    if (p.wantsEgitim) s += 14;
    if (hasAny(a.needs, 'yorum')) s += 6;
    if (a.online_share === 'mid' || a.online_share === 'high') s += 10;
    if (a.patient_volume === '300_plus' || a.appt_volume === '80_plus') s += 8;
    if (p.wantsWebsite) s -= 35; // web paketi VIP+site
    if (!p.wantsOnline && !p.wantsFinans && !p.wantsContent && !p.wantsEgitim) s -= 8;
  }

  if (id === 'web') {
    // Bireysel özel web sitesi
    if (p.wantsWebsite && p.track === 'bireysel') s += 60;
    if (p.wantsWebsite) s += 20;
    if (a.website === 'yes') s += 15;
    if (hasAny(a.goal, 'marka') || hasAny(a.needs, 'web')) s += 12;
    if (p.wantsContent) s += 8;
    if (p.wantsOnline) s += 6; // VIP özellikleri dahil
    if (p.wantsFinans) s += 4;
    if (a.city_scale === 'buyuk' || a.city_scale === 'coklu') s += 4;
    if (a.website === 'maybe' && !p.wantsWebsite) s += 6;
    if (a.website === 'no' && !hasAny(a.needs, 'web') && !hasAny(a.goal, 'marka')) s -= 50;
    if (p.track === 'klinik') s -= 90; // klinik web = kurumsal
  }

  return s;
}

function matchReasons(pkg: Pkg, a: Answers, p: Profile): string[] {
  const r: string[] = [];
  if (pkg.tur === 'klinik' && p.track === 'klinik') {
    r.push('Klinik / çok hekimli yapıya uygun');
  }
  if (pkg.tur === 'bireysel' && p.track === 'bireysel') {
    r.push('Bireysel hekim kullanımına uygun');
  }
  if (pkg.id === 'web' && p.wantsWebsite) r.push('Kişisel web sitesi talebiniz var');
  if (pkg.id === 'klinik_kurumsal' && p.wantsWebsite) r.push('Klinik web sitesi yalnızca bu pakette');
  if (pkg.id === 'klinik_kurumsal' && p.largeTeam) r.push('Büyük ekip / sınırsız limit');
  if (pkg.id === 'klinik_profesyonel' && p.wantsFinans) r.push('Merkezi finans & hakediş');
  if (pkg.id === 'klinik_profesyonel' && p.midTeam) r.push('Orta ölçek hekim/personel');
  if (pkg.id === 'klinik_baslangic' && p.multiDoctor && !p.largeTeam) r.push('Küçük ekip (≤3 hekim)');
  if (pkg.id === 'vip' && p.wantsOnline) r.push('Online görüşme dahildir');
  if (pkg.id === 'vip' && p.wantsFinans) r.push('Finans modülü dahildir');
  if (pkg.id === 'plus' && p.wantsGrowth) r.push('Talep & görünürlük odaklı');
  if (pkg.id === 'starter' && a.hekim_sayisi === '1') r.push('Tek hekim temel paket');
  if (pkg.id === 'demo' && p.trialOnly) r.push('Önce deneme tercihiniz');
  if (pkg.maxDoktor != null && a.hekim_sayisi) {
    r.push(`Hekim kapasitesi: ${pkg.limit ?? pkg.maxDoktor}`);
  }
  return r.slice(0, 4);
}

function recommendPackage(a: Answers): {
  pkg: Pkg;
  why: string[];
  match: string[];
  score: number;
  ranked: { pkg: Pkg; score: number; match: string[] }[];
  profile: Profile;
} {
  const profile = analyzeProfile(a);
  const ranked = PACKAGES.map((pkg) => {
    const score = scorePackage(pkg.id, a, profile);
    return { pkg, score, match: matchReasons(pkg, a, profile) };
  }).sort((x, y) => y.score - x.score);

  const best = ranked[0] ?? { pkg: PACKAGES[0], score: 0, match: [] as string[] };
  const why = profile.reasons.length ? profile.reasons : ['Genel kullanım profilinize göre seçildi.'];

  return {
    pkg: best.pkg,
    why,
    match: best.match,
    score: best.score,
    ranked,
    profile,
  };
}

function labelList(key: string, v: string | string[]): string {
  return asList(v)
    .map((id) => labelOf(key, id))
    .join(', ');
}

/** Short human labels for summary chips */
function labelOf(key: string, id: string): string {
  const map: Record<string, Record<string, string>> = {
    practice: {
      muayenehane: 'Muayenehane',
      klinik: 'Klinik',
      hastane: 'Hastane',
      online: 'Online ağırlıklı',
    },
    clinic: { yes: 'Var', planning: 'Planlıyor', no: 'Yok' },
    staff: { yes: 'Var', soon: 'Yakında', no: 'Yok' },
    hekim_sayisi: { '1': 'Sadece ben', '2_5': '2–5 hekim', '6_plus': '6+ hekim' },
    staff_count: { '0': 'Yok', '1': '1 kişi', '2_4': '2–4 kişi', '5_plus': '5+ kişi' },
    goal: {
      randevu: 'Randevu düzeni',
      buyume: 'Büyüme',
      online: 'Online seans',
      marka: 'Web / marka',
      klinik: 'Klinik yönetimi',
      finans: 'Finans',
    },
    needs: {
      takvim: 'Takvim',
      talep: 'Talep',
      galeri: 'Galeri',
      finans: 'Finans',
      blog: 'Blog',
      yorum: 'Yorum',
      egitim: 'Eğitim',
      online: 'Online',
      web: 'Web sitesi',
      personel: 'Personel',
    },
    branch: {
      dahili: 'Dahili/genel',
      cerrahi: 'Cerrahi',
      dis: 'Diş',
      estetik: 'Estetik',
      psikoloji: 'Psikoloji',
      diger: 'Diğer',
    },
    online: { yes: 'Evet', maybe: 'Belki', no: 'Hayır' },
    website: { yes: 'İstiyor', maybe: 'Belki', later: 'Sonra', no: 'İstemiyor' },
    patient_volume: {
      '0_20': '0–20/ay',
      '20_100': '20–100/ay',
      '100_300': '100–300/ay',
      '300_plus': '300+/ay',
    },
    appt_volume: {
      '0_15': '0–15/hafta',
      '15_40': '15–40/hafta',
      '40_80': '40–80/hafta',
      '80_plus': '80+/hafta',
    },
    city_scale: {
      buyuk: 'Büyükşehir',
      orta: 'Orta şehir',
      kucuk: 'Küçük şehir',
      coklu: 'Çok şehir',
    },
    experience: { '0_3': '0–3 yıl', '3_10': '3–10 yıl', '10_plus': '10+ yıl' },
    online_share: { none: 'Yok', low: 'Az', mid: 'Orta', high: 'Yüksek' },
    content: { yes: 'Blog var', maybe: 'Ara sıra', no: 'Yok' },
    egitim: { yes: 'Eğitim satar', maybe: 'Planlıyor', no: 'Yok' },
    current_tool: {
      defter: 'Defter/Excel',
      whatsapp: 'WhatsApp',
      baska: 'Başka yazılım',
      sekreter: 'Sekreter',
      yok: 'Sistem yok',
    },
    source: {
      google: 'Google',
      social: 'Sosyal',
      meslek: 'Meslektaş',
      reklam: 'Reklam',
      kongre: 'Kongre',
      diger: 'Diğer',
    },
    finans: { yes: 'İstiyor', maybe: 'Temel', basic: 'Temel', no: 'Gerekmez' },
    start_when: {
      hemen: 'Hemen',
      '1ay': '1 ay içinde',
      deneme: 'Önce deneme',
      kesfet: 'İnceleme',
      sonra: 'Sonra',
    },
  };
  return map[key]?.[id] ?? id;
}

export async function isOnboardingDone(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ONBOARDING_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function markOnboardingDone(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, '1');
  } catch {
    /* ignore */
  }
}

export async function loadOnboardingAnswers(): Promise<Answers | null> {
  try {
    const raw = await AsyncStorage.getItem(ONBOARDING_ANSWERS_KEY);
    return raw ? (JSON.parse(raw) as Answers) : null;
  } catch {
    return null;
  }
}

async function saveAnswers(a: Answers) {
  try {
    await AsyncStorage.setItem(ONBOARDING_ANSWERS_KEY, JSON.stringify(a));
  } catch {
    /* ignore */
  }
}

/* ─── Video-like staggered enter (left / right / up) ─────── */

type SlideFrom = 'left' | 'right' | 'up' | 'fade';

/**
 * Her sayfa geçişinde satır satır soldan/sağdan kayarak gelir.
 * delay ms — video tanıtımı gibi kademeli okuma hissi.
 */
function SlideIn({
  children,
  from = 'left',
  delay = 0,
  sceneKey,
  style,
  distance = 42,
  duration = 520,
}: {
  children: ReactNode;
  from?: SlideFrom;
  delay?: number;
  /** index / stage.key — değişince animasyon yeniden başlar */
  sceneKey: string | number;
  style?: StyleProp<ViewStyle>;
  distance?: number;
  duration?: number;
}) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = 0;
    t.value = withDelay(
      delay,
      withTiming(1, { duration, easing: Easing.out(Easing.cubic) }),
    );
  }, [sceneKey, delay, duration, t]);

  const anim = useAnimatedStyle(() => {
    const p = t.value;
    const x =
      from === 'left'
        ? interpolate(p, [0, 1], [-distance, 0], Extrapolation.CLAMP)
        : from === 'right'
          ? interpolate(p, [0, 1], [distance, 0], Extrapolation.CLAMP)
          : 0;
    const y =
      from === 'up' ? interpolate(p, [0, 1], [distance * 0.55, 0], Extrapolation.CLAMP) : 0;
    return {
      opacity: p,
      transform: [{ translateX: x }, { translateY: y }],
    };
  });

  return <Animated.View style={[anim, style]}>{children}</Animated.View>;
}

﻿/**
 * Premium intro — açık renk, tek ekran (scroll yok), mock + kademeli metin.
 */
function PremiumIntroScene({
  sceneKey,
  visual,
  accent,
  eyebrow,
  title,
  body,
  bullets,
  isFirst,
}: {
  sceneKey: string;
  visual: VisualKind;
  accent: string;
  eyebrow: string;
  title: string;
  body: string;
  bullets?: string[];
  isFirst?: boolean;
}) {
  const breath = useSharedValue(0);
  const ring = useSharedValue(0);
  const bulletShow = (bullets ?? []).slice(0, 3);

  useEffect(() => {
    breath.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    ring.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.out(Easing.cubic) }),
      -1,
      false,
    );
  }, [breath, ring, sceneKey]);

  const mockFloat = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(breath.value, [0, 1], [0, -5]) }],
  }));
  const pulseRing = useAnimatedStyle(() => ({
    opacity: interpolate(ring.value, [0, 0.7, 1], [0.45, 0.12, 0]),
    transform: [{ scale: interpolate(ring.value, [0, 1], [0.9, 1.28]) }],
  }));

  return (
    <View style={px.wrap}>
      <SlideIn sceneKey={sceneKey} from="up" delay={40} distance={36} duration={520}>
        <Animated.View style={[px.mockShell, mockFloat]}>
          <View style={px.mockTopBar}>
            <View style={[px.mockDot, { backgroundColor: accent }]} />
            <Text style={px.mockTopTxt} numberOfLines={1}>
              {visual === 'calendar'
                ? 'Takvim'
                : visual === 'modules'
                  ? 'Panel'
                  : visual === 'video'
                    ? 'Görüşme'
                    : visual === 'team'
                      ? 'Klinik'
                      : 'Randevu Ajandam'}
            </Text>
            <View style={[px.mockPill, { backgroundColor: `${accent}18` }]}>
              <Text style={[px.mockPillTxt, { color: accent }]}>CANLI</Text>
            </View>
          </View>

          {(visual === 'brand' || visual === 'ready' || visual === 'security') && (
            <View style={px.mockBodyCenter}>
              <LinearGradient colors={['#FFFFFF', '#F8FAFC']} style={px.logoDisc}>
                <Image source={LOGO} style={px.logoImg} />
              </LinearGradient>
              <Text style={px.mockBrand}>Randevu Ajandam</Text>
              <View style={px.metricRow}>
                {[
                  { v: '7/24', l: 'panel' },
                  { v: '2FA', l: 'güvenlik' },
                  { v: 'API', l: 'senkron' },
                ].map((m) => (
                  <View key={m.l} style={px.metricChip}>
                    <Text style={[px.metricVal, { color: accent }]}>{m.v}</Text>
                    <Text style={px.metricLab}>{m.l}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {visual === 'calendar' && (
            <View style={px.mockPad}>
              <View style={px.calHead}>
                <Text style={px.calTitle}>Bu hafta</Text>
                <Text style={[px.calBadgeTxt, { color: accent }]}>8 randevu</Text>
              </View>
              <View style={px.weekRow}>
                {['P', 'S', 'Ç', 'P', 'C'].map((d, i) => (
                  <View
                    key={`${d}${i}`}
                    style={[px.weekCell, i === 2 && { backgroundColor: accent, borderColor: accent }]}
                  >
                    <Text style={[px.weekD, i === 2 && { color: '#FFF' }]}>{d}</Text>
                    <Text style={[px.weekN, i === 2 && { color: '#FFF' }]}>{12 + i}</Text>
                  </View>
                ))}
              </View>
              {[
                { t: '09:30', n: 'Ayşe Yılmaz · Yüz yüze' },
                { t: '11:00', n: 'Online seans · Onaylı' },
              ].map((row, i) => (
                <View
                  key={row.t}
                  style={[
                    px.apptRow,
                    i === 0 && { borderColor: `${accent}55`, backgroundColor: `${accent}12` },
                  ]}
                >
                  <Text style={[px.apptT, i === 0 && { color: accent }]}>{row.t}</Text>
                  <Text style={px.apptN} numberOfLines={1}>
                    {row.n}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {visual === 'modules' && (
            <View style={px.modGrid}>
              {[
                { l: 'Hastalar', c: '#10B981' },
                { l: 'Hizmet', c: '#3B82F6' },
                { l: 'Finans', c: '#EE7D31' },
                { l: 'İçerik', c: '#8B5CF6' },
              ].map((m) => (
                <View key={m.l} style={px.modTile}>
                  <View style={[px.modDot, { backgroundColor: m.c }]} />
                  <Text style={px.modLabel}>{m.l}</Text>
                </View>
              ))}
            </View>
          )}

          {visual === 'video' && (
            <View style={px.mockBodyCenter}>
              <View style={px.avWrap}>
                <Animated.View style={[px.avRingOuter, { borderColor: `${accent}44` }, pulseRing]} />
                <View style={[px.avRing, { borderColor: `${accent}66` }]}>
                  <View style={[px.avInner, { backgroundColor: `${accent}14` }]}>
                    <Text style={[px.avLetter, { color: accent }]}>H</Text>
                  </View>
                </View>
              </View>
              <View style={px.liveRow}>
                <View style={[px.liveDot, { backgroundColor: accent }]} />
                <Text style={[px.liveTxt, { color: accent }]}>ONLINE GÖRÜŞME</Text>
              </View>
            </View>
          )}

          {visual === 'team' && (
            <View style={px.mockPad}>
              {[
                { n: 'Uzm. Dr. A. Yılmaz', r: 'Sahip' },
                { n: 'S. Demir', r: 'Sekreter' },
              ].map((row) => (
                <View key={row.n} style={px.teamRow}>
                  <View style={[px.teamAv, { backgroundColor: `${accent}18` }]}>
                    <Text style={[px.teamAvTxt, { color: accent }]}>{row.r.charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={px.teamName} numberOfLines={1}>
                      {row.n}
                    </Text>
                    <Text style={px.teamRole}>{row.r}</Text>
                  </View>
                  <Text style={[px.teamOkTxt, { color: accent }]}>✓</Text>
                </View>
              ))}
            </View>
          )}
        </Animated.View>
      </SlideIn>

      <View style={px.copyBlock}>
        <SlideIn sceneKey={sceneKey} from="left" delay={160} distance={36}>
          <Text style={[px.eyebrowPillTxt, { color: accent }]}>{eyebrow}</Text>
        </SlideIn>
        <SlideIn sceneKey={sceneKey} from="right" delay={260} distance={40} duration={500}>
          <Text style={px.displayTitle} numberOfLines={2}>
            {title.replace(/\n/g, ' ')}
          </Text>
        </SlideIn>
        <SlideIn sceneKey={sceneKey} from="left" delay={360} distance={32}>
          <Text style={px.lead} numberOfLines={2}>
            {body}
          </Text>
        </SlideIn>
        <View style={px.glassList}>
          {bulletShow.map((b, i) => (
            <SlideIn
              key={b}
              sceneKey={sceneKey}
              from={i % 2 === 0 ? 'left' : 'right'}
              delay={460 + i * 100}
              distance={36}
            >
              <View style={px.glassRow}>
                <View style={[px.glassCheck, { backgroundColor: `${accent}18` }]}>
                  <Text style={[px.glassCheckTxt, { color: accent }]}>✓</Text>
                </View>
                <Text style={px.glassTxt} numberOfLines={1}>
                  {b}
                </Text>
              </View>
            </SlideIn>
          ))}
        </View>
        {isFirst ? (
          <SlideIn sceneKey={sceneKey} from="up" delay={780} distance={20}>
            <Text style={px.proofTxt}>Profil · paket skoru · anında öneri</Text>
          </SlideIn>
        ) : null}
      </View>
    </View>
  );
}


/* ─── Premium button ─────────────────────────────────────── */

function GlowButton({
  label,
  onPress,
  arrow,
  flex,
  muted,
  disabled,
  height,
  onDark,
}: {
  label: string;
  onPress: () => void;
  arrow?: boolean;
  flex?: boolean;
  muted?: boolean;
  disabled?: boolean;
  /** Responsive button height from useLayout().btnHeight */
  height?: number;
  /** Koyu intro footer üzerinde ghost buton */
  onDark?: boolean;
}) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const minH = height ?? 54;

  if (muted) {
    return (
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        style={[
          s.btnGhost,
          onDark && s.btnGhostDark,
          { minHeight: Math.max(minH - 4, 44) },
          flex && { flex: 1 },
          disabled && { opacity: 0.5 },
        ]}
      >
        <Text style={[s.btnGhostTxt, onDark && s.btnGhostTxtDark]}>{label}</Text>
      </Pressable>
    );
  }

  return (
    <Animated.View style={[anim, flex ? { flex: 1 } : undefined, disabled && { opacity: 0.55 }]}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.97, { damping: 16, stiffness: 280 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 14, stiffness: 220 });
        }}
        style={[s.btnGlowWrap, flex && { flex: 1 }]}
      >
        <LinearGradient
          colors={['#FFB07A', '#F58A45', '#E06A20']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          pointerEvents="none"
          style={[s.btnGlow, { minHeight: minH }]}
        >
          <Text style={s.btnGlowTxt}>{label}</Text>
          {arrow ? <Text style={s.btnArrow}>→</Text> : null}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

/* ─── Cinematic visuals ──────────────────────────────────── */

function SceneArt({
  kind,
  accent,
  artH = 150,
  compact = false,
}: {
  kind: VisualKind;
  accent: string;
  artH?: number;
  compact?: boolean;
}) {
  const breath = useSharedValue(0);
  const shimmer = useSharedValue(0);

  useEffect(() => {
    breath.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    shimmer.value = withDelay(
      400,
      withRepeat(withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.cubic) }), -1, false),
    );
  }, [breath, shimmer]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(breath.value, [0, 1], [0, -8]) },
      { scale: interpolate(breath.value, [0, 1], [1, 1.02]) },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(breath.value, [0, 1], [0.2, 0.45]),
    transform: [{ scale: interpolate(breath.value, [0, 1], [0.92, 1.08]) }],
  }));

  const cardH = Math.max(compact ? 120 : 136, Math.min(artH, compact ? 150 : 168));

  return (
    <View style={[s.artStage, { marginBottom: compact ? 4 : 8, paddingHorizontal: compact ? 16 : 20 }]}>
      <Animated.View
        style={[
          s.artGlow,
          glowStyle,
          {
            backgroundColor: accent,
            width: compact ? 140 : 200,
            height: compact ? 140 : 200,
            top: compact ? 8 : 20,
          },
        ]}
      />
      <Animated.View
        style={[s.artCard, floatStyle, { borderColor: `${accent}33`, height: cardH }]}
      >
        <LinearGradient
          colors={['rgba(30,48,68,0.95)', 'rgba(12,22,34,0.98)']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <LinearGradient
          colors={[`${accent}55`, 'transparent']}
          style={s.artTopLine}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
        />

        {kind === 'brand' && (
          <View style={s.artCenter}>
            <View style={[s.logoRing, compact && { width: 64, height: 64, borderRadius: 20 }]}>
              <LinearGradient
                colors={['#FFFFFF', '#F5F0EB']}
                style={[s.logoDisc, compact && { width: 54, height: 54, borderRadius: 16 }]}
              >
                <Image
                  source={LOGO}
                  style={[s.logoImg, compact && { width: 36, height: 36 }]}
                />
              </LinearGradient>
            </View>
            <Text style={[s.artBrand, compact && { fontSize: 15 }]}>Randevu Ajandam</Text>
            {!compact ? (
              <View style={[s.artPill, { borderColor: `${accent}44`, backgroundColor: `${accent}18` }]}>
                <Text style={[s.artPillTxt, { color: accent }]}>DOKTOR DENEYİMİ</Text>
              </View>
            ) : null}
          </View>
        )}

        {kind === 'calendar' && (
          <View style={s.artPad}>
            <View style={s.calHead}>
              <Text style={s.calTitle}>Bu hafta</Text>
              <View style={[s.miniBadge, { backgroundColor: `${accent}22` }]}>
                <Text style={[s.miniBadgeTxt, { color: accent }]}>8 randevu</Text>
              </View>
            </View>
            <View style={s.weekRow}>
              {['P', 'S', 'Ç', 'P', 'C'].map((d, i) => (
                <View key={`${d}${i}`} style={[s.weekCell, i === 2 && { backgroundColor: accent }]}>
                  <Text style={[s.weekD, i === 2 && { color: '#FFF7ED' }]}>{d}</Text>
                  <Text style={[s.weekN, i === 2 && { color: '#FFF7ED' }]}>{12 + i}</Text>
                </View>
              ))}
            </View>
            {[
              { t: '09:30', n: 'Ayşe Yılmaz', on: true },
              { t: '11:00', n: 'Online seans', on: false },
            ].map((row) => (
              <View
                key={row.t}
                style={[
                  s.apptLine,
                  row.on && { borderColor: `${accent}50`, backgroundColor: `${accent}14` },
                ]}
              >
                <Text style={[s.apptT, row.on && { color: accent }]}>{row.t}</Text>
                <Text style={[s.apptN, !row.on && { color: '#7A8B9C' }]}>{row.n}</Text>
                {row.on ? <View style={s.dotLive} /> : null}
              </View>
            ))}
          </View>
        )}

        {kind === 'modules' && (
          <View style={s.modGrid}>
            {[
              { l: 'Hastalar', c: '#5DD4A0' },
              { l: 'Hizmet', c: '#6BA3F5' },
              { l: 'Finans', c: '#C96A2B' },
              { l: 'Klinik', c: '#B794F6' },
            ].map((m) => (
              <View key={m.l} style={s.modTile}>
                <View style={[s.modDot, { backgroundColor: m.c }]} />
                <Text style={s.modLabel}>{m.l}</Text>
              </View>
            ))}
          </View>
        )}

        {kind === 'video' && (
          <View style={s.artCenter}>
            <View style={[s.avRing, { borderColor: `${accent}66` }]}>
              <LinearGradient colors={[`${accent}33`, `${accent}11`]} style={s.avInner}>
                <Text style={[s.avLetter, { color: accent }]}>H</Text>
              </LinearGradient>
            </View>
            <View style={s.liveRow}>
              <View style={s.liveDot} />
              <Text style={s.liveTxt}>CANLI GÖRÜŞME</Text>
            </View>
          </View>
        )}

        {kind === 'team' && (
          <View style={s.artPad}>
            <Text style={s.cardH}>Personel paneli</Text>
            {['Randevu oluştur', 'Talep onayla', 'Ödeme al'].map((x) => (
              <View key={x} style={s.teamLine}>
                <View style={[s.checkMini, { backgroundColor: `${accent}22` }]}>
                  <Text style={{ color: accent, fontWeight: '800', fontSize: 11 }}>✓</Text>
                </View>
                <Text style={s.teamTxt}>{x}</Text>
              </View>
            ))}
          </View>
        )}

        {kind === 'reviews' && (
          <View style={s.artPad}>
            <Text style={s.quote}>
              “Randevu karmaşası bitti; sekreter aynı uygulamadan yönetiyor.”
            </Text>
            <Text style={s.quoteBy}>— Dr. A. Yılmaz · İstanbul</Text>
            <View style={s.quoteDiv} />
            <Text style={s.quote}>“Online seanslar hasta için çok kolay.”</Text>
            <Text style={s.quoteBy}>— Dr. E. Kaya · İzmir</Text>
          </View>
        )}

        {(kind === 'ready' || kind === 'security') && (
          <View style={s.artCenter}>
            <LinearGradient colors={[accent, '#E06A20']} style={s.readyDisc}>
              <Text style={s.readyCheck}>✓</Text>
            </LinearGradient>
            <Text style={s.readyTitle}>{kind === 'security' ? 'Güvenli oturum' : 'Hazırsınız'}</Text>
            <Text style={s.readySub}>
              {kind === 'security' ? '2FA · şifreli token' : 'Bir adım kaldı'}
            </Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

/* ─── Main screen ────────────────────────────────────────── */

export function OnboardingScreen({ onFinish }: Props) {
  const L = useLayout();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [period, setPeriod] = useState<IapPeriod>('aylik');
  const [busy, setBusy] = useState(false);
  const [stars, setStars] = useState(0);
  const [rateReason, setRateReason] = useState('');
  const [showReasonBox, setShowReasonBox] = useState(false);
  const [notifAsked, setNotifAsked] = useState(false);
  const [selectedPkgKey, setSelectedPkgKey] = useState<string | null>(null);
  /** Alt CTA, animasyon bitene kadar tıklanmaz */
  const [footerReady, setFooterReady] = useState(false);

  const stage = STAGES[index] ?? STAGES[0];
  const progress = (index + 1) / TOTAL;
  const recommendation = useMemo(() => recommendPackage(answers), [answers]);
  const recommended = recommendation.pkg;
  const otherPackages = useMemo(
    () => recommendation.ranked.filter((r) => r.pkg.id !== recommended.id),
    [recommendation.ranked, recommended.id],
  );
  const progressMax = Math.max(L.width - L.padX * 2, 100);

  useEffect(() => {
    if (stage.kind !== 'permission' || notifAsked) return;
    setNotifAsked(true);
    void (async () => {
      const r = await requestNotificationPermission();
      setAnswers((p) => ({ ...p, notif: r }));
    })();
  }, [stage.kind, notifAsked]);

  const progressSV = useSharedValue(progress);
  const footerReveal = useSharedValue(0);

  /** İçerik satır sayısı kadar gecikme — Devam butonu en sonda belirir */
  const footerDelayMs = useMemo(() => {
    if (stage.kind === 'story') {
      const n = Math.min(stage.bullets?.length ?? 0, 3);
      // mock + title + 3 bullets — then CTA (no scroll page)
      return 520 + n * 100 + 320;
    }
    if (stage.kind === 'question') {
      const n = Math.min(stage.choices.length, 8);
      return 320 + 140 + n * 85 + 220;
    }
    if (stage.kind === 'permission') return 700;
    if (stage.kind === 'package') return 480;
    return 500;
  }, [stage]);

  const isIntro = stage.phase === 'intro';

  useEffect(() => {
    progressSV.value = withTiming(progress, { duration: 320, easing: Easing.out(Easing.cubic) });
  }, [progress, progressSV]);

  useEffect(() => {
    setFooterReady(false);
    footerReveal.value = 0;
    footerReveal.value = withDelay(
      footerDelayMs,
      withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }),
    );
    const t = setTimeout(() => setFooterReady(true), footerDelayMs + 80);
    return () => clearTimeout(t);
  }, [index, footerDelayMs, footerReveal]);

  const progressStyle = useAnimatedStyle(() => ({
    width: interpolate(progressSV.value, [0, 1], [0, progressMax], Extrapolation.CLAMP),
  }));
  const footerStyle = useAnimatedStyle(() => ({
    opacity: footerReveal.value,
    transform: [
      {
        translateY: interpolate(footerReveal.value, [0, 1], [28, 0], Extrapolation.CLAMP),
      },
    ],
  }));

  const persistAndFinish = useCallback(
    async (mode: OnboardingFinishMode) => {
      await saveAnswers(answers);
      await markOnboardingDone();
      onFinish(mode);
    },
    [answers, onFinish],
  );

  const goNext = useCallback(() => {
    if (index >= TOTAL - 1) {
      void persistAndFinish('login');
      return;
    }
    setIndex((i) => Math.min(i + 1, TOTAL - 1));
  }, [index, persistAndFinish]);

  const goBack = useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0));
  }, []);

  const pick = useCallback((key: keyof Answers, id: string, multi?: boolean) => {
    if (multi) {
      setAnswers((prev) => {
        const cur = asList(prev[key]);
        const nextList = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
        const next = { ...prev, [key]: nextList };
        void saveAnswers(next);
        return next;
      });
      return;
    }
    setAnswers((prev) => {
      const next = { ...prev, [key]: id };
      void saveAnswers(next);
      return next;
    });
    setTimeout(() => setIndex((i) => Math.min(i + 1, TOTAL - 1)), 140);
  }, []);

  const multiSelectedCount = useMemo(() => {
    if (stage.kind !== 'question' || !stage.multi) return 0;
    return asList(answers[stage.key]).length;
  }, [stage, answers]);

  const submitLowStarFeedback = useCallback(
    async (yildiz: number, sebep: string) => {
      try {
        await fetch(`${API_URL}/app/rating-feedback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            yildiz,
            sebep,
            platform: Platform.OS,
            app_version: appVersion(),
            onboarding_cevaplar: answers,
          }),
        });
      } catch {
        /* offline ok */
      }
    },
    [answers],
  );

  const onStarPress = useCallback(
    async (n: number) => {
      setStars(n);
      setAnswers((p) => ({ ...p, rate: String(n) }));
      if (n === 5) {
        const url = storeReviewUrl();
        if (url) {
          try {
            await Linking.openURL(url);
          } catch {
            Alert.alert('Teşekkürler', 'Değerlendirmeniz için teşekkürler.');
          }
        } else {
          Alert.alert(
            'Teşekkürler',
            '5 yıldız için teşekkürler! Mağaza linki yayın sonrası açılacak (App Store ID yapılandırılmalı).',
          );
        }
        goNext();
        return;
      }
      if (n === 1) {
        setShowReasonBox(true);
        return;
      }
      // 2–4: optional short feedback then continue
      if (n >= 2 && n <= 4) {
        void submitLowStarFeedback(n, `${n} yıldız — onboarding (kısa)`);
      }
      goNext();
    },
    [goNext, submitLowStarFeedback],
  );

  const submitReasonAndContinue = useCallback(async () => {
    const reason = rateReason.trim();
    if (reason.length < 3) {
      Alert.alert('Sebep gerekli', 'Lütfen kısa bir geri bildirim yazın.');
      return;
    }
    setBusy(true);
    try {
      await submitLowStarFeedback(1, reason);
      Alert.alert('Teşekkürler', 'Geri bildiriminiz bize iletildi.');
      setShowReasonBox(false);
      goNext();
    } finally {
      setBusy(false);
    }
  }, [goNext, rateReason, submitLowStarFeedback]);

  const buyPackage = useCallback(
    async (pkg: Pkg) => {
      setBusy(true);
      setSelectedPkgKey(pkg.id);
      try {
        const isFree = pkg.aylik <= 0 && pkg.yillik <= 0;
        const res = await purchasePackageInApp({
          packageKey: pkg.id,
          packageName: pkg.ad,
          period,
          isFree: pkg.tur === 'klinik' ? false : isFree,
          paketId: pkg.dbId,
          tur: pkg.tur,
        });
        if (!res.ok) {
          Alert.alert('Paket seçimi', res.message);
          return;
        }
        if (pkg.tur === 'klinik') {
          Alert.alert(
            'Klinik paket tercihi',
            `${pkg.ad} kaydedildi.\n\nKlinik paketleri mobilden abone edilemez. Kayıt/giriş sonrası tercihiniz hatırlatılır; klinik kaydı ve paket bağlama web panelinden yapılır.\n\nAlttan “Kayıt ol” veya “Giriş yap” ile devam edin.`,
          );
          return;
        }
        Alert.alert(
          'Paket seçildi',
          `${pkg.ad} kaydedildi.\n\n${res.message}\n\nAlttan “Kayıt ol” veya “Giriş yap” ile devam edin — ücretsiz paket otomatik aktifleşir.`,
        );
      } finally {
        setBusy(false);
      }
    },
    [period],
  );

  const price = (p: Pkg) => {
    if (period === 'aylik') {
      return {
        main: p.aylikIndirimli ?? p.aylik,
        old: p.aylikIndirimli != null ? p.aylik : null,
        unit: '/ ay',
      };
    }
    return {
      main: p.yillikIndirimli ?? p.yillik,
      old: p.yillikIndirimli != null ? p.yillik : null,
      unit: '/ yıl',
    };
  };

  const accent = stage.accent;
  const phaseLabel =
    stage.phase === 'intro' ? 'Tanıtım' : stage.phase === 'profile' ? 'Profil' : 'Paket';
  const phaseIndex = STAGES.filter((x) => x.phase === stage.phase).findIndex(
    (x) => x.key === stage.key,
  );
  const phaseTotal = STAGES.filter((x) => x.phase === stage.phase).length;

  return (
    <View style={s.root}>
      <StatusBar style="dark" />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#F4F6F9' }]} pointerEvents="none" />

      {/* Header */}
      <View
        style={[
          s.header,
          {
            paddingTop: L.safeTop + 4,
            paddingHorizontal: L.padX,
            paddingBottom: 8,
          },
        ]}
      >
        <View style={s.headerLeft}>
          {index > 0 ? (
            <Pressable onPress={goBack} hitSlop={12} style={s.headerBackBtn}>
              <Text style={s.headerBackTxt}>‹</Text>
            </Pressable>
          ) : (
            <View style={s.headerLogo}>
              <Image source={LOGO} style={s.headerLogoImg} />
            </View>
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[s.headerBrand, { fontSize: 15 }]} numberOfLines={1}>
              Randevu Ajandam
            </Text>
            <Text style={[s.headerMeta, { fontSize: 11 }]} numberOfLines={1}>
              {phaseLabel} · {phaseIndex + 1}/{phaseTotal}
            </Text>
          </View>
        </View>
        <View style={s.stepChip}>
          <Text style={s.stepChipTxt}>
            {index + 1}/{TOTAL}
          </Text>
        </View>
      </View>

      {/* Progress */}
      <View style={[s.progressTrack, { marginHorizontal: L.padX }]}>
        <Animated.View style={[s.progressFill, progressStyle, { backgroundColor: accent }]} />
      </View>

      {/* Content */}
      <View style={[s.stage, isIntro && s.stageIntro]} key={stage.key}>
        {isIntro && stage.kind === 'story' ? (
          <View style={s.introFixed} pointerEvents="box-none">
            <PremiumIntroScene
              sceneKey={stage.key}
              visual={stage.visual}
              accent={accent}
              eyebrow={stage.eyebrow}
              title={stage.title}
              body={stage.body}
              bullets={stage.bullets}
              isFirst={index === 0}
            />
          </View>
        ) : (
        <ScrollView
          contentContainerStyle={{
            paddingTop: 12,
            paddingBottom: L.space.lg + L.btnHeight * 2 + L.footerPad,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          scrollEnabled={!isIntro}
        >
          {stage.kind === 'question' && (
            <>
              <SlideIn sceneKey={stage.key} from="left" delay={30}>
                <Text
                  style={[
                    s.eyebrow,
                    { color: accent, marginHorizontal: L.padX, marginTop: 4 },
                  ]}
                >
                  {stage.eyebrow}
                  {stage.multi ? '  ·  çoklu' : ''}
                </Text>
              </SlideIn>
              <SlideIn sceneKey={stage.key} from="right" delay={120}>
                <Text
                  style={[
                    s.title,
                    {
                      fontSize: 16,
                      lineHeight: 26,
                      marginHorizontal: L.padX,
                      marginTop: 6,
                    },
                  ]}
                >
                  {stage.title}
                </Text>
              </SlideIn>
              {stage.body ? (
                <SlideIn sceneKey={stage.key} from="left" delay={210}>
                  <Text
                    style={[
                      s.body,
                      {
                        fontSize: 13,
                        lineHeight: 18,
                        marginHorizontal: L.padX,
                        marginTop: 4,
                      },
                    ]}
                  >
                    {stage.body}
                  </Text>
                </SlideIn>
              ) : null}
              <View
                style={[
                  s.choices,
                  {
                    marginHorizontal: L.padX,
                    marginTop: 14,
                    gap: 8,
                  },
                ]}
              >
                {stage.choices.map((c, i) => {
                  const selected = stage.multi
                    ? asList(answers[stage.key]).includes(c.id)
                    : answers[stage.key] === c.id;
                  return (
                    <SlideIn
                      key={c.id}
                      sceneKey={stage.key}
                      from={i % 2 === 0 ? 'left' : 'right'}
                      delay={300 + i * 85}
                      distance={48}
                    >
                      <Pressable
                        onPress={() => pick(stage.key, c.id, stage.multi)}
                        style={[
                          s.choice,
                          selected && {
                            borderColor: accent,
                            backgroundColor: `${accent}12`,
                          },
                        ]}
                      >
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={s.choiceLabel}>{c.label}</Text>
                          {c.sub ? (
                            <Text style={s.choiceSub} numberOfLines={1}>
                              {c.sub}
                            </Text>
                          ) : null}
                        </View>
                        {stage.multi ? (
                          <View
                            style={[
                              s.checkbox,
                              selected && { borderColor: accent, backgroundColor: accent },
                            ]}
                          >
                            {selected ? <Text style={s.checkboxTick}>✓</Text> : null}
                          </View>
                        ) : (
                          <View
                            style={[
                              s.radio,
                              selected && { borderColor: accent, backgroundColor: accent },
                            ]}
                          >
                            {selected ? <View style={s.radioInner} /> : null}
                          </View>
                        )}
                      </Pressable>
                    </SlideIn>
                  );
                })}
              </View>
            </>
          )}

          {stage.kind === 'permission' && (
            <>
              <SlideIn sceneKey={stage.key} from="up" delay={40}>
                <View style={s.iconHero}>
                  <View style={[s.iconHeroGrad, { backgroundColor: `${accent}14` }]}>
                    <Text style={s.iconHeroEmoji}>🔔</Text>
                  </View>
                </View>
              </SlideIn>
              <SlideIn sceneKey={stage.key} from="left" delay={160}>
                <Text
                  style={[
                    s.eyebrow,
                    { color: accent, marginHorizontal: L.padX, textAlign: 'center' },
                  ]}
                >
                  {stage.eyebrow}
                </Text>
              </SlideIn>
              <SlideIn sceneKey={stage.key} from="right" delay={260}>
                <Text
                  style={[
                    s.title,
                    {
                      fontSize: 16,
                      lineHeight: 26,
                      marginHorizontal: L.padX,
                      textAlign: 'center',
                    },
                  ]}
                >
                  {stage.title}
                </Text>
              </SlideIn>
              <SlideIn sceneKey={stage.key} from="left" delay={360}>
                <Text
                  style={[
                    s.body,
                    {
                      fontSize: 13,
                      lineHeight: 18,
                      marginHorizontal: L.padX,
                      textAlign: 'center',
                    },
                  ]}
                >
                  {stage.body}
                </Text>
              </SlideIn>
              <SlideIn sceneKey={stage.key} from="up" delay={480}>
                <Text style={s.nativeHint}>
                  {answers.notif === 'granted'
                    ? '✓ İzin verildi'
                    : answers.notif === 'denied'
                      ? 'İzin reddedildi — ayarlardan açabilirsiniz'
                      : answers.notif === 'skipped'
                        ? 'Geliştirme ortamında sınırlı olabilir · APK’da tam çalışır'
                        : 'Sistem izin penceresi…'}
                </Text>
              </SlideIn>
            </>
          )}

          {stage.kind === 'rate' && (
            <>
              <Text
                style={[
                  s.eyebrow,
                  { color: accent, marginHorizontal: L.padX, textAlign: 'center' },
                ]}
              >
                {stage.eyebrow}
              </Text>
              <Text
                style={[
                  s.title,
                  {
                    fontSize: 16,
                    lineHeight: 26,
                    marginHorizontal: L.padX,
                    textAlign: 'center',
                  },
                ]}
              >
                {stage.title}
              </Text>
              <Text
                style={[
                  s.body,
                  {
                    fontSize: 13,
                    lineHeight: 18,
                    marginHorizontal: L.padX,
                    textAlign: 'center',
                  },
                ]}
              >
                {stage.body}
              </Text>

              <View style={s.starCard}>
                <LinearGradient
                  colors={['rgba(16,33,51,0.08)', 'rgba(255,255,255,0.02)']}
                  style={StyleSheet.absoluteFill}
                />
                <View style={s.starRow}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Pressable key={n} onPress={() => void onStarPress(n)} style={s.starHit} hitSlop={4}>
                      <Text style={[s.star, n <= stars && s.starOn]}>{n <= stars ? '★' : '☆'}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={s.starCaption}>
                  {stars === 0
                    ? 'Dokunarak seçin'
                    : stars === 5
                      ? 'Teşekkürler · mağaza açılıyor'
                      : stars === 1
                        ? 'Ne geliştirelim?'
                        : `${stars} yıldız · teşekkürler`}
                </Text>
              </View>

              {showReasonBox ? (
                <View style={[s.reasonCard, { marginHorizontal: L.padX }]}>
                  <Text style={s.reasonLabel}>Geri bildiriminiz</Text>
                  <TextInput
                    style={s.reasonInput}
                    value={rateReason}
                    onChangeText={setRateReason}
                    placeholder="Kısaca yazın…"
                    placeholderTextColor="#6B7F93"
                    multiline
                    textAlignVertical="top"
                  />
                  <GlowButton
                    label={busy ? 'Gönderiliyor…' : 'Gönder ve devam'}
                    onPress={() => void submitReasonAndContinue()}
                    disabled={busy}
                    height={L.btnHeight}
                  />
                </View>
              ) : null}
            </>
          )}

          {stage.kind === 'package' && (
            <>
              <SlideIn sceneKey={stage.key} from="left" delay={40}>
                <Text style={[s.eyebrow, { color: accent, marginHorizontal: L.padX }]}>
                  {stage.eyebrow}
                </Text>
              </SlideIn>
              <SlideIn sceneKey={stage.key} from="right" delay={120}>
                <Text
                  style={[
                    s.title,
                    {
                      fontSize: 16,
                      lineHeight: 26,
                      marginHorizontal: L.padX,
                    },
                  ]}
                >
                  {stage.title}
                </Text>
              </SlideIn>
              <SlideIn sceneKey={stage.key} from="left" delay={200}>
                <Text
                  style={[
                    s.body,
                    {
                      fontSize: 13,
                      lineHeight: 18,
                      marginHorizontal: L.padX,
                    },
                  ]}
                >
                  {stage.body}
                </Text>
              </SlideIn>

              <View style={[s.periodRow, { marginHorizontal: L.padX }]}>
                <Pressable
                  style={[s.periodBtn, period === 'aylik' && s.periodOn]}
                  onPress={() => setPeriod('aylik')}
                >
                  <Text style={[s.periodTxt, period === 'aylik' && s.periodTxtOn]}>Aylık</Text>
                </Pressable>
                <Pressable
                  style={[s.periodBtn, period === 'yillik' && s.periodOn]}
                  onPress={() => setPeriod('yillik')}
                >
                  <Text style={[s.periodTxt, period === 'yillik' && s.periodTxtOn]}>
                    Yıllık · avantajlı
                  </Text>
                </Pressable>
              </View>

              {/* Profil özeti */}
              <View style={[s.summaryCard, { marginHorizontal: L.padX }]}>
                <Text style={s.summaryTitle}>Analiz özeti</Text>
                <View
                  style={[
                    s.trackBadge,
                    recommendation.profile.track === 'klinik' ? s.trackKlinik : s.trackBireysel,
                  ]}
                >
                  <Text style={s.trackBadgeTxt}>
                    {recommendation.profile.track === 'klinik'
                      ? 'Klinik paket yolu'
                      : 'Bireysel hekim yolu'}
                  </Text>
                </View>
                <View style={s.summaryChips}>
                  {recommendation.why.map((w) => (
                    <View key={w} style={s.summaryChip}>
                      <Text style={s.summaryChipTxt}>{w}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View
                style={[
                  s.pkgHero,
                  {
                    marginHorizontal: L.padX,
                    borderColor: recommended.tur === 'klinik' ? '#86EFAC' : `${accent}55`,
                  },
                ]}
              >
                <Text style={[s.pkgBadge, { color: accent }]}>
                  ÖNERİLEN · {recommended.tur === 'klinik' ? 'KLİNİK' : 'BİREYSEL'} · #{1} sıra
                </Text>
                <Text style={s.pkgName}>{recommended.ad}</Text>
                <Text style={s.pkgTag}>{recommended.tagline}</Text>
                <Text style={s.pkgDesc}>{recommended.aciklama}</Text>
                <Text style={s.pkgIdeal}>Kimler için: {recommended.ideal}</Text>
                {recommended.limit ? (
                  <Text style={s.pkgLimit}>Limit: {recommended.limit}</Text>
                ) : null}

                {recommendation.match.length > 0 ? (
                  <View style={s.matchBox}>
                    <Text style={s.matchTitle}>Neden bu paket?</Text>
                    {recommendation.match.map((m) => (
                      <Text key={m} style={s.matchLine}>
                        · {m}
                      </Text>
                    ))}
                  </View>
                ) : null}

                <View style={s.priceRow}>
                  {price(recommended).old != null && price(recommended).old! > 0 ? (
                    <Text style={s.priceOld}>
                      {price(recommended).old!.toLocaleString('tr-TR')} ₺
                    </Text>
                  ) : null}
                  <Text style={s.pkgPriceMain}>
                    {price(recommended).main === 0
                      ? 'Ücretsiz'
                      : `${price(recommended).main.toLocaleString('tr-TR')} ₺`}
                  </Text>
                  <Text style={s.priceUnit}>{price(recommended).unit}</Text>
                </View>
                {period === 'yillik' && recommended.yillik > 0 ? (
                  <Text style={s.priceHint}>
                    Aylık karşılığı ~
                    {Math.round((price(recommended).main as number) / 12).toLocaleString('tr-TR')} ₺
                  </Text>
                ) : null}

                <Text style={s.featTitle}>Tüm özellikler</Text>
                {recommended.features.map((f) => (
                  <View key={f} style={s.featLine}>
                    <Text style={[s.featCheck, { color: accent }]}>✓</Text>
                    <Text style={s.featLineTxt}>{f}</Text>
                  </View>
                ))}

                <View style={{ marginTop: 16 }}>
                  <GlowButton
                    label={
                      busy && selectedPkgKey === recommended.id
                        ? 'İşleniyor…'
                        : recommended.aylik <= 0
                          ? 'Ücretsiz paketi seç'
                          : recommended.tur === 'klinik'
                            ? 'Bu klinik paketini seç'
                            : 'Bu paketi seç'
                    }
                    arrow
                    onPress={() => void buyPackage(recommended)}
                    disabled={busy}
                    height={48}
                  />
                </View>
              </View>

              <Text style={[s.otherTitle, { marginHorizontal: L.padX }]}>
                Diğer paketler (uyum sırası)
              </Text>
              {otherPackages.map(({ pkg: p, match }) => {
                const pr = price(p);
                return (
                  <View
                    key={p.id}
                    style={[
                      s.otherDetailCard,
                      { marginHorizontal: L.padX },
                      selectedPkgKey === p.id && { borderColor: `${accent}66` },
                    ]}
                  >
                    <View style={s.otherHead}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.pkgTypeTiny}>
                          {p.tur === 'klinik' ? 'Klinik' : 'Bireysel'}
                        </Text>
                        <Text style={s.otherName}>{p.ad}</Text>
                        <Text style={s.otherSub}>{p.tagline}</Text>
                      </View>
                      <Text style={s.otherPrice}>
                        {pr.main === 0 ? '0 ₺' : `${pr.main.toLocaleString('tr-TR')} ₺`}
                        <Text style={s.otherUnit}> {pr.unit}</Text>
                      </Text>
                    </View>
                    <Text style={s.otherDesc}>{p.aciklama}</Text>
                    <Text style={s.pkgIdeal}>Kimler için: {p.ideal}</Text>
                    {p.limit ? <Text style={s.pkgLimit}>Limit: {p.limit}</Text> : null}
                    {match.length > 0 ? (
                      <Text style={s.otherMatch}>{match.slice(0, 2).join(' · ')}</Text>
                    ) : null}
                    {p.features.slice(0, 4).map((f) => (
                      <Text key={f} style={s.otherFeat}>
                        · {f}
                      </Text>
                    ))}
                    {p.features.length > 4 ? (
                      <Text style={s.otherFeatMore}>+{p.features.length - 4} özellik daha</Text>
                    ) : null}
                    <Pressable
                      style={s.otherBuyBtn}
                      onPress={() => void buyPackage(p)}
                      disabled={busy}
                    >
                      <Text style={s.otherBuyTxt}>
                        {p.aylik <= 0
                          ? 'Bu paketi seç'
                          : p.tur === 'klinik'
                            ? 'Bu klinik paketini seç'
                            : 'Uygulama içi satın al'}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
              <Text style={[s.iapNote, { marginHorizontal: L.padX, marginBottom: 24 }]}>
                Ücretsiz paket giriş sonrası otomatik aktifleşir. Ücretli bireysel: havale veya (yapılandırılınca)
                mağaza IAP. Mevcut klinik sahibi klinik paket yükseltmesini havale ile talep edebilir; yeni klinik
                kaydı web panelinden yapılır. Siteye kart yönlendirmesi yok.
              </Text>
            </>
          )}
        </ScrollView>
        )}
      </View>

      {/* Footer — yazılar bittikten sonra alttan yükselir */}
      <Animated.View
        style={[
          s.footer,
          footerStyle,
          {
            paddingBottom: L.footerPad,
            paddingHorizontal: L.padX,
            paddingTop: L.space.sm,
          },
        ]}
        pointerEvents={footerReady ? 'auto' : 'none'}
      >
        {index === 0 && stage.kind === 'story' ? (
          <View style={[s.ctaStack, { gap: 8 }]} pointerEvents="auto">
            <GlowButton label="Deneyimi başlat" arrow onPress={goNext} height={52} />
            <GlowButton
              label="Zaten hesabım var — giriş"
              muted
              onPress={() => void persistAndFinish('login')}
              height={46}
            />
            <LegalLinks tone="light" style={{ marginTop: 4 }} />
          </View>
        ) : null}

        {index > 0 && stage.kind === 'story' ? (
          <View pointerEvents="auto">
            <GlowButton
              label={stage.cta ?? 'Devam'}
              arrow
              onPress={goNext}
              height={52}
            />
          </View>
        ) : null}

        {stage.kind === 'question' && stage.multi ? (
          <View style={[s.ctaStack, { gap: 6 }]} pointerEvents="auto">
            <Text style={s.footerHint}>
              {multiSelectedCount > 0
                ? `${multiSelectedCount} seçildi`
                : 'En az bir seçenek işaretleyin'}
            </Text>
            <GlowButton
              label="Devam"
              arrow
              onPress={goNext}
              disabled={multiSelectedCount < 1}
              height={48}
            />
          </View>
        ) : null}

        {stage.kind === 'question' && !stage.multi ? (
          <Text style={s.footerHint} pointerEvents="none">
            Seçince otomatik devam
          </Text>
        ) : null}

        {stage.kind === 'permission' ? (
          <View pointerEvents="auto">
            <GlowButton label="Devam" arrow onPress={goNext} height={48} />
          </View>
        ) : null}

        {stage.kind === 'rate' && !showReasonBox && stars === 0 ? (
          <Text style={s.footerHint}>Yukarıdan yıldız seçin</Text>
        ) : null}

        {stage.kind === 'package' ? (
          <View style={[s.ctaStack, { gap: 8 }]} pointerEvents="auto">
            <LegalLinks tone="dark" showKvkk style={{ marginBottom: 2 }} />
            <GlowButton
              label="Kayıt ol"
              arrow
              onPress={() => void persistAndFinish('register')}
              height={48}
            />
            <GlowButton
              label="Giriş yap"
              muted
              onPress={() => void persistAndFinish('login')}
              height={44}
            />
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F6F9' },
  ambientTop: { position: 'absolute', top: 0, left: 0, right: 0 },
  orb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.12,
  },
  orbTR: {
    width: 280,
    height: 280,
    top: -80,
    right: -90,
  },
  orbBL: {
    width: 220,
    height: 220,
    bottom: 120,
    left: -80,
    backgroundColor: '#3B82F6',
    opacity: 0.07,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  headerIntro: {
    borderBottomWidth: 0,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  headerLogo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8EDF3',
  },
  headerLogoIntro: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.14)',
  },
  headerLogoImg: { width: 24, height: 24, resizeMode: 'contain' },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1E6ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBackBtnIntro: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  headerBackTxt: { color: '#102133', fontSize: 22, fontWeight: '300', marginTop: -2 },
  headerBrand: { color: '#102133', fontWeight: '700', letterSpacing: -0.2 },
  headerMeta: {
    color: '#6D7D8E',
    fontWeight: '600',
    marginTop: 1,
  },
  stepChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1E6ED',
  },
  stepChipIntro: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  stepChipTxt: { color: '#39495B', fontSize: 12, fontWeight: '700' },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: '#E1E6ED',
    overflow: 'hidden',
  },
  progressFill: { height: 3, borderRadius: 2, overflow: 'hidden' },
  stage: { flex: 1, minHeight: 0 },
  stageIntro: { overflow: 'hidden' },
  introFixed: {
    flex: 1,
    overflow: 'hidden',
    justifyContent: 'flex-start',
  },

  artStage: {
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 16,
  },
  artGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    top: 12,
  },
  artCard: {
    width: '100%',
    maxWidth: 320,
    height: 150,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#102133',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  artTopLine: { height: 2, width: '100%' },
  artCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  artPad: { flex: 1, padding: 12, justifyContent: 'center' },
  logoRing: {
    padding: 2,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  logoDisc: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImg: { width: 36, height: 36, resizeMode: 'contain' },
  artBrand: { color: '#FFF', fontSize: 14, fontWeight: '700', letterSpacing: -0.2 },
  artPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  artPillTxt: { fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  calHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  calTitle: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  miniBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  miniBadgeTxt: { fontSize: 11, fontWeight: '800' },
  weekRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  weekCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  weekD: { color: '#6B7F93', fontSize: 10, fontWeight: '700' },
  weekN: { color: '#E8EEF5', fontSize: 14, fontWeight: '800', marginTop: 2 },
  apptLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16,33,51,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginBottom: 6,
  },
  apptT: { width: 48, color: '#8FA0B0', fontSize: 13, fontWeight: '800' },
  apptN: { flex: 1, color: '#FFF', fontSize: 13, fontWeight: '700' },
  dotLive: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#5DD4A0' },
  modGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 10,
    alignContent: 'center',
  },
  modTile: {
    width: '47%',
    flexGrow: 1,
    minHeight: 72,
    borderRadius: 16,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    justifyContent: 'center',
    gap: 8,
  },
  modDot: { width: 8, height: 8, borderRadius: 4 },
  modLabel: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  avRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    padding: 4,
  },
  avInner: {
    flex: 1,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avLetter: { fontSize: 32, fontWeight: '800' },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#5DD4A0' },
  liveTxt: { color: '#2E9E5B', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  cardH: { color: '#FFF', fontSize: 15, fontWeight: '800', marginBottom: 12 },
  teamLine: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  checkMini: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamTxt: { color: '#D0DBE6', fontSize: 14, fontWeight: '600' },
  quote: {
    color: '#E8EEF5',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  quoteBy: { color: '#7A8B9C', fontSize: 12, marginTop: 6, fontWeight: '600' },
  quoteDiv: {
    height: 1,
    backgroundColor: 'rgba(16,33,51,0.08)',
    marginVertical: 12,
  },
  readyDisc: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readyCheck: { color: '#FFF', fontSize: 32, fontWeight: '800' },
  readyTitle: { color: '#FFF', fontSize: 17, fontWeight: '800' },
  readySub: { color: '#8FA0B0', fontSize: 13, fontWeight: '600' },

  eyebrow: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 6,
    color: '#102133',
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  body: {
    marginTop: 4,
    color: '#6D7D8E',
    fontWeight: '500',
  },
  choices: { marginTop: 14, gap: 8 },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E1E6ED',
    backgroundColor: '#FFFFFF',
    minHeight: 48,
  },
  choiceLabel: { color: '#102133', fontSize: 14, fontWeight: '700' },
  choiceSub: { color: '#6D7D8E', fontSize: 11, marginTop: 2, fontWeight: '500' },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxTick: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 14,
  },
  iconHero: { alignItems: 'center', marginTop: 24, marginBottom: 8 },
  iconHeroGrad: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E1E6ED',
  },
  iconHeroEmoji: { fontSize: 18 },
  nativeHint: {
    marginTop: 16,
    textAlign: 'center',
    color: '#6D7D8E',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 28,
  },
  starCard: {
    marginHorizontal: 28,
    marginTop: 28,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(16,33,51,0.1)',
    paddingVertical: 28,
    paddingHorizontal: 16,
    overflow: 'hidden',
    alignItems: 'center',
  },
  starRow: { flexDirection: 'row', gap: 6 },
  starHit: { padding: 4 },
  star: { fontSize: 42, color: 'rgba(255,255,255,0.18)' },
  starOn: { color: '#F0B429' },
  starCaption: {
    marginTop: 14,
    color: '#8FA0B0',
    fontSize: 13,
    fontWeight: '600',
  },
  reasonCard: {
    marginTop: 18,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(240,180,41,0.35)',
    backgroundColor: 'rgba(240,180,41,0.08)',
    gap: 12,
  },
  reasonLabel: { color: '#F0B429', fontWeight: '800', fontSize: 13 },
  reasonInput: {
    minHeight: 96,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(16,33,51,0.1)',
    backgroundColor: 'rgba(0,0,0,0.28)',
    color: '#FFF',
    padding: 14,
    fontSize: 14,
  },
  periodRow: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 6,
    backgroundColor: '#EEF2F7',
    borderRadius: 12,
    padding: 4,
  },
  periodBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  periodOn: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E1E6ED' },
  periodTxt: { color: '#6D7D8E', fontWeight: '700', fontSize: 13 },
  periodTxtOn: { color: '#C96A2B' },
  pkgHero: {
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  trackBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 12,
    borderWidth: 1,
  },
  trackKlinik: {
    backgroundColor: '#ECFDF5',
    borderColor: '#86EFAC',
  },
  trackBireysel: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FDBA74',
  },
  trackBadgeTxt: {
    color: '#102133',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  matchBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E1E6ED',
  },
  matchTitle: {
    color: '#6D7D8E',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  matchLine: {
    color: '#39495B',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 20,
  },
  pkgTypeTiny: {
    color: '#3B82F6',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  otherMatch: {
    color: '#6D7D8E',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
    marginBottom: 4,
  },
  summaryCard: {
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E1E6ED',
    backgroundColor: '#FFFFFF',
  },
  summaryTitle: {
    color: '#6D7D8E',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  summaryChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  summaryChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  summaryChipTxt: { color: '#C96A2B', fontSize: 11, fontWeight: '700' },
  pkgBadge: {
    color: '#C96A2B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  pkgName: { color: '#102133', fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  pkgTag: { color: '#6D7D8E', fontSize: 13, marginTop: 4, fontWeight: '600' },
  pkgDesc: {
    color: '#39495B',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
    fontWeight: '500',
  },
  pkgIdeal: {
    color: '#6D7D8E',
    fontSize: 12,
    marginTop: 8,
    fontWeight: '600',
  },
  pkgLimit: {
    color: '#C13C2C',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '700',
  },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 14 },
  priceOld: {
    color: '#95A2B5',
    fontSize: 14,
    textDecorationLine: 'line-through',
    marginBottom: 3,
  },
  priceMain: { color: '#102133', fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  pkgPriceMain: { color: '#102133', fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  priceUnit: { color: '#6D7D8E', fontSize: 13, fontWeight: '600', marginBottom: 5 },
  priceHint: { color: '#6D7D8E', fontSize: 12, marginTop: 4, fontWeight: '600' },
  featTitle: {
    color: '#102133',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 16,
    marginBottom: 8,
  },
  featLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  featCheck: { color: '#2E9E5B', fontWeight: '800', fontSize: 13, marginTop: 1 },
  featLineTxt: { color: '#39495B', fontSize: 13, lineHeight: 18, flex: 1, fontWeight: '500' },
  otherTitle: {
    marginTop: 20,
    color: '#102133',
    fontSize: 14,
    fontWeight: '800',
  },
  otherDetailCard: {
    marginTop: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E1E6ED',
    backgroundColor: '#FFFFFF',
  },
  otherHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  otherName: { color: '#102133', fontSize: 15, fontWeight: '800' },
  otherSub: { color: '#6D7D8E', fontSize: 12, marginTop: 2 },
  otherPrice: { color: '#C96A2B', fontWeight: '800', fontSize: 14 },
  otherUnit: { color: '#6D7D8E', fontWeight: '600', fontSize: 11 },
  otherDesc: {
    color: '#39495B',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
    fontWeight: '500',
  },
  otherFeat: { color: '#39495B', fontSize: 12, marginTop: 4, fontWeight: '500' },
  otherFeatMore: { color: '#6D7D8E', fontSize: 11, marginTop: 4, fontWeight: '600' },
  otherBuyBtn: {
    marginTop: 12,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDBA74',
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
  },
  otherBuyTxt: { color: '#C96A2B', fontWeight: '800', fontSize: 13 },
  iapNote: {
    marginTop: 14,
    marginBottom: 6,
    color: '#6D7D8E',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },

  footer: {
    zIndex: 40,
    elevation: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E1E6ED',
  },
  backHit: { marginBottom: 8, minHeight: 28, justifyContent: 'center' },
  backTxt: { color: '#6D7D8E', fontWeight: '700', fontSize: 14 },
  footerHint: {
    textAlign: 'center',
    color: '#6D7D8E',
    fontSize: 12,
    fontWeight: '600',
    paddingVertical: 4,
  },
  ctaStack: { gap: 8 },
  btnGlowWrap: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#EE7D31',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  btnGlow: {
    minHeight: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  btnGlowTxt: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', letterSpacing: -0.1 },
  btnArrow: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  btnGhost: {
    minHeight: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E1E6ED',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
  },
  btnGhostDark: {
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  btnGhostTxt: { color: '#102133', fontSize: 14, fontWeight: '700' },
  btnGhostTxtDark: { color: 'rgba(248,250,252,0.9)' },
});

/** Premium intro — açık, kompakt, tek ekran (scroll yok) */
const px = StyleSheet.create({
  wrap: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 6,
    overflow: 'hidden',
  },
  mockShell: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E1E6ED',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    maxHeight: 168,
    shadowColor: '#102133',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  mockTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8EDF3',
    backgroundColor: '#FAFBFC',
  },
  mockDot: { width: 7, height: 7, borderRadius: 4 },
  mockTopTxt: { flex: 1, color: '#102133', fontSize: 12, fontWeight: '700' },
  mockPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  mockPillTxt: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  mockBodyCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 4,
  },
  mockPad: { paddingHorizontal: 10, paddingVertical: 8, gap: 5 },
  logoDisc: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8EDF3',
  },
  logoImg: { width: 32, height: 32, resizeMode: 'contain' },
  mockBrand: { color: '#102133', fontSize: 14, fontWeight: '800', marginTop: 2 },
  metricRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  metricChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F4F6F9',
    borderWidth: 1,
    borderColor: '#E8EDF3',
    alignItems: 'center',
    minWidth: 58,
  },
  metricVal: { fontSize: 11, fontWeight: '800' },
  metricLab: { color: '#6D7D8E', fontSize: 9, fontWeight: '600', marginTop: 1 },
  calHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  calTitle: { color: '#102133', fontSize: 13, fontWeight: '800' },
  calBadgeTxt: { fontSize: 11, fontWeight: '800' },
  weekRow: { flexDirection: 'row', gap: 4 },
  weekCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F4F6F9',
    borderWidth: 1,
    borderColor: '#E8EDF3',
  },
  weekD: { color: '#6D7D8E', fontSize: 9, fontWeight: '700' },
  weekN: { color: '#102133', fontSize: 12, fontWeight: '800', marginTop: 1 },
  apptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8EDF3',
    backgroundColor: '#FAFBFC',
  },
  apptT: { width: 40, color: '#6D7D8E', fontSize: 11, fontWeight: '800' },
  apptN: { flex: 1, color: '#102133', fontSize: 11, fontWeight: '600' },
  modGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 8, gap: 6 },
  modTile: {
    width: '47%',
    flexGrow: 1,
    minHeight: 42,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E8EDF3',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modDot: { width: 7, height: 7, borderRadius: 4 },
  modLabel: { color: '#102133', fontWeight: '800', fontSize: 12 },
  avWrap: { alignItems: 'center', justifyContent: 'center', width: 88, height: 88 },
  avRingOuter: {
    position: 'absolute',
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 2,
  },
  avRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    padding: 3,
  },
  avInner: {
    flex: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avLetter: { fontSize: 15, fontWeight: '800' },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveTxt: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E8EDF3',
    marginTop: 4,
  },
  teamAv: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamAvTxt: { fontSize: 12, fontWeight: '800' },
  teamName: { color: '#102133', fontSize: 12, fontWeight: '700' },
  teamRole: { color: '#6D7D8E', fontSize: 10, fontWeight: '600' },
  teamOkTxt: { fontSize: 13, fontWeight: '800' },
  copyBlock: { marginTop: 10, flexShrink: 1 },
  eyebrowPillTxt: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  displayTitle: {
    color: '#102133',
    fontSize: 15,
    lineHeight: 25,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  lead: {
    color: '#6D7D8E',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
    marginTop: 4,
  },
  glassList: { marginTop: 8, gap: 5 },
  glassRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E1E6ED',
    backgroundColor: '#FFFFFF',
  },
  glassCheck: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassCheckTxt: { fontSize: 11, fontWeight: '800' },
  glassTxt: {
    flex: 1,
    color: '#102133',
    fontSize: 12,
    fontWeight: '600',
  },
  proofTxt: {
    marginTop: 6,
    color: '#95A2B5',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
});

