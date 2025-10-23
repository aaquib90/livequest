import { NextRequest, NextResponse } from "next/server";

import { fetchAccountFeaturesForUser } from "@/lib/billing/server";
import { getStripeClient } from "@/lib/stripe";
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

    const stripe = getStripeClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${req.nextUrl.origin}/account`,
    });

    if (!session.url) {
      return NextResponse.json({ error: "portal_creation_failed" }, { status: 500 });
    }

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err) {
    console.error("stripe_portal_error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "server_error" },
      { status: 500 },
    );
  }
}
