/// <reference types="@cloudflare/workers-types" />
import webpush, { type PushSubscription } from "web-push";

interface Env {
  BASE_URL: string;
  CRON_SECRET: string;
  PUSH_DISPATCH_TOKEN?: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  VAPID_SUBJECT?: string;
}

type PushPayload = {
  title?: string;
  body?: string;
  url: string;
  tag?: string;
  icon?: string;
  badge?: string;
};

type SubscriptionRow = {
  id: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

function ensureConfigured(env: Env) {
  const subject = env.VAPID_SUBJECT || "mailto:admin@example.com";
  webpush.setVapidDetails(subject, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
}

function supabaseHeaders(env: Env): Record<string, string> {
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

async function fetchSubscriptions(liveblogId: string, env: Env): Promise<SubscriptionRow[]> {
  const url = new URL("/rest/v1/push_subscriptions", env.SUPABASE_URL);
  url.searchParams.set("liveblog_id", `eq.${liveblogId}`);
  url.searchParams.set("limit", "10000");

  const res = await fetch(url.toString(), {
    headers: supabaseHeaders(env),
  });
  if (!res.ok) {
    throw new Error(`subscription_fetch_failed:${res.status}`);
  }
  const json = (await res.json()) as SubscriptionRow[];
  return Array.isArray(json) ? json : [];
}

async function markDelivered(id: string, env: Env) {
  const url = new URL("/rest/v1/push_subscriptions", env.SUPABASE_URL);
  url.searchParams.set("id", `eq.${id}`);
  await fetch(url.toString(), {
    method: "PATCH",
    headers: supabaseHeaders(env),
    body: JSON.stringify({ last_notified_at: new Date().toISOString() }),
  }).catch(() => {});
}

async function removeSubscription(id: string, env: Env) {
  const url = new URL("/rest/v1/push_subscriptions", env.SUPABASE_URL);
  url.searchParams.set("id", `eq.${id}`);
  await fetch(url.toString(), {
    method: "DELETE",
    headers: supabaseHeaders(env),
  }).catch(() => {});
}

function extractStatus(error: unknown): number {
  if (typeof error === "object" && error !== null) {
    const maybe = error as { statusCode?: number; status?: number };
    const fromStatusCode = typeof maybe.statusCode === "number" ? maybe.statusCode : undefined;
    const fromStatus = typeof maybe.status === "number" ? maybe.status : undefined;
    return fromStatusCode ?? fromStatus ?? 0;
  }
  return 0;
}

async function dispatchPush(liveblogId: string, payload: PushPayload, env: Env) {
  ensureConfigured(env);
  const subs = await fetchSubscriptions(liveblogId, env);
  if (!subs.length) {
    return { delivered: 0, failed: 0 };
  }

  const body = JSON.stringify(payload);
  let delivered = 0;
  let failed = 0;

  await Promise.all(
    subs.map(async (row) => {
      try {
        const subscription: PushSubscription = {
          endpoint: row.endpoint,
          keys: row.keys,
        };
        await webpush.sendNotification(subscription, body);
        delivered += 1;
        await markDelivered(row.id, env);
      } catch (err) {
        failed += 1;
        const status = extractStatus(err);
        if (status === 404 || status === 410) {
          await removeSubscription(row.id, env);
        }
      }
    }),
  );

  return { delivered, failed };
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    // Optional bearer token guard for dispatcher endpoint
    const token = env.PUSH_DISPATCH_TOKEN || "";
    if (url.pathname.startsWith("/notify/") && token) {
      const auth = req.headers.get("authorization") || "";
      if (!auth.startsWith("Bearer ") || auth.slice(7) !== token) {
        return new Response("unauthorized", { status: 401 });
      }
    }

    if (req.method === "POST" && url.pathname.startsWith("/notify/")) {
      const liveblogId = url.pathname.split("/").pop() || "";
      const parsed = await req.json().catch(() => null) as unknown;
      const payload =
        parsed && typeof parsed === "object" && parsed !== null && "payload" in parsed
          ? (parsed as { payload: unknown }).payload
          : null;
      const payloadObj =
        payload && typeof payload === "object"
          ? (payload as PushPayload)
          : null;
      if (!liveblogId || !payloadObj || typeof payloadObj.url !== "string") {
        return new Response(JSON.stringify({ error: "invalid_payload" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      try {
        const result = await dispatchPush(liveblogId, payloadObj, env);
        return new Response(JSON.stringify({ ok: true, ...result }), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        const message =
          typeof err === "object" && err !== null && "message" in err && typeof (err as { message?: unknown }).message === "string"
            ? (err as { message: string }).message
            : "dispatch_failed";
        return new Response(JSON.stringify({ ok: false, error: message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    return new Response("OK", { status: 200, headers: { "content-type": "text/plain" } });
  },

  async scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
    const base = env.BASE_URL?.replace(/\/$/, "") || "";
    if (!base) return;

    const headers = { "X-CRON-SECRET": env.CRON_SECRET } as Record<string, string>;
    const endpoints = [
      "/api/matches/sync",
      "/api/matches/complete",
      "/api/liveblogs/publish/scheduled",
    ];

    await Promise.all(
      endpoints.map((p) => fetch(base + p, { method: "POST", headers })),
    );
  },
} satisfies ExportedHandler<Env>;
