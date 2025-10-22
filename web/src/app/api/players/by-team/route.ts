import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/adminClient";
import { matchTeam } from "@/lib/football/teams";

export async function GET(req: NextRequest) {
  const supabase = createAdminClient();
  const { searchParams } = new URL(req.url);
  const team = searchParams.get("team"); // accepts slug or human text
  const comp = searchParams.get("competition") || "premier-league";
  if (!team) return NextResponse.json({ error: "Missing team" }, { status: 400 });

  const matched = matchTeam(team);
  const teamSlug = matched?.slug ?? team.toLowerCase();

  const { data, error } = await supabase
    .from("players")
    .select("id,name,team_slug")
    .eq("competition_id", comp)
    .eq("team_slug", teamSlug)
    .order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ teamSlug, count: data?.length ?? 0, players: data ?? [] });
}


