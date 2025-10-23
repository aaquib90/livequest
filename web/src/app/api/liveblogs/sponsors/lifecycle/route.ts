import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/adminClient";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const secret = req.headers.get("x-cron-secret") || "";
    const expected = process.env.CRON_SECRET || "";
    if (!expected || secret !== expected) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const now = new Date();
    const nowIso = now.toISOString();

    const { data: slots, error } = await supabase
      .from("sponsor_slots")
      .select("id,status,starts_at,ends_at")
      .in("status", ["scheduled", "active"])
      .limit(1000);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let activated = 0;
    let archived = 0;

    for (const slot of slots || []) {
      const startsAt = slot.starts_at ? new Date(slot.starts_at) : null;
      const endsAt = slot.ends_at ? new Date(slot.ends_at) : null;

      const shouldActivate =
        slot.status === "scheduled" &&
        (!startsAt || startsAt.getTime() <= now.getTime()) &&
        (!endsAt || endsAt.getTime() > now.getTime());

      const shouldArchive =
        (slot.status === "scheduled" || slot.status === "active") &&
        !!endsAt && endsAt.getTime() <= now.getTime();

      if (shouldActivate) {
        const { error: updateError } = await supabase
          .from("sponsor_slots")
          .update({ status: "active", updated_at: nowIso })
          .eq("id", slot.id)
          .eq("status", "scheduled");
        if (!updateError) activated += 1;
      } else if (shouldArchive) {
        const { error: archiveError } = await supabase
          .from("sponsor_slots")
          .update({ status: "archived", updated_at: nowIso })
          .eq("id", slot.id)
          .in("status", ["scheduled", "active"]);
        if (!archiveError) archived += 1;
      }
    }

    return NextResponse.json({ ok: true, activated, archived }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "server_error" },
      { status: 500 },
    );
  }
}
