import type { GeoPath, GeoPermissibleObjects } from "d3-geo";

import { MapFeature } from "./MapFeature";
import type { RegionFeature } from "../types";

interface MapLayerProps {
  features: RegionFeature[];
  path: GeoPath<any, GeoPermissibleObjects>;
  opacity: number;
  showPartitionLabels: boolean;
  partitionLabelFontSize: number;
  partitionLabelColor: string;
  fillForFeature: (feature: RegionFeature) => string;
  strokeForFeature: (feature: RegionFeature) => string;
  strokeWidthForFeature: (feature: RegionFeature) => number;
  isSelected: (feature: RegionFeature) => boolean;
  isDisabled: (feature: RegionFeature) => boolean;
  canDrill: boolean;
  interactive: boolean;
  onHover: (feature: RegionFeature | null) => void;
  onActivate: (feature: RegionFeature) => void;
}

export function MapLayer({
  features,
  path,
  opacity,
  showPartitionLabels,
  partitionLabelFontSize,
  partitionLabelColor,
  fillForFeature,
  strokeForFeature,
  strokeWidthForFeature,
  isSelected,
  isDisabled,
  canDrill,
  interactive,
  onHover,
  onActivate,
}: MapLayerProps) {
  return (
    <g
      style={{
        opacity,
        transition: "opacity 0.3s ease",
        pointerEvents: interactive ? "auto" : "none",
      }}
    >
      {features.map((feature) => {
        const pathData = path(feature);
        if (!pathData) return null;

        const [labelX, labelY] = path.centroid(feature);
        const hasValidLabelPosition =
          Number.isFinite(labelX) && Number.isFinite(labelY);
        const isWardFeature = feature.properties.__id.startsWith("ward:");
        const isSpecialWardFeature =
          feature.properties.__id.startsWith("ward:special:");
        const wardNumber =
          typeof feature.properties.ward_no === "number" ||
          typeof feature.properties.ward_no === "string"
            ? String(feature.properties.ward_no).trim()
            : "";
        const labelText = (
          isWardFeature && !isSpecialWardFeature
            ? wardNumber
            : feature.properties.__label
        ).trim();
        const shouldRenderLabel =
          showPartitionLabels && hasValidLabelPosition && labelText.length > 0;

        return (
          <g key={feature.properties.__id}>
            <MapFeature
              feature={feature}
              pathData={pathData}
              fill={fillForFeature(feature)}
              stroke={strokeForFeature(feature)}
              strokeWidth={strokeWidthForFeature(feature)}
              interactive={interactive}
              isDisabled={isDisabled(feature)}
              isDrillMode={canDrill}
              canDrill={canDrill}
              isSelected={isSelected(feature)}
              onHover={onHover}
              onActivate={onActivate}
            />

            {shouldRenderLabel ? (
              <text
                x={labelX}
                y={labelY}
                textAnchor="middle"
                dominantBaseline="central"
                fill={partitionLabelColor}
                fontSize={partitionLabelFontSize}
                pointerEvents="none"
                aria-hidden
              >
                {labelText}
              </text>
            ) : null}
          </g>
        );
      })}
    </g>
  );
}
