import { useState } from "react";
import type { KeyboardEvent } from "react";

import type { RegionFeature } from "../types";

interface MapFeatureProps {
  feature: RegionFeature;
  pathData: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  interactive: boolean;
  isDisabled: boolean;
  isDrillMode: boolean;
  canDrill: boolean;
  isSelected: boolean;
  onHover: (feature: RegionFeature | null) => void;
  onActivate: (feature: RegionFeature) => void;
}

export function MapFeature({
  feature,
  pathData,
  fill,
  stroke,
  strokeWidth,
  interactive,
  isDisabled,
  isDrillMode,
  canDrill,
  isSelected,
  onHover,
  onActivate,
}: MapFeatureProps) {
  const label = feature.properties?.__label ?? "Region";
  const [focused, setFocused] = useState(false);

  function onKeyDown(event: KeyboardEvent<SVGPathElement>) {
    if (!interactive || isDisabled) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onActivate(feature);
  }

  const canInteract = interactive && !isDisabled;

  return (
    <path
      d={pathData}
      data-feature-id={feature.properties.__id}
      role="button"
      tabIndex={canInteract ? 0 : -1}
      aria-hidden={interactive ? undefined : true}
      aria-disabled={isDisabled || !interactive ? true : undefined}
      aria-label={label}
      aria-pressed={!isDrillMode && !isDisabled ? isSelected : undefined}
      aria-expanded={isDrillMode && canDrill && !isDisabled ? false : undefined}
      aria-haspopup={isDrillMode && canDrill && !isDisabled ? true : undefined}
      fill={fill}
      fillRule="evenodd"
      clipRule="evenodd"
      stroke={stroke}
      strokeWidth={focused ? strokeWidth + 0.35 : strokeWidth}
      vectorEffect="non-scaling-stroke"
      strokeLinejoin="round"
      strokeLinecap="round"
      style={{
        transition:
          "fill 0.2s ease, opacity 0.25s ease, stroke-width 0.15s ease",
        outline: "none",
        cursor: canInteract ? "pointer" : "not-allowed",
        opacity: isDisabled ? 0.55 : 1,
      }}
      onMouseDown={(event) => {
        event.currentTarget.blur();
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onMouseEnter={() => onHover(feature)}
      onMouseLeave={(event) => {
        const relatedTarget = event.relatedTarget;
        if (relatedTarget instanceof Element) {
          const nextFeatureId = relatedTarget.getAttribute("data-feature-id");
          if (nextFeatureId) {
            return;
          }
        }
        onHover(null);
      }}
      onClick={() => {
        if (!canInteract) return;
        onActivate(feature);
      }}
      onKeyDown={onKeyDown}
    />
  );
}
