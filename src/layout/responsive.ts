/**
 * Responsive layout — WIDTH + HEIGHT, premium kompakt ölçek.
 * Font/boşluk büyümesi sınırlı; büyük ekranlarda "kocaman" görünmez.
 */
import { Dimensions, PixelRatio, Platform, StatusBar as RNStatusBar } from 'react-native';

export type Insets = { top: number; bottom: number; left: number; right: number };

export type WidthCategory = 'xs' | 'sm' | 'md' | 'lg';
export type HeightCategory = 'compact' | 'regular' | 'tall' | 'xtall';

const FALLBACK_TOP =
  Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 24) : 44;
const FALLBACK_BOTTOM = Platform.OS === 'ios' ? 22 : 40;

const BASE_W = 390;
const BASE_H = 844;

export function getWindow() {
  return Dimensions.get('window');
}

export function getWidthCategory(width: number): WidthCategory {
  if (width < 360) return 'xs';
  if (width < 400) return 'sm';
  if (width < 768) return 'md';
  return 'lg';
}

export function getHeightCategory(height: number): HeightCategory {
  if (height < 700) return 'compact';
  if (height < 820) return 'regular';
  if (height < 920) return 'tall';
  return 'xtall';
}

export function isShortScreen(height: number): boolean {
  return height < 700;
}

export function isTallScreen(height: number): boolean {
  return height >= 860;
}

export function isTinyScreen(width: number, height: number): boolean {
  return width < 360 || height < 640;
}

/** Yatay ölçek — dar aralık, şişme yok */
export function scale(size: number, width: number): number {
  const ratio = width / BASE_W;
  const clamped = Math.min(1.06, Math.max(0.88, ratio));
  return Math.round(PixelRatio.roundToNearestPixel(size * clamped));
}

export function scaleVertical(size: number, height: number): number {
  const ratio = height / BASE_H;
  const clamped = Math.min(1.08, Math.max(0.8, ratio));
  return Math.round(PixelRatio.roundToNearestPixel(size * clamped));
}

/** Font ölçeği — neredeyse sabit, hafif dar/geniş uyumu */
export function scaleFont(size: number, width: number, height: number): number {
  const w = Math.min(1.05, Math.max(0.9, width / BASE_W));
  const h = Math.min(1.04, Math.max(0.9, height / BASE_H));
  const blended = w * 0.5 + h * 0.5;
  return Math.round(PixelRatio.roundToNearestPixel(size * blended));
}

export function safeTop(insets?: Partial<Insets> | null): number {
  const t = insets?.top;
  if (typeof t === 'number' && t > 0) {
    return t + (Platform.OS === 'ios' ? 2 : 4);
  }
  return FALLBACK_TOP + 4;
}

export function safeBottom(insets?: Partial<Insets> | null): number {
  const b = insets?.bottom;
  if (typeof b === 'number' && b > 0) {
    return Math.max(b, Platform.OS === 'ios' ? 12 : 36);
  }
  return FALLBACK_BOTTOM;
}

export function pagePadX(width: number): number {
  const cat = getWidthCategory(width);
  if (cat === 'xs') return 12;
  if (cat === 'sm') return 14;
  if (cat === 'lg') return 20;
  return 16;
}

export function pagePadY(height: number): number {
  const cat = getHeightCategory(height);
  if (cat === 'compact') return 6;
  if (cat === 'regular') return 8;
  if (cat === 'tall') return 10;
  return 12;
}

export function layoutMetrics(
  insets?: Partial<Insets> | null,
  window?: { width: number; height: number },
) {
  const { width, height } = window ?? getWindow();
  const widthCat = getWidthCategory(width);
  const heightCat = getHeightCategory(height);
  const short = isShortScreen(height);
  const tall = isTallScreen(height);
  const tiny = isTinyScreen(width, height);
  const compact = heightCat === 'compact' || tiny;

  const padX = pagePadX(width);
  const padY = pagePadY(height);
  const sTop = safeTop(insets);
  const sBottom = safeBottom(insets);

  const space = {
    xs: 4,
    sm: 6,
    md: 10,
    lg: 14,
    xl: compact ? 16 : 18,
  };

  const heroBase = compact ? 20 : 22;
  const titleBase = compact ? 17 : 18;

  const artH = Math.round(height * (compact ? 0.16 : tall ? 0.2 : 0.18));

  const choiceMinH = compact ? 42 : 46;
  const btnH = compact ? 42 : 44;

  const contentTop = compact ? 2 : 6;

  const footerExtra = Platform.OS === 'android' ? (compact ? 6 : 8) : 2;
  const scrollBottom = sBottom + (compact ? 56 : 64) + footerExtra;
  const bottomNav = (compact ? 48 : 52) + sBottom + footerExtra;
  const headerBlock = sTop + (compact ? 40 : 44);
  const footerPad = sBottom + footerExtra;

  return {
    width,
    height,
    category: widthCat,
    widthCat,
    heightCat,
    short,
    tall,
    compact,
    tiny,
    padX,
    padY,
    contentTop,
    safeTop: sTop,
    safeBottom: sBottom,
    footerPad,
    scrollBottom,
    bottomNav,
    headerMin: headerBlock,
    artH: Math.max(100, Math.min(artH, 180)),
    ambientH: Math.round(height * (compact ? 0.28 : 0.34)),
    choiceMinH,
    choiceGap: compact ? 6 : 8,
    font: {
      xs: scaleFont(10, width, height),
      sm: scaleFont(12, width, height),
      md: scaleFont(13, width, height),
      lg: scaleFont(15, width, height),
      xl: scaleFont(17, width, height),
      title: scaleFont(titleBase, width, height),
      hero: scaleFont(heroBase, width, height),
    },
    heroLineHeight: Math.round(scaleFont(heroBase, width, height) * 1.2),
    bodyLineHeight: Math.round(scaleFont(13, width, height) * 1.4),
    space,
    btnHeight: btnH,
    radius: scale(12, width),
    scale: (n: number) => scale(n, width),
    scaleV: (n: number) => scaleVertical(n, height),
    scaleF: (n: number) => scaleFont(n, width, height),
  };
}

export type LayoutMetrics = ReturnType<typeof layoutMetrics>;

export function scrollBottomClearance(insets?: Partial<Insets> | null): number {
  return layoutMetrics(insets).scrollBottom;
}

export function bottomNavHeight(insets?: Partial<Insets> | null): number {
  return layoutMetrics(insets).bottomNav;
}

export function headerMinHeight(insets?: Partial<Insets> | null): number {
  return layoutMetrics(insets).headerMin;
}
