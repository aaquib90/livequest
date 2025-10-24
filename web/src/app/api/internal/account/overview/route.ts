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

    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const { count: liveblogsThisMonth = 0 } = await supabase
      .from("liveblogs")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id)
      .gte("created_at", monthStart.toISOString());

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        user_metadata: user.user_metadata ?? {},
      },
      features,
      liveblogsThisMonth: liveblogsThisMonth ?? 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal_error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
