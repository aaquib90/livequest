import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/serverClient";
import { formatDiscordMessage, postToDiscord, type UpdateContent } from "@/lib/integrations/discord";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const liveblogId = params.id;
    if (!liveblogId) return NextResponse.json({ error: "bad_request" }, { status: 400 });

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const content = (body?.content ?? null) as UpdateContent;

    const { data: liveblog, error: lbErr } = await supabase
      .from("liveblogs")
      .select("owner_id,settings")
      .eq("id", liveblogId)
      .single();
    if (lbErr) return NextResponse.json({ error: lbErr.message }, { status: 400 });
    if (!liveblog || liveblog.owner_id !== user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const settings = (liveblog.settings as Record<string, unknown> | null) ?? {};
    const webhook = typeof settings["discord_webhook_url"] === "string" ? (settings["discord_webhook_url"] as string) : "";
    if (!webhook) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    let publicImageUrl: string | undefined;
    if (content && typeof content === "object" && "type" in content && (content.type === "image" || content.type === "text")) {
      // Build public URL for image path stored in supabase storage bucket "media"
      // Using signed public URL builder from client SDK (server-side instance should also work if bucket is public)
      try {
        const { createClient: createServerClient } = await import("@/lib/supabase/serverClient");
        const supa = await createServerClient();
        const path = content.type === "image" ? (content as any).path as string : ((content as any).image?.path as string | undefined);
        const url = supa.storage.from("media").getPublicUrl(path).data.publicUrl;
        if (url && url.startsWith("http")) publicImageUrl = url;
      } catch {
        // ignore
      }
    }

    const payload = formatDiscordMessage(content, { publicImageUrl });
    if (!payload) return NextResponse.json({ ok: true, skipped: true });

    const result = await postToDiscord(webhook, payload);
    return NextResponse.json({ ok: result.ok, status: result.status });
  } catch (err) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}


