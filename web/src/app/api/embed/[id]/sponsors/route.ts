import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/serverClient";

export const runtime = "edge";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const liveblogId = params.id;
    if (!liveblogId) {
      return NextResponse.json({ error: "bad_request" }, { status: 400, headers: cors() });
    }
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("sponsor_slots")
      .select("id,name,headline,description,cta_text,cta_url,affiliate_code,image_path,layout,pinned,priority,status,starts_at,ends_at")
      .eq("liveblog_id", liveblogId)
      .neq("status", "archived")
      .order("pinned", { ascending: false })
      .order("priority", { ascending: false })
      .order("starts_at", { ascending: true, nullsFirst: true })
      .limit(20);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500, headers: cors() });
    }

    const now = Date.now();
    const slots = (data || []).filter((slot) => {
      const status = String(slot.status || "").toLowerCase();
      if (status === "archived") return false;
      const startsAt = slot.starts_at ? Date.parse(slot.starts_at) : null;
      const endsAt = slot.ends_at ? Date.parse(slot.ends_at) : null;
      const withinWindow = (!startsAt || startsAt <= now) && (!endsAt || endsAt > now);
      if (!withinWindow) return false;
      if (status === "paused") return false;
      if (status === "scheduled") return false;
      return status === "active";
    });

    return NextResponse.json({ slots }, { status: 200, headers: cors() });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "server_error" },
      { status: 500, headers: cors() },
    );
  }
}

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors() });
}
