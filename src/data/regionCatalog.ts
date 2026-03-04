import { VIEW_LEVELS } from "../constants/viewLevels";
import { buildLayerCollections } from "../topology";
import { getFeaturesForLevel } from "../topologyCollections";
import type {
  LayerCollections,
  RegionCatalog,
  RegionReference,
} from "../types";
import type { RegionId, NepalTopology } from "../types/domain";
import { getNepalTopology } from "./nepalTopology";

function createEmptyByLevel(): Record<
  RegionReference["level"],
  RegionReference[]
> {
  return {
    country: [],
    province: [],
    district: [],
    local_unit: [],
    ward: [],
  };
}

function toRegionReference(
  level: RegionReference["level"],
  id: RegionId,
  name: string,
): RegionReference {
  return { id, level, name };
}

function buildRegionCatalogFromCollections(
  collections: LayerCollections,
): RegionCatalog {
  const byLevel = createEmptyByLevel();

  for (const level of VIEW_LEVELS) {
    const features = getFeaturesForLevel(collections, level);
    byLevel[level] = features
      .map((feature) => {
        const id = feature.properties.__id;
        const name = String(feature.properties.__label ?? "").trim();
        return toRegionReference(level, id, name);
      })
      .filter((entry) => entry.name.length > 0)
      .sort((first, second) => first.name.localeCompare(second.name));
  }

  const entries = VIEW_LEVELS.flatMap((level) => byLevel[level]);
  const byId = new Map<RegionId, RegionReference>(
    entries.map((entry) => [entry.id, entry]),
  );

  return {
    entries,
    byId,
    byLevel,
  };
}

function buildRegionCatalog(topology: NepalTopology): RegionCatalog {
  const collections = buildLayerCollections(topology);
  return buildRegionCatalogFromCollections(collections);
}

const regionCatalog = buildRegionCatalog(getNepalTopology());

export function getRegionCatalog(): RegionCatalog {
  return regionCatalog;
}

export function getRegionReferenceById(
  regionId: RegionId,
): RegionReference | null {
  return regionCatalog.byId.get(regionId) ?? null;
}
