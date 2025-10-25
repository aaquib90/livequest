import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/serverClient";
import { seedWidgetDefaults } from "@/lib/engagement/seedDefaults";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("engagement_widgets")
    .select("id,type,name,liveblog_id,status,created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ widgets: data ?? [] }, { status: 200 });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const type = String(body?.type || "").trim();
  const name = String(body?.name || "").trim().slice(0, 120);
  const liveblog_id = (body?.liveblog_id && String(body.liveblog_id)) || null;
  const config = (body?.config && typeof body.config === "object") ? body.config : {};
  if (!type) return NextResponse.json({ error: "invalid_type" }, { status: 400 });

  const { data, error } = await supabase
    .from("engagement_widgets")
    .insert({ owner_id: user.id, type, name: name || null, liveblog_id, config, status: "active" })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (data?.id) {
    await seedWidgetDefaults(data.id, type);
  }
  return NextResponse.json({ ok: true, id: data?.id }, { status: 200 });
}

