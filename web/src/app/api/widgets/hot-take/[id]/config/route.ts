import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { embedPreflightCorsHeaders, embedResponseCorsHeaders } from "@/lib/embed/cors";
import { createAnonServerClient } from "@/lib/supabase/anonServerClient";
import { createAdminClient } from "@/lib/supabase/adminClient";

export const runtime = "nodejs";

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
    let supabase: SupabaseClient;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = createAnonServerClient();
    }

    const { data: row, error } = await supabase
      .from("engagement_widgets")
      .select("config,status,type")
      .eq("id", widgetId)
      .maybeSingle();
    if (error) {
      return NextResponse.json({ error: "db_error", message: error.message }, { status: 500, headers: responseHeaders });
    }
    if (!row || row.status !== "active" || row.type !== "hot-take") {
      return NextResponse.json({ error: "not_found" }, { status: 404, headers: responseHeaders });
    }

    const config = row?.config || {};
    return NextResponse.json({ ok: true, config }, { status: 200, headers: responseHeaders });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200, headers: responseHeaders });
  }
}
