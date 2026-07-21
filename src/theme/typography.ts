import { TextStyle } from 'react-native';
import { colors } from './colors';

const fontFamily = {
  base: undefined, // sistem fontu (San Francisco / Roboto)
};

/**
 * Premium kompakt tipografi — büyük display yok.
 * Referans: modern SaaS mobil paneller (14 body / 17–20 başlık).
 */
export const typography = {
  fontFamily,
  weight: {
    regular: '400' as TextStyle['fontWeight'],
    medium: '600' as TextStyle['fontWeight'],
    bold: '700' as TextStyle['fontWeight'],
    extraBold: '800' as TextStyle['fontWeight'],
    black: '900' as TextStyle['fontWeight'],
  },
  preset: {
    display: {
      fontSize: 24,
      lineHeight: 30,
      fontWeight: '800',
      letterSpacing: -0.6,
      color: colors.text.heading,
    } as TextStyle,
    h1: {
      fontSize: 20,
      lineHeight: 26,
      fontWeight: '800',
      letterSpacing: -0.4,
      color: colors.text.heading,
    } as TextStyle,
    h2: {
      fontSize: 16,
      lineHeight: 22,
      fontWeight: '700',
      letterSpacing: -0.2,
      color: colors.text.heading,
    } as TextStyle,
    h3: {
      fontSize: 14,
      lineHeight: 19,
      fontWeight: '700',
      color: colors.text.heading,
    } as TextStyle,
    body: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '400',
      color: colors.text.body,
    } as TextStyle,
    bodyMuted: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '400',
      color: colors.text.muted,
    } as TextStyle,
    label: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '600',
      color: colors.text.body,
    } as TextStyle,
    eyebrow: {
      fontSize: 10,
      lineHeight: 13,
      fontWeight: '700',
      letterSpacing: 1.1,
      color: colors.brand.orangeSoft,
    } as TextStyle,
    caption: {
      fontSize: 11,
      lineHeight: 15,
      fontWeight: '400',
      color: colors.text.muted,
    } as TextStyle,
    button: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.white,
      letterSpacing: -0.1,
    } as TextStyle,
  },
} as const;
