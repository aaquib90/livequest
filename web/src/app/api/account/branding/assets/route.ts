import { NextResponse } from "next/server";

import { fetchAccountFeaturesForUser } from "@/lib/billing/server";
import { DEFAULT_BRANDING } from "@/lib/branding/constants";
import { normaliseBranding } from "@/lib/branding/utils";
import { createClient } from "@/lib/supabase/serverClient";

import { sanitiseBoundedText } from "@/lib/account-branding/server-utils";

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

    const features = await fetchAccountFeaturesForUser(supabase).catch(() => null);
    if (!features?.can_use_premium_themes) {
      return NextResponse.json({ error: "Premium plan required" }, { status: 402 });
    }

    const existingRaw = await supabase
      .rpc("account_branding")
      .then(({ data }) => (Array.isArray(data) ? data[0] ?? null : data))
      .catch(() => null);
    const existing = existingRaw
      ? normaliseBranding(existingRaw)
      : { ...DEFAULT_BRANDING, account_id: user.id };

    const logoPath = sanitiseBoundedText(body.logoPath ?? null, 500);
    const backgroundPath = sanitiseBoundedText(body.backgroundPath ?? null, 500);
    const watermark = sanitiseBoundedText(body.watermark ?? null, 80);

    const { error } = await supabase
      .from("account_branding")
      .upsert({
        account_id: user.id,
        palette_preset: existing.palette_preset,
        corner_style: existing.corner_style,
        surface_style: existing.surface_style,
        accent_color: existing.accent_color,
        watermark,
        logo_path: logoPath,
        background_path: backgroundPath,
        options: existing.options ?? {},
      })
      .select("*")
      .single();

    if (error) {
      console.error("Failed to save brand assets", error);
      return NextResponse.json({ error: "Unable to save brand assets" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      branding: normaliseBranding({
        ...existing,
        watermark,
        logo_path: logoPath,
        background_path: backgroundPath,
      }),
    });
  } catch (error) {
    console.error("Unexpected error saving brand assets", error);
    return NextResponse.json({ error: "Unable to save brand assets" }, { status: 500 });
  }
}
