import type { GeoJsonProperties } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";

import type { LocalUnitType, ProtectedAreaType } from "./adminCategories";

export type NepalCountryProperties = {
  country_name?: "Nepal" | string;
} & Record<string, unknown>;

export type NepalProvinceProperties = {
  province_no?: string | number;
  province_name?: string;
} & Record<string, unknown>;

export type NepalDistrictProperties = NepalProvinceProperties & {
  district?: string;
};

export type NepalLocalUnitProperties = NepalDistrictProperties & {
  local_unit?: string;
  local_unit_type?: LocalUnitType;
};

export type NepalWardProperties = NepalLocalUnitProperties & {
  ward_no?: string | number;
  special_area?: boolean | string | number;
  protected_area_name?: string;
  protected_area_type?: ProtectedAreaType;
};

export type NepalTopologyObjects = Record<
  string,
  GeometryCollection<GeoJsonProperties>
> & {
  country: GeometryCollection<NepalCountryProperties>;
  provinces: GeometryCollection<NepalProvinceProperties>;
  districts: GeometryCollection<NepalDistrictProperties>;
  local_units: GeometryCollection<NepalLocalUnitProperties>;
  wards: GeometryCollection<NepalWardProperties>;
};

export type NepalTopology = Topology<NepalTopologyObjects>;

export type NepalTopologyObjectName = keyof NepalTopologyObjects;

export const NEPAL_TOPOLOGY_OBJECT_NAMES: NepalTopologyObjectName[] = [
  "country",
  "provinces",
  "districts",
  "local_units",
  "wards",
];
