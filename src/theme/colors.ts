/**
 * Randevu Ajandam Doktor — renk paleti.
 * Değerler App.tsx'teki mevcut marka renklerinden (lacivert + turuncu) türetildi.
 */
export const colors = {
  background: {
    primary: '#0D1B2A',
    deep: '#07121F',
    surface: '#F7F8FC',
    card: '#FFFFFF',
    inputSurface: '#FBFCFD',
  },
  navy: {
    900: '#0D1B2A',
    800: '#14283B',
    700: '#1D3C56',
    600: '#29445D',
    500: '#32506A',
    border: '#2B4055',
  },
  brand: {
    orange: '#EE7D31',
    orangeDark: '#E66D25',
    orangeDeep: '#D85F18',
    orangeGlow: '#F0782C',
    orangeSoft: '#F3A26B',
    orangeLight: '#F59A5F',
  },
  status: {
    success: '#2E9E5B',
    successBg: '#E8F7EE',
    warning: '#BA5015',
    warningBg: '#FFF1E9',
    warningDot: '#E97029',
    error: '#C13C2C',
    errorBg: '#FBE9E7',
  },
  text: {
    onDark: '#FFFFFF',
    onDarkMuted: '#B7C4D3',
    onDarkSubtle: '#7F8C9B',
    heading: '#102133',
    body: '#39495B',
    muted: '#6D7D8E',
    mutedLight: '#95A2B5',
    link: '#53667A',
  },
  border: {
    input: '#E1E6ED',
  },
  white: '#FFFFFF',
  black: '#000000',
} as const;

export type ThemeColors = typeof colors;
