/**
 * Native-first light palette (iOS grouped + Material soft surface).
 * Less “marketing website”, more system app.
 */
export const colors = {
  background: {
    /** Grouped list canvas */
    primary: '#F2F4F7',
    deep: '#E8ECF1',
    surface: '#F7F8FA',
    card: '#FFFFFF',
    inputSurface: '#FFFFFF',
    elevated: '#FFFFFF',
  },
  navy: {
    900: '#0F172A',
    800: '#F1F5F9',
    700: '#E2E8F0',
    600: '#CBD5E1',
    500: '#94A3B8',
    border: 'rgba(15,23,42,0.08)',
  },
  brand: {
    orange: '#EE7D31',
    orangeDark: '#E06620',
    orangeDeep: '#C95716',
    orangeGlow: '#F0782C',
    orangeSoft: '#D9772A',
    orangeLight: '#F5A46A',
  },
  status: {
    success: '#1F9D55',
    successBg: '#E6F6ED',
    warning: '#B45309',
    warningBg: '#FFF7ED',
    warningDot: '#E97029',
    error: '#DC2626',
    errorBg: '#FEF2F2',
  },
  text: {
    onDark: '#FFFFFF',
    onDarkMuted: '#E2E8F0',
    onDarkSubtle: '#94A3B8',
    heading: '#0F172A',
    body: '#334155',
    muted: '#64748B',
    mutedLight: '#94A3B8',
    link: '#D9772A',
  },
  border: {
    input: 'rgba(15,23,42,0.1)',
    soft: 'rgba(15,23,42,0.06)',
    hairline: 'rgba(15,23,42,0.08)',
  },
  white: '#FFFFFF',
  black: '#000000',
} as const;

export type ThemeColors = typeof colors;
