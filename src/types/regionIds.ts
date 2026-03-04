export type CountryRegionId = "country:nepal";

export type ProvinceRegionId = `province:${string}`;
export type DistrictRegionId = `district:${string}:${string}`;
export type LocalUnitRegionId = `local_unit:${string}:${string}:${string}`;
export type WardRegionId = `ward:${string}:${string}:${string}:${string}`;
export type ProtectedAreaRegionId =
  `ward:special:${string}:${string}:${string}:${number}`;

export type RegionId =
  | CountryRegionId
  | ProvinceRegionId
  | DistrictRegionId
  | LocalUnitRegionId
  | WardRegionId
  | ProtectedAreaRegionId;
