import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors, radius, spacing, typography } from '../theme';

type Props = TextInputProps & {
  label: string;
  secureToggle?: boolean;
};

/** Kompakt etiketli metin girişi — 42px yükseklik. */
export function TextField({ label, secureToggle, secureTextEntry, style, ...inputProps }: Props) {
  const focus = useSharedValue(0);
  const [isSecureVisible, setIsSecureVisible] = useState(false);

  const animatedBorderStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focus.value, [0, 1], [colors.border.input, colors.brand.orangeDark]),
  }));

  const isSecure = secureToggle ? !isSecureVisible : secureTextEntry;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Animated.View style={[styles.wrap, animatedBorderStyle]}>
        <TextInput
          placeholderTextColor={colors.text.mutedLight}
          secureTextEntry={isSecure}
          style={[styles.input, style]}
          onFocus={(e) => {
            focus.value = withTiming(1, { duration: 160 });
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            focus.value = withTiming(0, { duration: 160 });
            inputProps.onBlur?.(e);
          }}
          {...inputProps}
        />
        {secureToggle ? (
          <Pressable
            accessibilityLabel={isSecureVisible ? 'Şifreyi gizle' : 'Şifreyi göster'}
            hitSlop={10}
            onPress={() => setIsSecureVisible((visible) => !visible)}
          >
            <Text style={styles.toggle}>{isSecureVisible ? 'Gizle' : 'Göster'}</Text>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.md },
  label: {
    ...typography.preset.label,
    color: colors.text.muted,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 5,
  },
  wrap: {
    height: 42,
    borderWidth: 1,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.inputSurface,
    paddingHorizontal: spacing.lg,
    borderColor: colors.border.input,
  },
  input: {
    flex: 1,
    height: '100%',
    color: colors.text.heading,
    fontSize: 14,
    paddingVertical: 0,
  },
  toggle: {
    color: colors.brand.orangeDeep,
    fontSize: 12,
    fontWeight: '700',
    paddingLeft: spacing.sm,
  },
});
