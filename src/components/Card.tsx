import { ReactNode } from 'react';
import { View, ViewStyle } from 'react-native';
import { colors, radius, shadow, spacing } from '../theme';

type Props = {
  children: ReactNode;
  style?: ViewStyle;
  padded?: boolean;
  elevated?: boolean;
};

/** Beyaz kart — ince kenarlık, hafif gölge, sıkı padding. */
export function Card({ children, style, padded = true, elevated = true }: Props) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.background.card,
          borderRadius: radius.lg,
          padding: padded ? spacing.lg : 0,
          borderWidth: 1,
          borderColor: colors.border.input,
        },
        elevated && shadow.soft,
        style,
      ]}
    >
      {children}
    </View>
  );
}
