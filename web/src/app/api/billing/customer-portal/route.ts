import { NextRequest, NextResponse } from "next/server";

import { fetchAccountFeaturesForUser } from "@/lib/billing/server";
import { requireStripeSecret, stripeRequest, StripeApiError } from "@/lib/billing/stripeEdge";
import { createClient } from "@/lib/supabase/serverClient";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const features = await fetchAccountFeaturesForUser(supabase);
    const stripeCustomerId = features?.stripe_customer_id ?? null;
    if (!stripeCustomerId) {
      return NextResponse.json({ error: "no_subscription" }, { status: 404 });
    }

    const stripeSecret = requireStripeSecret();
    const params = new URLSearchParams();
    params.set("customer", stripeCustomerId);
    params.set("return_url", `${req.nextUrl.origin}/account`);

    const session = await stripeRequest<{ url?: string }>(
      stripeSecret,
      "/v1/billing_portal/sessions",
      params,
    );

    if (!session.url) {
      return NextResponse.json({ error: "portal_creation_failed" }, { status: 500 });
    }

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err) {
    console.error("stripe_portal_error", err);
    const message = err instanceof Error ? err.message : "server_error";
    const status = err instanceof StripeApiError ? err.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
