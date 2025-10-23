import { NextRequest, NextResponse } from "next/server";
import { fetchAccountFeaturesForUser } from "@/lib/billing/server";
import { createClient } from "@/lib/supabase/serverClient";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const matchId = body?.matchId as number | string | undefined;
  if (!matchId) return NextResponse.json({ error: "matchId required" }, { status: 400 });

  const { data: match, error: mErr } = await supabase
    .from("matches")
    .select("id,league_name,country,date,venue,home_team_name,away_team_name")
    .eq("id", matchId)
    .single();
  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 400 });
  if (!match) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const features = await fetchAccountFeaturesForUser(supabase).catch(() => null);
  const monthlyLimit =
    typeof features?.monthly_liveblog_limit === "number"
      ? features.monthly_liveblog_limit
      : null;

  if (monthlyLimit !== null) {
    const now = new Date();
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const { count = 0 } = await supabase
      .from("liveblogs")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id)
      .gte("created_at", periodStart.toISOString());
    if (count >= monthlyLimit) {
      return NextResponse.json(
        {
          error:
            "You've reached the monthly liveblog limit on the free plan. Upgrade for unlimited coverage, sponsor tooling, and analytics exports.",
          code: "limit_reached",
        },
        { status: 403 },
      );
    }
  }

  const title = `${match.home_team_name} vs ${match.away_team_name} — ${match.league_name}`;
  const when = new Date(match.date).toLocaleString();
  const description = `Match: ${match.home_team_name} vs ${match.away_team_name}\nCompetition: ${match.league_name} (${match.country})\nWhen: ${when}\nVenue: ${match.venue || "TBD"}`;

  const { data: created, error } = await supabase
    .from("liveblogs")
    .insert({
      title,
      description,
      owner_id: user.id,
      settings: {
        template: "football",
        match_id: match.id,
      },
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, id: created?.id });
}
