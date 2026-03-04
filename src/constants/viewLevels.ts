export const VIEW_LEVEL = {
  COUNTRY: "country",
  PROVINCE: "province",
  DISTRICT: "district",
  LOCAL_UNIT: "local_unit",
  WARD: "ward",
} as const;

export type ViewLevel = (typeof VIEW_LEVEL)[keyof typeof VIEW_LEVEL];

export const VIEW_LEVELS: readonly ViewLevel[] = [
  VIEW_LEVEL.COUNTRY,
  VIEW_LEVEL.PROVINCE,
  VIEW_LEVEL.DISTRICT,
  VIEW_LEVEL.LOCAL_UNIT,
  VIEW_LEVEL.WARD,
];

export function isViewLevel(value: string): value is ViewLevel {
  return (VIEW_LEVELS as readonly string[]).includes(value);
}
