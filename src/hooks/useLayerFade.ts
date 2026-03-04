import { useCallback, useEffect, useRef, useState } from "react";

import type { RegionFeature } from "../types";

interface ExitingLayerState {
  features: RegionFeature[];
  clipPathData: string | null;
  opacity: number;
}

interface UseLayerFadeResult {
  exitingLayer: ExitingLayerState | null;
  snapshotAndFadeCurrentLayer: (
    features: RegionFeature[],
    clipPathData: string | null,
  ) => void;
}

const FADE_DURATION_MS = 260;

export function useLayerFade(): UseLayerFadeResult {
  const [exitingLayer, setExitingLayer] = useState<ExitingLayerState | null>(
    null,
  );
  const fadeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (fadeTimerRef.current != null) {
        window.clearTimeout(fadeTimerRef.current);
        fadeTimerRef.current = null;
      }
    };
  }, []);

  const snapshotAndFadeCurrentLayer = useCallback(
    (features: RegionFeature[], clipPathData: string | null) => {
      if (features.length === 0) return;

      setExitingLayer({
        features,
        clipPathData,
        opacity: 1,
      });

      requestAnimationFrame(() => {
        setExitingLayer((previous) => {
          if (!previous) return previous;
          return { ...previous, opacity: 0 };
        });
      });

      if (fadeTimerRef.current != null) {
        window.clearTimeout(fadeTimerRef.current);
      }

      fadeTimerRef.current = window.setTimeout(() => {
        setExitingLayer(null);
        fadeTimerRef.current = null;
      }, FADE_DURATION_MS);
    },
    [],
  );

  return { exitingLayer, snapshotAndFadeCurrentLayer };
}
