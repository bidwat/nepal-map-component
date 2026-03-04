import type { FeatureCollection, Geometry } from "geojson";
import { feature as topoFeature } from "topojson-client";
import type { GeometryCollection } from "topojson-specification";

import type {
  NepalTopology,
  NepalTopologyObjectName,
  RegionId,
} from "./types/domain";
import type {
  LayerCollections,
  NavigationNode,
  RegionFeature,
  RegionFeatureCollection,
  RegionFeatureProperties,
  ViewLevel,
} from "./types";
import { STANDARD_PROVINCE_NAMES_BY_NUMBER } from "./constants/provinces";
import { VIEW_LEVEL, VIEW_LEVELS } from "./constants/viewLevels";

function valueToString(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function normalizeText(value: unknown): string {
  return valueToString(value).trim().toLowerCase();
}

function isSpecialAreaValue(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}

function normalizeIdSegment(value: unknown): string {
  return valueToString(value).trim().toLowerCase();
}

function resolveProvinceName(properties: Record<string, unknown>): string {
  const provinceNo = valueToString(properties.province_no).trim();
  if (provinceNo) {
    const standardName = STANDARD_PROVINCE_NAMES_BY_NUMBER.get(provinceNo);
    if (standardName) {
      return standardName;
    }
  }

  return valueToString(properties.province_name).trim();
}

function resolveProvinceIdSegment(properties: Record<string, unknown>): string {
  const provinceName = normalizeIdSegment(resolveProvinceName(properties));
  if (provinceName) {
    return provinceName;
  }

  return normalizeIdSegment(properties.province_no);
}

function resolveProtectedAreaName(properties: Record<string, unknown>): string {
  const directName = valueToString(properties.protected_area_name).trim();
  if (directName) {
    return directName;
  }

  const legacyName = valueToString(properties.special_area_name).trim();
  if (legacyName) {
    return legacyName;
  }

  return "";
}

function makeRegionId(
  level: ViewLevel,
  properties: Record<string, unknown>,
  featureIndex: number,
): RegionId {
  const provinceName = resolveProvinceIdSegment(properties);
  const district = normalizeIdSegment(properties.district);
  const localUnit = normalizeIdSegment(properties.local_unit);
  const wardNo = normalizeIdSegment(properties.ward_no);

  if (level === VIEW_LEVEL.COUNTRY) return "country:nepal";
  if (level === VIEW_LEVEL.PROVINCE) return `province:${provinceName}`;
  if (level === VIEW_LEVEL.DISTRICT)
    return `district:${provinceName}:${district}`;
  if (level === VIEW_LEVEL.LOCAL_UNIT)
    return `local_unit:${provinceName}:${district}:${localUnit}`;
  if (isSpecialAreaValue(properties.special_area)) {
    return `ward:special:${provinceName}:${district}:${localUnit}:${featureIndex}`;
  }
  return `ward:${provinceName}:${district}:${localUnit}:${wardNo}`;
}

function makeLabel(
  level: ViewLevel,
  properties: Record<string, unknown>,
): string {
  if (
    level === VIEW_LEVEL.WARD &&
    isSpecialAreaValue(properties.special_area)
  ) {
    return resolveProtectedAreaName(properties) || "Protected area";
  }

  if (level === VIEW_LEVEL.COUNTRY) return "Nepal";
  if (level === VIEW_LEVEL.PROVINCE)
    return resolveProvinceName(properties) || "Province";
  if (level === VIEW_LEVEL.DISTRICT)
    return valueToString(properties.district) || "District";
  if (level === VIEW_LEVEL.LOCAL_UNIT)
    return valueToString(properties.local_unit) || "Local Unit";
  return `Ward ${valueToString(properties.ward_no) || ""}`.trim();
}

function toRegionCollection(
  topology: NepalTopology,
  objectName: NepalTopologyObjectName,
  level: ViewLevel,
): RegionFeatureCollection {
  const object = topology.objects[objectName] as GeometryCollection | undefined;

  if (!object) {
    return { type: "FeatureCollection", features: [] };
  }

  const collection = topoFeature(topology, object) as FeatureCollection<
    Geometry,
    Record<string, unknown>
  >;
  if (collection.type !== "FeatureCollection") {
    return { type: "FeatureCollection", features: [] };
  }

  const features = collection.features
    .map(
      (
        feature: FeatureCollection<
          Geometry,
          Record<string, unknown>
        >["features"][number],
        featureIndex: number,
      ): RegionFeature => {
        const properties = { ...(feature.properties ?? {}) } as Record<
          string,
          unknown
        >;
        const isSpecialArea =
          level === VIEW_LEVEL.WARD &&
          isSpecialAreaValue(properties.special_area);

        const normalized: RegionFeatureProperties = {
          ...properties,
          __id: makeRegionId(level, properties, featureIndex),
          __label: makeLabel(level, properties),
          __disabled: isSpecialArea,
        };

        return {
          ...feature,
          properties: normalized,
          geometry: feature.geometry as Geometry,
        };
      },
    )
    .filter((feature: RegionFeature) => {
      if (level === VIEW_LEVEL.LOCAL_UNIT) {
        return valueToString(feature.properties.local_unit).trim().length > 0;
      }

      if (level !== VIEW_LEVEL.WARD) {
        return true;
      }

      const wardNo = valueToString(feature.properties.ward_no).trim();
      const isSpecialArea = isSpecialAreaValue(feature.properties.special_area);

      return wardNo.length > 0 || isSpecialArea;
    });

  return {
    type: "FeatureCollection",
    features,
  };
}

export function buildLayerCollections(
  topology: NepalTopology,
): LayerCollections {
  return {
    country: toRegionCollection(topology, "country", VIEW_LEVEL.COUNTRY),
    provinces: toRegionCollection(topology, "provinces", VIEW_LEVEL.PROVINCE),
    districts: toRegionCollection(topology, "districts", VIEW_LEVEL.DISTRICT),
    local_units: toRegionCollection(
      topology,
      "local_units",
      VIEW_LEVEL.LOCAL_UNIT,
    ),
    wards: toRegionCollection(topology, "wards", VIEW_LEVEL.WARD),
  };
}

function getSelected(
  stack: NavigationNode[],
  level: Exclude<ViewLevel, "country">,
): RegionFeature | null {
  for (let index = stack.length - 1; index >= 0; index -= 1) {
    if (stack[index].level === level) {
      return stack[index].feature;
    }
  }

  return null;
}

function getFocusedFeatureForLevel(
  stack: NavigationNode[],
  level: ViewLevel,
): RegionFeature | null {
  if (level === VIEW_LEVEL.COUNTRY) {
    return null;
  }

  return getSelected(stack, level);
}

function applyFocusedFeatureFilter(
  features: RegionFeature[],
  focusedFeature: RegionFeature | null,
): RegionFeature[] {
  const focusedId = focusedFeature?.properties?.__id;
  if (!focusedId) {
    return features;
  }

  const focused = features.filter((item) => item.properties.__id === focusedId);
  return focused.length > 0 ? focused : features;
}

export function filterByStack(
  level: ViewLevel,
  features: RegionFeature[],
  stack: NavigationNode[],
): RegionFeature[] {
  if (level === VIEW_LEVEL.COUNTRY) return features;

  const focusedFeature = getFocusedFeatureForLevel(stack, level);
  const province = getSelected(stack, VIEW_LEVEL.PROVINCE);
  const district = getSelected(stack, VIEW_LEVEL.DISTRICT);
  const localUnit = getSelected(stack, VIEW_LEVEL.LOCAL_UNIT);

  if (level === VIEW_LEVEL.PROVINCE) {
    return applyFocusedFeatureFilter(features, focusedFeature);
  }

  if (level === VIEW_LEVEL.DISTRICT) {
    const provinceNo = normalizeText(province?.properties?.province_no);
    if (!provinceNo) return applyFocusedFeatureFilter(features, focusedFeature);

    const filteredDistricts = features.filter(
      (item) => normalizeText(item.properties?.province_no) === provinceNo,
    );

    return applyFocusedFeatureFilter(filteredDistricts, focusedFeature);
  }

  if (level === VIEW_LEVEL.LOCAL_UNIT) {
    const districtName = normalizeText(district?.properties?.district);
    const provinceNo = normalizeText(district?.properties?.province_no);

    const filteredLocalUnits = features.filter((item) => {
      const sameDistrict =
        !districtName ||
        normalizeText(item.properties?.district) === districtName;
      const sameProvince =
        !provinceNo ||
        normalizeText(item.properties?.province_no) === provinceNo;
      return sameDistrict && sameProvince;
    });

    return applyFocusedFeatureFilter(filteredLocalUnits, focusedFeature);
  }

  const districtName = normalizeText(
    localUnit?.properties?.district ?? district?.properties?.district,
  );
  const localName = normalizeText(localUnit?.properties?.local_unit);
  const provinceNo = normalizeText(
    localUnit?.properties?.province_no ?? district?.properties?.province_no,
  );

  const filteredWards = features.filter((item) => {
    const sameProvince =
      !provinceNo || normalizeText(item.properties?.province_no) === provinceNo;
    const sameDistrict =
      !districtName ||
      normalizeText(item.properties?.district) === districtName;
    const sameLocal =
      !localName || normalizeText(item.properties?.local_unit) === localName;
    return sameProvince && sameDistrict && sameLocal;
  });

  return applyFocusedFeatureFilter(filteredWards, focusedFeature);
}

export const levelOrder: ViewLevel[] = [...VIEW_LEVELS];

export function getNextLevel(level: ViewLevel): ViewLevel | null {
  const index = levelOrder.indexOf(level);
  if (index < 0 || index === levelOrder.length - 1) return null;
  return levelOrder[index + 1];
}

export function getRegionLevelFromId(regionId: RegionId): ViewLevel | null {
  const normalizedRegionId = regionId.toLowerCase();

  if (normalizedRegionId === "country:nepal") return VIEW_LEVEL.COUNTRY;
  if (normalizedRegionId.startsWith("province:")) return VIEW_LEVEL.PROVINCE;
  if (normalizedRegionId.startsWith("district:")) return VIEW_LEVEL.DISTRICT;
  if (normalizedRegionId.startsWith("local_unit:")) {
    return VIEW_LEVEL.LOCAL_UNIT;
  }
  if (
    normalizedRegionId.startsWith("ward:special:") ||
    normalizedRegionId.startsWith("ward:")
  ) {
    return VIEW_LEVEL.WARD;
  }

  return null;
}

function isLevelSkipped(
  level: ViewLevel,
  skipLevels: ReadonlySet<ViewLevel>,
): boolean {
  return level !== VIEW_LEVEL.COUNTRY && skipLevels.has(level);
}

export function getNextNavigableLevel(
  currentLevel: ViewLevel,
  endLevel: ViewLevel,
  skipLevels: ReadonlySet<ViewLevel>,
): ViewLevel | null {
  const currentIndex = levelOrder.indexOf(currentLevel);
  const endIndex = levelOrder.indexOf(endLevel);
  if (currentIndex < 0 || endIndex < 0 || currentIndex >= endIndex) return null;

  for (let index = currentIndex + 1; index <= endIndex; index += 1) {
    const candidate = levelOrder[index];
    if (!isLevelSkipped(candidate, skipLevels)) {
      return candidate;
    }
  }

  return null;
}

export function getPreviousNavigableLevel(
  currentLevel: ViewLevel,
  startLevel: ViewLevel,
  skipLevels: ReadonlySet<ViewLevel>,
): ViewLevel | null {
  const currentIndex = levelOrder.indexOf(currentLevel);
  const startIndex = levelOrder.indexOf(startLevel);
  if (currentIndex < 0 || startIndex < 0 || currentIndex <= startIndex) {
    return null;
  }

  for (let index = currentIndex - 1; index >= startIndex; index -= 1) {
    const candidate = levelOrder[index];
    if (!isLevelSkipped(candidate, skipLevels)) {
      return candidate;
    }
  }

  return null;
}
