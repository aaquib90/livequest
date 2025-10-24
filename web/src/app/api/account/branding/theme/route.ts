import { NextResponse } from "next/server";

import { DEFAULT_BRANDING } from "@/lib/branding/constants";
import { normaliseBranding } from "@/lib/branding/utils";
import { createClient } from "@/lib/supabase/serverClient";

import { sanitiseThemePayload, THEME_DEFAULTS } from "../../../account/customization/server-utils";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { palettePreset, cornerStyle, surfaceStyle, accentColor } = sanitiseThemePayload({
      palettePreset: body.palettePreset,
      cornerStyle: body.cornerStyle,
      surfaceStyle: body.surfaceStyle,
      accentColor: body.accentColor,
    });

    const existingRaw = await supabase
      .rpc("account_branding")
      .then(({ data }) => (Array.isArray(data) ? data[0] ?? null : data))
      .catch(() => null);
    const existing = existingRaw
      ? normaliseBranding(existingRaw)
      : { ...DEFAULT_BRANDING, account_id: user.id };

    const { error } = await supabase
      .from("account_branding")
      .upsert({
        account_id: user.id,
        palette_preset: palettePreset ?? THEME_DEFAULTS.palette,
        corner_style: cornerStyle ?? THEME_DEFAULTS.corner,
        surface_style: surfaceStyle ?? THEME_DEFAULTS.surface,
        accent_color: accentColor,
        watermark: existing.watermark,
        logo_path: existing.logo_path,
        background_path: existing.background_path,
        options: existing.options ?? {},
      })
      .select("*")
      .single();

    if (error) {
      console.error("Failed to save branding theme", error);
      return NextResponse.json({ error: "Unable to save theme" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      branding: normaliseBranding({
        ...existing,
        palette_preset: palettePreset,
        corner_style: cornerStyle,
        surface_style: surfaceStyle,
        accent_color: accentColor,
      }),
    });
  } catch (error) {
    console.error("Unexpected error saving branding theme", error);
    return NextResponse.json({ error: "Unable to save theme" }, { status: 500 });
  }
}
