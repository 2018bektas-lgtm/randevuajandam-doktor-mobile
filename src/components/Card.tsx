import { ReactNode } from 'react';
import { View, ViewStyle } from 'react-native';
import { colors, radius, shadow, spacing } from '../theme';

type Props = {
  children: ReactNode;
  style?: ViewStyle;
  padded?: boolean;
  elevated?: boolean;
};

/** Native surface card — soft elevation, no hard web border. */
export function Card({ children, style, padded = true, elevated = true }: Props) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.background.card,
          borderRadius: radius.lg,
          padding: padded ? spacing.lg : 0,
          borderWidth: 0,
          borderColor: 'transparent',
        },
        elevated && shadow.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}
