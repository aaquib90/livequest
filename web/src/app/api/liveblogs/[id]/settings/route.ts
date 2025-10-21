import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/serverClient";

export const runtime = "edge";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const liveblogId = params.id;
    if (!liveblogId) return NextResponse.json({ error: "bad_request" }, { status: 400 });

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    // Accept form submissions (from Settings modal)
    const form = await req.formData();
    const privacy = String(form.get("privacy") || "public") as "public" | "unlisted" | "private";
    const order = String(form.get("order") || "newest") as "newest" | "oldest";
    const discordWebhookUrlRaw = form.get("discord_webhook_url");
    const discordWebhookUrl = typeof discordWebhookUrlRaw === "string" ? discordWebhookUrlRaw.trim() : "";

    // Ensure owner
    const { data: current, error: curErr } = await supabase
      .from("liveblogs")
      .select("owner_id,settings")
      .eq("id", liveblogId)
      .single();
    if (curErr) return NextResponse.json({ error: curErr.message }, { status: 400 });
    if (!current || current.owner_id !== user.id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const currentSettings = (current.settings as Record<string, unknown> | null) ?? {};
    const nextSettings: Record<string, unknown> = {
      ...currentSettings,
      update_order: order,
    };
    if (discordWebhookUrl.length > 0) {
      nextSettings.discord_webhook_url = discordWebhookUrl;
    } else {
      // Allow clearing
      if ("discord_webhook_url" in nextSettings) delete nextSettings.discord_webhook_url;
    }

    const { error: updErr } = await supabase
      .from("liveblogs")
      .update({ privacy, settings: nextSettings })
      .eq("id", liveblogId);
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 });

    // Prefer redirect back to manage page when coming from a form submit
    const redirectTo = new URL(`/liveblogs/${liveblogId}/manage`, req.nextUrl.origin);
    return NextResponse.redirect(redirectTo, { status: 303 });
  } catch (err) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}


