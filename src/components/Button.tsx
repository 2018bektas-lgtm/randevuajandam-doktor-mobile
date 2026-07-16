import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { colors, radius, spacing, typography } from '../theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

type Props = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  style?: ViewStyle;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Marka bileşen kütüphanesinin temel aksiyon butonu.
 * Basınca hafif küçülme (spring) animasyonu içerir.
 */
export function Button({ label, onPress, variant = 'primary', disabled, loading, icon, style }: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const isDisabled = disabled || loading;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPressIn={() => {
        scale.value = withSpring(0.97, { damping: 16, stiffness: 220 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 14, stiffness: 200 });
      }}
      onPress={onPress}
      style={[
        styles.base,
        variantStyles[variant],
        isDisabled && styles.disabled,
        animatedStyle,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.white : colors.brand.orangeDark} />
      ) : (
        <>
          {icon}
          <Text style={[styles.label, textVariantStyles[variant]]}>{label}</Text>
        </>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    paddingHorizontal: spacing['2xl'],
  },
  disabled: {
    opacity: 0.6,
  },
  label: {
    ...typography.preset.button,
  },
});

const variantStyles: Record<ButtonVariant, ViewStyle> = {
  primary: { backgroundColor: colors.brand.orangeDark },
  secondary: { backgroundColor: colors.navy[800], borderWidth: 1, borderColor: colors.navy.border },
  ghost: { backgroundColor: 'transparent' },
};

const textVariantStyles: Record<ButtonVariant, { color: string }> = {
  primary: { color: colors.white },
  secondary: { color: colors.white },
  ghost: { color: colors.brand.orangeDark },
};
