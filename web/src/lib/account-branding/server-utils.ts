const ALLOWED_PALETTES = new Set(["violet", "teal", "amber", "rose"]);
const ALLOWED_CORNERS = new Set(["rounded", "pill", "square"]);
const ALLOWED_SURFACES = new Set(["glass", "solid", "contrast"]);

export const THEME_DEFAULTS = {
  palette: "violet",
  corner: "rounded",
  surface: "glass",
} as const;

export function sanitiseHexColor(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(trimmed);
  if (!match) return null;
  return trimmed.toUpperCase();
}

export function sanitiseBoundedText(value: string | null | undefined, limit = 200): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, limit);
}

export function sanitiseThemePayload(payload: {
  palettePreset?: string | null;
  cornerStyle?: string | null;
  surfaceStyle?: string | null;
  accentColor?: string | null;
}) {
  const paletteCandidate = String(payload.palettePreset ?? THEME_DEFAULTS.palette).toLowerCase();
  const cornerCandidate = String(payload.cornerStyle ?? THEME_DEFAULTS.corner).toLowerCase();
  const surfaceCandidate = String(payload.surfaceStyle ?? THEME_DEFAULTS.surface).toLowerCase();
  const accentCandidate = sanitiseHexColor(payload.accentColor ?? null);

  return {
    palettePreset: ALLOWED_PALETTES.has(paletteCandidate) ? paletteCandidate : THEME_DEFAULTS.palette,
    cornerStyle: ALLOWED_CORNERS.has(cornerCandidate) ? cornerCandidate : THEME_DEFAULTS.corner,
    surfaceStyle: ALLOWED_SURFACES.has(surfaceCandidate) ? surfaceCandidate : THEME_DEFAULTS.surface,
    accentColor: accentCandidate,
  } as const;
}

export { ALLOWED_PALETTES, ALLOWED_CORNERS, ALLOWED_SURFACES };
