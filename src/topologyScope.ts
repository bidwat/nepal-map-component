import { filterByStack, getRegionLevelFromId } from "./topology";
import type {
  LayerCollections,
  NavigationNode,
  RegionFeature,
  ViewLevel,
} from "./types";
import type { RegionId } from "./types/domain";
import { VIEW_LEVEL } from "./constants/viewLevels";
import { getFeaturesForLevel } from "./topologyCollections";

export function resolveRootFeature(
  collections: LayerCollections,
  startLevel: ViewLevel,
  requestedStartRegionId?: RegionId,
): RegionFeature | null {
  const startFeatures = getFeaturesForLevel(collections, startLevel);

  if (startFeatures.length === 0) {
    return null;
  }

  if (startLevel === VIEW_LEVEL.COUNTRY) {
    return startFeatures[0];
  }

  if (!requestedStartRegionId) {
    throw new Error(
      `[NepalMap] startRegionId is required when startLevel is '${startLevel}'.`,
    );
  }

  const normalizedStartRegionId =
    requestedStartRegionId.toLowerCase() as RegionId;

  const requestedLevel = getRegionLevelFromId(normalizedStartRegionId);
  if (requestedLevel !== startLevel) {
    throw new Error(
      `[NepalMap] startRegionId '${requestedStartRegionId}' does not match startLevel '${startLevel}'.`,
    );
  }

  const match = startFeatures.find(
    (feature) => feature.properties.__id === normalizedStartRegionId,
  );

  if (!match) {
    throw new Error(
      `[NepalMap] startRegionId '${requestedStartRegionId}' was not found at startLevel '${startLevel}'.`,
    );
  }

  return match;
}

interface ResolveActiveFeaturesInput {
  collections: LayerCollections;
  viewLevel: ViewLevel;
  navigationStack: NavigationNode[];
  startLevel: ViewLevel;
  rootRegionId: RegionId | null;
}

export function resolveActiveFeatures({
  collections,
  viewLevel,
  navigationStack,
  startLevel,
  rootRegionId,
}: ResolveActiveFeaturesInput): RegionFeature[] {
  const source = getFeaturesForLevel(collections, viewLevel);
  const filtered = filterByStack(viewLevel, source, navigationStack);

  if (!rootRegionId || viewLevel !== startLevel) {
    return filtered;
  }

  const rooted = filtered.filter(
    (feature) => feature.properties.__id === rootRegionId,
  );

  return rooted.length > 0 ? rooted : filtered;
}

export function getClippingFeatureForLevel(
  viewLevel: ViewLevel,
  navigationStack: NavigationNode[],
): RegionFeature | null {
  if (viewLevel === VIEW_LEVEL.DISTRICT) {
    const province = navigationStack.find(
      (item) => item.level === VIEW_LEVEL.PROVINCE,
    );
    return province?.feature ?? null;
  }

  if (viewLevel === VIEW_LEVEL.LOCAL_UNIT) {
    const district = navigationStack.find(
      (item) => item.level === VIEW_LEVEL.DISTRICT,
    );
    return district?.feature ?? null;
  }

  if (viewLevel === VIEW_LEVEL.WARD) {
    const localUnit = navigationStack.find(
      (item) => item.level === VIEW_LEVEL.LOCAL_UNIT,
    );
    return localUnit?.feature ?? null;
  }

  return null;
}
