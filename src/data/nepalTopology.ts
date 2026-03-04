import rawNepalTopology from "./nepalMapData";
import {
  NEPAL_TOPOLOGY_OBJECT_NAMES,
  type LocalUnitType,
  type NepalTopology,
  type NepalTopologyObjectName,
  type ProtectedAreaType,
} from "../types/domain";
import { STANDARD_PROVINCE_NAMES_BY_NUMBER } from "../constants/provinces";

type TopologyObjectRecord = Record<string, unknown>;
type PropertyRecord = Record<string, unknown>;

const KNOWN_LOCAL_UNIT_TYPES: readonly LocalUnitType[] = [
  "Gaunpalika",
  "Nagarpalika",
  "Upamahanagarpalika",
  "Mahanagarpalika",
];

const KNOWN_PROTECTED_AREA_TYPES: readonly ProtectedAreaType[] = [
  "Development Area",
  "Hunting Reserve",
  "National Park",
  "Watershed and Wildlife Reserve",
  "Wildlife Reserve",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  return "";
}

function coerceBoolLike(value: unknown): boolean | string | number {
  if (value === true || value === false) return value;
  if (value === 1 || value === 0) return value;
  if (value === "1" || value === "0") return value;

  const asText = normalizeText(value).toLowerCase();
  if (asText === "true") return true;
  if (asText === "false") return false;

  return value as boolean | string | number;
}

function normalizeEnumValue<T extends readonly string[]>(
  value: unknown,
  allowedValues: T,
): T[number] | undefined {
  const text = normalizeText(value);
  if (!text) return undefined;

  for (const candidate of allowedValues) {
    if (candidate.toLowerCase() === text.toLowerCase()) {
      return candidate;
    }
  }

  return undefined;
}

function normalizeProvinceNumber(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(Math.trunc(value));
  }

  const text = normalizeText(value);
  if (!text) {
    return "";
  }

  const numeric = Number(text);
  if (Number.isFinite(numeric) && Number.isInteger(numeric)) {
    return String(numeric);
  }

  return text;
}

function getStandardProvinceName(value: unknown): string | undefined {
  const provinceNo = normalizeProvinceNumber(value);
  if (!provinceNo) {
    return undefined;
  }

  return STANDARD_PROVINCE_NAMES_BY_NUMBER.get(provinceNo);
}

function normalizeProperties(
  objectName: NepalTopologyObjectName,
  rawProperties: unknown,
): PropertyRecord {
  const properties: PropertyRecord = isRecord(rawProperties)
    ? { ...rawProperties }
    : {};

  if (properties.province_no == null && properties.Province_No != null) {
    properties.province_no = properties.Province_No;
  }
  if (properties.province_name == null && properties.Province_Name != null) {
    properties.province_name = properties.Province_Name;
  }

  const standardProvinceName = getStandardProvinceName(properties.province_no);
  if (standardProvinceName) {
    properties.province_name = standardProvinceName;
  }

  if (properties.district == null && properties.DISTRICT != null) {
    properties.district = properties.DISTRICT;
  }
  if (properties.local_unit == null && properties.GaPa_NaPa != null) {
    properties.local_unit = properties.GaPa_NaPa;
  }
  if (properties.local_unit_type == null && properties.Type_GN != null) {
    properties.local_unit_type = properties.Type_GN;
  }
  if (properties.ward_no == null && properties.WARD_NO != null) {
    properties.ward_no = properties.WARD_NO;
  }

  if (objectName === "wards") {
    if (
      properties.protected_area_name == null &&
      properties.special_area_name != null
    ) {
      properties.protected_area_name = properties.special_area_name;
    }
    if (
      properties.protected_area_type == null &&
      properties.special_area_type != null
    ) {
      properties.protected_area_type = properties.special_area_type;
    }
    if (properties.special_area != null) {
      properties.special_area = coerceBoolLike(properties.special_area);
    }

    const normalizedProtectedAreaType = normalizeEnumValue(
      properties.protected_area_type,
      KNOWN_PROTECTED_AREA_TYPES,
    );
    if (normalizedProtectedAreaType) {
      properties.protected_area_type = normalizedProtectedAreaType;
    }
  }

  if (objectName === "local_units" || objectName === "wards") {
    const normalizedLocalUnitType = normalizeEnumValue(
      properties.local_unit_type,
      KNOWN_LOCAL_UNIT_TYPES,
    );
    if (normalizedLocalUnitType) {
      properties.local_unit_type = normalizedLocalUnitType;
    }
  }

  return properties;
}

function normalizeGeometryProperties(
  objectName: NepalTopologyObjectName,
  object: Record<string, unknown>,
): void {
  const geometries = object.geometries;
  if (!Array.isArray(geometries)) {
    throw new Error(
      `Invalid Nepal topology: object '${objectName}' must include geometries.`,
    );
  }

  for (const geometry of geometries) {
    if (!isRecord(geometry)) continue;
    geometry.properties = normalizeProperties(objectName, geometry.properties);
  }
}

function normalizeObjects(
  input: Record<string, unknown>,
): TopologyObjectRecord {
  const normalized: TopologyObjectRecord = { ...input };

  if (!normalized.local_units && normalized.localUnits) {
    normalized.local_units = normalized.localUnits;
  }

  for (const objectName of NEPAL_TOPOLOGY_OBJECT_NAMES) {
    const object = normalized[objectName];
    if (isRecord(object)) {
      normalizeGeometryProperties(objectName, object);
    }
  }

  return normalized;
}

function assertRequiredObjects(objects: TopologyObjectRecord): void {
  for (const key of NEPAL_TOPOLOGY_OBJECT_NAMES) {
    const object = objects[key];
    if (!isRecord(object)) {
      throw new Error(`Invalid Nepal topology: missing object '${key}'.`);
    }

    const objectType = object.type;
    if (objectType !== "GeometryCollection") {
      throw new Error(
        `Invalid Nepal topology: object '${key}' must be a GeometryCollection.`,
      );
    }
  }
}

export function parseNepalTopology(input: unknown): NepalTopology {
  if (!isRecord(input)) {
    throw new Error("Invalid Nepal topology: expected an object.");
  }

  if (input.type !== "Topology") {
    throw new Error("Invalid Nepal topology: root type must be 'Topology'.");
  }

  const rawObjects = input.objects;
  if (!isRecord(rawObjects)) {
    throw new Error("Invalid Nepal topology: missing 'objects' map.");
  }

  const normalizedObjects = normalizeObjects(rawObjects);
  assertRequiredObjects(normalizedObjects);

  return {
    ...(input as unknown as NepalTopology),
    objects: normalizedObjects as unknown as NepalTopology["objects"],
  };
}

const validatedNepalTopology = parseNepalTopology(rawNepalTopology);

export function getNepalTopology(): NepalTopology {
  return validatedNepalTopology;
}
