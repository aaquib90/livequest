import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/serverClient";

export const runtime = "edge";

async function requireEditorAccess(liveblogId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const liveblogId = params.id;
    if (!liveblogId) return NextResponse.json({ error: "bad_request" }, { status: 400 });
    const { supabase, allowed } = await requireEditorAccess(liveblogId);
    if (!allowed) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const { data, error } = await supabase
      .from("sponsor_slots")
      .select("*")
      .eq("liveblog_id", liveblogId)
      .order("starts_at", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const slotsRaw = data || [];
    const slotIds = slotsRaw.map((row: any) => row.id).filter(Boolean);
    const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

    const impressionsTotal = await aggregateCounts(supabase, "sponsor_impressions", liveblogId, slotIds);
    const impressions24h = await aggregateCounts(supabase, "sponsor_impressions", liveblogId, slotIds, since24h);
    const clicksTotal = await aggregateCounts(supabase, "sponsor_clicks", liveblogId, slotIds);
    const clicks24h = await aggregateCounts(supabase, "sponsor_clicks", liveblogId, slotIds, since24h);

    const slots = slotsRaw.map((row: any) => {
      const totalImpressions = impressionsTotal.get(row.id) || 0;
      const totalClicks = clicksTotal.get(row.id) || 0;
      const lastImpressions = impressions24h.get(row.id) || 0;
      const lastClicks = clicks24h.get(row.id) || 0;
      const ctr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
      const ctr24h = lastImpressions > 0 ? lastClicks / lastImpressions : 0;
      return {
        ...row,
        impressions: totalImpressions,
        clicks: totalClicks,
        impressions24h: lastImpressions,
        clicks24h: lastClicks,
        ctr,
        ctr24h,
      };
    });

    return NextResponse.json({ slots }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "server_error" },
      { status: 500 },
    );
  }
}

async function aggregateCounts(
  supabase: SupabaseClient<any, any, any>,
  table: string,
  liveblogId: string,
  slotIds: string[],
  since?: string,
) {
  const out = new Map<string, number>();
  if (!slotIds.length) return out;
  let query = supabase
    .from(table)
    .select("slot_id, count:id")
    .eq("liveblog_id", liveblogId)
    .in("slot_id", slotIds)
    .group("slot_id");
  if (since) {
    query = query.gte("created_at", since);
  }
  const { data } = await query;
  for (const row of (data as Array<{ slot_id: string; count: number }> | null) || []) {
    out.set(String(row.slot_id), Number(row.count || 0));
  }
  return out;
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const liveblogId = params.id;
    if (!liveblogId) return NextResponse.json({ error: "bad_request" }, { status: 400 });
    const { supabase, user, allowed } = await requireEditorAccess(liveblogId);
    if (!allowed || !user) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const payload = await req.json().catch(() => ({}));
    const name = typeof payload?.name === "string" ? payload.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "name_required" }, { status: 400 });
    }

    const slot = {
      liveblog_id: liveblogId,
      name,
      headline: typeof payload?.headline === "string" ? payload.headline : null,
      description: typeof payload?.description === "string" ? payload.description : null,
      cta_text: typeof payload?.cta_text === "string" ? payload.cta_text : null,
      cta_url: typeof payload?.cta_url === "string" ? payload.cta_url : null,
      affiliate_code: typeof payload?.affiliate_code === "string" ? payload.affiliate_code : null,
      image_path: typeof payload?.image_path === "string" ? payload.image_path : null,
      layout: typeof payload?.layout === "string" && payload.layout.length ? payload.layout : "card",
      pinned: Boolean(payload?.pinned),
      priority: Number.isFinite(payload?.priority) ? Number(payload.priority) : 0,
      status: typeof payload?.status === "string" ? payload.status : "scheduled",
      starts_at: payload?.starts_at ? new Date(payload.starts_at).toISOString() : null,
      ends_at: payload?.ends_at ? new Date(payload.ends_at).toISOString() : null,
      created_by: user.id,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from("sponsor_slots").insert(slot).select().single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ slot: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "server_error" },
      { status: 500 },
    );
  }
}
