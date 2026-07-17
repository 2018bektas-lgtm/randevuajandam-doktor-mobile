import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
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

export const ONBOARDING_KEY = 'randevuajandam.onboarding.done.v9';
export const ONBOARDING_ANSWERS_KEY = 'randevuajandam.onboarding.answers.v2';

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

type Stage =
  | {
      kind: 'story';
      key: string;
      stepLabel: string;
      eyebrow: string;
      title: string;
      body: string;
      accent: string;
      visual: VisualKind;
      cta?: string;
    }
  | {
      kind: 'question';
      key: keyof Answers;
      stepLabel: string;
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
      eyebrow: string;
      title: string;
      body: string;
      accent: string;
    }
  | {
      kind: 'rate';
      key: 'rate';
      stepLabel: string;
      eyebrow: string;
      title: string;
      body: string;
      accent: string;
    }
  | {
      kind: 'package';
      key: 'package';
      stepLabel: string;
      eyebrow: string;
      title: string;
      body: string;
      accent: string;
    };

type VisualKind = 'brand' | 'calendar' | 'modules' | 'video' | 'team' | 'reviews' | 'ready' | 'security';

const STAGES: Stage[] = [
  {
    kind: 'story',
    key: 's1',
    stepLabel: '01',
    eyebrow: 'Hoş geldiniz',
    title: 'Kliniğiniz,\ncebinizde',
    body: 'Birkaç soruyla sizi tanıyalım; ihtiyacınıza en uygun paketi detaylarıyla önereceğiz.',
    accent: '#F58A45',
    visual: 'brand',
    cta: 'Başla',
  },
  {
    kind: 'question',
    key: 'practice',
    stepLabel: '02',
    eyebrow: 'Çalışma şekli',
    title: 'Nerede\nhizmet veriyorsunuz?',
    body: 'Paket ve özellik önerisini doğrudan etkiler.',
    accent: '#6BA3F5',
    choices: [
      { id: 'muayenehane', label: 'Muayenehane / bireysel', sub: 'Tek hekim odaklı' },
      { id: 'klinik', label: 'Klinik / poliklinik', sub: 'Çok hekimli yapı' },
      { id: 'hastane', label: 'Hastane', sub: 'Kurumsal ortam' },
      { id: 'online', label: 'Ağırlıklı online', sub: 'Uzaktan danışmanlık' },
    ],
  },
  {
    kind: 'question',
    key: 'city_scale',
    stepLabel: '03',
    eyebrow: 'Konum',
    title: 'Hizmet verdiğiniz\nşehir ölçeği?',
    body: 'Yoğunluk ve görünürlük ihtiyacını anlamak için.',
    accent: '#6BA3F5',
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
    stepLabel: '04',
    eyebrow: 'Deneyim',
    title: 'Kaç yıldır\nmeslektesiniz?',
    body: 'Başlangıç veya ileri paket ihtiyacını ayırır.',
    accent: '#7CA6E0',
    choices: [
      { id: '0_3', label: '0–3 yıl', sub: 'Yeni / erken dönem' },
      { id: '3_10', label: '3–10 yıl', sub: 'Büyüyen pratik' },
      { id: '10_plus', label: '10+ yıl', sub: 'Yerleşik portföy' },
    ],
  },
  {
    kind: 'question',
    key: 'branch',
    stepLabel: '05',
    eyebrow: 'Branş',
    title: 'Branşlarınız\nneler?',
    body: 'Birden fazla seçebilirsiniz.',
    accent: '#7CA6E0',
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
    kind: 'story',
    key: 's6',
    stepLabel: '06',
    eyebrow: 'Takvim',
    title: 'Gününüzü\nnet görün',
    body: 'Haftalık plan, boş slotlar, hızlı randevu ve erteleme — operasyonunuz akıcı.',
    accent: '#6BA3F5',
    visual: 'calendar',
    cta: 'Devam',
  },
  {
    kind: 'question',
    key: 'clinic',
    stepLabel: '07',
    eyebrow: 'Klinik',
    title: 'Kliniğiniz\nvar mı?',
    body: 'Ekip paneli ve ortak hasta havuzu için kritik.',
    accent: '#5DD4A0',
    choices: [
      { id: 'yes', label: 'Evet, kliniğim var' },
      { id: 'planning', label: 'Kurmayı planlıyorum' },
      { id: 'no', label: 'Hayır, bireysel çalışıyorum' },
    ],
  },
  {
    kind: 'question',
    key: 'hekim_sayisi',
    stepLabel: '08',
    eyebrow: 'Hekim sayısı',
    title: 'Kaç hekimle\nçalışıyorsunuz?',
    body: 'Sadece siz misiniz, yoksa ekip mi?',
    accent: '#5DD4A0',
    choices: [
      { id: '1', label: 'Sadece ben' },
      { id: '2_5', label: '2–5 hekim' },
      { id: '6_plus', label: '6+ hekim' },
    ],
  },
  {
    kind: 'question',
    key: 'staff',
    stepLabel: '09',
    eyebrow: 'Personel',
    title: 'Personeliniz\nvar mı?',
    body: 'Sekreter aynı uygulamadan, yetkiye göre giriş yapar.',
    accent: '#F0B429',
    choices: [
      { id: 'yes', label: 'Evet, personelim var' },
      { id: 'soon', label: 'Yakında olacak' },
      { id: 'no', label: 'Hayır' },
    ],
  },
  {
    kind: 'question',
    key: 'staff_count',
    stepLabel: '10',
    eyebrow: 'Personel sayısı',
    title: 'Kaç personel\nkullanacak?',
    body: 'Yoksa “Yok” seçin.',
    accent: '#F0B429',
    choices: [
      { id: '0', label: 'Yok' },
      { id: '1', label: '1 kişi' },
      { id: '2_4', label: '2–4 kişi' },
      { id: '5_plus', label: '5+ kişi' },
    ],
  },
  {
    kind: 'story',
    key: 's11',
    stepLabel: '11',
    eyebrow: 'Yönetim',
    title: 'İşletmeniz\nkontrolünüzde',
    body: 'Hasta, hizmet, finans ve klinik — menüden tüm modüller.',
    accent: '#5DD4A0',
    visual: 'modules',
    cta: 'Devam',
  },
  {
    kind: 'question',
    key: 'patient_volume',
    stepLabel: '12',
    eyebrow: 'Hasta hacmi',
    title: 'Aylık yaklaşık\nhasta sayınız?',
    body: 'Limitli demo mu, sınırsız paket mi netleşir.',
    accent: '#7CA6E0',
    choices: [
      { id: '0_20', label: '0–20 hasta / ay' },
      { id: '20_100', label: '20–100 hasta / ay' },
      { id: '100_300', label: '100–300 hasta / ay' },
      { id: '300_plus', label: '300+ hasta / ay' },
    ],
  },
  {
    kind: 'question',
    key: 'appt_volume',
    stepLabel: '13',
    eyebrow: 'Randevu hacmi',
    title: 'Haftalık yaklaşık\nrandevu sayınız?',
    body: 'Takvim ve otomasyon ihtiyacını ölçer.',
    accent: '#7CA6E0',
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
    stepLabel: '14',
    eyebrow: 'Hedefler',
    title: 'Amaçlarınız\nneler?',
    body: 'Birden fazla seçin — paket önerisini birlikte etkiler.',
    accent: '#B794F6',
    multi: true,
    choices: [
      { id: 'randevu', label: 'Randevuları düzenlemek', sub: 'Takvim & hatırlatma' },
      { id: 'buyume', label: 'Daha fazla hasta', sub: 'Görünürlük & talep' },
      { id: 'online', label: 'Online görüşme', sub: 'Uzaktan seans' },
      { id: 'marka', label: 'Kendi web sitem', sub: 'Marka & SEO' },
      { id: 'klinik', label: 'Klinik / ekip yönetimi', sub: 'Personel & havuz' },
      { id: 'finans', label: 'Gelir–gider takibi', sub: 'Finans modülü' },
    ],
  },
  {
    kind: 'question',
    key: 'needs',
    stepLabel: '15',
    eyebrow: 'Modüller',
    title: 'Hangi özellikler\nşart?',
    body: 'İhtiyacınız olanları seçin (çoklu).',
    accent: '#A78BFA',
    multi: true,
    choices: [
      { id: 'takvim', label: 'Takvim & randevu' },
      { id: 'talep', label: 'Randevu talepleri' },
      { id: 'galeri', label: 'Fotoğraf galerisi' },
      { id: 'finans', label: 'Finans / muhasebe' },
      { id: 'blog', label: 'Blog / makale' },
      { id: 'yorum', label: 'Hasta yorumları' },
      { id: 'egitim', label: 'Eğitim / kurs' },
      { id: 'online', label: 'Online görüşme' },
      { id: 'web', label: 'Kişisel web sitesi' },
      { id: 'personel', label: 'Personel paneli' },
    ],
  },
  {
    kind: 'story',
    key: 's16',
    stepLabel: '16',
    eyebrow: 'Hekimlerden',
    title: 'Güvenilir\ntercih',
    body: 'Randevu yoğunluğu azaldı; sekreter aynı uygulamadan yönetiyor.',
    accent: '#F3A26B',
    visual: 'reviews',
    cta: 'Devam',
  },
  {
    kind: 'question',
    key: 'online',
    stepLabel: '17',
    eyebrow: 'Online görüşme',
    title: 'Görüntülü seans\nkullanacak mısınız?',
    body: 'VIP ve üzeri paketlerde platform içi oda vardır.',
    accent: '#B794F6',
    choices: [
      { id: 'yes', label: 'Evet, aktif kullanacağım' },
      { id: 'maybe', label: 'Belki ileride' },
      { id: 'no', label: 'Hayır, yüz yüze yeter' },
    ],
  },
  {
    kind: 'question',
    key: 'online_share',
    stepLabel: '18',
    eyebrow: 'Online oranı',
    title: 'Randevuların kaçı\nonline olur?',
    body: 'Online ihtiyaç seviyesini netleştirir.',
    accent: '#B794F6',
    choices: [
      { id: '0', label: 'Neredeyse hiç' },
      { id: 'low', label: 'Az (1/4’ten az)' },
      { id: 'mid', label: 'Yarı yarıya' },
      { id: 'high', label: 'Çoğu online' },
    ],
  },
  {
    kind: 'story',
    key: 's19',
    stepLabel: '19',
    eyebrow: 'Görüşme',
    title: 'Seanslar\nuygulama içinde',
    body: 'Harici Zoom hesabı yok. Onaylı online randevuda kamera ile katılın.',
    accent: '#B794F6',
    visual: 'video',
    cta: 'Devam',
  },
  {
    kind: 'question',
    key: 'website',
    stepLabel: '20',
    eyebrow: 'Web sitesi',
    title: 'Kişisel hekim\nsitesi ister misiniz?',
    body: 'Kendi domain, SEO ve siteden randevu — özel web paketi.',
    accent: '#7CA6E0',
    choices: [
      { id: 'yes', label: 'Evet, web sitem olsun' },
      { id: 'maybe', label: 'İleride bakarım' },
      { id: 'no', label: 'Hayır, platform yeter' },
    ],
  },
  {
    kind: 'question',
    key: 'finans',
    stepLabel: '21',
    eyebrow: 'Finans',
    title: 'Gelir–gider\ntakibi ister misiniz?',
    body: 'VIP paketinde finansal raporlar yer alır.',
    accent: '#F3A26B',
    choices: [
      { id: 'yes', label: 'Evet, aktif kullanırım' },
      { id: 'maybe', label: 'Belki' },
      { id: 'no', label: 'Şimdilik gerekmez' },
    ],
  },
  {
    kind: 'question',
    key: 'content',
    stepLabel: '22',
    eyebrow: 'İçerik',
    title: 'Blog / makale\nyayınlar mısınız?',
    body: 'VIP ve web paketlerinde blog paneli vardır.',
    accent: '#7CA6E0',
    choices: [
      { id: 'yes', label: 'Evet, düzenli yazarım' },
      { id: 'maybe', label: 'Ara sıra' },
      { id: 'no', label: 'Hayır' },
    ],
  },
  {
    kind: 'question',
    key: 'egitim',
    stepLabel: '23',
    eyebrow: 'Eğitim',
    title: 'Kurs / webinar\nsatar mısınız?',
    body: 'Eğitim ve başvuru formu VIP+ paketlerde.',
    accent: '#B794F6',
    choices: [
      { id: 'yes', label: 'Evet' },
      { id: 'maybe', label: 'Planlıyorum' },
      { id: 'no', label: 'Hayır' },
    ],
  },
  {
    kind: 'story',
    key: 's24',
    stepLabel: '24',
    eyebrow: 'Personel paneli',
    title: 'Ekibiniz de\naynı uygulamada',
    body: 'Girişte Hekim veya Personel. Sekreter randevu, talep ve ödemeyi yetkisine göre yönetir.',
    accent: '#F0B429',
    visual: 'team',
    cta: 'Devam',
  },
  {
    kind: 'question',
    key: 'current_tool',
    stepLabel: '25',
    eyebrow: 'Mevcut düzen',
    title: 'Şu an randevuyu\nnasıl yönetiyorsunuz?',
    body: 'Birden fazla yöntem kullanıyorsanız hepsini seçin.',
    accent: '#6BA3F5',
    multi: true,
    choices: [
      { id: 'yok', label: 'Düzenli sistem yok' },
      { id: 'defter', label: 'Defter / Excel' },
      { id: 'baska', label: 'Başka bir yazılım' },
      { id: 'asistan', label: 'Asistan / sekreter telefonla' },
      { id: 'whatsapp', label: 'WhatsApp / sosyal medya' },
    ],
  },
  {
    kind: 'question',
    key: 'start_when',
    stepLabel: '26',
    eyebrow: 'Zamanlama',
    title: 'Ne zaman\nbaşlamak istersiniz?',
    body: 'Demo veya ücretli paket önerisini etkiler.',
    accent: '#5DD4A0',
    choices: [
      { id: 'hemen', label: 'Hemen' },
      { id: '1ay', label: '1 ay içinde' },
      { id: 'deneme', label: 'Önce denemek istiyorum' },
      { id: 'kesfet', label: 'Sadece inceliyorum' },
    ],
  },
  {
    kind: 'question',
    key: 'source',
    stepLabel: '27',
    eyebrow: 'Keşif',
    title: 'Bizi nasıl\nduydunuz?',
    body: 'Birden fazla kanal seçebilirsiniz.',
    accent: '#6BA3F5',
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
    stepLabel: '28',
    eyebrow: 'Bildirimler',
    title: 'Anında\nhaberiniz olsun',
    body: 'Telefonunuzun izin penceresi açılır. Talep, iptal ve hatırlatmalar için önerilir.',
    accent: '#F58A45',
  },
  {
    kind: 'story',
    key: 's29',
    stepLabel: '29',
    eyebrow: 'Güvenlik',
    title: 'Veriniz\ngüvende',
    body: 'Token cihazınızda; 2FA desteklenir. Abonelik uygulama içi satın alma ile yönetilir.',
    accent: '#5DD4A0',
    visual: 'security',
    cta: 'Devam',
  },
  {
    kind: 'rate',
    key: 'rate',
    stepLabel: '30',
    eyebrow: 'Değerlendirme',
    title: 'Deneyiminizi\npuanlayın',
    body: '5 yıldız → mağaza. 1 yıldız → sebebinizi bize yazın (mağaza yok).',
    accent: '#F0B429',
  },
  {
    kind: 'package',
    key: 'package',
    stepLabel: '31',
    eyebrow: 'Size özel öneri',
    title: 'Uygun paketiniz\nve detayları',
    body: 'Cevaplarınıza göre seçildi. Özellik listesi, fiyat ve neden bu paket aşağıda.',
    accent: '#F58A45',
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
    website: { yes: 'İstiyor', maybe: 'Belki', no: 'İstemiyor' },
    patient_volume: {
      '0_20': '0–20/ay',
      '20_100': '20–100/ay',
      '100_300': '100–300/ay',
      '300_plus': '300+/ay',
    },
    finans: { yes: 'İstiyor', maybe: 'Belki', no: 'Gerekmez' },
    start_when: {
      hemen: 'Hemen',
      '1ay': '1 ay içinde',
      deneme: 'Önce deneme',
      kesfet: 'İnceleme',
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

/* ─── Premium button ─────────────────────────────────────── */

function GlowButton({
  label,
  onPress,
  arrow,
  flex,
  muted,
  disabled,
  height,
}: {
  label: string;
  onPress: () => void;
  arrow?: boolean;
  flex?: boolean;
  muted?: boolean;
  disabled?: boolean;
  /** Responsive button height from useLayout().btnHeight */
  height?: number;
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
          { minHeight: Math.max(minH - 4, 44) },
          flex && { flex: 1 },
          disabled && { opacity: 0.5 },
        ]}
      >
        <Text style={s.btnGhostTxt}>{label}</Text>
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
  artH = 210,
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

  const cardH = Math.max(compact ? 140 : 160, Math.min(artH, compact ? 180 : 260));

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
                  <Text style={[s.weekD, i === 2 && { color: '#1A1208' }]}>{d}</Text>
                  <Text style={[s.weekN, i === 2 && { color: '#1A1208' }]}>{12 + i}</Text>
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
              { l: 'Finans', c: '#F3A26B' },
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
  const contentOp = useSharedValue(1);
  const contentY = useSharedValue(0);
  const contentScale = useSharedValue(1);

  useEffect(() => {
    progressSV.value = withTiming(progress, { duration: 480, easing: Easing.out(Easing.cubic) });
  }, [progress, progressSV]);

  useEffect(() => {
    contentOp.value = 0;
    contentY.value = 22;
    contentScale.value = 0.97;
    contentOp.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
    contentY.value = withSpring(0, { damping: 18, stiffness: 140 });
    contentScale.value = withSpring(1, { damping: 16, stiffness: 120 });
  }, [index, contentOp, contentY, contentScale]);

  const progressStyle = useAnimatedStyle(() => ({
    width: interpolate(progressSV.value, [0, 1], [0, progressMax], Extrapolation.CLAMP),
  }));
  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOp.value,
    transform: [{ translateY: contentY.value }, { scale: contentScale.value }],
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
    setTimeout(() => setIndex((i) => Math.min(i + 1, TOTAL - 1)), 220);
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

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      {/* Layered cinematic background */}
      <LinearGradient
        colors={['#03080F', '#0A1624', '#0F2438']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <LinearGradient
        colors={[`${accent}18`, 'transparent']}
        style={[s.ambientTop, { height: L.ambientH }]}
        pointerEvents="none"
      />
      {!L.compact ? (
        <>
          <View style={[s.orb, s.orbTR, { backgroundColor: accent }]} pointerEvents="none" />
          <View style={[s.orb, s.orbBL]} pointerEvents="none" />
        </>
      ) : null}

      {/* Header */}
      <View
        style={[
          s.header,
          {
            paddingTop: L.safeTop,
            paddingHorizontal: L.padX,
            paddingBottom: L.space.xs,
          },
        ]}
      >
        <View style={s.headerLeft}>
          <View style={s.headerLogo}>
            <Image source={LOGO} style={s.headerLogoImg} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[s.headerBrand, { fontSize: L.font.sm }]} numberOfLines={1}>
              Randevu Ajandam
            </Text>
            <Text style={[s.headerMeta, { fontSize: L.font.xs }]}>
              {stage.stepLabel}  ·  {String(TOTAL).padStart(2, '0')}
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
        <Animated.View style={[s.progressFill, progressStyle]}>
          <LinearGradient
            colors={['#FFC49A', accent, '#E06A20']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
        </Animated.View>
      </View>

      {/* Content */}
      <Animated.View style={[s.stage, contentStyle]} key={stage.key}>
        <ScrollView
          contentContainerStyle={{
            paddingTop: L.contentTop,
            // Room so last options aren't hidden under sticky footer + system nav
            paddingBottom: L.space.xl + L.btnHeight * 2 + L.footerPad,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {stage.kind === 'story' && (
            <>
              <SceneArt
                kind={stage.visual}
                accent={accent}
                artH={L.artH}
                compact={L.compact}
              />
              <Text style={[s.eyebrow, { color: accent, marginHorizontal: L.padX }]}>
                {stage.eyebrow}
              </Text>
              <Text
                style={[
                  s.title,
                  {
                    fontSize: L.font.hero,
                    lineHeight: L.heroLineHeight,
                    marginHorizontal: L.padX,
                    marginTop: L.space.sm,
                  },
                ]}
              >
                {stage.title}
              </Text>
              <Text
                style={[
                  s.body,
                  {
                    fontSize: L.font.md,
                    lineHeight: L.bodyLineHeight,
                    marginHorizontal: L.padX,
                    marginTop: L.space.sm,
                  },
                ]}
              >
                {stage.body}
              </Text>
            </>
          )}

          {stage.kind === 'question' && (
            <>
              <Text
                style={[
                  s.eyebrow,
                  { color: accent, marginHorizontal: L.padX, marginTop: L.space.xs },
                ]}
              >
                {stage.eyebrow}
                {stage.multi ? '  ·  çoklu seçim' : ''}
              </Text>
              <Text
                style={[
                  s.title,
                  {
                    fontSize: L.font.hero,
                    lineHeight: L.heroLineHeight,
                    marginHorizontal: L.padX,
                    marginTop: L.space.sm,
                  },
                ]}
              >
                {stage.title}
              </Text>
              <Text
                style={[
                  s.body,
                  {
                    fontSize: L.font.md,
                    lineHeight: L.bodyLineHeight,
                    marginHorizontal: L.padX,
                    marginTop: L.space.sm,
                  },
                ]}
              >
                {stage.body}
              </Text>
              <View
                style={[
                  s.choices,
                  {
                    marginHorizontal: L.padX,
                    marginTop: L.space.md,
                    gap: L.choiceGap,
                  },
                ]}
              >
                {stage.choices.map((c) => {
                  const selected = stage.multi
                    ? asList(answers[stage.key]).includes(c.id)
                    : answers[stage.key] === c.id;
                  return (
                    <Pressable
                      key={c.id}
                      onPress={() => pick(stage.key, c.id, stage.multi)}
                      style={[
                        s.choice,
                        {
                          minHeight: L.choiceMinH,
                          paddingVertical: L.compact ? 10 : 14,
                        },
                        selected && {
                          borderColor: `${accent}88`,
                          backgroundColor: `${accent}14`,
                        },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[s.choiceLabel, { fontSize: L.font.md }]}>{c.label}</Text>
                        {c.sub && !L.compact ? (
                          <Text style={[s.choiceSub, { fontSize: L.font.xs }]}>{c.sub}</Text>
                        ) : c.sub && L.compact ? (
                          <Text style={[s.choiceSub, { fontSize: L.font.xs }]} numberOfLines={1}>
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
                  );
                })}
              </View>
            </>
          )}

          {stage.kind === 'permission' && (
            <>
              <View style={s.iconHero}>
                <LinearGradient colors={[`${accent}33`, `${accent}0A`]} style={s.iconHeroGrad}>
                  <Text style={s.iconHeroEmoji}>🔔</Text>
                </LinearGradient>
              </View>
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
                    fontSize: L.font.hero,
                    lineHeight: L.heroLineHeight,
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
                    fontSize: L.font.md,
                    lineHeight: L.bodyLineHeight,
                    marginHorizontal: L.padX,
                    textAlign: 'center',
                  },
                ]}
              >
                {stage.body}
              </Text>
              <Text style={s.nativeHint}>
                {answers.notif === 'granted'
                  ? '✓ İzin verildi'
                  : answers.notif === 'denied'
                    ? 'İzin reddedildi — ayarlardan açabilirsiniz'
                    : answers.notif === 'skipped'
                      ? 'Geliştirme ortamında sınırlı olabilir · APK’da tam çalışır'
                      : 'Sistem izin penceresi…'}
              </Text>
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
                    fontSize: L.font.hero,
                    lineHeight: L.heroLineHeight,
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
                    fontSize: L.font.md,
                    lineHeight: L.bodyLineHeight,
                    marginHorizontal: L.padX,
                    textAlign: 'center',
                  },
                ]}
              >
                {stage.body}
              </Text>

              <View style={s.starCard}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']}
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
              <Text style={[s.eyebrow, { color: accent, marginHorizontal: L.padX }]}>
                {stage.eyebrow}
              </Text>
              <Text
                style={[
                  s.title,
                  {
                    fontSize: L.font.hero,
                    lineHeight: L.heroLineHeight,
                    marginHorizontal: L.padX,
                  },
                ]}
              >
                {stage.title}
              </Text>
              <Text
                style={[
                  s.body,
                  {
                    fontSize: L.font.md,
                    lineHeight: L.bodyLineHeight,
                    marginHorizontal: L.padX,
                  },
                ]}
              >
                {stage.body}
              </Text>

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

              <View style={[s.pkgHero, { marginHorizontal: L.padX, borderColor: `${accent}44` }]}>
                <LinearGradient
                  colors={
                    recommended.tur === 'klinik'
                      ? ['rgba(93,212,160,0.18)', 'rgba(15,30,48,0.95)']
                      : ['rgba(245,138,69,0.2)', 'rgba(15,30,48,0.95)']
                  }
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                />
                <Text style={s.pkgBadge}>
                  ÖNERİLEN · {recommended.tur === 'klinik' ? 'KLİNİK' : 'BİREYSEL'}
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
                  <Text style={s.priceMain}>
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

                <Text style={s.featTitle}>Paket özellikleri</Text>
                {recommended.features.map((f) => (
                  <View key={f} style={s.featLine}>
                    <Text style={s.featCheck}>✓</Text>
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
                            : 'Uygulama içi satın al'
                    }
                    arrow
                    onPress={() => void buyPackage(recommended)}
                    disabled={busy}
                    height={L.btnHeight}
                  />
                </View>
              </View>

              <Text style={[s.otherTitle, { marginHorizontal: L.padX }]}>
                Uyum sırasına göre diğer paketler
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
                mağaza IAP. Klinik paketler web panelinden bağlanır. Siteye kart yönlendirmesi yok.
              </Text>
            </>
          )}
        </ScrollView>
      </Animated.View>

      {/* Footer */}
      <View
        style={[
          s.footer,
          {
            // Clear Android 3-button / gesture system nav
            paddingBottom: L.footerPad,
            paddingHorizontal: L.padX,
            paddingTop: L.space.sm,
          },
        ]}
      >
        {index > 0 && stage.kind !== 'package' ? (
          <Pressable onPress={goBack} style={s.backHit} hitSlop={12}>
            <Text style={s.backTxt}>‹  Geri</Text>
          </Pressable>
        ) : (
          <View style={{ height: 8 }} />
        )}

        {index === 0 && stage.kind === 'story' ? (
          <View style={[s.ctaStack, { gap: L.space.sm }]}>
            <GlowButton label="Başla" arrow onPress={goNext} height={L.btnHeight} />
            <GlowButton
              label="Zaten hesabım var"
              muted
              onPress={() => void persistAndFinish('login')}
              height={L.btnHeight}
            />
          </View>
        ) : null}

        {index > 0 && stage.kind === 'story' ? (
          <GlowButton
            label={stage.cta ?? 'Devam'}
            arrow
            onPress={goNext}
            height={L.btnHeight}
          />
        ) : null}

        {stage.kind === 'question' && stage.multi ? (
          <View style={[s.ctaStack, { gap: L.space.sm }]}>
            {multiSelectedCount > 0 ? (
              <Text style={s.footerHint}>
                {multiSelectedCount} seçildi · istediğinizi ekleyin/çıkarın
              </Text>
            ) : (
              <Text style={s.footerHint}>En az bir seçenek işaretleyin</Text>
            )}
            <GlowButton
              label="Devam"
              arrow
              onPress={goNext}
              disabled={multiSelectedCount < 1}
              height={L.btnHeight}
            />
          </View>
        ) : null}

        {stage.kind === 'question' && !stage.multi ? (
          <Text style={s.footerHint}>Seçiminizle otomatik devam edilir</Text>
        ) : null}

        {stage.kind === 'permission' ? (
          <GlowButton label="Devam" arrow onPress={goNext} height={L.btnHeight} />
        ) : null}

        {stage.kind === 'rate' && !showReasonBox && stars === 0 ? (
          <Text style={s.footerHint}>Yukarıdan yıldız seçin</Text>
        ) : null}

        {stage.kind === 'package' ? (
          <View style={[s.ctaStack, { gap: L.space.sm }]}>
            <LegalLinks tone="dark" showKvkk style={{ marginBottom: 4 }} />
            <GlowButton
              label="Kayıt ol ve devam"
              arrow
              onPress={() => void persistAndFinish('register')}
              height={L.btnHeight}
            />
            <GlowButton
              label="Giriş yap"
              muted
              onPress={() => void persistAndFinish('login')}
              height={L.btnHeight}
            />
          </View>
        ) : null}

        {/* Login / story footers: legal always reachable */}
        {stage.kind === 'story' && index === 0 ? (
          <LegalLinks tone="dark" style={{ marginTop: 10 }} />
        ) : null}
      </View>
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#03080F' },
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
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  headerLogo: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#F58A45',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  headerLogoImg: { width: 28, height: 28, resizeMode: 'contain' },
  headerBrand: { color: '#F4F7FA', fontWeight: '700', letterSpacing: -0.2 },
  headerMeta: {
    color: '#6B7F93',
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: 2,
  },
  stepChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  stepChipTxt: { color: '#A8B8C8', fontSize: 12, fontWeight: '800' },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },
  progressFill: { height: 3, borderRadius: 2, overflow: 'hidden' },
  stage: { flex: 1, minHeight: 0 },

  artStage: {
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  artGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    top: 20,
  },
  artCard: {
    width: '100%',
    maxWidth: 360,
    height: 210,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  artTopLine: { height: 2, width: '100%' },
  artCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  artPad: { flex: 1, padding: 18, justifyContent: 'center' },
  logoRing: {
    padding: 3,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  logoDisc: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImg: { width: 52, height: 52, resizeMode: 'contain' },
  artBrand: { color: '#FFF', fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
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
    borderColor: 'rgba(255,255,255,0.06)',
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
  liveTxt: { color: '#7ED2AB', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
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
    backgroundColor: 'rgba(255,255,255,0.08)',
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
    marginTop: 18,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 10,
    color: '#FFFFFF',
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: -1,
  },
  body: {
    marginTop: 12,
    color: '#8FA0B0',
    lineHeight: 23,
    fontWeight: '500',
  },
  choices: { marginTop: 20, gap: 10 },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    minHeight: 60,
  },
  choiceLabel: { color: '#F4F7FA', fontSize: 15, fontWeight: '700' },
  choiceSub: { color: '#6B7F93', fontSize: 12, marginTop: 3, fontWeight: '500' },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1A1208',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxTick: {
    color: '#1A1208',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 15,
  },
  iconHero: { alignItems: 'center', marginTop: 20, marginBottom: 8 },
  iconHeroGrad: {
    width: 96,
    height: 96,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  iconHeroEmoji: { fontSize: 40 },
  nativeHint: {
    marginTop: 20,
    textAlign: 'center',
    color: '#A8B8C8',
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 28,
  },
  starCard: {
    marginHorizontal: 28,
    marginTop: 28,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
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
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(0,0,0,0.28)',
    color: '#FFF',
    padding: 14,
    fontSize: 14,
  },
  periodRow: {
    flexDirection: 'row',
    marginTop: 18,
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 4,
  },
  periodBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  periodOn: { backgroundColor: 'rgba(245,138,69,0.28)' },
  periodTxt: { color: '#8FA0B0', fontWeight: '700', fontSize: 13 },
  periodTxtOn: { color: '#F3A26B' },
  pkgHero: {
    marginTop: 16,
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    overflow: 'hidden',
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
    backgroundColor: 'rgba(93,212,160,0.15)',
    borderColor: 'rgba(93,212,160,0.4)',
  },
  trackBireysel: {
    backgroundColor: 'rgba(245,138,69,0.15)',
    borderColor: 'rgba(245,138,69,0.4)',
  },
  trackBadgeTxt: {
    color: '#F4F7FA',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  matchBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  matchTitle: {
    color: '#C8D4E0',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  matchLine: {
    color: '#A8B8C8',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 20,
  },
  pkgTypeTiny: {
    color: '#7CA6E0',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  otherMatch: {
    color: '#8FA0B0',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
    marginBottom: 4,
  },
  summaryCard: {
    marginTop: 14,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  summaryTitle: {
    color: '#A8B8C8',
    fontSize: 12,
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
    backgroundColor: 'rgba(245,138,69,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245,138,69,0.25)',
  },
  summaryChipTxt: { color: '#F3A26B', fontSize: 11, fontWeight: '700' },
  pkgBadge: {
    color: '#F3A26B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.3,
    marginBottom: 8,
  },
  pkgName: { color: '#FFF', fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  pkgTag: { color: '#A8B8C8', fontSize: 13, marginTop: 4, fontWeight: '600' },
  pkgDesc: {
    color: '#B7C4D3',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 12,
    fontWeight: '500',
  },
  pkgIdeal: {
    color: '#8FA0B0',
    fontSize: 12,
    marginTop: 10,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  pkgLimit: {
    color: '#F09AA8',
    fontSize: 12,
    marginTop: 6,
    fontWeight: '700',
  },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 16 },
  priceOld: {
    color: '#6B7F93',
    fontSize: 14,
    textDecorationLine: 'line-through',
    marginBottom: 3,
  },
  priceMain: { color: '#FFF', fontSize: 30, fontWeight: '800', letterSpacing: -0.6 },
  priceUnit: { color: '#8FA0B0', fontSize: 13, fontWeight: '600', marginBottom: 5 },
  priceHint: { color: '#6B7F93', fontSize: 12, marginTop: 4, fontWeight: '600' },
  featTitle: {
    color: '#E8EEF5',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 18,
    marginBottom: 8,
  },
  featLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  featCheck: { color: '#5DD4A0', fontWeight: '800', fontSize: 13, marginTop: 1 },
  featLineTxt: { color: '#C5D0DC', fontSize: 13, lineHeight: 18, flex: 1, fontWeight: '500' },
  otherTitle: {
    marginTop: 22,
    color: '#A8B8C8',
    fontSize: 13,
    fontWeight: '800',
  },
  otherDetailCard: {
    marginTop: 10,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  otherHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  otherName: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  otherSub: { color: '#7A8B9C', fontSize: 12, marginTop: 2 },
  otherPrice: { color: '#F3A26B', fontWeight: '800', fontSize: 14 },
  otherUnit: { color: '#8FA0B0', fontWeight: '600', fontSize: 11 },
  otherDesc: {
    color: '#94A7B9',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
    fontWeight: '500',
  },
  otherFeat: { color: '#A8B8C8', fontSize: 12, marginTop: 4, fontWeight: '500' },
  otherFeatMore: { color: '#6B7F93', fontSize: 11, marginTop: 4, fontWeight: '600' },
  otherBuyBtn: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245,138,69,0.4)',
    backgroundColor: 'rgba(245,138,69,0.12)',
    alignItems: 'center',
  },
  otherBuyTxt: { color: '#F3A26B', fontWeight: '800', fontSize: 13 },
  iapNote: {
    marginTop: 14,
    marginBottom: 6,
    color: '#5A6B7C',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },

  footer: {
    zIndex: 40,
    elevation: 20,
    backgroundColor: 'rgba(3,8,15,0.92)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  backHit: { marginBottom: 8, minHeight: 28, justifyContent: 'center' },
  backTxt: { color: '#8FA0B0', fontWeight: '700', fontSize: 14 },
  footerHint: {
    textAlign: 'center',
    color: '#5A6B7C',
    fontSize: 12,
    fontWeight: '600',
    paddingVertical: 10,
  },
  ctaStack: { gap: 10 },
  btnGlowWrap: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#F58A45',
    shadowOpacity: 0.4,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  btnGlow: {
    minHeight: 54,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
  },
  btnGlowTxt: { color: '#1A1208', fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  btnArrow: { color: '#1A1208', fontSize: 18, fontWeight: '700' },
  btnGhost: {
    minHeight: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 14,
  },
  btnGhostTxt: { color: '#E8EEF5', fontSize: 15, fontWeight: '700' },
});
