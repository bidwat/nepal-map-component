import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { ViewLevel as ViewLevelKey } from "./constants/viewLevels";
import type {
  LocalUnitType,
  ProtectedAreaType,
  RegionId,
} from "./types/domain";

export type ViewLevel = ViewLevelKey;

export type SelectionMode = "none" | "single" | "multi";

export interface RegionFeatureProperties {
  province_no?: string | number;
  province_name?: string;
  district?: string;
  local_unit?: string;
  local_unit_type?: LocalUnitType;
  ward_no?: string | number;
  special_area?: boolean | string | number;
  protected_area_name?: string;
  protected_area_type?: ProtectedAreaType;
  __id: RegionId;
  __label: string;
  __disabled?: boolean;
  [key: string]: unknown;
}

export type RegionFeature = Feature<Geometry, RegionFeatureProperties>;
export type RegionFeatureCollection = FeatureCollection<
  Geometry,
  RegionFeatureProperties
>;

export interface LayerCollections {
  country: RegionFeatureCollection;
  provinces: RegionFeatureCollection;
  districts: RegionFeatureCollection;
  local_units: RegionFeatureCollection;
  wards: RegionFeatureCollection;
}

export interface NepalMapTheme {
  primary: string;
  disabled: string;
  hover: string;
  selected: string;
  background: string;
  stroke: string;
  strokeWidth: number;
}

export interface NavigationNode {
  level: Exclude<ViewLevel, "country">;
  feature: RegionFeature;
}

export interface MapPolicyLevelConfig {
  enabled?: boolean;
  colors?: Partial<NepalMapTheme>;
}

export interface MapPolicyRegionConfig {
  enabled?: boolean;
  colors?: Partial<NepalMapTheme>;
}

export interface NepalMapPolicy {
  levels?: Partial<Record<ViewLevel, MapPolicyLevelConfig>>;
  regions?: Partial<Record<RegionId, MapPolicyRegionConfig>>;
}

export interface RegionReference {
  id: RegionId;
  level: ViewLevel;
  name: string;
}

export interface RegionCatalog {
  entries: RegionReference[];
  byId: ReadonlyMap<RegionId, RegionReference>;
  byLevel: Readonly<Record<ViewLevel, RegionReference[]>>;
}

export interface NepalMapProps {
  startLevel?: ViewLevel;
  /** Preferred typed start region selector. */
  startRegion?: RegionReference;
  /** Required when startLevel is not "country". */
  startRegionId?: RegionId;
  endLevel?: ViewLevel;
  skipLevels?: ViewLevel[];
  showFirstLayerDivisions?: boolean;
  openEndLevel?: boolean;
  showPartitionLabels?: boolean;
  partitionLabelFontSize?: number;
  selectableProtectedAreas?: boolean;
  selectable?: boolean;
  selectionMode?: SelectionMode;
  mapPolicy?: NepalMapPolicy;
  selectedIds?: RegionId[];
  fitParent?: boolean;
  width?: number;
  height?: number;
  theme?: Partial<NepalMapTheme>;
  onRegionHover?: (feature: RegionFeature | null) => void;
  onRegionClick?: (feature: RegionFeature) => void;
  onSelectionChange?: (selectedIds: RegionId[]) => void;
  ariaLabel?: string;
}
