/**
 * Onboarding intro previews — styles co-located (Metro HMR safe).
 * Layout: fixed copy on top + scrollable full preview card.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode, useEffect } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { AppIcon, type AppIconName } from '../components/AppIcon';
import { useLayout } from '../layout';

const LOGO = require('../../assets/logo.png');

export type IntroVisual =
  | 'brand'
  | 'calendar'
  | 'modules'
  | 'video'
  | 'team'
  | 'ready'
  | 'security'
  | 'reviews';

/* ─── Layout: text top + scrollable card ─────────────────── */

export function IntroFeatureLayout({
  accent,
  eyebrow,
  title,
  body,
  bullets,
  scrollHint,
  children,
}: {
  accent: string;
  eyebrow: string;
  title: string;
  body: string;
  bullets?: string[];
  scrollHint?: string;
  children: ReactNode;
}) {
  const L = useLayout();
  const chips = (bullets ?? []).slice(0, 3);
  return (
    <View style={[layout.wrap, { paddingHorizontal: L.padX }]}>
      <View style={layout.copyTop}>
        <Text style={[layout.eyebrow, { color: accent }]}>{eyebrow}</Text>
        <Text style={layout.title}>{title.replace(/\n/g, ' ')}</Text>
        <Text style={layout.body} numberOfLines={2}>
          {body}
        </Text>
        <View style={layout.chipRow}>
          {chips.map((b) => (
            <View key={b} style={[layout.chip, { borderColor: `${accent}28` }]}>
              <View style={[layout.chipDot, { backgroundColor: accent }]} />
              <Text style={layout.chipTxt}>{b}</Text>
            </View>
          ))}
        </View>
      </View>
      <ScrollView
        style={layout.scroll}
        contentContainerStyle={layout.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces
      >
        {children}
        {scrollHint ? <Text style={layout.hint}>{scrollHint}</Text> : null}
      </ScrollView>
    </View>
  );
}

const layout = StyleSheet.create({
  wrap: { flex: 1, minHeight: 0, paddingTop: 2 },
  copyTop: { flexShrink: 0, marginBottom: 10 },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.7,
    marginBottom: 4,
  },
  title: {
    color: '#0F172A',
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  body: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    marginTop: 4,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipDot: { width: 5, height: 5, borderRadius: 3 },
  chipTxt: { color: '#334155', fontSize: 11, fontWeight: '600' },
  scroll: { flex: 1, minHeight: 0 },
  scrollContent: { paddingBottom: 12, flexGrow: 1 },
  hint: {
    marginTop: 8,
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
});

/* ─── Welcome (step 0) ───────────────────────────────────── */

export function WelcomeHeroScene({
  accent,
  eyebrow,
  title,
  body,
  bullets,
}: {
  accent: string;
  eyebrow: string;
  title: string;
  body: string;
  bullets?: string[];
}) {
  const L = useLayout();
  const breath = useSharedValue(0);
  const logoIn = useSharedValue(0);
  const chips = (bullets ?? []).slice(0, 3);
  const icons: AppIconName[] = ['calendar', 'call', 'package'];

  useEffect(() => {
    logoIn.value = withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) });
    breath.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 3200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [breath, logoIn]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoIn.value,
    transform: [
      { scale: interpolate(logoIn.value, [0, 1], [0.86, 1], Extrapolation.CLAMP) },
      { translateY: interpolate(breath.value, [0, 1], [0, -4], Extrapolation.CLAMP) },
    ],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(breath.value, [0, 1], [0.35, 0.55], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(breath.value, [0, 1], [1, 1.08], Extrapolation.CLAMP) }],
  }));

  return (
    <View style={[welcome.wrap, { paddingHorizontal: L.padX }]}>
      <View style={welcome.orbLayer} pointerEvents="none">
        <LinearGradient
          colors={[`${accent}28`, `${accent}00`]}
          style={welcome.orbTop}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </View>

      <Animated.View style={[welcome.logoStack, logoStyle]}>
        <Animated.View style={[welcome.logoGlow, { backgroundColor: `${accent}30` }, glowStyle]} />
        <LinearGradient colors={['#FFFFFF', '#FFF8F3']} style={welcome.logoCard}>
          <Image source={LOGO} style={welcome.logoImg} />
        </LinearGradient>
      </Animated.View>

      <Text style={welcome.brand}>Randevu Ajandam</Text>
      <View style={[welcome.eyebrowPill, { backgroundColor: `${accent}14` }]}>
        <Text style={[welcome.eyebrowTxt, { color: accent }]}>{eyebrow}</Text>
      </View>
      <Text style={welcome.title}>{title}</Text>
      <Text style={welcome.body}>{body}</Text>

      <View style={welcome.chipRow}>
        {chips.map((label, i) => (
          <View key={label} style={welcome.chip}>
            <View style={[welcome.chipIcon, { backgroundColor: `${accent}14` }]}>
              <AppIcon name={icons[i] ?? 'check'} size={16} color={accent} />
            </View>
            <Text style={welcome.chipTxt} numberOfLines={2}>
              {label}
            </Text>
          </View>
        ))}
      </View>
      <Text style={welcome.meta}>Yaklaşık 2 dakika · size özel paket önerisi</Text>
    </View>
  );
}

const welcome = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 12,
    overflow: 'hidden',
  },
  orbLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  orbTop: {
    position: 'absolute',
    top: -40,
    left: '10%',
    right: '10%',
    height: 220,
    borderRadius: 120,
  },
  logoStack: {
    width: 112,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logoGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  logoCard: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15,23,42,0.08)',
  },
  logoImg: { width: 56, height: 56, resizeMode: 'contain' },
  brand: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  eyebrowPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 12,
  },
  eyebrowTxt: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  title: {
    color: '#0F172A',
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: -0.9,
    textAlign: 'center',
  },
  body: {
    marginTop: 12,
    color: '#64748B',
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 300,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    maxWidth: 380,
    marginTop: 28,
  },
  chip: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15,23,42,0.08)',
    minHeight: 96,
  },
  chipIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipTxt: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 15,
  },
  meta: {
    marginTop: 20,
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});

/* ─── Calendar ───────────────────────────────────────────── */

export function CalendarPreviewCard({ accent }: { accent: string }) {
  const week = [
    { d: 'Pzt', n: 12, dots: 2 },
    { d: 'Sal', n: 13, dots: 1 },
    { d: 'Çar', n: 14, on: true, dots: 4 },
    { d: 'Per', n: 15, dots: 3 },
    { d: 'Cum', n: 16, dots: 2 },
    { d: 'Cmt', n: 17, dots: 0 },
    { d: 'Paz', n: 18, dots: 0 },
  ];
  const stats = [
    { label: 'Onaylı', value: '5', color: '#1F9D55', bg: '#E6F6ED' },
    { label: 'Talep', value: '2', color: '#B45309', bg: '#FFF7ED' },
    { label: 'Boş slot', value: '6', color: accent, bg: `${accent}14` },
  ];
  const appts = [
    { t: '09:30', name: 'Ayşe Yılmaz', kind: 'Yüz yüze · Muayene', status: 'Onaylı', sc: '#1F9D55', sb: '#E6F6ED', i: 'A' },
    { t: '11:00', name: 'Mehmet Kaya', kind: 'Online görüşme', status: 'Talep', sc: '#B45309', sb: '#FFF7ED', i: 'M' },
    { t: '13:00', name: '—', kind: 'Öğle arası', status: 'Kapalı', sc: '#64748B', sb: '#F1F5F9', i: '·', blocked: true },
    { t: '14:15', name: 'Zeynep Demir', kind: 'Kontrol · 20 dk', status: 'Onaylı', sc: '#1F9D55', sb: '#E6F6ED', i: 'Z' },
    { t: '16:00', name: 'Can Öztürk', kind: 'Yüz yüze · İlk', status: 'Bekliyor', sc: '#2563EB', sb: '#EFF6FF', i: 'C' },
  ];

  return (
    <View style={cal.card}>
      <View style={cal.appBar}>
        <View style={cal.appBarLeft}>
          <View style={[cal.appBarIcon, { backgroundColor: `${accent}14` }]}>
            <AppIcon name="calendar" size={16} color={accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={cal.appBarTitle}>Takvim</Text>
            <Text style={cal.appBarSub}>14 Mart · Çarşamba · Bu hafta</Text>
          </View>
        </View>
        <View style={[cal.countPill, { backgroundColor: `${accent}12` }]}>
          <Text style={[cal.countPillTxt, { color: accent }]}>8 randevu</Text>
        </View>
      </View>

      <View style={cal.statsRow}>
        {stats.map((s) => (
          <View key={s.label} style={[cal.statCell, { backgroundColor: s.bg }]}>
            <Text style={[cal.statVal, { color: s.color }]}>{s.value}</Text>
            <Text style={cal.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <View style={cal.weekRow}>
        {week.map((day) => (
          <View key={day.d} style={[cal.dayCell, day.on && { backgroundColor: accent }]}>
            <Text style={[cal.dayLabel, day.on && cal.dayLabelOn]}>{day.d}</Text>
            <Text style={[cal.dayNum, day.on && cal.dayNumOn]}>{day.n}</Text>
            <View style={cal.dotRow}>
              {Array.from({ length: Math.min(day.dots, 3) }).map((_, di) => (
                <View
                  key={di}
                  style={[
                    cal.busyDot,
                    { backgroundColor: day.on ? 'rgba(255,255,255,0.85)' : accent },
                  ]}
                />
              ))}
            </View>
          </View>
        ))}
      </View>

      <View style={cal.listHead}>
        <Text style={cal.listHeadTitle}>Bugünün programı</Text>
        <Text style={[cal.listHeadMeta, { color: accent }]}>5 kayıt</Text>
      </View>

      <View style={cal.list}>
        {appts.map((a, idx) => (
          <View
            key={`${a.t}-${a.name}`}
            style={[
              cal.apptRow,
              a.blocked && cal.apptBlocked,
              idx === 0 && !a.blocked && { backgroundColor: `${accent}08`, borderColor: `${accent}22` },
            ]}
          >
            <Text style={[cal.apptTime, idx === 0 && !a.blocked && { color: accent }]}>{a.t}</Text>
            <View
              style={[
                cal.avatar,
                {
                  backgroundColor: a.blocked ? '#E2E8F0' : idx === 0 ? `${accent}18` : '#F1F5F9',
                },
              ]}
            >
              <Text style={[cal.avatarTxt, idx === 0 && !a.blocked && { color: accent }]}>{a.i}</Text>
            </View>
            <View style={cal.apptCopy}>
              <Text style={[cal.apptName, a.blocked && cal.apptNameMuted]} numberOfLines={1}>
                {a.name}
              </Text>
              <Text style={cal.apptKind} numberOfLines={1}>
                {a.kind}
              </Text>
            </View>
            <View style={[cal.statusChip, { backgroundColor: a.sb }]}>
              <Text style={[cal.statusTxt, { color: a.sc }]}>{a.status}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={cal.footerBar}>
        <View style={[cal.footerBtn, { backgroundColor: `${accent}12` }]}>
          <AppIcon name="plus" size={14} color={accent} />
          <Text style={[cal.footerBtnTxt, { color: accent }]}>Randevu</Text>
        </View>
        <View style={cal.footerBtnGhost}>
          <AppIcon name="block" size={14} color="#64748B" />
          <Text style={cal.footerBtnGhostTxt}>Slot kapat</Text>
        </View>
        <View style={cal.footerBtnGhost}>
          <AppIcon name="requests" size={14} color="#64748B" />
          <Text style={cal.footerBtnGhostTxt}>Talepler</Text>
        </View>
      </View>
    </View>
  );
}

const cal = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15,23,42,0.08)',
    overflow: 'hidden',
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  appBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  appBarIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appBarTitle: { color: '#0F172A', fontSize: 15, fontWeight: '700' },
  appBarSub: { color: '#94A3B8', fontSize: 11, fontWeight: '500', marginTop: 1 },
  countPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  countPillTxt: { fontSize: 11, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 10, paddingBottom: 8 },
  statCell: { flex: 1, borderRadius: 12, paddingVertical: 8, alignItems: 'center' },
  statVal: { fontSize: 16, fontWeight: '800' },
  statLabel: { color: '#64748B', fontSize: 10, fontWeight: '600', marginTop: 2 },
  weekRow: { flexDirection: 'row', gap: 3, paddingHorizontal: 8, paddingBottom: 8 },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: 11,
    backgroundColor: '#F8FAFC',
    minHeight: 52,
  },
  dayLabel: { color: '#94A3B8', fontSize: 9, fontWeight: '600', marginBottom: 2 },
  dayLabelOn: { color: 'rgba(255,255,255,0.85)' },
  dayNum: { color: '#0F172A', fontSize: 13, fontWeight: '700' },
  dayNumOn: { color: '#FFFFFF' },
  dotRow: { flexDirection: 'row', gap: 2, marginTop: 3, minHeight: 4 },
  busyDot: { width: 3.5, height: 3.5, borderRadius: 2 },
  listHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F1F5F9',
  },
  listHeadTitle: { color: '#0F172A', fontSize: 12, fontWeight: '700' },
  listHeadMeta: { fontSize: 11, fontWeight: '700' },
  list: { paddingHorizontal: 8, paddingBottom: 8, gap: 5 },
  apptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 8,
    paddingHorizontal: 9,
    borderRadius: 11,
    backgroundColor: '#FAFBFC',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#F1F5F9',
  },
  apptBlocked: { backgroundColor: '#F8FAFC', opacity: 0.92 },
  apptTime: { width: 38, color: '#64748B', fontSize: 11, fontWeight: '700' },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTxt: { color: '#64748B', fontSize: 11, fontWeight: '700' },
  apptCopy: { flex: 1, minWidth: 0 },
  apptName: { color: '#0F172A', fontSize: 12, fontWeight: '600' },
  apptNameMuted: { color: '#94A3B8', fontStyle: 'italic' },
  apptKind: { color: '#94A3B8', fontSize: 10, fontWeight: '500', marginTop: 1 },
  statusChip: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 },
  statusTxt: { fontSize: 9, fontWeight: '700' },
  footerBar: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FAFBFC',
  },
  footerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 9,
    borderRadius: 10,
  },
  footerBtnTxt: { fontSize: 11, fontWeight: '700' },
  footerBtnGhost: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
  },
  footerBtnGhostTxt: { color: '#64748B', fontSize: 11, fontWeight: '600' },
});

/* ─── Modules / Panel ────────────────────────────────────── */

export function ModulesPreviewCard({ accent }: { accent: string }) {
  const kpis = [
    { icon: 'people' as const, label: 'Hasta', value: '128', color: '#10B981', bg: '#ECFDF5' },
    { icon: 'calendar' as const, label: 'Bugün', value: '7', color: '#3B82F6', bg: '#EFF6FF' },
    { icon: 'finance' as const, label: 'Gelir', value: '₺18B', color: accent, bg: `${accent}14` },
    { icon: 'star' as const, label: 'Yorum', value: '4.9', color: '#F59E0B', bg: '#FFFBEB' },
  ];
  const modules = [
    { icon: 'people' as const, label: 'Hastalar', sub: 'Kart & geçmiş', color: '#10B981' },
    { icon: 'list' as const, label: 'Hizmetler', sub: 'Fiyat tanımları', color: '#3B82F6' },
    { icon: 'finance' as const, label: 'Finans', sub: 'Gelir–gider', color: '#EE7D31' },
    { icon: 'blog' as const, label: 'İçerik', sub: 'Blog & makale', color: '#8B5CF6' },
    { icon: 'gallery' as const, label: 'Galeri', sub: 'Vitrin foto', color: '#06B6D4' },
    { icon: 'star' as const, label: 'Yorumlar', sub: 'Geri bildirim', color: '#F59E0B' },
  ];
  const activity = [
    { t: '10:12', title: 'Yeni hasta kaydı', meta: 'Elif Aydın', tone: '#10B981' },
    { t: '09:40', title: 'Hizmet güncellendi', meta: 'Kontrol · 800 ₺', tone: '#3B82F6' },
    { t: 'Dün', title: 'Tahsilat alındı', meta: 'Mehmet K. · 1.200 ₺', tone: '#EE7D31' },
  ];

  return (
    <View style={mod.card}>
      <View style={mod.appBar}>
        <View style={mod.appBarLeft}>
          <View style={[mod.appBarIcon, { backgroundColor: `${accent}14` }]}>
            <AppIcon name="menu" size={16} color={accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={mod.appBarTitle}>İşletme paneli</Text>
            <Text style={mod.appBarSub}>Bugün · canlı özet</Text>
          </View>
        </View>
        <View style={[mod.livePill, { backgroundColor: `${accent}12` }]}>
          <View style={[mod.liveDot, { backgroundColor: accent }]} />
          <Text style={[mod.liveTxt, { color: accent }]}>Aktif</Text>
        </View>
      </View>

      <View style={mod.kpiGrid}>
        {kpis.map((k) => (
          <View key={k.label} style={[mod.kpiCell, { backgroundColor: k.bg }]}>
            <View style={mod.kpiTop}>
              <AppIcon name={k.icon} size={14} color={k.color} />
              <Text style={mod.kpiLabel}>{k.label}</Text>
            </View>
            <Text style={[mod.kpiVal, { color: k.color }]}>{k.value}</Text>
          </View>
        ))}
      </View>

      <View style={mod.sectionHead}>
        <Text style={mod.sectionTitle}>Modüller</Text>
        <Text style={[mod.sectionMeta, { color: accent }]}>6 alan</Text>
      </View>
      <View style={mod.modGrid}>
        {modules.map((m) => (
          <View key={m.label} style={mod.modTile}>
            <View style={[mod.modIcon, { backgroundColor: `${m.color}16` }]}>
              <AppIcon name={m.icon} size={16} color={m.color} />
            </View>
            <Text style={mod.modLabel}>{m.label}</Text>
            <Text style={mod.modSub} numberOfLines={1}>
              {m.sub}
            </Text>
          </View>
        ))}
      </View>

      <View style={[mod.financeCard, { borderColor: `${accent}22` }]}>
        <View style={mod.financeLeft}>
          <Text style={mod.financeEyebrow}>Bu ay finans</Text>
          <Text style={mod.financeAmount}>₺42.500</Text>
          <Text style={mod.financeHint}>Gelir · net tahsilat</Text>
        </View>
        <View style={mod.financeBars}>
          {[0.45, 0.7, 0.55, 0.85, 0.6, 0.95].map((h, i) => (
            <View
              key={i}
              style={[
                mod.bar,
                { height: 12 + h * 28, backgroundColor: i === 5 ? accent : `${accent}35` },
              ]}
            />
          ))}
        </View>
      </View>

      <View style={mod.sectionHead}>
        <Text style={mod.sectionTitle}>Son hareketler</Text>
      </View>
      <View style={mod.actList}>
        {activity.map((a) => (
          <View key={a.title + a.t} style={mod.actRow}>
            <View style={[mod.actDot, { backgroundColor: a.tone }]} />
            <View style={mod.actCopy}>
              <Text style={mod.actTitle} numberOfLines={1}>
                {a.title}
              </Text>
              <Text style={mod.actMeta} numberOfLines={1}>
                {a.meta}
              </Text>
            </View>
            <Text style={mod.actTime}>{a.t}</Text>
          </View>
        ))}
      </View>

      <View style={mod.footerBar}>
        <View style={[mod.footerBtn, { backgroundColor: `${accent}12` }]}>
          <AppIcon name="plus" size={14} color={accent} />
          <Text style={[mod.footerBtnTxt, { color: accent }]}>Hasta ekle</Text>
        </View>
        <View style={mod.footerBtnGhost}>
          <AppIcon name="finance" size={14} color="#64748B" />
          <Text style={mod.footerBtnGhostTxt}>Rapor</Text>
        </View>
        <View style={mod.footerBtnGhost}>
          <AppIcon name="settings" size={14} color="#64748B" />
          <Text style={mod.footerBtnGhostTxt}>Ayarlar</Text>
        </View>
      </View>
    </View>
  );
}

const mod = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15,23,42,0.08)',
    overflow: 'hidden',
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  appBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  appBarIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appBarTitle: { color: '#0F172A', fontSize: 15, fontWeight: '700' },
  appBarSub: { color: '#94A3B8', fontSize: 11, fontWeight: '500', marginTop: 1 },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveTxt: { fontSize: 11, fontWeight: '700' },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  kpiCell: {
    width: '48%',
    flexGrow: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  kpiTop: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  kpiLabel: { color: '#64748B', fontSize: 10, fontWeight: '600' },
  kpiVal: { fontSize: 18, fontWeight: '800', letterSpacing: -0.4 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  sectionTitle: { color: '#0F172A', fontSize: 12, fontWeight: '700' },
  sectionMeta: { fontSize: 11, fontWeight: '700' },
  modGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  modTile: {
    width: '31%',
    flexGrow: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#F1F5F9',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  modIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  modLabel: { color: '#0F172A', fontSize: 12, fontWeight: '700' },
  modSub: { color: '#94A3B8', fontSize: 10, fontWeight: '500', marginTop: 2 },
  financeCard: {
    marginHorizontal: 10,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: '#FAFBFC',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  financeLeft: { flex: 1 },
  financeEyebrow: { color: '#94A3B8', fontSize: 10, fontWeight: '600' },
  financeAmount: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  financeHint: { color: '#64748B', fontSize: 10, fontWeight: '500', marginTop: 2 },
  financeBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 44 },
  bar: { width: 8, borderRadius: 4, minHeight: 10 },
  actList: { paddingHorizontal: 10, paddingBottom: 8, gap: 6 },
  actRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 11,
    backgroundColor: '#FAFBFC',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#F1F5F9',
  },
  actDot: { width: 8, height: 8, borderRadius: 4 },
  actCopy: { flex: 1, minWidth: 0 },
  actTitle: { color: '#0F172A', fontSize: 12, fontWeight: '600' },
  actMeta: { color: '#94A3B8', fontSize: 10, fontWeight: '500', marginTop: 1 },
  actTime: { color: '#94A3B8', fontSize: 10, fontWeight: '600' },
  footerBar: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FAFBFC',
  },
  footerBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 9,
    borderRadius: 10,
  },
  footerBtnTxt: { fontSize: 11, fontWeight: '700' },
  footerBtnGhost: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
  },
  footerBtnGhostTxt: { color: '#64748B', fontSize: 11, fontWeight: '600' },
});

/* ─── Video ──────────────────────────────────────────────── */

export function VideoPreviewCard({ accent }: { accent: string }) {
  const features = [
    { icon: 'check' as const, t: 'Onay sonrası oda otomatik açılır' },
    { icon: 'globe' as const, t: 'Hasta aynı uygulamadan katılır' },
    { icon: 'lock' as const, t: 'Güvenli bağlantı · kayıt yok' },
  ];

  return (
    <View style={vid.card}>
      <View style={vid.appBar}>
        <View style={vid.appBarLeft}>
          <View style={[vid.appBarIcon, { backgroundColor: `${accent}14` }]}>
            <AppIcon name="call" size={16} color={accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={vid.appBarTitle}>Online görüşme</Text>
            <Text style={vid.appBarSub}>Randevu odası · hazır</Text>
          </View>
        </View>
        <View style={[vid.livePill, { backgroundColor: `${accent}12` }]}>
          <View style={[vid.liveDot, { backgroundColor: accent }]} />
          <Text style={[vid.liveTxt, { color: accent }]}>CANLI</Text>
        </View>
      </View>

      <View style={[vid.stage, { backgroundColor: `${accent}08` }]}>
        <View style={vid.mainPeer}>
          <View style={[vid.bigAv, { backgroundColor: `${accent}22` }]}>
            <Text style={[vid.bigAvTxt, { color: accent }]}>H</Text>
          </View>
          <Text style={vid.peerName}>Siz (hekim)</Text>
          <Text style={vid.peerMeta}>Kamera açık</Text>
        </View>
        <View style={vid.pip}>
          <View style={vid.pipAv}>
            <Text style={vid.pipAvTxt}>A</Text>
          </View>
          <Text style={vid.pipName}>Ayşe Y.</Text>
        </View>
        <View style={vid.timerBadge}>
          <Text style={vid.timerTxt}>12:04</Text>
        </View>
      </View>

      <View style={vid.controls}>
        {[
          { icon: 'time' as const, label: 'Sessiz', danger: false },
          { icon: 'camera' as const, label: 'Kamera', danger: false },
          { icon: 'call' as const, label: 'Bitir', danger: true },
        ].map((c) => (
          <View key={c.label} style={vid.ctrlItem}>
            <View
              style={[vid.ctrlBtn, c.danger ? vid.ctrlDanger : { backgroundColor: `${accent}14` }]}
            >
              <AppIcon name={c.icon} size={18} color={c.danger ? '#FFF' : accent} />
            </View>
            <Text style={vid.ctrlLabel}>{c.label}</Text>
          </View>
        ))}
      </View>

      <View style={vid.apptStrip}>
        <View style={vid.apptStripLeft}>
          <Text style={vid.apptStripEyebrow}>Bağlı randevu</Text>
          <Text style={vid.apptStripTitle}>Ayşe Yılmaz · 11:00</Text>
          <Text style={vid.apptStripMeta}>Online seans · 30 dk</Text>
        </View>
        <View style={[vid.joinPill, { backgroundColor: accent }]}>
          <Text style={vid.joinPillTxt}>Odaya gir</Text>
        </View>
      </View>

      <View style={vid.featList}>
        {features.map((f) => (
          <View key={f.t} style={vid.featRow}>
            <View style={[vid.featIcon, { backgroundColor: `${accent}14` }]}>
              <AppIcon name={f.icon} size={14} color={accent} />
            </View>
            <Text style={vid.featTxt}>{f.t}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const vid = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15,23,42,0.08)',
    overflow: 'hidden',
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  appBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  appBarIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appBarTitle: { color: '#0F172A', fontSize: 15, fontWeight: '700' },
  appBarSub: { color: '#94A3B8', fontSize: 11, fontWeight: '500', marginTop: 1 },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveTxt: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  stage: {
    marginHorizontal: 10,
    borderRadius: 16,
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    position: 'relative',
  },
  mainPeer: { alignItems: 'center' },
  bigAv: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigAvTxt: { fontSize: 28, fontWeight: '800' },
  peerName: { color: '#0F172A', fontSize: 14, fontWeight: '700', marginTop: 8 },
  peerMeta: { color: '#64748B', fontSize: 11, fontWeight: '500', marginTop: 2 },
  pip: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 72,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
  },
  pipAv: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pipAvTxt: { color: '#64748B', fontSize: 12, fontWeight: '700' },
  pipName: { color: '#0F172A', fontSize: 10, fontWeight: '600', marginTop: 4 },
  timerBadge: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    backgroundColor: 'rgba(15,23,42,0.72)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  timerTxt: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  controls: { flexDirection: 'row', justifyContent: 'center', gap: 22, paddingVertical: 14 },
  ctrlItem: { alignItems: 'center', gap: 6 },
  ctrlBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctrlDanger: { backgroundColor: '#DC2626' },
  ctrlLabel: { color: '#64748B', fontSize: 10, fontWeight: '600' },
  apptStrip: {
    marginHorizontal: 10,
    marginBottom: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  apptStripLeft: { flex: 1 },
  apptStripEyebrow: { color: '#94A3B8', fontSize: 10, fontWeight: '600' },
  apptStripTitle: { color: '#0F172A', fontSize: 14, fontWeight: '700', marginTop: 2 },
  apptStripMeta: { color: '#64748B', fontSize: 11, fontWeight: '500', marginTop: 2 },
  joinPill: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10 },
  joinPillTxt: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  featList: { paddingHorizontal: 10, paddingBottom: 12, gap: 6 },
  featRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 11,
    backgroundColor: '#FAFBFC',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#F1F5F9',
  },
  featIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featTxt: { flex: 1, color: '#334155', fontSize: 12, fontWeight: '600' },
});

/* ─── Team ───────────────────────────────────────────────── */

export function TeamPreviewCard({ accent }: { accent: string }) {
  const members = [
    { n: 'Uzm. Dr. A. Yılmaz', r: 'Sahip · Hekim', s: 'Aktif', i: 'A', owner: true },
    { n: 'Dr. B. Kaya', r: 'Hekim', s: 'Aktif', i: 'B', owner: false },
    { n: 'Selin Demir', r: 'Sekreter', s: 'Aktif', i: 'S', owner: false },
    { n: 'Can Öztürk', r: 'Personel', s: 'Davet', i: 'C', owner: false },
  ];
  const perms = [
    { t: 'Ortak hasta havuzu', on: true },
    { t: 'Takvim yetkisi', on: true },
    { t: 'Finans görünümü', on: true },
    { t: 'Klinik web sitesi', on: false },
  ];

  return (
    <View style={team.card}>
      <View style={team.appBar}>
        <View style={team.appBarLeft}>
          <View style={[team.appBarIcon, { backgroundColor: `${accent}14` }]}>
            <AppIcon name="clinic" size={16} color={accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={team.appBarTitle}>Klinik ekibi</Text>
            <Text style={team.appBarSub}>Yılmaz Polikliniği · 4 üye</Text>
          </View>
        </View>
        <View style={[team.countPill, { backgroundColor: `${accent}12` }]}>
          <Text style={[team.countPillTxt, { color: accent }]}>Klinik</Text>
        </View>
      </View>

      <View style={team.statsRow}>
        {[
          { v: '3', l: 'Hekim' },
          { v: '1', l: 'Personel' },
          { v: '256', l: 'Hasta' },
        ].map((s) => (
          <View key={s.l} style={[team.statCell, { backgroundColor: `${accent}10` }]}>
            <Text style={[team.statVal, { color: accent }]}>{s.v}</Text>
            <Text style={team.statLabel}>{s.l}</Text>
          </View>
        ))}
      </View>

      <View style={team.sectionHead}>
        <Text style={team.sectionTitle}>Ekip üyeleri</Text>
        <Text style={[team.sectionMeta, { color: accent }]}>+ Davet et</Text>
      </View>
      <View style={team.list}>
        {members.map((m) => (
          <View key={m.n} style={team.row}>
            <View style={[team.av, { backgroundColor: m.owner ? `${accent}18` : '#F1F5F9' }]}>
              <Text style={[team.avTxt, m.owner && { color: accent }]}>{m.i}</Text>
            </View>
            <View style={team.copy}>
              <Text style={team.name} numberOfLines={1}>
                {m.n}
              </Text>
              <Text style={team.role} numberOfLines={1}>
                {m.r}
              </Text>
            </View>
            <View
              style={[
                team.statusChip,
                { backgroundColor: m.s === 'Davet' ? '#FFF7ED' : '#E6F6ED' },
              ]}
            >
              <Text style={[team.statusTxt, { color: m.s === 'Davet' ? '#B45309' : '#1F9D55' }]}>
                {m.s}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View style={team.sectionHead}>
        <Text style={team.sectionTitle}>Yetkiler</Text>
      </View>
      <View style={team.permList}>
        {perms.map((p) => (
          <View key={p.t} style={team.permRow}>
            <Text style={team.permTxt}>{p.t}</Text>
            <View style={[team.toggle, p.on ? { backgroundColor: accent } : team.toggleOff]}>
              <View style={[team.toggleKnob, p.on && team.toggleKnobOn]} />
            </View>
          </View>
        ))}
      </View>

      <View style={team.footerBar}>
        <View style={[team.footerBtn, { backgroundColor: `${accent}12` }]}>
          <AppIcon name="plus" size={14} color={accent} />
          <Text style={[team.footerBtnTxt, { color: accent }]}>Hekim davet</Text>
        </View>
        <View style={team.footerBtnGhost}>
          <AppIcon name="people" size={14} color="#64748B" />
          <Text style={team.footerBtnGhostTxt}>Personel</Text>
        </View>
        <View style={team.footerBtnGhost}>
          <AppIcon name="globe" size={14} color="#64748B" />
          <Text style={team.footerBtnGhostTxt}>Site</Text>
        </View>
      </View>
    </View>
  );
}

const team = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15,23,42,0.08)',
    overflow: 'hidden',
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  appBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  appBarIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appBarTitle: { color: '#0F172A', fontSize: 15, fontWeight: '700' },
  appBarSub: { color: '#94A3B8', fontSize: 11, fontWeight: '500', marginTop: 1 },
  countPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  countPillTxt: { fontSize: 11, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 10, paddingBottom: 10 },
  statCell: { flex: 1, borderRadius: 12, paddingVertical: 8, alignItems: 'center' },
  statVal: { fontSize: 16, fontWeight: '800' },
  statLabel: { color: '#64748B', fontSize: 10, fontWeight: '600', marginTop: 2 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  sectionTitle: { color: '#0F172A', fontSize: 12, fontWeight: '700' },
  sectionMeta: { fontSize: 11, fontWeight: '700' },
  list: { paddingHorizontal: 10, paddingBottom: 8, gap: 5 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 11,
    backgroundColor: '#FAFBFC',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#F1F5F9',
  },
  av: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avTxt: { color: '#64748B', fontSize: 13, fontWeight: '700' },
  copy: { flex: 1, minWidth: 0 },
  name: { color: '#0F172A', fontSize: 13, fontWeight: '600' },
  role: { color: '#94A3B8', fontSize: 10, fontWeight: '500', marginTop: 1 },
  statusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 },
  statusTxt: { fontSize: 10, fontWeight: '700' },
  permList: { paddingHorizontal: 10, paddingBottom: 8, gap: 4 },
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 11,
    backgroundColor: '#FAFBFC',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#F1F5F9',
  },
  permTxt: { color: '#334155', fontSize: 12, fontWeight: '600', flex: 1 },
  toggle: {
    width: 40,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  toggleOff: { backgroundColor: '#E2E8F0' },
  toggleKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFF' },
  toggleKnobOn: { alignSelf: 'flex-end' },
  footerBar: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FAFBFC',
  },
  footerBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 9,
    borderRadius: 10,
  },
  footerBtnTxt: { fontSize: 11, fontWeight: '700' },
  footerBtnGhost: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
  },
  footerBtnGhostTxt: { color: '#64748B', fontSize: 11, fontWeight: '600' },
});

/* ─── Scene router ───────────────────────────────────────── */

export function IntroSceneRouter({
  visual,
  accent,
  eyebrow,
  title,
  body,
  bullets,
  isWelcome,
}: {
  visual: IntroVisual;
  accent: string;
  eyebrow: string;
  title: string;
  body: string;
  bullets?: string[];
  isWelcome?: boolean;
}) {
  if (isWelcome || visual === 'brand') {
    return (
      <WelcomeHeroScene
        accent={accent}
        eyebrow={eyebrow}
        title={title}
        body={body}
        bullets={bullets}
      />
    );
  }

  const card =
    visual === 'calendar' ? (
      <CalendarPreviewCard accent={accent} />
    ) : visual === 'modules' ? (
      <ModulesPreviewCard accent={accent} />
    ) : visual === 'video' ? (
      <VideoPreviewCard accent={accent} />
    ) : visual === 'team' ? (
      <TeamPreviewCard accent={accent} />
    ) : (
      <ModulesPreviewCard accent={accent} />
    );

  const hint =
    visual === 'calendar'
      ? 'Kaydırarak tüm programı görün'
      : visual === 'modules'
        ? 'Kaydırarak paneli keşfedin'
        : visual === 'video'
          ? 'Kaydırarak görüşme odasını görün'
          : 'Kaydırarak ekip panelini görün';

  return (
    <IntroFeatureLayout
      accent={accent}
      eyebrow={eyebrow}
      title={title}
      body={body}
      bullets={bullets}
      scrollHint={hint}
    >
      {card}
    </IntroFeatureLayout>
  );
}
