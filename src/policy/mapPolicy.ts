import { getRegionLevelFromId } from "../topology";
import type {
  NepalMapPolicy,
  NepalMapTheme,
  RegionFeature,
  ViewLevel,
} from "../types";

function getLevelTheme(
  baseTheme: NepalMapTheme,
  mapPolicy: NepalMapPolicy | undefined,
  level: ViewLevel,
): NepalMapTheme {
  const levelColors = mapPolicy?.levels?.[level]?.colors;
  return { ...baseTheme, ...levelColors };
}

function getLevelEnabled(
  mapPolicy: NepalMapPolicy | undefined,
  level: ViewLevel,
): boolean {
  return mapPolicy?.levels?.[level]?.enabled ?? true;
}

export interface MapPolicyResolver {
  getThemeForLevel: (level: ViewLevel) => NepalMapTheme;
  getThemeForFeature: (
    feature: RegionFeature,
    fallbackLevel: ViewLevel,
  ) => NepalMapTheme;
  isFeatureEnabled: (
    feature: RegionFeature,
    fallbackLevel: ViewLevel,
  ) => boolean;
}

export function createMapPolicyResolver(
  baseTheme: NepalMapTheme,
  mapPolicy?: NepalMapPolicy,
): MapPolicyResolver {
  const getThemeForLevelFn = (level: ViewLevel): NepalMapTheme =>
    getLevelTheme(baseTheme, mapPolicy, level);

  const getThemeForFeatureFn = (
    feature: RegionFeature,
    fallbackLevel: ViewLevel,
  ): NepalMapTheme => {
    const featureLevel =
      getRegionLevelFromId(feature.properties.__id) ?? fallbackLevel;
    const levelTheme = getThemeForLevelFn(featureLevel);
    const regionColors = mapPolicy?.regions?.[feature.properties.__id]?.colors;
    return { ...levelTheme, ...regionColors };
  };

  const isFeatureEnabledFn = (
    feature: RegionFeature,
    fallbackLevel: ViewLevel,
  ): boolean => {
    const featureLevel =
      getRegionLevelFromId(feature.properties.__id) ?? fallbackLevel;
    const levelEnabled = getLevelEnabled(mapPolicy, featureLevel);
    const regionEnabled =
      mapPolicy?.regions?.[feature.properties.__id]?.enabled;

    if (typeof regionEnabled === "boolean") {
      return regionEnabled;
    }

    return levelEnabled;
  };

  return {
    getThemeForLevel: getThemeForLevelFn,
    getThemeForFeature: getThemeForFeatureFn,
    isFeatureEnabled: isFeatureEnabledFn,
  };
}
