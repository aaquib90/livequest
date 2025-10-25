"use server";

import { redirect } from "next/navigation";

import { fetchAccountFeaturesForUser } from "@/lib/billing/server";
import { DEFAULT_BRANDING, DEFAULT_PALETTE } from "@/lib/branding/constants";
import { fetchAccountBrandingForUser } from "@/lib/branding/server";
import { normaliseBranding, normaliseReactions } from "@/lib/branding/utils";
import { createClient } from "@/lib/supabase/serverClient";

const ALLOWED_PALETTES = new Set(["violet", "teal", "amber", "rose"]);
const ALLOWED_CORNERS = new Set(["rounded", "pill", "square"]);
const ALLOWED_SURFACES = new Set(["glass", "solid", "contrast", "liquid"]);
const NSFW_TERMS = [
  "nsfw",
  "nude",
  "porn",
  "xxx",
  "sex",
  "boob",
  "butt",
  "ass",
  "cock",
  "dick",
  "pussy",
  "cum",
];
const ALLOWED_IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif"]);

function sanitiseHexColor(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(trimmed);
  if (!match) return null;
  return trimmed.toUpperCase();
}

function sanitiseBoundedText(value: string | null | undefined, limit = 200): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, limit);
}

export async function updateBrandingTheme(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return redirect("/signin");
  }

  const paletteCandidate = String(formData.get("palettePreset") || DEFAULT_PALETTE).toLowerCase();
  const cornerCandidate = String(formData.get("cornerStyle") || DEFAULT_BRANDING.corner_style).toLowerCase();
  const surfaceCandidate = String(formData.get("surfaceStyle") || DEFAULT_BRANDING.surface_style).toLowerCase();
  const accentCandidate = sanitiseHexColor(String(formData.get("accentColor") || "").toLowerCase());

  const palette = ALLOWED_PALETTES.has(paletteCandidate) ? paletteCandidate : DEFAULT_PALETTE;
  const corner = ALLOWED_CORNERS.has(cornerCandidate) ? cornerCandidate : DEFAULT_BRANDING.corner_style;
  const surface = ALLOWED_SURFACES.has(surfaceCandidate)
    ? surfaceCandidate
    : DEFAULT_BRANDING.surface_style;

  const existingRaw = await fetchAccountBrandingForUser(supabase).catch(() => null);
  const existing = normaliseBranding(existingRaw ?? { ...DEFAULT_BRANDING, account_id: user.id });

  const { error } = await supabase
    .from("account_branding")
    .upsert({
      account_id: user.id,
      palette_preset: palette,
      accent_color: accentCandidate,
      corner_style: corner,
      surface_style: surface,
      watermark: existing.watermark,
      logo_path: existing.logo_path,
      background_path: existing.background_path,
      reactions: existing.reactions ?? [],
      options: existing.options ?? {},
    })
    .select("account_id")
    .single();

  if (error) {
    return redirect("/account/customization?error=theme-save");
  }

  return redirect("/account/customization?status=theme-saved");
}

export async function updateBrandAssets(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return redirect("/signin");
  }

  const features = await fetchAccountFeaturesForUser(supabase).catch(() => null);
  if (!features?.can_use_premium_themes) {
    return redirect("/account/customization?error=premium-required");
  }

  const existingRaw = await fetchAccountBrandingForUser(supabase).catch(() => null);
  const existing = normaliseBranding(existingRaw ?? { ...DEFAULT_BRANDING, account_id: user.id });

  const logoPath = sanitiseBoundedText(String(formData.get("logoPath") || ""), 500);
  const backgroundPath = sanitiseBoundedText(String(formData.get("backgroundPath") || ""), 500);
  const watermark = sanitiseBoundedText(String(formData.get("watermark") || ""), 80);

  const { error } = await supabase
    .from("account_branding")
    .upsert({
      account_id: user.id,
      palette_preset: existing.palette_preset,
      accent_color: existing.accent_color,
      corner_style: existing.corner_style,
      surface_style: existing.surface_style,
      watermark,
      logo_path: logoPath,
      background_path: backgroundPath,
      reactions: existing.reactions ?? [],
      options: existing.options ?? {},
    })
    .select("account_id")
    .single();

  if (error) {
    return redirect("/account/customization?error=brand-save");
  }

  return redirect("/account/customization?status=brand-saved");
}

type ReactionPayload = {
  id?: string | null;
  type?: string | null;
  label?: string | null;
  emoji?: string | null;
  image_path?: string | null;
  alt?: string | null;
};

export async function updateBrandReactions(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return redirect("/signin");
  }

  const rawPayload = String(formData.get("reactionsPayload") || "[]");
  let parsed: ReactionPayload[] = [];
  try {
    const json = JSON.parse(rawPayload);
    if (Array.isArray(json)) {
      parsed = json as ReactionPayload[];
    }
  } catch {
    return redirect("/account/customization?error=reactions-invalid");
  }

  const existingRaw = await fetchAccountBrandingForUser(supabase).catch(() => null);
  const existing = normaliseBranding(existingRaw ?? { ...DEFAULT_BRANDING, account_id: user.id });

  const reactions = normaliseReactions(parsed);

  if (!reactions.length) {
    return redirect("/account/customization?error=reactions-invalid");
  }

  for (const reaction of reactions) {
    const label = reaction.label.toLowerCase();
    if (NSFW_TERMS.some((term) => label.includes(term))) {
      return redirect("/account/customization?error=reactions-nsfw");
    }
    if (reaction.type === "image") {
      const path = reaction.image_path?.trim() ?? "";
      if (!path || !path.startsWith(`${user.id}/`)) {
        return redirect("/account/customization?error=reactions-invalid");
      }
      const extension = path.split(".").pop()?.toLowerCase() ?? "";
      if (!ALLOWED_IMAGE_EXTENSIONS.has(extension)) {
        return redirect("/account/customization?error=reactions-invalid");
      }
      const loweredPath = path.toLowerCase();
      if (NSFW_TERMS.some((term) => loweredPath.includes(term))) {
        return redirect("/account/customization?error=reactions-nsfw");
      }
      const alt = reaction.alt?.toLowerCase() ?? "";
      if (alt && NSFW_TERMS.some((term) => alt.includes(term))) {
        return redirect("/account/customization?error=reactions-nsfw");
      }
    }
  }

  const { error } = await supabase
    .from("account_branding")
    .upsert({
      account_id: user.id,
      palette_preset: existing.palette_preset,
      accent_color: existing.accent_color,
      corner_style: existing.corner_style,
      surface_style: existing.surface_style,
      watermark: existing.watermark,
      logo_path: existing.logo_path,
      background_path: existing.background_path,
      reactions,
      options: existing.options ?? {},
    })
    .select("account_id")
    .single();

  if (error) {
    return redirect("/account/customization?error=reactions-save");
  }

  return redirect("/account/customization?status=reactions-saved");
}
