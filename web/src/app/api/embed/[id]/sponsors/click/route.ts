import { NextResponse } from "next/server";
import { embedPreflightCorsHeaders, embedResponseCorsHeaders } from "@/lib/embed/cors";
import { createClient } from "@/lib/supabase/serverClient";

export const runtime = "edge";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const baseCors = embedResponseCorsHeaders(req);
  const responseHeaders = {
    ...baseCors,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  try {
    const liveblogId = params.id;
    if (!liveblogId) {
      return NextResponse.json({ error: "bad_request" }, { status: 400, headers: responseHeaders });
    }

    const payload = await req.json().catch(() => ({}));
    const slotId = typeof payload?.slotId === "string" ? payload.slotId : "";
    if (!slotId) {
      return NextResponse.json({ error: "invalid_slot" }, { status: 400, headers: responseHeaders });
    }
    const sessionId = typeof payload?.sessionId === "string" ? payload.sessionId : null;
    const deviceId = typeof payload?.deviceId === "string" ? payload.deviceId : null;
    const mode = typeof payload?.mode === "string" ? payload.mode : null;
    const targetUrl = typeof payload?.targetUrl === "string" ? payload.targetUrl : null;

    const supabase = await createClient();
    const { error } = await supabase.from("sponsor_clicks").insert({
      slot_id: slotId,
      liveblog_id: liveblogId,
      session_id: sessionId,
      device_id: deviceId,
      mode,
      target_url: targetUrl,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500, headers: responseHeaders });
    }
    return NextResponse.json({ ok: true }, { status: 200, headers: responseHeaders });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "server_error" },
      { status: 500, headers: responseHeaders },
    );
  }
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: embedPreflightCorsHeaders(req, {
      methods: ["POST", "OPTIONS"],
      headers: ["Content-Type"],
    }),
  });
}
