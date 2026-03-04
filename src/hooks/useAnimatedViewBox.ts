import type { GeoPath, GeoPermissibleObjects } from "d3-geo";
import { useEffect, useMemo, useRef, useState } from "react";

import type { RegionFeatureCollection } from "../types";
import {
  boxToViewBox,
  getFullViewportBox,
  getTargetBox,
  interpolateBox,
  type Box,
} from "../components/viewBox";

interface UseAnimatedViewBoxParams {
  path: GeoPath<any, GeoPermissibleObjects>;
  activeCollection: RegionFeatureCollection;
  viewportWidth: number;
  viewportHeight: number;
}

const ZOOM_DURATION_MS = 320;

export function useAnimatedViewBox({
  path,
  activeCollection,
  viewportWidth,
  viewportHeight,
}: UseAnimatedViewBoxParams): string {
  const fullBox = useMemo(
    () => getFullViewportBox(viewportWidth, viewportHeight),
    [viewportHeight, viewportWidth],
  );
  const [viewBox, setViewBox] = useState<string>(boxToViewBox(fullBox));
  const currentBoxRef = useRef<Box>(fullBox);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    currentBoxRef.current = fullBox;
    setViewBox(boxToViewBox(fullBox));
  }, [fullBox]);

  const targetBox = useMemo(
    () =>
      getTargetBox(path, activeCollection, viewportWidth, viewportHeight, 0.08),
    [activeCollection, path, viewportHeight, viewportWidth],
  );

  useEffect(() => {
    const fromBox = currentBoxRef.current;
    const toBox = targetBox;

    if (animationFrameRef.current != null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / ZOOM_DURATION_MS);
      const eased = 1 - (1 - progress) * (1 - progress);
      const nextBox = interpolateBox(fromBox, toBox, eased);
      currentBoxRef.current = nextBox;
      setViewBox(boxToViewBox(nextBox));

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(tick);
      }
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current != null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [targetBox]);

  return viewBox;
}
