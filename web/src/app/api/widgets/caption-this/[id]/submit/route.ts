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
    const text = String(body?.text || "").trim().slice(0, 200);
    const deviceId = String(body?.deviceId || "").trim();
    if (!text || !deviceId) return NextResponse.json({ error: "invalid_payload" }, { status: 400, headers: responseHeaders });

    let supabase: SupabaseClient;
    let role: "service" | "anon" = "service";

    try {
      supabase = createAdminClient();
    } catch {
      supabase = createAnonServerClient();
      role = "anon";
    }

    const userAgent = (req.headers.get("user-agent") || "").slice(0, 512);
    const device_hash = await sha256(deviceId + "|" + userAgent);

    if (role === "service") {
      const { data: widget, error: widgetError } = await supabase
        .from("engagement_widgets")
        .select("id,status,type")
        .eq("id", widgetId)
        .maybeSingle();
      if (widgetError) {
        return NextResponse.json({ error: "db_error", message: widgetError.message }, { status: 500, headers: responseHeaders });
      }
      if (!widget || widget.type !== "caption-this" || widget.status !== "active") {
        return NextResponse.json({ error: "not_found" }, { status: 404, headers: responseHeaders });
      }
    }

    const { error: insErr } = await supabase
      .from("ugc_submissions")
      .insert({ widget_id: widgetId, device_hash, content: text, status: "pending" }, { returning: "minimal" });
    if (insErr) {
      const status = /policy/i.test(insErr.message) ? 403 : 500;
      return NextResponse.json({ error: "db_error", message: insErr.message }, { status, headers: responseHeaders });
    }

    return NextResponse.json({ ok: true }, { status: 200, headers: responseHeaders });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || "error" }, { status: 200, headers: responseHeaders });
  }
}

async function sha256(input: string) {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const bytes = Array.from(new Uint8Array(hash));
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}
