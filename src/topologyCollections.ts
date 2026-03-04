import { VIEW_LEVEL } from "./constants/viewLevels";
import type {
  LayerCollections,
  RegionFeature,
  RegionFeatureCollection,
  ViewLevel,
} from "./types";

export function getCollectionForLevel(
  collections: LayerCollections,
  level: ViewLevel,
): RegionFeatureCollection {
  if (level === VIEW_LEVEL.COUNTRY) return collections.country;
  if (level === VIEW_LEVEL.PROVINCE) return collections.provinces;
  if (level === VIEW_LEVEL.DISTRICT) return collections.districts;
  if (level === VIEW_LEVEL.LOCAL_UNIT) return collections.local_units;
  return collections.wards;
}

export function getFeaturesForLevel(
  collections: LayerCollections,
  level: ViewLevel,
): RegionFeature[] {
  return getCollectionForLevel(collections, level).features;
}
