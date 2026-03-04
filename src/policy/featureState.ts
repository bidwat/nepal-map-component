import { filterByStack } from "../topology";
import type { NavigationNode, RegionFeature, ViewLevel } from "../types";
import type { RegionId } from "../types/domain";
import type { MapPolicyResolver } from "./mapPolicy";
import { VIEW_LEVEL } from "../constants/viewLevels";

function normalizeHierarchyPart(value: unknown): string {
  if (typeof value === "string") return value.trim().toLowerCase();
  if (typeof value === "number") return String(value).trim().toLowerCase();
  return "";
}

export function getLocalUnitHierarchyKey(
  feature: RegionFeature,
): string | null {
  const localUnit = normalizeHierarchyPart(feature.properties.local_unit);
  if (!localUnit) return null;

  const provinceNo = normalizeHierarchyPart(feature.properties.province_no);
  const district = normalizeHierarchyPart(feature.properties.district);

  return `${provinceNo}::${district}::${localUnit}`;
}

export function isProtectedAreaFeature(feature: RegionFeature): boolean {
  if (feature.properties.__id.startsWith("ward:special:")) {
    return true;
  }

  const value = feature.properties.special_area;
  return value === true || value === "true" || value === 1 || value === "1";
}

interface BuildWardAvailabilityByLocalUnitInput {
  wardFeatures: RegionFeature[];
  navigationStack: NavigationNode[];
  selectableProtectedAreas: boolean;
  policyResolver: MapPolicyResolver;
}

export function buildWardAvailabilityByLocalUnit({
  wardFeatures,
  navigationStack,
  selectableProtectedAreas,
  policyResolver,
}: BuildWardAvailabilityByLocalUnitInput): Map<string, boolean> {
  const availability = new Map<string, boolean>();
  const scopedWards = filterByStack(
    VIEW_LEVEL.WARD,
    wardFeatures,
    navigationStack,
  );

  for (const ward of scopedWards) {
    const key = getLocalUnitHierarchyKey(ward);
    if (!key) continue;

    const wardSelectable =
      (selectableProtectedAreas || !isProtectedAreaFeature(ward)) &&
      policyResolver.isFeatureEnabled(ward, VIEW_LEVEL.WARD);

    if (wardSelectable) {
      availability.set(key, true);
    } else if (!availability.has(key)) {
      availability.set(key, false);
    }
  }

  return availability;
}

interface BuildDisabledLocalUnitIdSetInput {
  viewLevel: ViewLevel;
  hasWardLevelBelowLocalUnit: boolean;
  localUnitFeatures: RegionFeature[];
  navigationStack: NavigationNode[];
  wardAvailabilityByLocalUnit: ReadonlyMap<string, boolean>;
}

export function buildDisabledLocalUnitIdSet({
  viewLevel,
  hasWardLevelBelowLocalUnit,
  localUnitFeatures,
  navigationStack,
  wardAvailabilityByLocalUnit,
}: BuildDisabledLocalUnitIdSetInput): Set<RegionId> {
  const blocked = new Set<RegionId>();
  if (viewLevel !== VIEW_LEVEL.LOCAL_UNIT) return blocked;
  if (!hasWardLevelBelowLocalUnit) return blocked;

  const scopedLocalUnits = filterByStack(
    VIEW_LEVEL.LOCAL_UNIT,
    localUnitFeatures,
    navigationStack,
  );

  for (const localUnit of scopedLocalUnits) {
    const key = getLocalUnitHierarchyKey(localUnit);
    if (!key) {
      blocked.add(localUnit.properties.__id);
      continue;
    }

    const hasSelectableWard = wardAvailabilityByLocalUnit.get(key) === true;
    if (!hasSelectableWard) {
      blocked.add(localUnit.properties.__id);
    }
  }

  return blocked;
}

interface CreateFeatureDisabledResolverInput {
  viewLevel: ViewLevel;
  selectableProtectedAreas: boolean;
  disabledLocalUnitIdSet: ReadonlySet<RegionId>;
  policyResolver: MapPolicyResolver;
}

export function createFeatureDisabledResolver({
  viewLevel,
  selectableProtectedAreas,
  disabledLocalUnitIdSet,
  policyResolver,
}: CreateFeatureDisabledResolverInput): (feature: RegionFeature) => boolean {
  return (feature: RegionFeature): boolean => {
    const isProtectedArea = isProtectedAreaFeature(feature);

    if (isProtectedArea && !selectableProtectedAreas) {
      return true;
    }

    if (feature.properties.__disabled === true && !isProtectedArea) {
      return true;
    }

    if (disabledLocalUnitIdSet.has(feature.properties.__id)) {
      return true;
    }

    return !policyResolver.isFeatureEnabled(feature, viewLevel);
  };
}
