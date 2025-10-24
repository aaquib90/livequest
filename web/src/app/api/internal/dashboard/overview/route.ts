import { NextRequest, NextResponse } from "next/server";

import { fetchAccountFeaturesForUser } from "@/lib/billing/server";
import { createClient } from "@/lib/supabase/serverClient";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const features = await fetchAccountFeaturesForUser(supabase).catch(() => null);
    const { data: liveblogs } = await supabase
      .from("liveblogs")
      .select("id,title,created_at,status,privacy,folder,owner_id")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    const now = new Date();
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const { count: monthlyUsage = 0 } = await supabase
      .from("liveblogs")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id)
      .gte("created_at", periodStart.toISOString());

    const monthlyLimit =
      typeof features?.monthly_liveblog_limit === "number"
        ? features.monthly_liveblog_limit
        : null;

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      features,
      liveblogs: (liveblogs as unknown[]) ?? [],
      monthlyUsage: monthlyUsage ?? 0,
      monthlyLimit,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal_error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
