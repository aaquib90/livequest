import { NextResponse } from "next/server";
import { embedPreflightCorsHeaders, embedResponseCorsHeaders } from "@/lib/embed/cors";
import { supabaseEnsure } from "@/lib/supabase/gatewayClient";

export const runtime = "edge";

export async function OPTIONS(req: Request) {
  const headers = embedPreflightCorsHeaders(req, { methods: ["GET", "OPTIONS"], headers: ["Content-Type"] });
  return new NextResponse(null, { status: 204, headers });
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const baseCors = embedResponseCorsHeaders(req);
  const responseHeaders = {
    ...baseCors,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  try {
    const widgetId = params.id;
    if (!widgetId) return NextResponse.json({ error: "bad_request" }, { status: 400, headers: responseHeaders });

    const rows = await supabaseEnsure<Array<{ id: string; content: string; votes: number }>>(req, {
      action: "select",
      table: "ugc_submissions",
      columns: "id,content,votes",
      filters: [
        { column: "widget_id", op: "eq", value: widgetId },
        { column: "status", op: "eq", value: "approved" },
      ],
      order: { column: "votes", ascending: false },
      limit: 20,
    });

    return NextResponse.json({ ok: true, items: rows || [] }, { status: 200, headers: responseHeaders });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200, headers: responseHeaders });
  }
}


