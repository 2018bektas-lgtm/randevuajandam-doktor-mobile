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

/** Randevu/durum etiketleri için nokta + metin içeren küçük hap (pill). */
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
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 11, fontWeight: '800' },
});
