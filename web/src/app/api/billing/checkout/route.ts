import { NextRequest, NextResponse } from "next/server";

import { fetchAccountFeaturesForUser } from "@/lib/billing/server";
import { getStripeClient } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/adminClient";
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

    const priceId = process.env.STRIPE_PRICE_MONTHLY;
    if (!priceId) {
      return NextResponse.json({ error: "stripe_price_missing" }, { status: 500 });
    }

    const features = await fetchAccountFeaturesForUser(supabase);
    if (features?.is_paid) {
      return NextResponse.json({ error: "already_subscribed" }, { status: 409 });
    }

    const stripe = getStripeClient();
    const admin = createAdminClient();

    const { data: existingSubscription } = await admin
      .from("subscriptions", { schema: "billing" })
      .select("stripe_customer_id")
      .eq("account_id", user.id)
      .maybeSingle();

    let stripeCustomerId: string | null =
      typeof existingSubscription?.stripe_customer_id === "string"
        ? existingSubscription.stripe_customer_id
        : null;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { supabase_account_id: user.id },
      });
      stripeCustomerId = customer.id;
    }

    await admin
      .from("subscriptions", { schema: "billing" })
      .upsert(
        {
          account_id: user.id,
          stripe_customer_id: stripeCustomerId,
        },
        { onConflict: "account_id" },
      );

    const origin = req.nextUrl.origin;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      client_reference_id: user.id,
      success_url: `${origin}/account?status=checkout-success`,
      cancel_url: `${origin}/account?status=checkout-canceled`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: {
          supabase_account_id: user.id,
        },
      },
      metadata: {
        supabase_account_id: user.id,
      },
    });

    if (!session.url) {
      return NextResponse.json({ error: "session_creation_failed" }, { status: 500 });
    }

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err) {
    console.error("stripe_checkout_error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "server_error" },
      { status: 500 },
    );
  }
}
