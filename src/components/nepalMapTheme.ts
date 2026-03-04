import type { NepalMapTheme } from "../types";

export const defaultTheme: NepalMapTheme = {
  primary: "#D9DDE4",
  disabled: "#BFC6D3",
  hover: "#8FB3FF",
  selected: "#5A8BFF",
  background: "transparent",
  stroke: "#596579",
  strokeWidth: 0.65,
};

export function mergeTheme(theme?: Partial<NepalMapTheme>): NepalMapTheme {
  return { ...defaultTheme, ...theme };
}
