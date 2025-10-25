import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { embedPreflightCorsHeaders, embedResponseCorsHeaders } from "@/lib/embed/cors";
import { resolveBrandAssetUrl } from "@/lib/branding/assets";
import { normaliseBranding, resolveAccentColor } from "@/lib/branding/utils";
import type { AccountBranding } from "@/lib/branding/types";
import { createAdminClient } from "@/lib/supabase/adminClient";
import { createAnonServerClient } from "@/lib/supabase/anonServerClient";
import { supabaseEnsure } from "@/lib/supabase/gatewayClient";

export const runtime = "nodejs";

type WidgetThemePayload = {
  accent: string;
  cornerStyle: string;
  surfaceStyle: string;
  backgroundUrl: string | null;
  logoUrl: string | null;
};

type WidgetResponse = {
  id: string;
  type: string;
  status: string;
  config: Record<string, unknown>;
};

const DEFAULT_THEME: WidgetThemePayload = {
  accent: "#22d3ee",
  cornerStyle: "rounded",
  surfaceStyle: "glass",
  backgroundUrl: null,
  logoUrl: null,
};

function unwrapBranding(result: AccountBranding | AccountBranding[] | null): AccountBranding | null {
  if (!result) return null;
  if (Array.isArray(result)) {
    if (!result.length) return null;
    return (result[0] ?? null) as AccountBranding | null;
  }
  return result;
}

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
    if (!widgetId) {
      return NextResponse.json({ error: "bad_request" }, { status: 400, headers: responseHeaders });
    }

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
      .select("id,type,status,config,owner_id")
      .eq("id", widgetId)
      .maybeSingle();

    if (widgetError) {
      return NextResponse.json(
        { error: "db_error", message: widgetError.message },
        { status: 500, headers: responseHeaders }
      );
    }

    if (!widget) {
      return NextResponse.json({ error: "not_found" }, { status: 404, headers: responseHeaders });
    }

    const theme: WidgetThemePayload = { ...DEFAULT_THEME };

    const branding = await resolveBrandingForWidget(req, supabase, role, widget.owner_id);

    if (branding) {
      const normalized = normaliseBranding(branding);
      theme.accent = resolveAccentColor(normalized);
      theme.cornerStyle = normalized.corner_style;
      theme.surfaceStyle = normalized.surface_style;
      theme.backgroundUrl = resolveBrandAssetUrl(normalized.background_path);
      theme.logoUrl = resolveBrandAssetUrl(normalized.logo_path);
    } else {
      const configTheme =
        widget.config && typeof widget.config === "object"
          ? ((widget.config as Record<string, unknown>)?.theme as Record<string, unknown> | undefined)
          : undefined;
      if (configTheme && typeof configTheme === "object") {
        const accent = typeof configTheme.accent === "string" ? configTheme.accent.trim() : "";
        if (accent) theme.accent = accent;
        const corner = typeof configTheme.cornerStyle === "string" ? configTheme.cornerStyle.trim() : "";
        if (corner) theme.cornerStyle = corner;
        const surface = typeof configTheme.surfaceStyle === "string" ? configTheme.surfaceStyle.trim() : "";
        if (surface) theme.surfaceStyle = surface;
        const bg = typeof configTheme.backgroundUrl === "string" ? configTheme.backgroundUrl.trim() : "";
        if (bg) theme.backgroundUrl = bg;
        const logo = typeof configTheme.logoUrl === "string" ? configTheme.logoUrl.trim() : "";
        if (logo) theme.logoUrl = logo;
      }
    }

    const widgetResponse: WidgetResponse = {
      id: widget.id,
      type: widget.type,
      status: widget.status,
      config: (widget.config && typeof widget.config === "object" ? widget.config : {}) as Record<string, unknown>,
    };

    return NextResponse.json(
      {
        ok: true,
        theme,
        widget: widgetResponse,
      },
      { status: 200, headers: responseHeaders }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 200, headers: responseHeaders });
  }
}

async function resolveBrandingForWidget(
  req: Request,
  supabase: SupabaseClient,
  role: "service" | "anon",
  ownerId: string | null
): Promise<AccountBranding | null> {
  if (!ownerId) return null;

  const fetchViaRpc = async (client: SupabaseClient) => {
    const { data, error } = await client.rpc("account_branding", { p_account_id: ownerId });
    if (error) throw error;
    return unwrapBranding(data as AccountBranding[] | AccountBranding | null);
  };

  try {
    const branding = await fetchViaRpc(supabase);
    if (branding) return branding;
  } catch {
    // ignore and fall through
  }

  try {
    const branding = await supabaseEnsure<AccountBranding | AccountBranding[] | null>(req, {
      action: "rpc",
      name: "account_branding",
      args: { p_account_id: ownerId },
    });
    if (branding) return unwrapBranding(branding);
  } catch {
    // ignore
  }

  try {
    const admin = createAdminClient();
    if (admin !== supabase) {
      const branding = await fetchViaRpc(admin);
      if (branding) return branding;
    }
  } catch {
    // ignore final fallback
  }

  return null;
}
