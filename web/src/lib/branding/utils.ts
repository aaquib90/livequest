import { DEFAULT_BRANDING, DEFAULT_PALETTE, DEFAULT_REACTIONS, PALETTE_PRESETS } from "./constants";
import type {
  AccountBranding,
  CornerStyle,
  PalettePresetKey,
  ReactionConfig,
  ReactionKind,
  SurfaceStyle,
} from "./types";

export function normaliseBranding(branding: AccountBranding | null | undefined): AccountBranding {
  if (!branding) return DEFAULT_BRANDING;
  return {
    ...DEFAULT_BRANDING,
    ...branding,
    palette_preset: (branding.palette_preset || DEFAULT_PALETTE) as PalettePresetKey,
    corner_style: (branding.corner_style || DEFAULT_BRANDING.corner_style) as CornerStyle,
    surface_style: (branding.surface_style || DEFAULT_BRANDING.surface_style) as SurfaceStyle,
    reactions: normaliseReactions(branding.reactions),
  };
}

export function resolveAccentColor(branding: AccountBranding | null | undefined): string {
  if (branding?.accent_color) return branding.accent_color;
  const preset = (branding?.palette_preset || DEFAULT_PALETTE) as PalettePresetKey;
  return PALETTE_PRESETS[preset]?.accent ?? PALETTE_PRESETS[DEFAULT_PALETTE].accent;
}

export function normaliseReactions(value: unknown): ReactionConfig[] {
  const input = Array.isArray(value) ? value : [];
  const output: ReactionConfig[] = [];
  const seen = new Set<string>();

  const ensureUniqueId = (base: string) => {
    let candidate = base.slice(0, 64);
    if (!candidate) candidate = "reaction";
    let unique = candidate;
    let counter = 1;
    while (seen.has(unique)) {
      unique = `${candidate}-${counter}`;
      counter += 1;
    }
    seen.add(unique);
    return unique;
  };

  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const type = resolveReactionType((raw as any).type);
    let label = typeof (raw as any).label === "string" ? (raw as any).label.trim() : "";
    if (!label) {
      if (type === "emoji") {
        label = "Emoji";
      } else {
        label = "Emote";
      }
    }
    label = label.slice(0, 48);

    if (type === "emoji") {
      const emojiRaw = typeof (raw as any).emoji === "string" ? (raw as any).emoji.trim() : "";
      if (!emojiRaw) continue;
      const idSource =
        typeof (raw as any).id === "string"
          ? (raw as any).id
          : slugifyReactionId(emojiRaw) || slugifyReactionId(label) || "";
      const id = ensureUniqueId(idSource || "emoji");
      output.push({
        id,
        type: "emoji",
        label,
        emoji: emojiRaw,
      });
    } else {
      const imagePath =
        typeof (raw as any).image_path === "string"
          ? sanitiseStoragePath((raw as any).image_path.trim())
          : null;
      if (!imagePath) continue;
      const idSource =
        typeof (raw as any).id === "string"
          ? (raw as any).id
          : slugifyReactionId(label) || slugifyReactionId(imagePath) || "";
      const id = ensureUniqueId(idSource || "emote");
      const alt =
        typeof (raw as any).alt === "string" ? (raw as any).alt.trim().slice(0, 80) : null;
      output.push({
        id,
        type: "image",
        label,
        image_path: imagePath,
        alt: alt || null,
      });
    }
    if (output.length >= 4) break;
  }

  if (!output.length) {
    return DEFAULT_REACTIONS;
  }
  return output;
}

function resolveReactionType(value: unknown): ReactionKind {
  return value === "image" ? "image" : "emoji";
}

function slugifyReactionId(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized.slice(0, 48);
}

function sanitiseStoragePath(path: string): string | null {
  if (!path) return null;
  if (path.includes("..")) return null;
  if (/^https?:\/\//i.test(path)) return null;
  if (!/^[\w\-\/.]+$/.test(path)) return null;
  return path.slice(0, 160);
}
