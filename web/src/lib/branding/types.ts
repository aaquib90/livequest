export type AccountBranding = {
  account_id: string;
  palette_preset: string;
  accent_color: string | null;
  corner_style: string;
  surface_style: string;
  watermark: string | null;
  logo_path: string | null;
  background_path: string | null;
  options: Record<string, unknown>;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PalettePresetKey = "violet" | "teal" | "amber" | "rose";

export type CornerStyle = "rounded" | "pill" | "square";

export type SurfaceStyle = "glass" | "solid" | "contrast";
