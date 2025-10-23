import { NextResponse } from "next/server";

import { fetchAccountFeaturesForAccount, isPaidAccount } from "@/lib/billing/server";
import { createClient } from "@/lib/supabase/serverClient";

export const runtime = "edge";

type AccessCheck = {
  allowed: boolean;
  ownerId: string | null;
};

async function resolveAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  liveblogId: string,
  userId: string,
) : Promise<AccessCheck> {
  const { data: lb } = await supabase
    .from("liveblogs")
    .select("owner_id")
    .eq("id", liveblogId)
    .single();
  if (!lb) return { allowed: false, ownerId: null };
  if (lb.owner_id === userId) return { allowed: true, ownerId: lb.owner_id as string };
  const { count = 0 } = await supabase
    .from("liveblog_editors")
    .select("user_id", { count: "exact", head: true })
    .eq("liveblog_id", liveblogId)
    .eq("user_id", userId);
  return { allowed: count > 0, ownerId: lb.owner_id as string };
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const liveblogId = params.id;
    if (!liveblogId) {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const { allowed, ownerId } = await resolveAccess(supabase, liveblogId, user.id);
    if (!allowed) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const features = ownerId
      ? await fetchAccountFeaturesForAccount(ownerId).catch(() => null)
      : null;
    if (!isPaidAccount(features)) {
      return NextResponse.json({ error: "subscription_required" }, { status: 402 });
    }

    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

    const { count: uniques24h = 0 } = await supabase
      .from("viewer_pings")
      .select("session_id", { count: "exact", head: true })
      .eq("liveblog_id", liveblogId)
      .gt("created_at", since);

    const { count: starts24h = 0 } = await supabase
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("liveblog_id", liveblogId)
      .eq("event", "start")
      .gt("created_at", since);

    const { count: totalStarts = 0 } = await supabase
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("liveblog_id", liveblogId)
      .eq("event", "start");

    const { data: concurrentData } = await supabase.rpc("count_concurrent_viewers", {
      p_liveblog_id: liveblogId,
    });
    const concurrent = typeof concurrentData === "number" ? concurrentData : 0;

    return NextResponse.json({
      liveblogId,
      uniques24h: uniques24h || 0,
      starts24h: starts24h || 0,
      totalStarts: totalStarts || 0,
      concurrentNow: concurrent || 0,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: "server_error", message: err instanceof Error ? err.message : undefined },
      { status: 500 },
    );
  }
}
