import { ReactNode } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { AppIcon, AppIconName } from './AppIcon';
import { colors } from '../theme';

/** Grouped white surface for page blocks */
export function Surface({
  children,
  style,
  padded = true,
}: {
  children: ReactNode;
  style?: ViewStyle;
  padded?: boolean;
}) {
  return <View style={[styles.surface, padded && styles.surfacePad, style]}>{children}</View>;
}

export function ListRow({
  title,
  subtitle,
  meta,
  icon,
  iconColor = colors.brand.orange,
  right,
  onPress,
  danger,
  style,
}: {
  title: string;
  subtitle?: string | null;
  meta?: string | null;
  icon?: AppIconName;
  iconColor?: string;
  right?: ReactNode;
  onPress?: () => void;
  danger?: boolean;
  style?: ViewStyle;
}) {
  const body = (
    <View style={[styles.row, style]}>
      {icon ? (
        <View style={[styles.iconBadge, { backgroundColor: 'rgba(238,125,49,0.12)' }]}>
          <AppIcon name={icon} size={20} color={iconColor} />
        </View>
      ) : null}
      <View style={styles.rowCopy}>
        <Text style={[styles.rowTitle, danger && styles.rowTitleDanger]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.rowSubtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
        {meta ? (
          <Text style={styles.rowMeta} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
      {right ?? (onPress ? <AppIcon name="chevronRight" size={18} color="#94A3B8" /> : null)}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.rowPress, pressed && styles.pressed]}>
        {body}
      </Pressable>
    );
  }
  return <View style={styles.rowPress}>{body}</View>;
}

export function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} style={styles.sectionActionBtn}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
          <AppIcon name="chevronRight" size={14} color={colors.brand.orange} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function MetricTile({
  icon,
  value,
  label,
  hint,
  onPress,
  accent,
}: {
  icon: AppIconName;
  value: string | number;
  label: string;
  hint?: string;
  onPress?: () => void;
  accent?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.metric, accent && styles.metricAccent, pressed && styles.pressed]}
    >
      <View style={[styles.metricIcon, accent && styles.metricIconAccent]}>
        <AppIcon name={icon} size={14} color={accent ? '#FFFFFF' : colors.brand.orange} />
      </View>
      <Text style={[styles.metricValue, accent && styles.metricValueAccent]}>{value}</Text>
      <Text style={[styles.metricLabel, accent && styles.metricLabelAccent]}>{label}</Text>
      {hint ? (
        <Text style={[styles.metricHint, accent && styles.metricHintAccent]} numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function StatusChip({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'brand';
}) {
  return (
    <View style={[styles.chip, chipTone[tone]]}>
      <Text style={[styles.chipText, chipTextTone[tone]]}>{label}</Text>
    </View>
  );
}

export function EmptyContent({
  icon = 'document',
  title,
  text,
}: {
  icon?: AppIconName;
  title: string;
  text: string;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <AppIcon name={icon} size={28} color={colors.brand.orange} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

/** Soft pill action used in lists (Onayla, Ertele…) */
export function SoftAction({
  label,
  onPress,
  tone = 'brand',
  disabled,
  icon,
}: {
  label: string;
  onPress: () => void;
  tone?: 'brand' | 'success' | 'danger' | 'neutral' | 'info';
  disabled?: boolean;
  icon?: AppIconName;
}) {
  const map = {
    brand: { bg: 'rgba(238,125,49,0.14)', fg: '#C96A2B' },
    success: { bg: 'rgba(31,157,85,0.14)', fg: '#1F9D55' },
    danger: { bg: 'rgba(220,38,38,0.12)', fg: '#DC2626' },
    neutral: { bg: '#F1F5F9', fg: '#475569' },
    info: { bg: 'rgba(37,99,235,0.12)', fg: '#2563EB' },
  }[tone];

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.softAction,
        { backgroundColor: map.bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
      ]}
    >
      {icon ? <AppIcon name={icon} size={15} color={map.fg} /> : null}
      <Text style={[styles.softActionText, { color: map.fg }]}>{label}</Text>
    </Pressable>
  );
}

/** Mobile appointment tile — timeline style */
export function AppointmentTile({
  time,
  endTime,
  date,
  patient,
  service,
  statusLabel,
  statusColor,
  online,
  phone,
  compact,
  busy,
  onPress,
  onConfirm,
  onReschedule,
  onComplete,
  onCancel,
}: {
  time: string;
  endTime?: string | null;
  date?: string | null;
  patient: string;
  service?: string | null;
  statusLabel: string;
  statusColor: string;
  online?: boolean;
  phone?: string | null;
  compact?: boolean;
  busy?: boolean;
  onPress?: () => void;
  onConfirm?: () => void;
  onReschedule?: () => void;
  onComplete?: () => void;
  onCancel?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onReschedule}
      delayLongPress={380}
      style={({ pressed }) => [styles.appt, pressed && styles.pressed]}
    >
      <View style={[styles.apptRail, { backgroundColor: statusColor }]} />
      <View style={styles.apptBody}>
        <View style={styles.apptTop}>
          <View style={styles.apptTimeBlock}>
            <AppIcon name="time" size={14} color={colors.brand.orange} />
            <Text style={styles.apptTime}>
              {time}
              {endTime ? `–${endTime}` : ''}
            </Text>
            {date ? <Text style={styles.apptDate}>{date}</Text> : null}
          </View>
          <StatusChip
            label={statusLabel}
            tone={
              statusLabel.toLowerCase().includes('iptal')
                ? 'danger'
                : statusLabel.toLowerCase().includes('tamam')
                  ? 'success'
                  : statusLabel.toLowerCase().includes('bek')
                    ? 'warning'
                    : 'brand'
            }
          />
        </View>

        <Text style={styles.apptPatient} numberOfLines={1}>
          {patient}
        </Text>

        <View style={styles.apptMetaRow}>
          {service ? (
            <View style={styles.apptMetaItem}>
              <AppIcon name="list" size={13} color="#94A3B8" />
              <Text style={styles.apptMetaText} numberOfLines={1}>
                {service}
              </Text>
            </View>
          ) : null}
          {online ? (
            <View style={styles.apptMetaItem}>
              <AppIcon name="globe" size={13} color="#1F9D55" />
              <Text style={[styles.apptMetaText, { color: '#1F9D55' }]}>Online</Text>
            </View>
          ) : null}
          {phone ? (
            <View style={styles.apptMetaItem}>
              <AppIcon name="call" size={13} color="#94A3B8" />
              <Text style={styles.apptMetaText}>{phone}</Text>
            </View>
          ) : null}
        </View>

        {!compact && (onConfirm || onReschedule || onComplete || onCancel) ? (
          <View style={styles.apptActions}>
            {onConfirm ? (
              <SoftAction label="Onayla" icon="check" tone="success" disabled={busy} onPress={onConfirm} />
            ) : null}
            {onReschedule ? (
              <SoftAction label="Ertele" icon="time" tone="brand" disabled={busy} onPress={onReschedule} />
            ) : null}
            {onComplete ? (
              <SoftAction label="Tamam" icon="check" tone="info" disabled={busy} onPress={onComplete} />
            ) : null}
            {onCancel ? (
              <SoftAction label="İptal" icon="close" tone="danger" disabled={busy} onPress={onCancel} />
            ) : null}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export function SearchField({
  value,
  onChangeText,
  onSubmit,
  placeholder = 'Ara…',
  ...rest
}: {
  value: string;
  onChangeText: (t: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
} & Omit<TextInputProps, 'value' | 'onChangeText' | 'placeholder'>) {
  return (
    <View style={styles.searchWrap}>
      <AppIcon name="search" size={18} color="#94A3B8" />
      <TextInput
        style={styles.searchInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        autoCapitalize="none"
        {...rest}
      />
      {value ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={8}>
          <AppIcon name="close" size={16} color="#94A3B8" />
        </Pressable>
      ) : null}
    </View>
  );
}

export function HeaderIconButton({
  name,
  onPress,
  color = '#FFFFFF',
}: {
  name: AppIconName;
  onPress: () => void;
  color?: string;
}) {
  return (
    <Pressable onPress={onPress} hitSlop={10} style={styles.headerIconBtn}>
      <AppIcon name={name} size={22} color={color} />
    </Pressable>
  );
}

const chipTone = {
  neutral: { backgroundColor: '#F1F5F9' },
  success: { backgroundColor: '#E6F6ED' },
  warning: { backgroundColor: '#FFF7ED' },
  danger: { backgroundColor: '#FEF2F2' },
  brand: { backgroundColor: 'rgba(238,125,49,0.14)' },
};

const chipTextTone = {
  neutral: { color: '#475569' },
  success: { color: '#1F9D55' },
  warning: { color: '#C2410C' },
  danger: { color: '#DC2626' },
  brand: { color: '#C96A2B' },
};

const styles = StyleSheet.create({
  surface: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginTop: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  surfacePad: { padding: 14 },
  rowPress: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginTop: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 3 },
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  pressed: { opacity: 0.9 },
  row: {
    minHeight: 72,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  rowTitleDanger: { color: '#DC2626' },
  rowSubtitle: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
  rowMeta: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 3,
    fontWeight: '500',
  },
  sectionHeader: {
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sectionActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  sectionAction: {
    color: colors.brand.orange,
    fontSize: 12,
    fontWeight: '600',
  },
  metric: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 8,
    minHeight: 78,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOpacity: 0.04,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 1 },
      default: {},
    }),
  },
  metricAccent: { backgroundColor: colors.brand.orange },
  metricIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: 'rgba(238,125,49,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  metricIconAccent: { backgroundColor: 'rgba(255,255,255,0.22)' },
  metricValue: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  metricValueAccent: { color: '#FFFFFF' },
  metricLabel: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  metricLabelAccent: { color: 'rgba(255,255,255,0.95)' },
  metricHint: { color: '#94A3B8', fontSize: 9, marginTop: 2 },
  metricHintAccent: { color: 'rgba(255,255,255,0.8)' },
  chip: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  chipText: { fontSize: 10, fontWeight: '700' },
  empty: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: 'rgba(238,125,49,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    textAlign: 'center',
  },
  softAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: 10,
    flexGrow: 1,
    minWidth: '22%',
  },
  softActionText: { fontSize: 12, fontWeight: '700' },
  appt: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 6,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOpacity: 0.04,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 1 },
      default: {},
    }),
  },
  apptRail: { width: 3 },
  apptBody: { flex: 1, padding: 10 },
  apptTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  apptTimeBlock: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  apptTime: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.15,
  },
  apptDate: { color: '#94A3B8', fontSize: 10, fontWeight: '600' },
  apptPatient: {
    marginTop: 4,
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.15,
  },
  apptMetaRow: {
    marginTop: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  apptMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 3, maxWidth: '100%' },
  apptMetaText: { color: '#64748B', fontSize: 11, fontWeight: '500' },
  apptActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  searchWrap: {
    marginTop: 8,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 1 },
      default: {},
    }),
  },
  searchInput: {
    flex: 1,
    color: '#0F172A',
    fontSize: 16,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
});
