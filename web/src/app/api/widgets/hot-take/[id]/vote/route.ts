import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { embedPreflightCorsHeaders, embedResponseCorsHeaders } from "@/lib/embed/cors";
import { createAnonServerClient } from "@/lib/supabase/anonServerClient";
import { createAdminClient } from "@/lib/supabase/adminClient";

export const runtime = "nodejs";

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
    if (!widgetId) return NextResponse.json({ error: "bad_request" }, { status: 400, headers: responseHeaders });

    const body = await req.json().catch(() => ({}));
    let value = Number.parseInt(String(body?.value ?? ""), 10);
    const deviceId = String(body?.deviceId || "");
    if (!Number.isFinite(value) || !deviceId) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400, headers: responseHeaders });
    }
    value = Math.max(0, Math.min(100, Math.round(value)));

    // Validate widget is active and of type hot-take
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
      .select("id,type,status")
      .eq("id", widgetId)
      .maybeSingle();
    if (widgetError) {
      return NextResponse.json({ error: "db_error", message: widgetError.message }, { status: 500, headers: responseHeaders });
    }
    if (!widget || widget.type !== "hot-take" || widget.status !== "active") {
      return NextResponse.json({ error: "not_found" }, { status: 404, headers: responseHeaders });
    }

    const userAgent = (req.headers.get("user-agent") || "").slice(0, 512);
    const device_hash = await sha256(deviceId + "|" + userAgent);

    const { data: existing, error: existingError } = await supabase
      .from("widget_events")
      .select("id")
      .eq("widget_id", widgetId)
      .eq("event", "vote")
      .eq("device_hash", device_hash)
      .maybeSingle();
    if (existingError) {
      const status = role === "anon" && /policy/i.test(existingError.message) ? 403 : 500;
      return NextResponse.json({ error: "db_error", message: existingError.message }, { status, headers: responseHeaders });
    }
    let duplicate = false;
    if (existing?.id) {
      duplicate = true;
    } else {
      const { error: insertError } = await supabase
        .from("widget_events")
        .insert({ widget_id: widgetId, event: "vote", device_hash, value }, { returning: "minimal" });
      if (insertError) {
        const code = (insertError as any)?.code || "";
        const message = insertError.message || "unknown_error";
        if (code === "23505" || /duplicate key value/i.test(message)) {
          duplicate = true;
        } else {
          const status = role === "anon" && /policy/i.test(message) ? 403 : 500;
          return NextResponse.json({ error: "db_error", message }, { status, headers: responseHeaders });
        }
      }
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

    return NextResponse.json({ ok: true, mean, total, duplicate }, { status: 200, headers: responseHeaders });
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
