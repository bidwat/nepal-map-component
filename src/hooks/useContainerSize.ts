import { useEffect, useState } from "react";
import type { RefObject } from "react";

interface UseContainerSizeParams {
  fitParent: boolean;
  fallbackWidth: number;
  fallbackHeight: number;
  containerRef: RefObject<HTMLDivElement>;
}

interface Size {
  width: number;
  height: number;
}

export function useContainerSize({
  fitParent,
  fallbackWidth,
  fallbackHeight,
  containerRef,
}: UseContainerSizeParams): Size {
  const [containerSize, setContainerSize] = useState<Size>({
    width: fallbackWidth,
    height: fallbackHeight,
  });

  useEffect(() => {
    if (!fitParent) {
      setContainerSize({ width: fallbackWidth, height: fallbackHeight });
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const updateSize = (nextWidth: number, nextHeight: number) => {
      setContainerSize({
        width: Math.max(1, Math.round(nextWidth || fallbackWidth)),
        height: Math.max(1, Math.round(nextHeight || fallbackHeight)),
      });
    };

    const initialRect = container.getBoundingClientRect();
    updateSize(initialRect.width, initialRect.height);

    if (typeof ResizeObserver === "undefined") {
      const onResize = () => {
        const rect = container.getBoundingClientRect();
        updateSize(rect.width, rect.height);
      };

      window.addEventListener("resize", onResize);
      return () => {
        window.removeEventListener("resize", onResize);
      };
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      updateSize(entry.contentRect.width, entry.contentRect.height);
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [containerRef, fallbackHeight, fallbackWidth, fitParent]);

  return fitParent
    ? containerSize
    : { width: fallbackWidth, height: fallbackHeight };
}
