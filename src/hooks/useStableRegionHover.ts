import { useCallback, useEffect, useRef, useState } from "react";

import type { RegionFeature } from "../types";
import type { RegionId } from "../types/domain";

interface UseStableRegionHoverParams {
  onRegionHover?: (feature: RegionFeature | null) => void;
}

interface UseStableRegionHoverResult {
  hoveredId: RegionId | null;
  handleHover: (feature: RegionFeature | null) => void;
}

export function useStableRegionHover({
  onRegionHover,
}: UseStableRegionHoverParams): UseStableRegionHoverResult {
  const [hoveredId, setHoveredId] = useState<RegionId | null>(null);
  const hoverClearTimerRef = useRef<number | null>(null);
  const hoverClearFrameRef = useRef<number | null>(null);
  const lastNotifiedHoverIdRef = useRef<RegionId | null>(null);

  const cancelPendingHoverClear = useCallback(() => {
    if (hoverClearTimerRef.current != null) {
      window.clearTimeout(hoverClearTimerRef.current);
      hoverClearTimerRef.current = null;
    }

    if (hoverClearFrameRef.current != null) {
      cancelAnimationFrame(hoverClearFrameRef.current);
      hoverClearFrameRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cancelPendingHoverClear();
    };
  }, [cancelPendingHoverClear]);

  const emitHoverCallback = useCallback(
    (feature: RegionFeature | null) => {
      const nextId = feature?.properties.__id ?? null;
      if (lastNotifiedHoverIdRef.current === nextId) {
        return;
      }

      lastNotifiedHoverIdRef.current = nextId;
      onRegionHover?.(feature);
    },
    [onRegionHover],
  );

  const handleHover = useCallback(
    (feature: RegionFeature | null) => {
      if (feature) {
        cancelPendingHoverClear();
        const nextId = feature.properties.__id;
        setHoveredId((previous) => (previous === nextId ? previous : nextId));
        emitHoverCallback(feature);
        return;
      }

      cancelPendingHoverClear();
      hoverClearTimerRef.current = window.setTimeout(() => {
        hoverClearFrameRef.current = requestAnimationFrame(() => {
          hoverClearTimerRef.current = null;
          hoverClearFrameRef.current = null;
          setHoveredId((previous) => (previous === null ? previous : null));
          emitHoverCallback(null);
        });
      }, 32);
    },
    [cancelPendingHoverClear, emitHoverCallback],
  );

  return {
    hoveredId,
    handleHover,
  };
}
