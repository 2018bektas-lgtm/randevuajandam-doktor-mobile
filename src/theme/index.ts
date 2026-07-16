import { colors } from './colors';
import { radius, shadow, spacing } from './spacing';
import { typography } from './typography';

export const theme = {
  colors,
  spacing,
  radius,
  shadow,
  typography,
} as const;

export type Theme = typeof theme;

export { colors, radius, shadow, spacing, typography };
