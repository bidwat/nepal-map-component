import type { ViewLevel } from "../types";

export function getMapAriaLabel(
  ariaLabel: string,
  viewLevel: ViewLevel,
): string {
  return `${ariaLabel} (${viewLevel.replace("_", " ")})`;
}
