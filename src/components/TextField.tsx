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

/**
 * Etiketli metin girişi. Odaklanınca kenarlık rengi turuncuya doğru
 * yumuşak bir geçişle (timing) animasyonlanır.
 */
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
            focus.value = withTiming(1, { duration: 180 });
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            focus.value = withTiming(0, { duration: 180 });
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
  container: { marginBottom: spacing.lg },
  label: { ...typography.preset.label, marginBottom: spacing.sm },
  wrap: {
    height: 54,
    borderWidth: 1,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.inputSurface,
    paddingHorizontal: spacing.lg,
  },
  input: {
    flex: 1,
    height: '100%',
    color: colors.text.heading,
    fontSize: 16,
  },
  toggle: {
    color: colors.brand.orangeDeep,
    fontSize: 13,
    fontWeight: '800',
    paddingLeft: spacing.sm,
  },
});
