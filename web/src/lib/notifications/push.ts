import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/adminClient";

type PushPayload = {
  title?: string;
  body?: string;
  url: string;
  tag?: string;
  icon?: string;
  badge?: string;
};

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

let configured = false;
function ensureConfigured() {
  if (configured) return;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    throw new Error("VAPID keys are not configured");
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  configured = true;
}

export async function sendPushToLiveblog(liveblogId: string, payload: PushPayload): Promise<void> {
  ensureConfigured();
  const supa = createAdminClient();
  const { data: subs } = await supa
    .from("push_subscriptions")
    .select("id, endpoint, keys")
    .eq("liveblog_id", liveblogId)
    .limit(10000);
  if (!subs || subs.length === 0) return;

  const notifications = subs.map(async (row: any) => {
    try {
      const subscription = {
        endpoint: row.endpoint,
        keys: row.keys,
      } as any;
      await webpush.sendNotification(subscription, JSON.stringify(payload));
      await supa
        .from("push_subscriptions")
        .update({ last_notified_at: new Date().toISOString() })
        .eq("id", row.id);
    } catch (err: any) {
      const status = err?.statusCode || err?.status || 0;
      if (status === 404 || status === 410) {
        await supa.from("push_subscriptions").delete().eq("id", row.id);
      }
    }
  });

  await Promise.allSettled(notifications);
}

export type { PushPayload };


