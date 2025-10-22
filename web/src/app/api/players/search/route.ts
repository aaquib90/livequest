import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/adminClient";

export async function GET(req: NextRequest) {
  const supabase = createAdminClient();
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const comp = searchParams.get("competition") || "premier-league";
  if (!q) return NextResponse.json({ error: "Missing q" }, { status: 400 });

  // Normalize server-side using SQL function if available; fallback to simple ilike
  const { data, error } = await supabase
    .from("players")
    .select("id,name,team_slug")
    .eq("competition_id", comp)
    .ilike("name_normalized", `%${q.toLowerCase()}%`)
    .limit(25);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ count: data?.length ?? 0, players: data ?? [] });
}


