import { ReactNode } from 'react';
import { View, ViewStyle } from 'react-native';
import { colors, radius, shadow, spacing } from '../theme';

type Props = {
  children: ReactNode;
  style?: ViewStyle;
  padded?: boolean;
  elevated?: boolean;
};

/** Beyaz zemin üzerine oturan, yumuşak gölgeli standart kart yüzeyi. */
export function Card({ children, style, padded = true, elevated = true }: Props) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.background.card,
          borderRadius: radius['2xl'],
          padding: padded ? spacing['2xl'] : 0,
        },
        elevated && shadow.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}
