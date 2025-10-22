import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/adminClient";
import data from "@/data/players-epl.json" assert { type: "json" };
import { matchTeam } from "@/lib/football/teams";

type PlayerRow = { name: string; team: string };

export async function POST(req: NextRequest) {
  const supabase = createAdminClient();
  const rows = (data as PlayerRow[]).map((r) => {
    const t = matchTeam(r.team);
    return {
      name: r.name,
      team_name_raw: r.team,
      team_slug: t?.slug ?? null,
      competition_id: "premier-league",
    } as Record<string, unknown>;
  });

  if (rows.length === 0) return NextResponse.json({ ok: true, imported: 0 });

  const { error, data: inserted } = await supabase
    .from("players")
    .upsert(rows, { onConflict: "name,team_name_raw" })
    .select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, imported: inserted?.length ?? 0 });
}


