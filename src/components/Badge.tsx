import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

type BadgeVariant = 'warning' | 'success' | 'error';

type Props = {
  label: string;
  variant?: BadgeVariant;
};

const variantMap: Record<BadgeVariant, { bg: string; dot: string; text: string }> = {
  warning: { bg: colors.status.warningBg, dot: colors.status.warningDot, text: colors.status.warning },
  success: { bg: colors.status.successBg, dot: colors.status.success, text: colors.status.success },
  error: { bg: colors.status.errorBg, dot: colors.status.error, text: colors.status.error },
};

/** Küçük durum hapı. */
export function Badge({ label, variant = 'warning' }: Props) {
  const tone = variantMap[variant];
  return (
    <View style={[styles.wrap, { backgroundColor: tone.bg }]}>
      <View style={[styles.dot, { backgroundColor: tone.dot }]} />
      <Text style={[styles.text, { color: tone.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  text: { fontSize: 10, fontWeight: '700' },
});
