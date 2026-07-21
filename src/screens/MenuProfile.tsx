import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { AppIcon, AppIconName } from '../components/AppIcon';
import { apiGet } from '../api/client';
import { useLayout } from '../layout';
import type { ModuleProps, ScreenId } from '../navigation/types';
import { colors } from '../theme';

type MenuItem = {
  icon: AppIconName;
  title: string;
  description: string;
  screen: ScreenId;
  feature?: string;
  tint: string;
};

type MenuGroup = { title: string; items: MenuItem[] };

const MENU_GROUPS: MenuGroup[] = [
  {
    title: 'Randevu',
    items: [
      { icon: 'calendar', title: 'Takvim', description: 'Günlük plan', screen: 'calendar', tint: '#EE7D31' },
      { icon: 'requests', title: 'Talepler', description: 'Onay bekleyenler', screen: 'requests', feature: 'randevu_talepleri', tint: '#F59E0B' },
      { icon: 'people', title: 'Hastalar', description: 'Kayıtlar', screen: 'patients', tint: '#3B82F6' },
      { icon: 'waitlist', title: 'Bekleme listesi', description: 'Boş slot', screen: 'waitlist', tint: '#8B5CF6' },
      { icon: 'block', title: 'Hızlı kapat', description: 'Saat kapat/aç', screen: 'quickClose', tint: '#EF4444' },
      { icon: 'time', title: 'İzin / tatil', description: 'Müsaitlik', screen: 'leaves', tint: '#06B6D4' },
      { icon: 'time', title: 'Çalışma saatleri', description: 'Haftalık plan', screen: 'workingHours', tint: '#0EA5E9' },
      { icon: 'settings', title: 'Randevu ayarları', description: 'Periyot & onay', screen: 'settings', tint: '#64748B' },
    ],
  },
  {
    title: 'İçerik',
    items: [
      { icon: 'list', title: 'Hizmetler', description: 'Süre & fiyat', screen: 'services', tint: '#10B981' },
      { icon: 'blog', title: 'Blog', description: 'Yazılar', screen: 'blogs', feature: 'blog', tint: '#6366F1' },
      { icon: 'star', title: 'Yorumlar', description: 'Hasta geri bildirimi', screen: 'reviews', tint: '#EAB308' },
      { icon: 'gallery', title: 'Galeri', description: 'Fotoğraflar', screen: 'gallery', feature: 'galeri', tint: '#EC4899' },
      { icon: 'document', title: 'SSS', description: 'Sık sorulanlar', screen: 'faq', feature: 'faq', tint: '#14B8A6' },
      { icon: 'education', title: 'Eğitimler', description: 'Kurs & seminer', screen: 'education', feature: 'egitimler', tint: '#8B5CF6' },
      { icon: 'mail', title: 'Eğitim başvuruları', description: 'Başvuru listesi', screen: 'educationApps', feature: 'egitimler', tint: '#A855F7' },
    ],
  },
  {
    title: 'İşletme',
    items: [
      { icon: 'finance', title: 'Finans', description: 'Gelir & gider', screen: 'finance', feature: 'finans', tint: '#22C55E' },
      { icon: 'clinic', title: 'Klinik', description: 'Ekip & yönetim', screen: 'clinic', tint: '#0F172A' },
    ],
  },
];

function MenuRow({
  item,
  locked,
  last,
  onPress,
}: {
  item: MenuItem;
  locked: boolean;
  last: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, !last && styles.rowBorder, pressed && styles.pressed, locked && styles.rowLocked]}
    >
      <View style={[styles.iconBox, { backgroundColor: `${item.tint}18` }]}>
        <AppIcon name={item.icon} size={20} color={item.tint} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          {locked ? 'Paket yükseltme gerekli' : item.description}
        </Text>
      </View>
      <AppIcon name={locked ? 'lock' : 'chevronRight'} size={18} color={locked ? '#F59E0B' : '#CBD5E1'} />
    </Pressable>
  );
}

/** Alt sekme: iş modülleri — şık, sade, app menüsü */
export function MenuScreen({ onBack, onNavigate, onSignOut }: ModuleProps) {
  const L = useLayout();
  const [features, setFeatures] = useState<string[]>([]);
  const [restrict, setRestrict] = useState(false);
  const [paketAd, setPaketAd] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await apiGet<{ features: string[]; restrict: boolean; paket: { ad?: string } | null }>(
          '/doctor/package-features',
        );
        setFeatures(res.data?.features ?? []);
        setRestrict(!!res.data?.restrict);
        setPaketAd(res.data?.paket?.ad ?? null);
      } catch {
        setRestrict(false);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function isLocked(item: MenuItem): boolean {
    if (!restrict || !item.feature) return false;
    return !features.includes(item.feature);
  }

  function openItem(item: MenuItem) {
    if (isLocked(item)) {
      Alert.alert('Paket gerekli', 'Bu özellik mevcut paketinizde yok.', [
        { text: 'Tamam', style: 'cancel' },
        { text: 'Paketlere git', onPress: () => onNavigate('packages') },
      ]);
      return;
    }
    onNavigate(item.screen);
  }

  return (
    <View style={styles.safe}>
      <StatusBar style="dark" />
      <View style={[styles.topBar, { paddingTop: L.safeTop + 8 }]}>
        <View style={styles.topBarRow}>
          <Pressable onPress={onBack} hitSlop={12} style={styles.backChip}>
            <AppIcon name="chevronLeft" size={20} color="#0F172A" />
          </Pressable>
          <Text style={styles.topTitle}>Menü</Text>
          <View style={styles.backChip} />
        </View>
        {paketAd ? (
          <View style={styles.paketPill}>
            <AppIcon name="package" size={14} color="#C96A2B" />
            <Text style={styles.paketPillText} numberOfLines={1}>
              {paketAd}
            </Text>
          </View>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: L.scrollBottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator color="#EE7D31" style={{ marginTop: 40 }} />
        ) : (
          MENU_GROUPS.map((group) => (
            <View key={group.title} style={styles.group}>
              <Text style={styles.groupLabel}>{group.title}</Text>
              <View style={styles.card}>
                {group.items.map((item, i) => (
                  <MenuRow
                    key={item.screen}
                    item={item}
                    locked={isLocked(item)}
                    last={i === group.items.length - 1}
                    onPress={() => openItem(item)}
                  />
                ))}
              </View>
            </View>
          ))
        )}

        <Pressable
          style={({ pressed }) => [styles.profileCta, pressed && styles.pressed]}
          onPress={() => onNavigate('profile')}
        >
          <View style={[styles.iconBox, { backgroundColor: 'rgba(15,23,42,0.08)' }]}>
            <AppIcon name="profile" size={20} color="#0F172A" />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Profil & hesap</Text>
            <Text style={styles.rowSub}>Güvenlik, paket, web sitesi</Text>
          </View>
          <AppIcon name="chevronRight" size={18} color="#CBD5E1" />
        </Pressable>

        {onSignOut ? (
          <Pressable
            style={({ pressed }) => [styles.logoutBtn, pressed && styles.pressed]}
            onPress={() => void onSignOut()}
          >
            <AppIcon name="close" size={18} color="#DC2626" />
            <Text style={styles.logoutText}>Oturumu kapat</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

// ── Profile shell helpers (used by Modules ProfileScreen redesign) ──────────

export function ProfileChrome({
  onBack,
  children,
  loading,
}: {
  onBack?: () => void;
  children: React.ReactNode;
  loading?: boolean;
}) {
  const L = useLayout();
  return (
    <View style={styles.safe}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#0F172A', '#1E293B', '#334155']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.profileHeader, { paddingTop: L.safeTop + 6 }]}
      >
        <View style={styles.topBarRow}>
          {onBack ? (
            <Pressable onPress={onBack} hitSlop={12} style={styles.backChipLight}>
              <AppIcon name="chevronLeft" size={20} color="#FFFFFF" />
            </Pressable>
          ) : (
            <View style={styles.backChipLight} />
          )}
          <Text style={styles.topTitleLight}>Profil</Text>
          <View style={styles.backChipLight} />
        </View>
      </LinearGradient>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: L.scrollBottom + 28, marginTop: -28 }]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? <ActivityIndicator color="#EE7D31" style={{ marginTop: 48 }} /> : children}
      </ScrollView>
    </View>
  );
}

export function ProfileHeroCard({
  photoUri,
  name,
  email,
  specialty,
  phone,
  onPickPhoto,
}: {
  photoUri: string | null;
  name: string;
  email: string;
  specialty?: string | null;
  phone?: string | null;
  onPickPhoto: () => void;
}) {
  return (
    <View style={styles.heroCard}>
      <Pressable onPress={onPickPhoto} style={styles.avatarWrap}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarLetter}>{(name || '?').charAt(0).toLocaleUpperCase('tr-TR')}</Text>
          </View>
        )}
        <View style={styles.cameraBadge}>
          <AppIcon name="camera" size={14} color="#FFFFFF" />
        </View>
      </Pressable>
      <Text style={styles.heroName} numberOfLines={2}>
        {name}
      </Text>
      <Text style={styles.heroEmail} numberOfLines={1}>
        {email}
      </Text>
      {specialty ? (
        <Text style={styles.heroMeta} numberOfLines={2}>
          {specialty}
        </Text>
      ) : null}
      {phone ? (
        <View style={styles.phoneRow}>
          <AppIcon name="call" size={13} color="#64748B" />
          <Text style={styles.heroMeta}>{phone}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function ProfileLinkGroup({
  title,
  items,
  onNavigate,
}: {
  title: string;
  items: { icon: AppIconName; title: string; description: string; screen: ScreenId; tint: string }[];
  onNavigate: (s: ScreenId) => void;
}) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{title}</Text>
      <View style={styles.card}>
        {items.map((item, i) => (
          <Pressable
            key={item.screen}
            onPress={() => onNavigate(item.screen)}
            style={({ pressed }) => [
              styles.row,
              i < items.length - 1 && styles.rowBorder,
              pressed && styles.pressed,
            ]}
          >
            <View style={[styles.iconBox, { backgroundColor: `${item.tint}18` }]}>
              <AppIcon name={item.icon} size={20} color={item.tint} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.rowSub}>{item.description}</Text>
            </View>
            <AppIcon name="chevronRight" size={18} color="#CBD5E1" />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F1F5F9' },
  topBar: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
  },
  backChip: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backChipLight: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  topTitleLight: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  paketPill: {
    marginTop: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(238,125,49,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  paketPillText: { color: '#C96A2B', fontSize: 12, fontWeight: '700', maxWidth: 260 },
  scroll: { paddingHorizontal: 16, paddingTop: 8 },
  group: { marginTop: 18 },
  groupLabel: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: 0.2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  row: {
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15,23,42,0.07)',
  },
  rowLocked: { opacity: 0.55 },
  pressed: { opacity: 0.88 },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  rowSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  profileCta: {
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  logoutBtn: {
    marginTop: 14,
    marginBottom: 8,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: '#FEF2F2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutText: { color: '#DC2626', fontSize: 16, fontWeight: '700' },

  profileHeader: {
    paddingHorizontal: 16,
    paddingBottom: 48,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 22,
    paddingHorizontal: 18,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  avatarWrap: { position: 'relative', marginBottom: 12 },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#E2E8F0',
  },
  avatarFallback: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(238,125,49,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { color: '#EE7D31', fontSize: 36, fontWeight: '700' },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EE7D31',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  heroName: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  heroEmail: { color: '#64748B', fontSize: 14, marginTop: 4, textAlign: 'center' },
  heroMeta: { color: '#94A3B8', fontSize: 13, marginTop: 4, textAlign: 'center' },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
});
