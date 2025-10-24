import { NextRequest, NextResponse } from "next/server";
import { supabaseEnsure } from "@/lib/supabase/gatewayClient";
import { formatDiscordMessage, postToDiscord, type UpdateContent } from "@/lib/integrations/discord";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get("x-cron-secret") || "";
    const expected = process.env.CRON_SECRET || "";
    if (!expected || secret !== expected) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const limit = Math.max(1, Math.min(100, Number((await req.json().catch(() => ({})))?.limit || 50)));

    const due = await supabaseEnsure<Array<{ id: string; liveblog_id: string; content: UpdateContent }>>(req, {
      action: "select",
      table: "updates",
      columns: "id,liveblog_id,content",
      filters: [
        { column: "status", op: "eq", value: "scheduled" },
        { column: "scheduled_at", op: "lte", value: new Date().toISOString() },
        { column: "deleted_at", op: "is", value: null },
      ],
      order: { column: "scheduled_at", ascending: true },
      limit,
    });

    const publishedIds: string[] = [];
    for (const row of due || []) {
      const updateResult = await supabaseEnsure(req, {
        action: "update",
        table: "updates",
        values: { status: "published", published_at: new Date().toISOString() },
        filters: [
          { column: "id", op: "eq", value: row.id },
          { column: "status", op: "eq", value: "scheduled" },
        ],
        returning: "minimal",
      }).catch(() => null);
      if (updateResult === null) continue;
      publishedIds.push(row.id);

      const lb = await supabaseEnsure<{ settings: Record<string, unknown> } | null>(req, {
        action: "select",
        table: "liveblogs",
        columns: "settings",
        filters: [{ column: "id", op: "eq", value: row.liveblog_id }],
        single: true,
      });
      const webhook = (lb?.settings as any)?.discord_webhook_url as string | undefined;
      if (webhook) {
        let publicImageUrl: string | undefined;
        const content = row.content as UpdateContent;
        if (content && typeof content === "object" && "type" in content && (content as any).type === "image") {
          const path = (content as any).path as string;
          const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
          if (baseUrl && path) {
            publicImageUrl = `${baseUrl}/storage/v1/object/public/media/${encodeURI(path)}`;
          }
        }
        const payload = formatDiscordMessage(content, { publicImageUrl });
        if (payload) await postToDiscord(webhook, payload);
      }

      // Forward push notification
      try {
        const site = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
        const text = (row.content as any)?.title || (typeof (row.content as any)?.text === "string" ? (row.content as any).text : "New update");
        const payload = {
          title: "New live update",
          body: String(text).slice(0, 140),
          url: site ? `${site}/embed/${row.liveblog_id}` : "",
          tag: `lb-${row.liveblog_id}`,
          icon: "/favicon.svg",
          badge: "/favicon.svg",
        };
        const dispatcher = process.env.PUSH_DISPATCH_URL || "";
        if (dispatcher && payload.url) {
          await fetch(new URL(`/notify/${row.liveblog_id}`, dispatcher).toString(), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(process.env.PUSH_DISPATCH_TOKEN ? { Authorization: `Bearer ${process.env.PUSH_DISPATCH_TOKEN}` } : {}),
            },
            body: JSON.stringify({ payload }),
            // Fire-and-forget; dispatcher handles delivery
          }).catch(() => {});
        }
      } catch {}
    }

    return NextResponse.json({ ok: true, published: publishedIds.length });
  } catch (err) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
