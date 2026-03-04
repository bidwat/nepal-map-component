import type { GeoPath, GeoPermissibleObjects } from "d3-geo";

import type { RegionFeatureCollection } from "../types";

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function clampBoxToViewport(
  box: Box,
  viewportWidth: number,
  viewportHeight: number,
): Box {
  const width = Math.max(1, Math.min(viewportWidth, box.width));
  const height = Math.max(1, Math.min(viewportHeight, box.height));
  const x = Math.max(0, Math.min(viewportWidth - width, box.x));
  const y = Math.max(0, Math.min(viewportHeight - height, box.y));

  return { x, y, width, height };
}

export function expandBox(box: Box, paddingFactor: number): Box {
  const dx = box.width * paddingFactor;
  const dy = box.height * paddingFactor;

  return {
    x: box.x - dx,
    y: box.y - dy,
    width: box.width + dx * 2,
    height: box.height + dy * 2,
  };
}

export function boxToViewBox(box: Box): string {
  return `${box.x} ${box.y} ${box.width} ${box.height}`;
}

export function interpolateBox(from: Box, to: Box, t: number): Box {
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
    width: from.width + (to.width - from.width) * t,
    height: from.height + (to.height - from.height) * t,
  };
}

export function getFullViewportBox(
  viewportWidth: number,
  viewportHeight: number,
): Box {
  return { x: 0, y: 0, width: viewportWidth, height: viewportHeight };
}

export function getTargetBox(
  path: GeoPath<any, GeoPermissibleObjects>,
  activeCollection: RegionFeatureCollection,
  viewportWidth: number,
  viewportHeight: number,
  paddingFactor = 0.08,
): Box {
  const bounds = path.bounds(activeCollection);
  const x0 = Number.isFinite(bounds[0][0]) ? bounds[0][0] : 0;
  const y0 = Number.isFinite(bounds[0][1]) ? bounds[0][1] : 0;
  const x1 = Number.isFinite(bounds[1][0]) ? bounds[1][0] : viewportWidth;
  const y1 = Number.isFinite(bounds[1][1]) ? bounds[1][1] : viewportHeight;

  const raw: Box = {
    x: Math.min(x0, x1),
    y: Math.min(y0, y1),
    width: Math.max(1, Math.abs(x1 - x0)),
    height: Math.max(1, Math.abs(y1 - y0)),
  };

  const padded = expandBox(raw, paddingFactor);
  return clampBoxToViewport(padded, viewportWidth, viewportHeight);
}

function parseViewBoxSize(viewBox: string): { width: number; height: number } {
  const [x, y, width, height] = viewBox
    .trim()
    .split(/\s+/)
    .map((value) => Number(value));

  if (
    Number.isFinite(x) &&
    Number.isFinite(y) &&
    Number.isFinite(width) &&
    Number.isFinite(height)
  ) {
    return {
      width: Math.max(0, width),
      height: Math.max(0, height),
    };
  }

  return { width: 0, height: 0 };
}

export function resolveZoomCompensatedFontSize(
  desiredScreenFontSize: number,
  viewBox: string,
  viewportWidth: number,
  viewportHeight: number,
): number {
  const safeDesired = Number.isFinite(desiredScreenFontSize)
    ? Math.max(0, desiredScreenFontSize)
    : 0;
  if (safeDesired === 0) {
    return 0;
  }

  const { width: viewBoxWidth, height: viewBoxHeight } =
    parseViewBoxSize(viewBox);
  if (viewBoxWidth <= 0 || viewBoxHeight <= 0) {
    return safeDesired;
  }

  const scaleX = viewportWidth / viewBoxWidth;
  const scaleY = viewportHeight / viewBoxHeight;
  const uniformScale = Math.min(scaleX, scaleY);

  if (!Number.isFinite(uniformScale) || uniformScale <= 0) {
    return safeDesired;
  }

  return safeDesired / uniformScale;
}
