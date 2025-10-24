import { NextResponse } from "next/server";
import { supabaseEnsure } from "@/lib/supabase/gatewayClient";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const secret = req.headers.get("x-cron-secret") || "";
    const expected = process.env.CRON_SECRET || "";
    if (!expected || secret !== expected) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const now = new Date();
    const nowIso = now.toISOString();

    const slots = await supabaseEnsure<Array<{ id: string; status: string; starts_at: string | null; ends_at: string | null }>>(req, {
      action: "select",
      table: "sponsor_slots",
      columns: "id,status,starts_at,ends_at",
      filters: [{ column: "status", op: "in", value: ["scheduled", "active"] }],
      limit: 1000,
    });

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
        const res = await supabaseEnsure(req, {
          action: "update",
          table: "sponsor_slots",
          values: { status: "active", updated_at: nowIso },
          filters: [
            { column: "id", op: "eq", value: slot.id },
            { column: "status", op: "eq", value: "scheduled" },
          ],
          returning: "minimal",
        }).catch(() => null);
        if (res !== null) activated += 1;
      } else if (shouldArchive) {
        const res = await supabaseEnsure(req, {
          action: "update",
          table: "sponsor_slots",
          values: { status: "archived", updated_at: nowIso },
          filters: [
            { column: "id", op: "eq", value: slot.id },
            { column: "status", op: "in", value: ["scheduled", "active"] },
          ],
          returning: "minimal",
        }).catch(() => null);
        if (res !== null) archived += 1;
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
