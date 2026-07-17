/**
 * Responsive layout for all phone sizes — WIDTH + HEIGHT.
 * Short SE-like phones, tall Pro Max / Android 20:9, tablets.
 */
import { Dimensions, PixelRatio, Platform, StatusBar as RNStatusBar } from 'react-native';

export type Insets = { top: number; bottom: number; left: number; right: number };

/** Width bucket */
export type WidthCategory = 'xs' | 'sm' | 'md' | 'lg';
/** Height bucket — independent from width */
export type HeightCategory = 'compact' | 'regular' | 'tall' | 'xtall';

const FALLBACK_TOP =
  Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 24) : 44;
const FALLBACK_BOTTOM = Platform.OS === 'ios' ? 28 : 16;

/** Design reference: iPhone 12/13/14 logical */
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

/**
 * Height categories (logical px):
 * - compact: SE / small Android (~640–700) — squeeze vertical chrome
 * - regular: common mid phones (~700–820)
 * - tall: modern 19.5:9+ (~820–920)
 * - xtall: Pro Max / large Android (920+)
 */
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

/** Horizontal scale from width, clamped. */
export function scale(size: number, width: number): number {
  const ratio = width / BASE_W;
  const clamped = Math.min(1.18, Math.max(0.82, ratio));
  return Math.round(PixelRatio.roundToNearestPixel(size * clamped));
}

/** Vertical scale from height, clamped tighter on short phones. */
export function scaleVertical(size: number, height: number): number {
  const ratio = height / BASE_H;
  const clamped = Math.min(1.2, Math.max(0.72, ratio));
  return Math.round(PixelRatio.roundToNearestPixel(size * clamped));
}

/**
 * Font scale blends width + height so short-wide phones don't get huge titles
 * and tall-narrow phones don't get cramped type.
 */
export function scaleFont(size: number, width: number, height: number): number {
  const w = Math.min(1.16, Math.max(0.84, width / BASE_W));
  const h = Math.min(1.12, Math.max(0.8, height / BASE_H));
  // Prefer height a bit for titles; balanced for body
  const blended = w * 0.45 + h * 0.55;
  return Math.round(PixelRatio.roundToNearestPixel(size * blended));
}

export function safeTop(insets?: Partial<Insets> | null): number {
  const t = insets?.top;
  if (typeof t === 'number' && t > 0) {
    return t + (Platform.OS === 'ios' ? 4 : 6);
  }
  return FALLBACK_TOP + 8;
}

export function safeBottom(insets?: Partial<Insets> | null): number {
  const b = insets?.bottom;
  if (typeof b === 'number' && b > 0) {
    return Math.max(b, Platform.OS === 'ios' ? 16 : 12);
  }
  return FALLBACK_BOTTOM;
}

export function pagePadX(width: number): number {
  const cat = getWidthCategory(width);
  if (cat === 'xs') return 14;
  if (cat === 'sm') return 18;
  if (cat === 'lg') return 28;
  return 20;
}

/** Vertical content padding — shrinks on short, opens on tall */
export function pagePadY(height: number): number {
  const cat = getHeightCategory(height);
  if (cat === 'compact') return 8;
  if (cat === 'regular') return 12;
  if (cat === 'tall') return 16;
  return 20;
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

  // Vertical rhythm — tighter on compact, airy on xtall
  const space = {
    xs: heightCat === 'compact' ? 4 : heightCat === 'xtall' ? 8 : 6,
    sm: heightCat === 'compact' ? 8 : heightCat === 'xtall' ? 14 : 10,
    md: heightCat === 'compact' ? 12 : heightCat === 'xtall' ? 20 : 16,
    lg: heightCat === 'compact' ? 16 : heightCat === 'xtall' ? 28 : 22,
    xl: heightCat === 'compact' ? 22 : heightCat === 'xtall' ? 40 : 30,
  };

  const heroBase =
    heightCat === 'compact' ? 26 : heightCat === 'regular' ? 30 : heightCat === 'tall' ? 34 : 36;
  const titleBase =
    heightCat === 'compact' ? 22 : heightCat === 'regular' ? 26 : heightCat === 'tall' ? 28 : 30;

  const artH =
    heightCat === 'compact'
      ? Math.round(height * 0.18)
      : heightCat === 'regular'
        ? Math.round(height * 0.22)
        : heightCat === 'tall'
          ? Math.round(height * 0.24)
          : Math.round(height * 0.26);

  const choiceMinH =
    heightCat === 'compact' ? 48 : heightCat === 'regular' ? 56 : heightCat === 'tall' ? 60 : 64;

  const btnH =
    heightCat === 'compact' ? 46 : heightCat === 'regular' ? 50 : heightCat === 'tall' ? 54 : 56;

  const contentTop =
    heightCat === 'compact' ? 4 : heightCat === 'regular' ? 10 : heightCat === 'tall' ? 14 : 18;

  const scrollBottom = sBottom + (compact ? 56 : tall ? 80 : 68);
  const bottomNav = (compact ? 52 : 60) + sBottom;
  const headerBlock = sTop + (compact ? 48 : 56);

  return {
    width,
    height,
    /** @deprecated use widthCat */
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
    scrollBottom,
    bottomNav,
    headerMin: headerBlock,
    /** Onboarding / hero illustration max height */
    artH: Math.max(120, Math.min(artH, 260)),
    /** Ambient gradient band */
    ambientH: Math.round(height * (compact ? 0.32 : tall ? 0.44 : 0.38)),
    choiceMinH,
    choiceGap: compact ? 8 : tall ? 12 : 10,
    font: {
      xs: scaleFont(11, width, height),
      sm: scaleFont(13, width, height),
      md: scaleFont(15, width, height),
      lg: scaleFont(17, width, height),
      xl: scaleFont(20, width, height),
      title: scaleFont(titleBase, width, height),
      hero: scaleFont(heroBase, width, height),
    },
    /** Title line height ≈ 1.12–1.2 of hero */
    heroLineHeight: Math.round(scaleFont(heroBase, width, height) * (compact ? 1.12 : 1.18)),
    bodyLineHeight: Math.round(scaleFont(15, width, height) * 1.45),
    space,
    btnHeight: btnH,
    radius: scale(compact ? 14 : 16, width),
    /** scale helpers bound to this window */
    scale: (n: number) => scale(n, width),
    scaleV: (n: number) => scaleVertical(n, height),
    scaleF: (n: number) => scaleFont(n, width, height),
  };
}

export type LayoutMetrics = ReturnType<typeof layoutMetrics>;

// Back-compat wrappers (optional call sites)
export function scrollBottomClearance(insets?: Partial<Insets> | null): number {
  return layoutMetrics(insets).scrollBottom;
}

export function bottomNavHeight(insets?: Partial<Insets> | null): number {
  return layoutMetrics(insets).bottomNav;
}

export function headerMinHeight(insets?: Partial<Insets> | null): number {
  return layoutMetrics(insets).headerMin;
}
