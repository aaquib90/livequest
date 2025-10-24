import { DEFAULT_BRANDING, DEFAULT_PALETTE, PALETTE_PRESETS } from "./constants";
import type { AccountBranding, CornerStyle, PalettePresetKey, SurfaceStyle } from "./types";

export function normaliseBranding(branding: AccountBranding | null | undefined): AccountBranding {
  if (!branding) return DEFAULT_BRANDING;
  return {
    ...DEFAULT_BRANDING,
    ...branding,
    palette_preset: (branding.palette_preset || DEFAULT_PALETTE) as PalettePresetKey,
    corner_style: (branding.corner_style || DEFAULT_BRANDING.corner_style) as CornerStyle,
    surface_style: (branding.surface_style || DEFAULT_BRANDING.surface_style) as SurfaceStyle,
  };
}

export function resolveAccentColor(branding: AccountBranding | null | undefined): string {
  if (branding?.accent_color) return branding.accent_color;
  const preset = (branding?.palette_preset || DEFAULT_PALETTE) as PalettePresetKey;
  return PALETTE_PRESETS[preset]?.accent ?? PALETTE_PRESETS[DEFAULT_PALETTE].accent;
}
