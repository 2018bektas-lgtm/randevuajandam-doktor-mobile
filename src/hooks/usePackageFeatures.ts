import { useCallback, useEffect, useState } from 'react';
import type { ScreenId } from '../navigation/types';
import {
  clearPackageFeaturesCache,
  ensureFeature,
  ensureScreen,
  getCachedPackageFeatures,
  hasAnyFeature,
  isScreenLocked,
  loadPackageFeatures,
  type PackageFeaturesData,
  subscribePackageFeatures,
} from '../services/packageFeatures';

export function usePackageFeatures() {
  const [data, setData] = useState<PackageFeaturesData>(
    () => getCachedPackageFeatures() ?? {
      features: [],
      restrict: true,
      paketAd: null,
      paketId: null,
    },
  );
  const [loading, setLoading] = useState(!getCachedPackageFeatures());

  useEffect(() => {
    const unsub = subscribePackageFeatures(setData);
    setLoading(true);
    void loadPackageFeatures().finally(() => setLoading(false));
    return unsub;
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      return await loadPackageFeatures(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const can = useCallback(
    (codes: string | string[] | null | undefined) =>
      hasAnyFeature(data.features, codes, data.restrict),
    [data.features, data.restrict],
  );

  const screenLocked = useCallback(
    (screen: ScreenId) => isScreenLocked(screen, data),
    [data],
  );

  const requireFeature = useCallback(
    (codes: string | string[] | null | undefined, onGoPackages?: () => void) =>
      ensureFeature(data, codes, onGoPackages),
    [data],
  );

  const requireScreen = useCallback(
    (screen: ScreenId, onGoPackages?: () => void) =>
      ensureScreen(screen, data, onGoPackages),
    [data],
  );

  return {
    ...data,
    loading,
    refresh,
    can,
    screenLocked,
    requireFeature,
    requireScreen,
    clear: clearPackageFeaturesCache,
  };
}
