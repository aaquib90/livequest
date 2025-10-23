import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

import { canManageSponsors, fetchAccountFeaturesForAccount } from "@/lib/billing/server";
import { createClient } from "@/lib/supabase/serverClient";

export const runtime = "nodejs";

type SponsorSlotRow = {
  id: string;
  name: string | null;
  status: string | null;
  starts_at: string | null;
  ends_at: string | null;
  [key: string]: unknown;
};

type AccessCheckResult = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: User | null;
  allowed: boolean;
  featureAllowed: boolean;
  ownerId: string | null;
};

async function requireEditorAccess(liveblogId: string, req: Request): Promise<AccessCheckResult> {
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
    return { supabase, user: null, allowed: false, featureAllowed: false, ownerId: null };
  }
  const { data: lb } = await supabase
    .from("liveblogs")
    .select("owner_id")
    .eq("id", liveblogId)
    .single();
  if (!lb) {
    return { supabase, user, allowed: false, featureAllowed: false, ownerId: null };
  }
  const ownerId = lb.owner_id as string;
  let allowed = ownerId === user.id;
  if (!allowed) {
    const { count = 0 } = await supabase
      .from("liveblog_editors")
      .select("user_id", { count: "exact", head: true })
      .eq("liveblog_id", liveblogId)
      .eq("user_id", user.id);
    allowed = count > 0;
  }

  const features = await fetchAccountFeaturesForAccount(ownerId).catch(() => null);
  const featureAllowed = canManageSponsors(features);

  return { supabase, user, allowed, featureAllowed, ownerId };
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const liveblogId = params.id;
    if (!liveblogId) return NextResponse.json({ error: "bad_request" }, { status: 400 });
    const { supabase, allowed, featureAllowed } = await requireEditorAccess(liveblogId, _req);
    if (!allowed) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    if (!featureAllowed) return NextResponse.json({ error: "subscription_required" }, { status: 402 });

    const { data, error } = await supabase
      .from("sponsor_slots")
      .select("*")
      .eq("liveblog_id", liveblogId)
      .order("starts_at", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const slotsRaw = ((data ?? []) as SponsorSlotRow[]).filter((row) => typeof row?.id === "string");
    const slotIds = slotsRaw.map((row) => row.id);
    const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

    const impressionsTotal = await aggregateCounts(supabase, "sponsor_impressions", liveblogId, slotIds);
    const impressions24h = await aggregateCounts(supabase, "sponsor_impressions", liveblogId, slotIds, since24h);
    const clicksTotal = await aggregateCounts(supabase, "sponsor_clicks", liveblogId, slotIds);
    const clicks24h = await aggregateCounts(supabase, "sponsor_clicks", liveblogId, slotIds, since24h);

    const slots = slotsRaw.map((row) => {
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
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
  liveblogId: string,
  slotIds: string[],
  since?: string,
) {
  const out = new Map<string, number>();
  if (!slotIds.length) return out;
  const pageSize = 1000;
  let from = 0;

  while (true) {
    let query = supabase
      .from(table)
      .select("slot_id", { head: false })
      .eq("liveblog_id", liveblogId)
      .in("slot_id", slotIds)
      .range(from, from + pageSize - 1);
    if (since) {
      query = query.gte("created_at", since);
    }
    const { data, error } = await query;
    if (error) {
      throw error;
    }
    const rows = (Array.isArray(data) ? data : []) as Array<{ slot_id: string | null }>;
    for (const row of rows) {
      if (!row?.slot_id) continue;
      const key = String(row.slot_id);
      out.set(key, (out.get(key) || 0) + 1);
    }
    if (rows.length < pageSize) {
      break;
    }
    from += pageSize;
  }
  return out;
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const liveblogId = params.id;
    if (!liveblogId) return NextResponse.json({ error: "bad_request" }, { status: 400 });
    const { supabase, user, allowed, featureAllowed } = await requireEditorAccess(liveblogId, req);
    if (!allowed || !user) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    if (!featureAllowed) return NextResponse.json({ error: "subscription_required" }, { status: 402 });

    const payload = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const nameValue = payload?.name;
    const name = typeof nameValue === "string" ? nameValue.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "name_required" }, { status: 400 });
    }

    const headline = payload?.headline;
    const description = payload?.description;
    const ctaText = payload?.cta_text;
    const ctaUrl = payload?.cta_url;
    const affiliateCode = payload?.affiliate_code;
    const imagePath = payload?.image_path;
    const layoutRaw = payload?.layout;
    const pinnedRaw = payload?.pinned;
    const priorityRaw = payload?.priority;
    const statusRaw = payload?.status;
    const startsAtRaw = payload?.starts_at;
    const endsAtRaw = payload?.ends_at;

    const priorityNumber =
      typeof priorityRaw === "number" ? priorityRaw : Number(priorityRaw ?? 0);
    const priority = Number.isFinite(priorityNumber) ? priorityNumber : 0;

    const slot = {
      liveblog_id: liveblogId,
      name,
      headline: typeof headline === "string" ? headline : null,
      description: typeof description === "string" ? description : null,
      cta_text: typeof ctaText === "string" ? ctaText : null,
      cta_url: typeof ctaUrl === "string" ? ctaUrl : null,
      affiliate_code: typeof affiliateCode === "string" ? affiliateCode : null,
      image_path: typeof imagePath === "string" ? imagePath : null,
      layout: typeof layoutRaw === "string" && layoutRaw.length ? layoutRaw : "card",
      pinned: Boolean(pinnedRaw),
      priority,
      status: typeof statusRaw === "string" ? statusRaw : "scheduled",
      starts_at:
        typeof startsAtRaw === "string" && startsAtRaw.length
          ? new Date(startsAtRaw).toISOString()
          : null,
      ends_at:
        typeof endsAtRaw === "string" && endsAtRaw.length
          ? new Date(endsAtRaw).toISOString()
          : null,
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
