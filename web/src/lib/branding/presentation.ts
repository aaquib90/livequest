import type { CornerStyle, SurfaceStyle } from "./types";

export const CORNER_CLASS_MAP: Record<CornerStyle | string, string> = {
  rounded: "rounded-3xl",
  pill: "rounded-[2.5rem]",
  square: "rounded-2xl",
};

export const SURFACE_CLASS_MAP: Record<SurfaceStyle | string, string> = {
  glass: "border border-border/50 bg-background/60 backdrop-blur",
  solid: "border border-border/70 bg-background",
  contrast: "border border-border/40 bg-background/90",
};

export function accentOverlay(accentHex: string, alpha = 0.15): string {
  const normalized = accentHex.replace("#", "");
  const value = normalized.length === 3 ? normalized.split("").map((char) => char + char).join("") : normalized;
  const intValue = parseInt(value, 16);
  const r = (intValue >> 16) & 255;
  const g = (intValue >> 8) & 255;
  const b = intValue & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
