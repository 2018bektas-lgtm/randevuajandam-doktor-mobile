/**
 * Randevu Ajandam Doktor — açık (light) tema paleti.
 * Sayfa: soft gri-mavi · kart: beyaz · vurgu: marka turuncu · metin: lacivert gri.
 */
export const colors = {
  background: {
    /** Ana ekran zemin */
    primary: '#F4F6F9',
    /** Daha koyu paneller / alt katman */
    deep: '#EEF1F6',
    /** İçerik şeridi */
    surface: '#F7F8FC',
    /** Kart / sheet */
    card: '#FFFFFF',
    /** Input içi */
    inputSurface: '#FFFFFF',
  },
  navy: {
    /** Başlık / güçlü metin */
    900: '#102133',
    /** İkincil yüzey (chip, soft panel) */
    800: '#F1F5F9',
    700: '#E2E8F0',
    600: '#CBD5E1',
    500: '#94A3B8',
    border: '#E1E6ED',
  },
  brand: {
    orange: '#EE7D31',
    orangeDark: '#E66D25',
    orangeDeep: '#D85F18',
    orangeGlow: '#F0782C',
    orangeSoft: '#C96A2B',
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
    onDarkMuted: '#E2E8F0',
    onDarkSubtle: '#94A3B8',
    heading: '#102133',
    body: '#39495B',
    muted: '#6D7D8E',
    mutedLight: '#95A2B5',
    link: '#C96A2B',
  },
  border: {
    input: '#E1E6ED',
    soft: '#E8EDF3',
  },
  white: '#FFFFFF',
  black: '#000000',
} as const;

export type ThemeColors = typeof colors;
