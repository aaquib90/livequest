import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/serverClient";

export const runtime = "edge";

async function requireEditorAccess(liveblogId: string, req: Request) {
  const supabase = await createClient();
  let token: string | null = null;
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice(7).trim() || null;
  }
  const {
    data: { user },
  } = token ? await supabase.auth.getUser(token) : await supabase.auth.getUser();
  if (!user) {
    return { supabase, user: null, allowed: false };
  }
  const { data: lb } = await supabase
    .from("liveblogs")
    .select("owner_id")
    .eq("id", liveblogId)
    .single();
  if (!lb) return { supabase, user, allowed: false };
  if (lb.owner_id === user.id) return { supabase, user, allowed: true };
  const { count = 0 } = await supabase
    .from("liveblog_editors")
    .select("user_id", { count: "exact", head: true })
    .eq("liveblog_id", liveblogId)
    .eq("user_id", user.id);
  return { supabase, user, allowed: count > 0 };
}

export async function PATCH(req: Request, { params }: { params: { id: string; slotId: string } }) {
  try {
    const liveblogId = params.id;
    const slotId = params.slotId;
    if (!liveblogId || !slotId) {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }
    const { supabase, allowed } = await requireEditorAccess(liveblogId, req);
    if (!allowed) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const fields = [
      "name",
      "headline",
      "description",
      "cta_text",
      "cta_url",
      "affiliate_code",
      "image_path",
      "layout",
      "pinned",
      "priority",
      "status",
      "starts_at",
      "ends_at",
    ];
    for (const key of fields) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        const value = (body as any)[key];
        if (key === "starts_at" || key === "ends_at") {
          update[key] = value ? new Date(value).toISOString() : null;
        } else {
          update[key] = value;
        }
      }
    }

    const { data, error } = await supabase
      .from("sponsor_slots")
      .update(update)
      .eq("id", slotId)
      .eq("liveblog_id", liveblogId)
      .select()
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ slot: data }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "server_error" },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string; slotId: string } }) {
  try {
    const liveblogId = params.id;
    const slotId = params.slotId;
    if (!liveblogId || !slotId) {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }
    const { supabase, allowed } = await requireEditorAccess(liveblogId, _req);
    if (!allowed) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const { error } = await supabase
      .from("sponsor_slots")
      .delete()
      .eq("id", slotId)
      .eq("liveblog_id", liveblogId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "server_error" },
      { status: 500 },
    );
  }
}
