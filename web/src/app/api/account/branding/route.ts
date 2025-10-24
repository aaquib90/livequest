import { NextResponse } from "next/server";

import { fetchAccountFeaturesForUser } from "@/lib/billing/server";
import { normaliseBranding } from "@/lib/branding/utils";
import type { AccountBranding } from "@/lib/branding/types";
import type { AccountFeatures } from "@/lib/billing/types";
import { createClient } from "@/lib/supabase/serverClient";

type BrandingResponse = {
  displayName: string;
  email: string | null;
  features: AccountFeatures | null;
  branding: AccountBranding | null;
  accountId: string;
};

export const runtime = "edge";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const features = await fetchAccountFeaturesForUser(supabase).catch(() => null);
    const brandingRaw = await supabase
      .rpc("account_branding")
      .then(({ data }) => (Array.isArray(data) ? data[0] ?? null : (data as AccountBranding | null)))
      .catch(() => null);

    const branding = brandingRaw
      ? normaliseBranding(brandingRaw)
      : null;
    const brandingWithAccount = branding ? { ...branding, account_id: branding.account_id || user.id } : null;
    const displayName =
      (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
      user.email?.split("@")[0] ||
      "Account";

    const payload: BrandingResponse = {
      displayName,
      email: user.email ?? null,
      features,
      branding: brandingWithAccount,
      accountId: user.id,
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Failed to load account branding", error);
    return NextResponse.json({ error: "Unable to load branding" }, { status: 500 });
  }
}
