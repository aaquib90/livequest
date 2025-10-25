import { NextResponse } from "next/server";
import { embedPreflightCorsHeaders, embedResponseCorsHeaders } from "@/lib/embed/cors";
import { supabaseEnsure } from "@/lib/supabase/gatewayClient";

export const runtime = "edge";

export async function OPTIONS(req: Request) {
  const headers = embedPreflightCorsHeaders(req, { methods: ["POST", "OPTIONS"], headers: ["Content-Type"] });
  return new NextResponse(null, { status: 204, headers });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const baseCors = embedResponseCorsHeaders(req);
  const responseHeaders = {
    ...baseCors,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  try {
    const widgetId = params.id;
    const body = await req.json().catch(() => ({}));
    const submissionId = String(body?.submissionId || "");
    const deviceId = String(body?.deviceId || "");
    if (!widgetId || !submissionId || !deviceId) return NextResponse.json({ error: "invalid_payload" }, { status: 400, headers: responseHeaders });

    const ua = (req.headers.get("user-agent") || "").slice(0, 512);
    const device_hash = await sha256(deviceId + "|" + ua);

    // One upvote per device per submission using widget_events as vote ledger
    const existing = await supabaseEnsure<{ id: string } | null>(req, {
      action: "select",
      table: "widget_events",
      columns: "id",
      filters: [
        { column: "widget_id", op: "eq", value: widgetId },
        { column: "event", op: "eq", value: "caption_vote" },
        { column: "device_hash", op: "eq", value: device_hash },
        { column: "metadata", op: "contains", value: { submissionId } },
      ],
      limit: 1,
      maybeSingle: true,
    });

    if (existing) {
      return NextResponse.json({ ok: true, duplicate: true }, { status: 200, headers: responseHeaders });
    }

    await supabaseEnsure(req, {
      action: "insert",
      table: "widget_events",
      values: { widget_id: widgetId, event: "caption_vote", device_hash, metadata: { submissionId } },
      returning: "minimal",
    });

    // Read current votes and increment
    const row = await supabaseEnsure<{ votes: number } | null>(req, {
      action: "select",
      table: "ugc_submissions",
      columns: "votes",
      filters: [{ column: "id", op: "eq", value: submissionId }],
      maybeSingle: true,
    });
    const current = Number(row?.votes ?? 0);
    await supabaseEnsure(req, {
      action: "update",
      table: "ugc_submissions",
      values: { votes: current + 1 },
      filters: [{ column: "id", op: "eq", value: submissionId }],
      returning: "minimal",
    });

    return NextResponse.json({ ok: true }, { status: 200, headers: responseHeaders });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200, headers: responseHeaders });
  }
}

async function sha256(input: string) {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const bytes = Array.from(new Uint8Array(hash));
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}


