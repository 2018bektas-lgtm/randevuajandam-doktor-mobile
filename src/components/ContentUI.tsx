import { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { AppIcon, AppIconName } from './AppIcon';
import { colors } from '../theme';

/** Content row used across module lists — app-native, not web cards. */
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
        <View style={[styles.iconBadge, { backgroundColor: `${iconColor}18` }]}>
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
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
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
      style={({ pressed }) => [
        styles.metric,
        accent && styles.metricAccent,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.metricIcon, accent && styles.metricIconAccent]}>
        <AppIcon name={icon} size={18} color={accent ? '#FFFFFF' : colors.brand.orange} />
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
  rowPress: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginTop: 10,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  pressed: { opacity: 0.88 },
  row: {
    minHeight: 72,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBadge: {
    width: 42,
    height: 42,
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
    marginTop: 18,
    marginBottom: 4,
    paddingHorizontal: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sectionAction: {
    color: colors.brand.orange,
    fontSize: 14,
    fontWeight: '600',
  },
  metric: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    minHeight: 118,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  metricAccent: {
    backgroundColor: colors.brand.orange,
  },
  metricIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(238,125,49,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  metricIconAccent: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  metricValue: {
    color: '#0F172A',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  metricValueAccent: { color: '#FFFFFF' },
  metricLabel: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  metricLabelAccent: { color: 'rgba(255,255,255,0.95)' },
  metricHint: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 4,
  },
  metricHintAccent: { color: 'rgba(255,255,255,0.8)' },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  empty: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(238,125,49,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    color: '#0F172A',
    fontSize: 16,
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
});
