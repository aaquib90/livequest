import { NextRequest, NextResponse } from "next/server";

import { fetchAccountFeaturesForUser } from "@/lib/billing/server";
import { fetchAccountBrandingForLiveblog, fetchAccountBrandingForUser } from "@/lib/branding/server";
import { normaliseBranding } from "@/lib/branding/utils";
import { matchTeam } from "@/lib/football/teams";
import { createClient } from "@/lib/supabase/serverClient";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const target = req.nextUrl.searchParams.get("target");

  switch (target) {
    case "account":
      return handleAccountOverview(supabase);
    case "account-customization":
      return handleAccountCustomization(supabase);
    case "dashboard":
      return handleDashboardOverview(supabase);
    case "embed":
      return handleEmbedOverview(supabase, req.nextUrl.searchParams.get("id"));
    default:
      return NextResponse.json({ error: "invalid_target" }, { status: 400 });
  }
}

async function handleAccountOverview(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const features = await fetchAccountFeaturesForUser(supabase).catch(() => null);
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const { count: liveblogsThisMonth = 0 } = await supabase
    .from("liveblogs")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id)
    .gte("created_at", monthStart.toISOString());

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      user_metadata: user.user_metadata ?? {},
    },
    features,
    liveblogsThisMonth: liveblogsThisMonth ?? 0,
  });
}

async function handleAccountCustomization(
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const features = await fetchAccountFeaturesForUser(supabase).catch(() => null);
  const brandingRaw = await fetchAccountBrandingForUser(supabase).catch(() => null);
  const normalized = normaliseBranding(brandingRaw ?? undefined);
  const branding = normalized.account_id ? normalized : { ...normalized, account_id: user.id };

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      user_metadata: user.user_metadata ?? {},
    },
    features,
    branding,
  });
}

async function handleDashboardOverview(
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const features = await fetchAccountFeaturesForUser(supabase).catch(() => null);
  const { data: liveblogs } = await supabase
    .from("liveblogs")
    .select("id,title,created_at,status,privacy,folder,owner_id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const now = new Date();
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const { count: monthlyUsage = 0 } = await supabase
    .from("liveblogs")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id)
    .gte("created_at", periodStart.toISOString());

  const monthlyLimit =
    typeof features?.monthly_liveblog_limit === "number"
      ? features.monthly_liveblog_limit
      : null;

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
    },
    features,
    liveblogs: (liveblogs as unknown[]) ?? [],
    monthlyUsage: monthlyUsage ?? 0,
    monthlyLimit,
  });
}

async function handleEmbedOverview(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string | null
) {
  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

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
}
