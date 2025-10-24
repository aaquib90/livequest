import { NextRequest, NextResponse } from "next/server";

import { fetchAccountBrandingForLiveblog } from "@/lib/branding/server";
import { normaliseBranding } from "@/lib/branding/utils";
import { matchTeam } from "@/lib/football/teams";
import { createClient } from "@/lib/supabase/serverClient";

export const runtime = "edge";
export const revalidate = 5;

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: "missing_id" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: liveblog } = await supabase
      .from("liveblogs")
      .select("id,title,privacy,settings")
      .eq("id", id)
      .single();

    if (!liveblog) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const { data: updates } = await supabase
      .from("updates")
      .select("id,content,published_at,pinned")
      .eq("liveblog_id", liveblog.id)
      .is("deleted_at", null)
      .eq("status", "published")
      .order("pinned", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(50);

    const orderPref =
      (liveblog.settings?.update_order as "newest" | "oldest") || "newest";
    const template = (liveblog.settings?.template as string | undefined) ?? null;
    const matchId =
      (liveblog.settings?.match_id as string | number | undefined) ?? undefined;

    let homeTeamName: string | null = null;
    let awayTeamName: string | null = null;
    let homeTeamSlug: string | null = null;
    let awayTeamSlug: string | null = null;

    if (template === "football" && matchId) {
      const { data: match } = await supabase
        .from("matches")
        .select("home_team_name,away_team_name")
        .eq("id", matchId)
        .single();
      if (match) {
        homeTeamName = match.home_team_name as string;
        awayTeamName = match.away_team_name as string;
        const home = homeTeamName ? matchTeam(homeTeamName) : null;
        const away = awayTeamName ? matchTeam(awayTeamName) : null;
        homeTeamSlug = home?.slug ?? null;
        awayTeamSlug = away?.slug ?? null;
      }
    }

    const brandingRaw = await fetchAccountBrandingForLiveblog(supabase, liveblog.id).catch(
      () => null,
    );
    const branding = brandingRaw ? normaliseBranding(brandingRaw) : null;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
    const buildPublicUrl = (path: string | null | undefined) => {
      if (!supabaseUrl || !path) return null;
      const safePath = path
        .split("/")
        .filter(Boolean)
        .map(encodeURIComponent)
        .join("/");
      return `${supabaseUrl}/storage/v1/object/public/brand-assets/${safePath}`;
    };

    const logoUrl = buildPublicUrl(branding?.logo_path ?? null);
    const backgroundUrl = buildPublicUrl(branding?.background_path ?? null);

    return NextResponse.json({
      liveblog,
      updates: updates ?? [],
      orderPref,
      template,
      match: {
        homeTeamName,
        awayTeamName,
        homeTeamSlug,
        awayTeamSlug,
      },
      branding,
      brandingAssets: { logoUrl, backgroundUrl },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal_error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
