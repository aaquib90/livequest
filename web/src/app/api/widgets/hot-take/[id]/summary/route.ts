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

    // Validate exists and active
    let supabase: SupabaseClient;
    let role: "service" | "anon" = "service";

    try {
      supabase = createAdminClient();
    } catch {
      supabase = createAnonServerClient();
      role = "anon";
    }

    const { data: widget, error: widgetError } = await supabase
      .from("engagement_widgets")
      .select("id,status,type")
      .eq("id", widgetId)
      .maybeSingle();
    if (widgetError) {
      return NextResponse.json({ error: "db_error", message: widgetError.message }, { status: 500, headers: responseHeaders });
    }
    if (!widget || widget.status !== "active" || widget.type !== "hot-take") {
      return NextResponse.json({ error: "not_found" }, { status: 404, headers: responseHeaders });
    }

    const { data: aggregate, error: aggError } = await supabase
      .from("widget_events")
      .select("avg(value),count(*)")
      .eq("widget_id", widgetId)
      .eq("event", "vote")
      .maybeSingle();
    if (aggError) {
      const status = role === "anon" && /policy/i.test(aggError.message) ? 403 : 500;
      return NextResponse.json({ error: "db_error", message: aggError.message }, { status, headers: responseHeaders });
    }

    const mean = Number((aggregate as any)?.avg ?? 0);
    const total = Number((aggregate as any)?.count ?? 0);

    return NextResponse.json({ ok: true, mean, total }, { status: 200, headers: responseHeaders });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200, headers: responseHeaders });
  }
}
