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
import { HeaderIconButton, MetricTile, SectionHeader, SoftAction, StatusChip } from '../components/ContentUI';

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
 * Doctor home dashboard — native mobile layout (aligned with login / onboarding).
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
  const patientInitial = nextAppt?.patient
    ? nextAppt.patient
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() ?? '')
        .join('')
    : '?';

  return (
    <View style={styles.root}>
      {/* Header / greeting */}
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.dateTitle}>{todayLabel}</Text>
            <Text style={styles.subtitle} numberOfLines={2}>
              {specialty || 'Bugünkü programınız'}
            </Text>
          </View>
          <Pressable style={styles.addFab} onPress={onAddAppointment} accessibilityLabel="Yeni randevu">
            <AppIcon name="plus" size={18} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={styles.heroChips}>
          <View style={[styles.liveChip, bookingOpen ? styles.liveOpen : styles.liveClosed]}>
            <View style={[styles.liveDot, bookingOpen ? styles.liveDotOpen : styles.liveDotClosed]} />
            <Text style={styles.liveText}>
              {bookingOpen ? 'Randevu alımı açık' : 'Randevu alımı kapalı'}
            </Text>
          </View>
          <View style={styles.weekChip}>
            <AppIcon name="calendar" size={11} color="#C96A2B" />
            <Text style={styles.weekChipText}>Bu hafta {weekTotal}</Text>
          </View>
          {paketAd ? (
            <View style={styles.metaChip}>
              <AppIcon name="package" size={11} color="#64748B" />
              <Text style={styles.metaChipText} numberOfLines={1}>
                {paketAd}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Clinic invites */}
      {pendingInvites.length > 0 ? (
        <View style={styles.inviteCard}>
          <View style={styles.inviteHead}>
            <View style={styles.inviteIcon}>
              <AppIcon name="clinic" size={15} color="#EE7D31" />
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

      {/* Next appointment — hero card */}
      {nextAppt ? (
        <Pressable
          style={({ pressed }) => [styles.nextCard, pressed && styles.pressed]}
          onPress={onOpenNext}
        >
          <View style={styles.nextTopRow}>
            <Text style={styles.nextEyebrow}>Sıradaki randevu</Text>
            <StatusChip label={nextAppt.statusLabel} tone="brand" />
          </View>
          <View style={styles.nextMain}>
            <View style={styles.nextAvatar}>
              <Text style={styles.nextAvatarTxt}>{patientInitial || '?'}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.nextTime}>
                {nextAppt.time}
                {nextAppt.endTime ? ` – ${nextAppt.endTime}` : ''}
              </Text>
              <Text style={styles.nextDateHint}>{nextAppt.dateHint}</Text>
              <Text style={styles.nextPatient} numberOfLines={1}>
                {nextAppt.patient}
              </Text>
            </View>
          </View>
          <View style={styles.nextMeta}>
            {nextAppt.service ? (
              <View style={styles.nextMetaPill}>
                <AppIcon name="list" size={11} color="#64748B" />
                <Text style={styles.nextMetaText} numberOfLines={1}>
                  {nextAppt.service}
                </Text>
              </View>
            ) : null}
            {nextAppt.online ? (
              <View style={[styles.nextMetaPill, styles.nextOnlinePill]}>
                <AppIcon name="globe" size={11} color="#1F9D55" />
                <Text style={[styles.nextMetaText, { color: '#1F9D55' }]}>Online</Text>
              </View>
            ) : (
              <View style={styles.nextMetaPill}>
                <AppIcon name="clinic" size={11} color="#64748B" />
                <Text style={styles.nextMetaText}>Yüz yüze</Text>
              </View>
            )}
          </View>
          <View style={styles.nextCta}>
            <Text style={styles.nextCtaText}>Detay ve işlemler</Text>
            <AppIcon name="chevronRight" size={14} color="#EE7D31" />
          </View>
        </Pressable>
      ) : (
        <View style={styles.nextEmpty}>
          <View style={styles.nextEmptyIcon}>
            <AppIcon name="calendar" size={20} color="#EE7D31" />
          </View>
          <Text style={styles.nextEmptyTitle}>Sıradaki randevu yok</Text>
          <Text style={styles.nextEmptyText}>Bugün için kalan aktif randevu bulunmuyor.</Text>
          <View style={styles.nextEmptyActions}>
            <SoftAction label="Randevu ekle" icon="plus" onPress={onAddAppointment} />
            <SoftAction
              label="Talepler"
              icon="requests"
              tone="neutral"
              onPress={() => onNavigate('requests')}
            />
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

      {/* Today status */}
      <View style={styles.card}>
        <Text style={styles.blockTitle}>Bugünün durumu</Text>
        <View style={styles.statusRow}>
          {[
            { label: 'Bekliyor', value: todayPending, color: '#B45309', bg: '#FFF7ED' },
            { label: 'Onaylı', value: todayConfirmed, color: '#1F9D55', bg: '#E6F6ED' },
            { label: 'Tamam', value: todayCompleted, color: '#2563EB', bg: '#EFF6FF' },
            { label: 'İptal', value: todayCancelled, color: '#DC2626', bg: '#FEF2F2' },
          ].map((item) => (
            <View key={item.label} style={[styles.statusItem, { backgroundColor: item.bg }]}>
              <Text style={[styles.statusValue, { color: item.color }]}>{item.value}</Text>
              <Text style={styles.statusLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Week activity */}
      <View style={styles.card}>
        <View style={styles.weekHead}>
          <View style={{ flex: 1 }}>
            <Text style={styles.blockTitle}>Haftalık yoğunluk</Text>
            <Text style={styles.blockSub}>Toplam {weekTotal} randevu</Text>
          </View>
          <Pressable style={styles.linkBtn} onPress={() => onNavigate('calendar')}>
            <Text style={styles.linkText}>Takvim</Text>
            <AppIcon name="chevronRight" size={12} color="#EE7D31" />
          </Pressable>
        </View>
        <View style={styles.bars}>
          {weekDays.map((d) => {
            const h = d.count > 0 ? Math.max(10, Math.round((d.count / Math.max(weekMax, 1)) * 40)) : 6;
            return (
              <Pressable key={d.key} style={styles.barCol} onPress={() => onNavigate('calendar')}>
                <View
                  style={[
                    styles.bar,
                    { height: h },
                    d.count > 0 && styles.barFilled,
                    d.isToday && styles.barToday,
                  ]}
                />
                <Text style={[styles.barDay, d.isToday && styles.barDayToday]}>{d.label}</Text>
                <Text style={[styles.barCount, d.isToday && styles.barDayToday]}>
                  {d.count > 0 ? d.count : '·'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Booking toggle */}
      <View style={styles.toggleCard}>
        <View style={styles.toggleLeft}>
          <View
            style={[
              styles.toggleIcon,
              { backgroundColor: bookingOpen ? '#E6F6ED' : '#FEF2F2' },
            ]}
          >
            <AppIcon
              name={bookingOpen ? 'check' : 'block'}
              size={15}
              color={bookingOpen ? '#1F9D55' : '#DC2626'}
            />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.toggleTitle}>Randevu alımı</Text>
            <Text style={styles.toggleSub}>
              {bookingOpen ? 'Hastalar randevu alabilir' : 'Yeni randevu kapalı'}
            </Text>
            {klinikAd ? (
              <Text style={styles.toggleMeta} numberOfLines={1}>
                {klinikAd}
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
          style={styles.toggleSwitch}
        />
      </View>
      <Pressable style={styles.settingsLink} onPress={() => onNavigate('settings')}>
        <AppIcon name="settings" size={14} color="#64748B" />
        <Text style={styles.settingsLinkText}>Randevu ayarları</Text>
        <AppIcon name="chevronRight" size={14} color="#94A3B8" />
      </Pressable>

      {/* Quick shortcuts */}
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
              <AppIcon name={item.icon} size={16} color="#EE7D31" />
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
            <AppIcon name="star" size={14} color="#C96A2B" />
          </View>
          <Text style={styles.reviewText}>{reviewsPending} yorum onay bekliyor</Text>
          <AppIcon name="chevronRight" size={14} color="#C96A2B" />
        </Pressable>
      ) : null}

      {/* Today's schedule */}
      <SectionHeader
        title="Bugünün programı"
        actionLabel="Takvim"
        onAction={() => onNavigate('calendar')}
      />
      <Text style={styles.scheduleHint}>
        {todayActive > 0
          ? `${todayActive} aktif · ${todayCompleted} tamamlandı`
          : 'Programınız şu an müsait'}
      </Text>
      {todayList ? (
        <View style={styles.scheduleList}>{todayList}</View>
      ) : (
        <View style={styles.scheduleEmpty}>
          <View style={styles.scheduleEmptyIcon}>
            <AppIcon name="calendar" size={16} color="#EE7D31" />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.scheduleEmptyTitle}>Bugün için randevu yok</Text>
            <Text style={styles.scheduleEmptyText}>
              Yeni randevu ekleyin veya talepleri kontrol edin.
            </Text>
          </View>
          <Pressable style={styles.scheduleEmptyBtn} onPress={onAddAppointment}>
            <AppIcon name="plus" size={14} color="#FFFFFF" />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  android: { elevation: 2 },
  default: {},
});

const styles = StyleSheet.create({
  root: { paddingBottom: 8 },
  pressed: { opacity: 0.9 },

  hero: { paddingTop: 0, paddingBottom: 2 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  greeting: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  dateTitle: {
    marginTop: 1,
    color: '#0F172A',
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: 2,
    color: '#64748B',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  addFab: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#EE7D31',
    alignItems: 'center',
    justifyContent: 'center',
    ...cardShadow,
  },
  heroChips: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  liveOpen: { backgroundColor: '#E6F6ED' },
  liveClosed: { backgroundColor: '#FEF2F2' },
  liveDot: { width: 5, height: 5, borderRadius: 3 },
  liveDotOpen: { backgroundColor: '#1F9D55' },
  liveDotClosed: { backgroundColor: '#DC2626' },
  liveText: { color: '#0F172A', fontSize: 10, fontWeight: '600' },
  weekChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(238,125,49,0.12)',
  },
  weekChipText: { color: '#C96A2B', fontSize: 10, fontWeight: '700' },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
    maxWidth: '100%',
  },
  metaChipText: { color: '#64748B', fontSize: 10, fontWeight: '600', maxWidth: 120 },

  inviteCard: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15,23,42,0.08)',
    ...cardShadow,
  },
  inviteHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inviteIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(238,125,49,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteTitle: { color: '#0F172A', fontSize: 13, fontWeight: '700' },
  inviteSub: { color: '#64748B', fontSize: 11, marginTop: 0 },
  inviteRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15,23,42,0.08)',
  },
  inviteKlinik: { color: '#0F172A', fontSize: 13, fontWeight: '600', marginBottom: 6 },
  inviteActions: { flexDirection: 'row', gap: 6 },

  nextCard: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15,23,42,0.08)',
    borderLeftWidth: 3,
    borderLeftColor: '#EE7D31',
    ...cardShadow,
  },
  nextTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  nextEyebrow: {
    color: '#C96A2B',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  nextMain: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nextAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(238,125,49,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextAvatarTxt: { color: '#C96A2B', fontSize: 12, fontWeight: '800' },
  nextTime: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  nextDateHint: { color: '#94A3B8', fontSize: 10, fontWeight: '600', marginTop: 0 },
  nextPatient: {
    marginTop: 1,
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '600',
  },
  nextMeta: { marginTop: 6, flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  nextMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
  },
  nextOnlinePill: { backgroundColor: '#E6F6ED' },
  nextMetaText: { color: '#64748B', fontSize: 10, fontWeight: '600', maxWidth: 140 },
  nextCta: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15,23,42,0.06)',
  },
  nextCtaText: { color: '#EE7D31', fontSize: 11, fontWeight: '700' },

  nextEmpty: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15,23,42,0.08)',
    ...cardShadow,
  },
  nextEmptyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(238,125,49,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  nextEmptyTitle: { color: '#0F172A', fontSize: 13, fontWeight: '700' },
  nextEmptyText: {
    color: '#64748B',
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 8,
  },
  nextEmptyActions: { flexDirection: 'row', gap: 6, width: '100%' },

  kpiGrid: { marginTop: 8, gap: 6 },
  kpiRow: { flexDirection: 'row', gap: 6 },

  card: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15,23,42,0.08)',
    ...cardShadow,
  },
  blockTitle: { color: '#0F172A', fontSize: 13, fontWeight: '700', letterSpacing: -0.15 },
  blockSub: { color: '#64748B', fontSize: 10, marginTop: 1, fontWeight: '500' },
  statusRow: { marginTop: 8, flexDirection: 'row', gap: 5 },
  statusItem: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 2,
  },
  statusValue: { fontSize: 14, fontWeight: '800', letterSpacing: -0.3 },
  statusLabel: { color: '#64748B', fontSize: 9, fontWeight: '700', marginTop: 2 },

  weekHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  linkText: { color: '#EE7D31', fontSize: 11, fontWeight: '700' },
  bars: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 3,
    minHeight: 52,
  },
  barCol: { flex: 1, alignItems: 'center' },
  bar: {
    width: '55%',
    maxWidth: 18,
    minHeight: 6,
    borderRadius: 5,
    backgroundColor: '#E8EDF3',
  },
  barFilled: { backgroundColor: 'rgba(238,125,49,0.4)' },
  barToday: { backgroundColor: '#EE7D31' },
  barDay: { color: '#94A3B8', fontSize: 9, fontWeight: '700', marginTop: 4 },
  barDayToday: { color: '#C96A2B' },
  barCount: { color: '#64748B', fontSize: 9, fontWeight: '600', marginTop: 1 },

  toggleCard: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15,23,42,0.08)',
    ...cardShadow,
  },
  toggleLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleTitle: { color: '#0F172A', fontSize: 13, fontWeight: '700' },
  toggleSub: { color: '#64748B', fontSize: 10, marginTop: 1 },
  toggleMeta: { color: '#94A3B8', fontSize: 9, marginTop: 1 },
  toggleSwitch: { transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] },
  settingsLink: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  settingsLinkText: { flex: 1, color: '#64748B', fontSize: 12, fontWeight: '600' },

  shortcutGrid: {
    marginTop: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 6,
  },
  shortcut: {
    width: '23.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 2,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15,23,42,0.06)',
    ...cardShadow,
  },
  shortcutIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(238,125,49,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  shortcutBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    paddingHorizontal: 3,
    backgroundColor: '#EE7D31',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  shortcutBadgeText: { color: '#FFFFFF', fontSize: 8, fontWeight: '800' },
  shortcutTitle: { color: '#0F172A', fontSize: 10, fontWeight: '700', textAlign: 'center' },
  shortcutSub: { color: '#94A3B8', fontSize: 8, marginTop: 1, textAlign: 'center' },

  reviewBanner: {
    marginTop: 8,
    backgroundColor: 'rgba(238,125,49,0.12)',
    borderRadius: 10,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(238,125,49,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewText: { flex: 1, color: '#C96A2B', fontSize: 12, fontWeight: '700' },

  scheduleHint: {
    color: '#64748B',
    fontSize: 11,
    marginBottom: 4,
    fontWeight: '500',
  },
  scheduleList: { gap: 0 },
  scheduleEmpty: {
    marginTop: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15,23,42,0.08)',
    ...cardShadow,
  },
  scheduleEmptyIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(238,125,49,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleEmptyTitle: { color: '#0F172A', fontSize: 12, fontWeight: '700' },
  scheduleEmptyText: { color: '#64748B', fontSize: 10, marginTop: 1, lineHeight: 13 },
  scheduleEmptyBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#EE7D31',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
