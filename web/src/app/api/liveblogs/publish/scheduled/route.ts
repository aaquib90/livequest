import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/adminClient";
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
    const supa = createAdminClient();

    const { data: due, error: qErr } = await supa
      .from("updates")
      .select("id,liveblog_id,content")
      .eq("status", "scheduled")
      .lte("scheduled_at", new Date().toISOString())
      .is("deleted_at", null)
      .order("scheduled_at", { ascending: true })
      .limit(limit);
    if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

    const publishedIds: string[] = [];
    for (const row of due || []) {
      const { error: updErr } = await supa
        .from("updates")
        .update({ status: "published", published_at: new Date().toISOString() })
        .eq("id", row.id)
        .eq("status", "scheduled");
      if (updErr) continue;
      publishedIds.push(row.id);

      const { data: lb } = await supa
        .from("liveblogs")
        .select("settings")
        .eq("id", row.liveblog_id)
        .single();
      const webhook = (lb?.settings as any)?.discord_webhook_url as string | undefined;
      if (webhook) {
        let publicImageUrl: string | undefined;
        const content = row.content as UpdateContent;
        if (content && typeof content === "object" && "type" in content && (content as any).type === "image") {
          const path = (content as any).path as string;
          const urlRes = supa.storage.from("media").getPublicUrl(path).data.publicUrl;
          if (urlRes && urlRes.startsWith("http")) publicImageUrl = urlRes;
        }
        const payload = formatDiscordMessage(content, { publicImageUrl });
        if (payload) await postToDiscord(webhook, payload);
      }
    }

    return NextResponse.json({ ok: true, published: publishedIds.length });
  } catch (err) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}


