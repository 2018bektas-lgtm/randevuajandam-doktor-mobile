import { useEffect, useMemo, useState } from 'react';
import { Dimensions, Platform, StatusBar as RNStatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { layoutMetrics, type LayoutMetrics } from './responsive';

/**
 * Android 3-button navigation bar is typically ~48dp.
 * Gesture bar is smaller; system insets may report 0 on some ROMs / edge-to-edge.
 * Always keep a usable minimum so CTAs & bottom tabs stay above the system nav.
 */
const ANDROID_NAV_MIN = 48;
const ANDROID_NAV_FALLBACK = 56;

/**
 * Fallback estimates when SafeAreaProvider has not measured yet.
 */
function estimateInsets(width: number, height: number) {
  if (Platform.OS === 'android') {
    const status = RNStatusBar.currentHeight ?? 24;
    // Prefer taller bottom for 3-button nav (common on many Androids)
    const bottom = height < 700 ? ANDROID_NAV_FALLBACK : ANDROID_NAV_MIN + 8;
    return { top: status, bottom, left: 0, right: 0 };
  }

  // iOS portrait
  if (height < 700) {
    return { top: 20, bottom: 0, left: 0, right: 0 };
  }
  if (height < 900) {
    return { top: 47, bottom: 34, left: 0, right: 0 };
  }
  return { top: 54, bottom: 34, left: 0, right: 0 };
}

function normalizeInsets(
  raw: { top: number; bottom: number; left: number; right: number },
  height: number,
) {
  let top = raw.top;
  let bottom = raw.bottom;

  if (Platform.OS === 'android') {
    // Status bar
    if (top <= 0) {
      top = RNStatusBar.currentHeight ?? 24;
    }
    // System bottom inset may be 0 with edge-to-edge or misreported —
    // never go below 3-button nav height on Android.
    const minBottom = height < 700 ? ANDROID_NAV_FALLBACK : ANDROID_NAV_MIN;
    bottom = Math.max(bottom, minBottom);
  }

  return {
    top,
    bottom,
    left: raw.left || 0,
    right: raw.right || 0,
  };
}

/** Live metrics; recompute on rotate + real safe-area insets. */
export function useLayout(): LayoutMetrics {
  const safe = useSafeAreaInsets();
  const [dims, setDims] = useState(() => Dimensions.get('window'));

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setDims(window);
    });
    return () => sub.remove();
  }, []);

  return useMemo(() => {
    const estimated = estimateInsets(dims.width, dims.height);
    // Prefer real insets from SafeAreaProvider; fill zeros with estimates
    const merged = {
      top: safe.top > 0 ? safe.top : estimated.top,
      bottom: safe.bottom > 0 ? safe.bottom : estimated.bottom,
      left: safe.left || 0,
      right: safe.right || 0,
    };
    const insets = normalizeInsets(merged, dims.height);
    return layoutMetrics(insets, { width: dims.width, height: dims.height });
  }, [dims.width, dims.height, safe.top, safe.bottom, safe.left, safe.right]);
}
