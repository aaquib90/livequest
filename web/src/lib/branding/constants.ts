import type { AccountBranding, CornerStyle, PalettePresetKey, ReactionConfig, SurfaceStyle } from "./types";

export const PALETTE_PRESETS: Record<PalettePresetKey, { accent: string; name: string }> = {
  violet: { accent: "#8B5CF6", name: "Electric violet" },
  teal: { accent: "#14B8A6", name: "Coastal teal" },
  amber: { accent: "#F59E0B", name: "Sunrise amber" },
  rose: { accent: "#F97393", name: "Editorial rose" },
};

export const DEFAULT_PALETTE: PalettePresetKey = "violet";
export const DEFAULT_CORNER_STYLE: CornerStyle = "rounded";
export const DEFAULT_SURFACE_STYLE: SurfaceStyle = "glass";

export const DEFAULT_REACTIONS: ReactionConfig[] = [
  { id: "smile", type: "emoji", label: "Smile", emoji: "😊" },
  { id: "heart", type: "emoji", label: "Heart", emoji: "❤️" },
  { id: "thumbs_up", type: "emoji", label: "Thumbs up", emoji: "👍" },
];

export const DEFAULT_BRANDING: AccountBranding = {
  account_id: "",
  palette_preset: DEFAULT_PALETTE,
  accent_color: null,
  corner_style: DEFAULT_CORNER_STYLE,
  surface_style: DEFAULT_SURFACE_STYLE,
  watermark: null,
  logo_path: null,
  background_path: null,
  reactions: DEFAULT_REACTIONS,
  options: {},
  updated_by: null,
  created_at: new Date(0).toISOString(),
  updated_at: new Date(0).toISOString(),
};
