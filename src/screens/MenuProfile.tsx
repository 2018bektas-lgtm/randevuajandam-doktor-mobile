import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { AppIcon, AppIconName } from '../components/AppIcon';
import { HeaderIconButton, SearchField } from '../components/ContentUI';
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
        <AppIcon name={item.icon} size={16} color={item.tint} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          {locked ? 'Paket yükseltme gerekli' : item.description}
        </Text>
      </View>
      <AppIcon name={locked ? 'lock' : 'chevronRight'} size={16} color={locked ? '#F59E0B' : '#CBD5E1'} />
    </Pressable>
  );
}

/** Alt sekme: iş modülleri — şık, sade, app menüsü */
export function MenuScreen({ onBack: _onBack, onNavigate, onSignOut }: ModuleProps) {
  const L = useLayout();
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
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

  const allItems = MENU_GROUPS.flatMap((g) => g.items);
  const searchResults = query.trim()
    ? allItems.filter(
        (i) =>
          i.title.toLowerCase().includes(query.toLowerCase()) ||
          i.description.toLowerCase().includes(query.toLowerCase()),
      )
    : [];

  return (
    <View style={styles.safe}>
      <StatusBar style="dark" />
      <View style={[styles.compactHeader, { paddingTop: L.safeTop + 4 }]}>
        <View style={styles.headerNavRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitleText}>Tüm Modüller</Text>
            <Text style={styles.headerSubtitleText}>
              {paketAd ? `Paket: ${paketAd}` : 'İşletme ve randevu yönetimi'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <HeaderIconButton name="search" color="#0F172A" onPress={() => setSearchOpen(true)} />
            <HeaderIconButton name="bell" color="#0F172A" onPress={() => onNavigate('notifications')} />
          </View>
        </View>
      </View>

      {/* Arama Modalı */}
      <Modal visible={searchOpen} animationType="fade" transparent={false} onRequestClose={() => setSearchOpen(false)}>
        <View style={[styles.safe, { paddingTop: L.safeTop + 4 }]}>
          <StatusBar style="dark" />
          <View style={styles.searchModalTop}>
            <View style={{ flex: 1 }}>
              <SearchField
                value={query}
                onChangeText={setQuery}
                placeholder="Modül veya özellik ara…"
                autoFocus
              />
            </View>
            <Pressable
              style={({ pressed }) => [styles.searchCancelBtn, pressed && { opacity: 0.7 }]}
              onPress={() => {
                setQuery('');
                setSearchOpen(false);
              }}
            >
              <Text style={styles.searchCancelTxt}>Vazgeç</Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
          >
            {!query.trim() ? (
              <View style={{ marginTop: 24, alignItems: 'center' }}>
                <Text style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center' }}>
                  Aramak istediğiniz modül veya sayfa adını yazın.
                </Text>
              </View>
            ) : searchResults.length === 0 ? (
              <View style={{ alignItems: 'center', marginTop: 36 }}>
                <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                  <AppIcon name="search" size={22} color="#94A3B8" />
                </View>
                <Text style={{ color: '#0F172A', fontSize: 16, fontWeight: '700' }}>Sonuç Bulunamadı</Text>
                <Text style={{ color: '#64748B', fontSize: 13, marginTop: 4, textAlign: 'center' }}>
                  "{query}" ile eşleşen bir modül veya özellik bulunamadı.
                </Text>
              </View>
            ) : (
              <View style={styles.card}>
                {searchResults.map((item, i) => (
                  <MenuRow
                    key={item.screen}
                    item={item}
                    locked={isLocked(item)}
                    last={i === searchResults.length - 1}
                    onPress={() => {
                      setSearchOpen(false);
                      setQuery('');
                      openItem(item);
                    }}
                  />
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: L.scrollBottom + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.quickGrid}>
          <Pressable
            style={({ pressed }) => [styles.quickTile, { backgroundColor: '#FFF7ED' }, pressed && styles.pressed]}
            onPress={() => onNavigate('calendar')}
          >
            <View style={[styles.quickIcon, { backgroundColor: '#EE7D31' }]}>
              <AppIcon name="calendar" size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.quickTitle}>Takvim</Text>
            <Text style={styles.quickSub}>Günlük plan</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.quickTile, { backgroundColor: '#FEF3C7' }, pressed && styles.pressed]}
            onPress={() => onNavigate('requests')}
          >
            <View style={[styles.quickIcon, { backgroundColor: '#F59E0B' }]}>
              <AppIcon name="requests" size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.quickTitle}>Talepler</Text>
            <Text style={styles.quickSub}>Onay bekleyenler</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.quickTile, { backgroundColor: '#EFF6FF' }, pressed && styles.pressed]}
            onPress={() => onNavigate('patients')}
          >
            <View style={[styles.quickIcon, { backgroundColor: '#3B82F6' }]}>
              <AppIcon name="people" size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.quickTitle}>Hastalar</Text>
            <Text style={styles.quickSub}>Hasta listesi</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.quickTile, { backgroundColor: '#FEF2F2' }, pressed && styles.pressed]}
            onPress={() => onNavigate('quickClose')}
          >
            <View style={[styles.quickIcon, { backgroundColor: '#EF4444' }]}>
              <AppIcon name="block" size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.quickTitle}>Hızlı Kapat</Text>
            <Text style={styles.quickSub}>Saat kapat/aç</Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.brand.orange} style={{ marginTop: 40 }} />
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

        <View style={styles.group}>
          <Text style={styles.groupLabel}>Hesap & Ayarlar</Text>
          <View style={styles.card}>
            <Pressable
              style={({ pressed }) => [styles.row, styles.rowBorder, pressed && styles.pressed]}
              onPress={() => onNavigate('notifications')}
            >
              <View style={[styles.iconBox, { backgroundColor: 'rgba(59,130,246,0.12)' }]}>
                <AppIcon name="bell" size={16} color="#3B82F6" />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Bildirimler</Text>
                <Text style={styles.rowSub}>Talepler ve uyarılardan haberdar olun</Text>
              </View>
              <AppIcon name="chevronRight" size={16} color="#CBD5E1" />
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              onPress={() => onNavigate('profile')}
            >
              <View style={[styles.iconBox, { backgroundColor: 'rgba(15,23,42,0.08)' }]}>
                <AppIcon name="profile" size={16} color="#0F172A" />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Profil & Hesap Ayarları</Text>
                <Text style={styles.rowSub}>Güvenlik, paket ve web sitesi düzenlemesi</Text>
              </View>
              <AppIcon name="chevronRight" size={16} color="#CBD5E1" />
            </Pressable>
          </View>
        </View>

        {onSignOut ? (
          <Pressable
            style={({ pressed }) => [styles.logoutBtn, pressed && styles.pressed]}
            onPress={() => {
              if (Platform.OS === 'web' && typeof window !== 'undefined') {
                if (window.confirm('Çıkış yap\n\nHesabınızdan çıkmak istiyor musunuz?')) {
                  void onSignOut();
                }
                return;
              }
              Alert.alert('Çıkış yap', 'Hesabınızdan çıkmak istiyor musunuz?', [
                { text: 'Vazgeç', style: 'cancel' },
                { text: 'Çıkış yap', style: 'destructive', onPress: () => void onSignOut() },
              ]);
            }}
          >
            <AppIcon name="close" size={16} color="#DC2626" />
            <Text style={styles.logoutText}>Oturumu kapat</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

// ── Profile shell helpers (used by Modules ProfileScreen redesign) ──────────

export function ProfileChrome({
  onBack: _onBack,
  onNavigate,
  children,
  loading,
}: {
  onBack?: () => void;
  onNavigate?: (screen: ScreenId) => void;
  children: React.ReactNode;
  loading?: boolean;
}) {
  const L = useLayout();
  return (
    <View style={styles.safe}>
      <StatusBar style="dark" />
      <View style={[styles.compactHeader, { paddingTop: L.safeTop + 4 }]}>
        <View style={styles.headerNavRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitleText}>Profil & Hesap</Text>
            <Text style={styles.headerSubtitleText}>Kişisel bilgiler, güvenlik ve klinik ayarları</Text>
          </View>
          {onNavigate ? (
            <HeaderIconButton name="bell" color="#0F172A" onPress={() => onNavigate('notifications')} />
          ) : null}
        </View>
      </View>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: L.scrollBottom + 16 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {loading ? <ActivityIndicator color="#EE7D31" style={{ marginTop: 32 }} /> : children}
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
          <AppIcon name="camera" size={11} color="#FFFFFF" />
        </View>
      </Pressable>
      <View style={styles.heroCopy}>
        <Text style={styles.heroName} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.heroEmail} numberOfLines={1}>
          {email}
        </Text>
        {specialty ? (
          <Text style={styles.heroMeta} numberOfLines={1}>
            {specialty}
          </Text>
        ) : null}
        {phone ? (
          <View style={styles.phoneRow}>
            <AppIcon name="call" size={11} color="#64748B" />
            <Text style={styles.heroMeta} numberOfLines={1}>
              {phone}
            </Text>
          </View>
        ) : null}
      </View>
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
              <AppIcon name={item.icon} size={16} color={item.tint} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.rowSub}>{item.description}</Text>
            </View>
            <AppIcon name="chevronRight" size={16} color="#CBD5E1" />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F2F4F7' },

  /** Tab kökleri: hafif başlık, geri butonu yok */
  compactHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15,23,42,0.08)',
    shadowColor: '#0F172A',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  searchModalTop: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15,23,42,0.08)',
  },
  searchCancelBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  searchCancelTxt: {
    color: colors.brand.orangeSoft,
    fontSize: 15,
    fontWeight: '700',
  },
  headerNavRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerTitleText: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  headerSubtitleText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  paketPill: {
    marginTop: 6,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(238,125,49,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  paketPillText: { color: '#C96A2B', fontSize: 11, fontWeight: '700', maxWidth: 240 },

  scroll: { paddingHorizontal: 14, paddingTop: 6 },
  quickGrid: {
    marginTop: 10,
    marginBottom: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickTile: {
    width: '48%',
    flexGrow: 1,
    padding: 14,
    borderRadius: 16,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  quickIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  quickSub: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  group: { marginTop: 20 },
  groupLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 7,
    marginLeft: 4,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  row: {
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 10,
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
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  rowSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '400',
  },
  profileCta: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15,23,42,0.06)',
  },
  logoutBtn: {
    marginTop: 10,
    marginBottom: 4,
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  logoutText: { color: '#DC2626', fontSize: 14, fontWeight: '700' },

  /** Kompakt yatay kimlik kartı */
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
  },
  avatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(238,125,49,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { color: '#EE7D31', fontSize: 22, fontWeight: '700' },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EE7D31',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  heroCopy: { flex: 1, minWidth: 0 },
  heroName: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.25,
  },
  heroEmail: { color: '#64748B', fontSize: 12, marginTop: 2 },
  heroMeta: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
});
