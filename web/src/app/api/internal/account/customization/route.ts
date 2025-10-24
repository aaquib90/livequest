import { NextRequest, NextResponse } from "next/server";

import { fetchAccountFeaturesForUser } from "@/lib/billing/server";
import { fetchAccountBrandingForUser } from "@/lib/branding/server";
import { normaliseBranding } from "@/lib/branding/utils";
import { createClient } from "@/lib/supabase/serverClient";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const features = await fetchAccountFeaturesForUser(supabase).catch(() => null);
    const brandingRaw = await fetchAccountBrandingForUser(supabase).catch(() => null);
    const normalized = normaliseBranding(brandingRaw ?? undefined);
    const branding = normalized.account_id ? normalized : { ...normalized, account_id: user.id };

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        user_metadata: user.user_metadata ?? {},
      },
      features,
      branding,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal_error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
