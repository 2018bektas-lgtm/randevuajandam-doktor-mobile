import { TextStyle } from 'react-native';
import { colors } from './colors';

const fontFamily = {
  base: undefined, // sistem fontu (San Francisco / Roboto)
};

export const typography = {
  fontFamily,
  weight: {
    regular: '400' as TextStyle['fontWeight'],
    medium: '600' as TextStyle['fontWeight'],
    bold: '700' as TextStyle['fontWeight'],
    extraBold: '800' as TextStyle['fontWeight'],
    black: '900' as TextStyle['fontWeight'],
  },
  // Hazır metin stilleri — ekranlar arasında tutarlılık için doğrudan kullan.
  preset: {
    display: {
      fontSize: 34,
      lineHeight: 40,
      fontWeight: '800',
      letterSpacing: -1.1,
      color: colors.text.onDark,
    } as TextStyle,
    h1: {
      fontSize: 28,
      lineHeight: 34,
      fontWeight: '800',
      letterSpacing: -0.9,
      color: colors.text.heading,
    } as TextStyle,
    h2: {
      fontSize: 21,
      lineHeight: 27,
      fontWeight: '800',
      letterSpacing: -0.5,
      color: colors.text.heading,
    } as TextStyle,
    h3: {
      fontSize: 17,
      lineHeight: 23,
      fontWeight: '800',
      color: colors.text.heading,
    } as TextStyle,
    body: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '400',
      color: colors.text.body,
    } as TextStyle,
    bodyMuted: {
      fontSize: 14,
      lineHeight: 21,
      fontWeight: '400',
      color: colors.text.muted,
    } as TextStyle,
    label: {
      fontSize: 13,
      lineHeight: 17,
      fontWeight: '700',
      color: colors.text.body,
    } as TextStyle,
    eyebrow: {
      fontSize: 11,
      lineHeight: 14,
      fontWeight: '800',
      letterSpacing: 1.7,
      color: colors.brand.orangeSoft,
    } as TextStyle,
    caption: {
      fontSize: 12,
      lineHeight: 18,
      fontWeight: '400',
      color: colors.text.onDarkSubtle,
    } as TextStyle,
    button: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.white,
      letterSpacing: -0.1,
    } as TextStyle,
  },
} as const;
