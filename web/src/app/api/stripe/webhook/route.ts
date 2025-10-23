import { NextRequest, NextResponse } from "next/server";

import { verifyStripeSignature } from "@/lib/billing/stripeEdge";
import { createAdminClient } from "@/lib/supabase/adminClient";

export const runtime = "edge";

type AdminClient = ReturnType<typeof createAdminClient>;

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("stripe_webhook_secret_missing");
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 500 });
  }
  if (!signature) {
    return NextResponse.json({ error: "signature_missing" }, { status: 400 });
  }

  let event: StripeEvent;
  try {
    const payload = await req.text();
    await verifyStripeSignature(payload, signature, webhookSecret);
    event = JSON.parse(payload) as StripeEvent;
  } catch (err) {
    console.error("stripe_webhook_signature_error", err);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await upsertSubscriptionFromStripe(event.data.object as StripeSubscription, admin, event.id);
        break;
      case "checkout.session.completed":
        await syncCheckoutSession(event.data.object as StripeCheckoutSession, admin, event.id);
        break;
      default:
        break;
    }
  } catch (err) {
    console.error("stripe_webhook_processing_error", err);
    return NextResponse.json({ error: "webhook_processing_failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

async function upsertSubscriptionFromStripe(
  subscription: StripeSubscription,
  admin: AdminClient,
  eventId: string,
) {
  const accountId =
    getAccountIdFromMetadata(subscription.metadata) ||
    (await lookupAccountIdBySubscription(admin, subscription.id)) ||
    (await lookupAccountIdByCustomer(
      admin,
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer?.id ?? null,
    ));

  if (!accountId) {
    console.warn("stripe_subscription_missing_account", subscription.id);
    return;
  }

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id ?? null;

  const priceId = subscription.items?.data?.[0]?.price?.id ?? null;
  const plan = resolvePlanFromPrice(priceId);
  const currentPeriodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;

  const payload = {
    account_id: accountId,
    plan,
    status: subscription.status ?? "incomplete",
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    price_id: priceId,
    current_period_end: currentPeriodEnd,
    cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
    metadata: metadataToJson(subscription.metadata),
    last_event_id: eventId,
  };

  const { error } = await admin
    .from("billing_subscriptions")
    .upsert(payload, { onConflict: "account_id" });
  if (error) {
    throw error;
  }
}

async function syncCheckoutSession(
  session: StripeCheckoutSession,
  admin: AdminClient,
  eventId: string,
) {
  const accountId =
    getAccountIdFromMetadata(session.metadata) ||
    (typeof session.client_reference_id === "string" ? session.client_reference_id : null);
  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id ?? null;
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription && typeof session.subscription === "object"
        ? session.subscription.id
        : null;

  if (!accountId || !customerId) {
    return;
  }

  const payload = {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    metadata: metadataToJson(session.metadata),
    last_event_id: eventId,
  };

  const { data: updatedRows, error: updateError } = await admin
    .from("billing_subscriptions")
    .update(payload)
    .eq("account_id", accountId)
    .select("account_id");

  if (updateError) {
    throw updateError;
  }

  if (!updatedRows?.length) {
    const { error: insertError } = await admin
      .from("billing_subscriptions")
      .insert({
        account_id: accountId,
        plan: "free",
        status: "inactive",
        ...payload,
      });
    if (insertError) {
      throw insertError;
    }
  }
}

function getAccountIdFromMetadata(metadata: StripeMetadata): string | null {
  if (!metadata) return null;
  const candidate =
    metadata.supabase_account_id ??
    metadata.account_id ??
    metadata.user_id ??
    metadata.userId ??
    null;
  return typeof candidate === "string" && candidate.length ? candidate : null;
}

async function lookupAccountIdBySubscription(
  admin: AdminClient,
  subscriptionId: string | null,
): Promise<string | null> {
  if (!subscriptionId) return null;
  const { data, error } = await admin
    .from("billing_subscriptions")
    .select("account_id")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();
  if (error) throw error;
  const accountId = data?.account_id;
  return typeof accountId === "string" ? accountId : null;
}

async function lookupAccountIdByCustomer(
  admin: AdminClient,
  customerId: string | null,
): Promise<string | null> {
  if (!customerId) return null;
  const { data, error } = await admin
    .from("billing_subscriptions")
    .select("account_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (error) throw error;
  const accountId = data?.account_id;
  return typeof accountId === "string" ? accountId : null;
}

function resolvePlanFromPrice(priceId: string | null): string {
  if (!priceId) return "free";
  const monthlyPrice = process.env.STRIPE_PRICE_MONTHLY;
  if (monthlyPrice && priceId === monthlyPrice) {
    return "pro_monthly";
  }
  return "paid";
}

function metadataToJson(metadata: StripeMetadata): Record<string, string> {
  if (!metadata) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (typeof value === "string") {
      out[key] = value;
    }
  }
  return out;
}

type StripeMetadata = Record<string, string | null | undefined> | null | undefined;

type StripeEvent = {
  id: string;
  type: string;
  data: {
    object: unknown;
  };
};

type StripeSubscription = {
  id: string;
  status?: string | null;
  metadata?: StripeMetadata;
  items?: {
    data: Array<{
      price?: {
        id?: string | null;
      } | null;
    }>;
  };
  customer?: string | { id?: string | null } | null;
  current_period_end?: number | null;
  cancel_at_period_end?: boolean | null;
};

type StripeCheckoutSession = {
  metadata?: StripeMetadata;
  client_reference_id?: string | null;
  customer?: string | { id?: string | null } | null;
  subscription?: string | { id?: string | null } | null;
};
