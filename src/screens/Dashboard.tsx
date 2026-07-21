import { ReactNode } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { AppIcon, AppIconName } from '../components/AppIcon';
import { MetricTile, SectionHeader, SoftAction, StatusChip } from '../components/ContentUI';
import { colors } from '../theme';

export type DashInvite = { id: number; klinik: string };

type Props = {
  greeting: string;
  todayLabel: string;
  specialty: string;
  bookingOpen: boolean;
  paketAd?: string | null;
  klinikAd?: string | null;
  klinikRol?: string | null;
  weekTotal: number;
  todayActive: number;
  todayPending: number;
  todayConfirmed: number;
  todayCompleted: number;
  todayCancelled: number;
  patientsCount: number | string;
  waitlistCount: number | string;
  pendingRequests: number;
  reviewsPending: number;
  pendingInvites: DashInvite[];
  weekDays: { key: string; label: string; count: number; isToday: boolean }[];
  weekMax: number;
  nextAppt?: {
    time: string;
    endTime?: string | null;
    dateHint: string;
    patient: string;
    service?: string | null;
    statusLabel: string;
    statusColor: string;
    online?: boolean;
  } | null;
  todayList: ReactNode;
  onAcceptInvite: (id: number) => void;
  onRejectInvite: (id: number) => void;
  onOpenNext: () => void;
  onAddAppointment: () => void;
  onToggleBooking: () => void;
  onNavigate: (screen: string) => void;
};

/**
 * Mobile doctor home dashboard — native app layout (not web responsive).
 */
export function DashboardOverview({
  greeting,
  todayLabel,
  specialty,
  bookingOpen,
  paketAd,
  klinikAd,
  klinikRol,
  weekTotal,
  todayActive,
  todayPending,
  todayConfirmed,
  todayCompleted,
  todayCancelled,
  patientsCount,
  waitlistCount,
  pendingRequests,
  reviewsPending,
  pendingInvites,
  weekDays,
  weekMax,
  nextAppt,
  todayList,
  onAcceptInvite,
  onRejectInvite,
  onOpenNext,
  onAddAppointment,
  onToggleBooking,
  onNavigate,
}: Props) {
  return (
    <View style={styles.root}>
      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.greeting}>{greeting}</Text>
        <Text style={styles.dateTitle}>{todayLabel}</Text>
        <Text style={styles.subtitle} numberOfLines={2}>
          {specialty || 'Bugünkü programınız'}
        </Text>
        <View style={styles.heroChips}>
          <View style={[styles.liveChip, bookingOpen ? styles.liveOpen : styles.liveClosed]}>
            <View style={[styles.liveDot, bookingOpen ? styles.liveDotOpen : styles.liveDotClosed]} />
            <Text style={styles.liveText}>{bookingOpen ? 'Randevu alımı açık' : 'Randevu alımı kapalı'}</Text>
          </View>
          {weekTotal > 0 ? (
            <View style={styles.weekChip}>
              <AppIcon name="calendar" size={13} color="#C96A2B" />
              <Text style={styles.weekChipText}>Bu hafta {weekTotal}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Clinic invites */}
      {pendingInvites.length > 0 ? (
        <View style={styles.inviteCard}>
          <View style={styles.inviteHead}>
            <View style={styles.inviteIcon}>
              <AppIcon name="clinic" size={18} color="#EE7D31" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inviteTitle}>Klinik daveti</Text>
              <Text style={styles.inviteSub}>{pendingInvites.length} bekleyen davet</Text>
            </View>
          </View>
          {pendingInvites.map((inv) => (
            <View key={inv.id} style={styles.inviteRow}>
              <Text style={styles.inviteKlinik} numberOfLines={1}>
                {inv.klinik}
              </Text>
              <View style={styles.inviteActions}>
                <SoftAction label="Kabul" icon="check" tone="success" onPress={() => onAcceptInvite(inv.id)} />
                <SoftAction label="Reddet" icon="close" tone="danger" onPress={() => onRejectInvite(inv.id)} />
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {/* Next appointment */}
      {nextAppt ? (
        <Pressable style={styles.nextCard} onPress={onOpenNext}>
          <View style={styles.nextAccent} />
          <View style={styles.nextBody}>
            <View style={styles.nextTop}>
              <Text style={styles.nextEyebrow}>Sıradaki randevu</Text>
              <StatusChip label={nextAppt.statusLabel} tone="brand" />
            </View>
            <Text style={styles.nextTime}>
              {nextAppt.time}
              {nextAppt.endTime ? ` – ${nextAppt.endTime}` : ''}
              <Text style={styles.nextDateHint}>  ·  {nextAppt.dateHint}</Text>
            </Text>
            <Text style={styles.nextPatient} numberOfLines={1}>
              {nextAppt.patient}
            </Text>
            <View style={styles.nextMeta}>
              {nextAppt.service ? (
                <View style={styles.nextMetaItem}>
                  <AppIcon name="list" size={13} color="#94A3B8" />
                  <Text style={styles.nextMetaText} numberOfLines={1}>
                    {nextAppt.service}
                  </Text>
                </View>
              ) : null}
              {nextAppt.online ? (
                <View style={styles.nextMetaItem}>
                  <AppIcon name="globe" size={13} color="#1F9D55" />
                  <Text style={[styles.nextMetaText, { color: '#1F9D55' }]}>Online</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.nextCta}>
              <Text style={styles.nextCtaText}>Detay ve işlemler</Text>
              <AppIcon name="chevronRight" size={16} color="#EE7D31" />
            </View>
          </View>
        </Pressable>
      ) : (
        <View style={styles.nextEmpty}>
          <View style={styles.nextEmptyIcon}>
            <AppIcon name="calendar" size={24} color="#EE7D31" />
          </View>
          <Text style={styles.nextEmptyTitle}>Sıradaki randevu yok</Text>
          <Text style={styles.nextEmptyText}>
            Bugün için kalan aktif randevu bulunmuyor.
          </Text>
          <View style={styles.nextEmptyActions}>
            <SoftAction label="Randevu ekle" icon="plus" onPress={onAddAppointment} />
            <SoftAction label="Talepler" icon="requests" tone="neutral" onPress={() => onNavigate('requests')} />
          </View>
        </View>
      )}

      {/* KPI 2x2 */}
      <View style={styles.kpiGrid}>
        <View style={styles.kpiRow}>
          <MetricTile
            icon="calendar"
            value={todayActive}
            label="Bugün aktif"
            hint={`${todayConfirmed} onaylı · ${todayCompleted} tamam`}
            onPress={() => onNavigate('calendar')}
          />
          <MetricTile
            icon="requests"
            value={pendingRequests}
            label="Bekleyen talep"
            hint="Onay için dokunun"
            onPress={() => onNavigate('requests')}
            accent
          />
        </View>
        <View style={styles.kpiRow}>
          <MetricTile
            icon="people"
            value={patientsCount}
            label="Kayıtlı hasta"
            hint="Hasta listesi"
            onPress={() => onNavigate('patients')}
          />
          <MetricTile
            icon="waitlist"
            value={waitlistCount}
            label="Bekleme listesi"
            hint="Boş slot doldur"
            onPress={() => onNavigate('waitlist')}
          />
        </View>
      </View>

      {/* Today status strip */}
      <View style={styles.statusCard}>
        <Text style={styles.blockTitle}>Bugünün durumu</Text>
        <View style={styles.statusRow}>
          {[
            { label: 'Bekliyor', value: todayPending, color: '#E8A317' },
            { label: 'Onaylı', value: todayConfirmed, color: '#2E9E5B' },
            { label: 'Tamam', value: todayCompleted, color: '#2563EB' },
            { label: 'İptal', value: todayCancelled, color: '#DC2626' },
          ].map((item) => (
            <View key={item.label} style={styles.statusItem}>
              <Text style={[styles.statusValue, { color: item.color }]}>{item.value}</Text>
              <Text style={styles.statusLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Week activity */}
      <View style={styles.weekCard}>
        <View style={styles.weekHead}>
          <View>
            <Text style={styles.blockTitle}>Haftalık yoğunluk</Text>
            <Text style={styles.blockSub}>Toplam {weekTotal} randevu</Text>
          </View>
          <Pressable style={styles.linkBtn} onPress={() => onNavigate('calendar')}>
            <Text style={styles.linkText}>Takvim</Text>
            <AppIcon name="chevronRight" size={14} color="#EE7D31" />
          </Pressable>
        </View>
        <View style={styles.bars}>
          {weekDays.map((d) => {
            const h = d.count > 0 ? Math.max(12, Math.round((d.count / Math.max(weekMax, 1)) * 56)) : 6;
            return (
              <Pressable
                key={d.key}
                style={styles.barCol}
                onPress={() => onNavigate('calendar')}
              >
                <View
                  style={[
                    styles.bar,
                    { height: h },
                    d.count > 0 && styles.barFilled,
                    d.isToday && styles.barToday,
                  ]}
                />
                <Text style={[styles.barDay, d.isToday && styles.barDayToday]}>{d.label}</Text>
                <Text style={styles.barCount}>{d.count > 0 ? d.count : '·'}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Booking toggle */}
      <View style={styles.toggleCard}>
        <View style={styles.toggleLeft}>
          <View style={styles.toggleIcon}>
            <AppIcon name={bookingOpen ? 'check' : 'block'} size={18} color={bookingOpen ? '#1F9D55' : '#DC2626'} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleTitle}>Randevu alımı</Text>
            <Text style={styles.toggleSub}>
              {bookingOpen ? 'Hastalar randevu alabilir' : 'Yeni randevu kapalı'}
            </Text>
            {paketAd ? <Text style={styles.toggleMeta}>Paket: {paketAd}</Text> : null}
            {klinikAd ? (
              <Text style={styles.toggleMeta}>
                Klinik: {klinikAd}
                {klinikRol ? ` · ${klinikRol}` : ''}
              </Text>
            ) : null}
          </View>
        </View>
        <Switch
          value={bookingOpen}
          onValueChange={() => onToggleBooking()}
          trackColor={{ false: '#CBD5E1', true: '#FDBA8C' }}
          thumbColor={bookingOpen ? '#EE7D31' : '#F8FAFC'}
        />
      </View>
      <Pressable style={styles.settingsLink} onPress={() => onNavigate('settings')}>
        <AppIcon name="settings" size={16} color="#64748B" />
        <Text style={styles.settingsLinkText}>Randevu ayarları</Text>
        <AppIcon name="chevronRight" size={16} color="#94A3B8" />
      </Pressable>

      {/* Quick shortcuts — horizontal app grid */}
      <SectionHeader title="Hızlı erişim" actionLabel="Menü" onAction={() => onNavigate('menu')} />
      <View style={styles.shortcutGrid}>
        {(
          [
            { id: 'calendar', icon: 'calendar' as AppIconName, title: 'Takvim', sub: 'Plan' },
            {
              id: 'requests',
              icon: 'requests' as AppIconName,
              title: 'Talepler',
              sub: pendingRequests > 0 ? `${pendingRequests} bekliyor` : 'Onay',
              badge: pendingRequests,
            },
            { id: 'add', icon: 'plus' as AppIconName, title: 'Yeni', sub: 'Randevu' },
            {
              id: 'patients',
              icon: 'people' as AppIconName,
              title: 'Hastalar',
              sub: typeof patientsCount === 'number' ? `${patientsCount}` : 'Liste',
            },
            {
              id: 'waitlist',
              icon: 'waitlist' as AppIconName,
              title: 'Bekleme',
              sub: 'Liste',
              badge: typeof waitlistCount === 'number' ? waitlistCount : 0,
            },
            { id: 'finance', icon: 'finance' as AppIconName, title: 'Finans', sub: 'Gelir' },
            { id: 'clinic', icon: 'clinic' as AppIconName, title: 'Klinik', sub: 'Ekip' },
            { id: 'packages', icon: 'package' as AppIconName, title: 'Paket', sub: 'Abonelik' },
          ] as const
        ).map((item) => (
          <Pressable
            key={item.id}
            style={({ pressed }) => [styles.shortcut, pressed && styles.pressed]}
            onPress={() => {
              if (item.id === 'add') onAddAppointment();
              else onNavigate(item.id);
            }}
          >
            <View style={styles.shortcutIcon}>
              <AppIcon name={item.icon} size={20} color="#EE7D31" />
              {'badge' in item && item.badge && item.badge > 0 ? (
                <View style={styles.shortcutBadge}>
                  <Text style={styles.shortcutBadgeText}>
                    {item.badge > 9 ? '9+' : item.badge}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.shortcutTitle}>{item.title}</Text>
            <Text style={styles.shortcutSub} numberOfLines={1}>
              {item.sub}
            </Text>
          </Pressable>
        ))}
      </View>

      {reviewsPending > 0 ? (
        <Pressable style={styles.reviewBanner} onPress={() => onNavigate('reviews')}>
          <View style={styles.reviewIcon}>
            <AppIcon name="star" size={18} color="#C96A2B" />
          </View>
          <Text style={styles.reviewText}>{reviewsPending} yorum onay bekliyor</Text>
          <AppIcon name="chevronRight" size={18} color="#C96A2B" />
        </Pressable>
      ) : null}

      {/* Today's schedule */}
      <SectionHeader title="Bugünün programı" actionLabel="Takvim" onAction={() => onNavigate('calendar')} />
      <Text style={styles.scheduleHint}>
        {todayActive > 0
          ? `${todayActive} aktif · ${todayCompleted} tamamlandı`
          : 'Programınız şu an müsait'}
      </Text>
      {todayList}
    </View>
  );
}

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  android: { elevation: 2 },
  default: {},
});

const styles = StyleSheet.create({
  root: { paddingBottom: 8 },
  pressed: { opacity: 0.88 },
  hero: { paddingTop: 4, paddingBottom: 6 },
  greeting: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  dateTitle: {
    marginTop: 2,
    color: '#0F172A',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.7,
  },
  subtitle: {
    marginTop: 4,
    color: '#64748B',
    fontSize: 15,
    lineHeight: 20,
  },
  heroChips: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  liveOpen: { backgroundColor: '#E6F6ED' },
  liveClosed: { backgroundColor: '#FEF2F2' },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  liveDotOpen: { backgroundColor: '#1F9D55' },
  liveDotClosed: { backgroundColor: '#DC2626' },
  liveText: { color: '#0F172A', fontSize: 12, fontWeight: '600' },
  weekChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(238,125,49,0.12)',
  },
  weekChipText: { color: '#C96A2B', fontSize: 12, fontWeight: '700' },

  inviteCard: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    ...cardShadow,
  },
  inviteHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  inviteIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(238,125,49,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteTitle: { color: '#0F172A', fontSize: 15, fontWeight: '700' },
  inviteSub: { color: '#64748B', fontSize: 12, marginTop: 1 },
  inviteRow: { marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(15,23,42,0.08)' },
  inviteKlinik: { color: '#0F172A', fontSize: 15, fontWeight: '600', marginBottom: 8 },
  inviteActions: { flexDirection: 'row', gap: 8 },

  nextCard: {
    marginTop: 12,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    ...cardShadow,
  },
  nextAccent: { width: 5, backgroundColor: colors.brand.orange },
  nextBody: { flex: 1, padding: 16 },
  nextTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nextEyebrow: {
    color: '#C96A2B',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  nextTime: {
    marginTop: 10,
    color: '#0F172A',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  nextDateHint: { color: '#94A3B8', fontSize: 14, fontWeight: '600' },
  nextPatient: {
    marginTop: 6,
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '600',
  },
  nextMeta: { marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  nextMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  nextMetaText: { color: '#64748B', fontSize: 12, fontWeight: '500' },
  nextCta: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  nextCtaText: { color: '#EE7D31', fontSize: 13, fontWeight: '700' },

  nextEmpty: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    ...cardShadow,
  },
  nextEmptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: 'rgba(238,125,49,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  nextEmptyTitle: { color: '#0F172A', fontSize: 16, fontWeight: '700' },
  nextEmptyText: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  nextEmptyActions: { flexDirection: 'row', gap: 8, width: '100%' },

  kpiGrid: { marginTop: 14, gap: 12 },
  kpiRow: { flexDirection: 'row', gap: 12 },

  statusCard: {
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    ...cardShadow,
  },
  blockTitle: { color: '#0F172A', fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  blockSub: { color: '#64748B', fontSize: 12, marginTop: 2 },
  statusRow: { marginTop: 14, flexDirection: 'row' },
  statusItem: { flex: 1, alignItems: 'center' },
  statusValue: { fontSize: 20, fontWeight: '700', letterSpacing: -0.4 },
  statusLabel: { color: '#64748B', fontSize: 11, fontWeight: '600', marginTop: 4 },

  weekCard: {
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    ...cardShadow,
  },
  weekHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  linkText: { color: '#EE7D31', fontSize: 13, fontWeight: '700' },
  bars: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 4,
    minHeight: 72,
  },
  barCol: { flex: 1, alignItems: 'center' },
  bar: {
    width: '58%',
    maxWidth: 24,
    minHeight: 6,
    borderRadius: 8,
    backgroundColor: '#E8EDF3',
  },
  barFilled: { backgroundColor: 'rgba(238,125,49,0.45)' },
  barToday: { backgroundColor: '#EE7D31' },
  barDay: { color: '#94A3B8', fontSize: 10, fontWeight: '700', marginTop: 8 },
  barDayToday: { color: '#C96A2B' },
  barCount: { color: '#64748B', fontSize: 10, fontWeight: '600', marginTop: 2 },

  toggleCard: {
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...cardShadow,
  },
  toggleLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleTitle: { color: '#0F172A', fontSize: 15, fontWeight: '700' },
  toggleSub: { color: '#64748B', fontSize: 12, marginTop: 2 },
  toggleMeta: { color: '#94A3B8', fontSize: 11, marginTop: 3 },
  settingsLink: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  settingsLinkText: { flex: 1, color: '#64748B', fontSize: 14, fontWeight: '600' },

  shortcutGrid: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  shortcut: {
    width: '23%',
    flexGrow: 1,
    minWidth: '22%',
    maxWidth: '25%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    ...cardShadow,
  },
  shortcutIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(238,125,49,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  shortcutBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: '#EE7D31',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  shortcutBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  shortcutTitle: { color: '#0F172A', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  shortcutSub: { color: '#94A3B8', fontSize: 10, marginTop: 2, textAlign: 'center' },

  reviewBanner: {
    marginTop: 14,
    backgroundColor: 'rgba(238,125,49,0.12)',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reviewIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(238,125,49,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewText: { flex: 1, color: '#C96A2B', fontSize: 14, fontWeight: '700' },

  scheduleHint: {
    color: '#64748B',
    fontSize: 13,
    marginBottom: 4,
  },
});
