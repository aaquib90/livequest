import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/serverClient";

export const runtime = "edge";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const liveblogId = params.id;
    if (!liveblogId) return NextResponse.json({ error: "bad_request" }, { status: 400, headers: cors() });

    const body = await req.json().catch(() => ({}));
    const slotId = typeof body?.slotId === "string" ? body.slotId : "";
    if (!slotId) {
      return NextResponse.json({ error: "invalid_slot" }, { status: 400, headers: cors() });
    }
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId : null;
    const deviceId = typeof body?.deviceId === "string" ? body.deviceId : null;
    const viewMs = Number.isFinite(body?.viewMs) ? Math.max(0, Math.min(60000, Number(body.viewMs))) : 0;
    const mode = typeof body?.mode === "string" ? body.mode : null;
    const userAgent = (req.headers.get("user-agent") || "").slice(0, 512);
    const referrer = (req.headers.get("referer") || "").slice(0, 512);
    const ip = req.headers.get("x-forwarded-for") || "";
    const ipHash = await sha256(ip);

    const supabase = await createClient();
    const { error } = await supabase.from("sponsor_impressions").insert({
      slot_id: slotId,
      liveblog_id: liveblogId,
      session_id: sessionId,
      device_id: deviceId,
      view_ms: viewMs,
      mode,
      user_agent: userAgent,
      referrer,
      ip_hash: ipHash,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500, headers: cors() });
    }
    return NextResponse.json({ ok: true }, { status: 200, headers: cors() });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "server_error" },
      { status: 500, headers: cors() },
    );
  }
}

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors() });
}

async function sha256(input: string) {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
