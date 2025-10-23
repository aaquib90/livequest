import { NextRequest, NextResponse } from "next/server";

import { fetchAccountFeaturesForUser } from "@/lib/billing/server";
import { stripeRequest, requireStripeSecret, StripeApiError } from "@/lib/billing/stripeEdge";
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

    const stripeSecret = requireStripeSecret();
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
      const customerParams = new URLSearchParams();
      if (user.email) customerParams.set("email", user.email);
      customerParams.set("metadata[supabase_account_id]", user.id);
      const customer = await stripeRequest<{ id: string }>(stripeSecret, "/v1/customers", customerParams);
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
    const sessionParams = new URLSearchParams();
    sessionParams.set("mode", "subscription");
    sessionParams.set("client_reference_id", user.id);
    sessionParams.set("success_url", `${origin}/account?status=checkout-success`);
    sessionParams.set("cancel_url", `${origin}/account?status=checkout-canceled`);
    sessionParams.set("allow_promotion_codes", "true");
    sessionParams.set("billing_address_collection", "auto");
    sessionParams.set("line_items[0][price]", priceId);
    sessionParams.set("line_items[0][quantity]", "1");
    sessionParams.set("subscription_data[metadata][supabase_account_id]", user.id);
    sessionParams.set("metadata[supabase_account_id]", user.id);
    if (stripeCustomerId) {
      sessionParams.set("customer", stripeCustomerId);
    }

    const session = await stripeRequest<{ url?: string }>(
      stripeSecret,
      "/v1/checkout/sessions",
      sessionParams,
    );

    if (!session.url) {
      return NextResponse.json({ error: "session_creation_failed" }, { status: 500 });
    }

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err) {
    console.error("stripe_checkout_error", err);
    if (err instanceof StripeApiError) {
      return NextResponse.json(
        { error: err.message, code: err.code ?? null, detail: (err as any)?.response ?? null },
        { status: err.status },
      );
    }
    const message = err instanceof Error ? err.message : "server_error";
    return NextResponse.json({ error: message, detail: JSON.stringify(err) }, { status: 500 });
  }
}
