import { useEffect, useMemo, useState } from 'react';
import { Dimensions, Platform, StatusBar as RNStatusBar } from 'react-native';
import { layoutMetrics, type LayoutMetrics } from './responsive';

/**
 * Safe-area estimates using BOTH width and height
 * (notch, Dynamic Island, gesture bar, short SE frames).
 */
function estimateInsets(width: number, height: number) {
  if (Platform.OS === 'android') {
    const status = RNStatusBar.currentHeight ?? 24;
    // Short phones often use 3-button nav (taller); tall phones gesture bar
    const bottom = height < 700 ? 16 : height > 850 ? 22 : 18;
    return { top: status, bottom, left: 0, right: 0 };
  }

  // iOS portrait
  // SE / mini-like short: no home indicator
  if (height < 700) {
    return { top: 20, bottom: 0, left: 0, right: 0 };
  }
  // Classic notch (~812–896)
  if (height < 900) {
    return { top: 47, bottom: 34, left: 0, right: 0 };
  }
  // Dynamic Island / Pro Max class
  return { top: 54, bottom: 34, left: 0, right: 0 };
}

/** Live metrics; recompute on rotate, fold, split-screen (width AND height). */
export function useLayout(): LayoutMetrics {
  const [dims, setDims] = useState(() => Dimensions.get('window'));

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setDims(window);
    });
    return () => sub.remove();
  }, []);

  return useMemo(() => {
    const insets = estimateInsets(dims.width, dims.height);
    return layoutMetrics(insets, { width: dims.width, height: dims.height });
  }, [dims.width, dims.height]);
}
