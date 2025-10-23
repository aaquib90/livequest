import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/serverClient";

export const runtime = "edge";

type LiveblogStatus = "active" | "archived" | "completed" | "deleted";

type AccountLiveblogRow = {
  id: string;
  title: string | null;
  status: LiveblogStatus | null;
  folder: string | null;
};

type AnalyticsSummaryRow = {
  total_liveblogs: number;
  active_liveblogs: number;
  archived_liveblogs: number;
  unique_viewers_7d: number;
  unique_viewers_30d: number;
  session_pings_7d: number;
  session_pings_30d: number;
  starts_7d: number;
  starts_30d: number;
  total_updates: number;
  sponsor_impressions_30d: number;
  sponsor_clicks_30d: number;
  sponsor_ctr_30d: string | number;
};

type TopLiveblogRow = {
  liveblog_id: string;
  liveblog_title: string | null;
  status: string | null;
  unique_viewers: number;
  starts: number;
  updates_published: number;
  last_published_at: string | null;
};

type SponsorLeaderboardRow = {
  slot_id: string;
  sponsor_name: string | null;
  liveblog_id: string;
  liveblog_title: string | null;
  status: string | null;
  impressions: number;
  clicks: number;
  ctr: string | number;
};

type ReferrerRow = {
  referrer: string | null;
  sessions: number;
  unique_viewers: number;
};

type TimeseriesRow = {
  day: string;
  unique_viewers: number;
  sessions: number;
  starts: number;
};

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const [
    liveblogsResult,
    summaryResult,
    topLiveblogsResult,
    topSponsorsResult,
    referrerResult,
    timeseriesResult,
  ] = await Promise.all([
    supabase.from("liveblogs").select("id,title,status,folder").eq("owner_id", user.id),
    supabase.rpc("account_analytics_summary"),
    supabase.rpc("account_top_liveblogs", { p_limit: 10 }),
    supabase.rpc("account_top_sponsors", { p_limit: 8 }),
    supabase.rpc("account_referrer_breakdown", { p_limit: 10 }),
    supabase.rpc("account_viewer_timeseries", { p_days: 14 }),
  ]);

  const liveblogRows = (liveblogsResult.data as AccountLiveblogRow[] | null) ?? [];
  const analyticsSummary =
    ((summaryResult.data as AnalyticsSummaryRow[] | null)?.[0] as AnalyticsSummaryRow | undefined) ??
    undefined;
  const topLiveblogs = (topLiveblogsResult.data as TopLiveblogRow[] | null) ?? [];
  const topSponsors = (topSponsorsResult.data as SponsorLeaderboardRow[] | null) ?? [];
  const referrers = (referrerResult.data as ReferrerRow[] | null) ?? [];
  const timeseries = (timeseriesResult.data as TimeseriesRow[] | null) ?? [];

  const totalLiveblogs =
    typeof analyticsSummary?.total_liveblogs === "number"
      ? analyticsSummary.total_liveblogs
      : liveblogRows.length;
  const activeLiveblogs =
    typeof analyticsSummary?.active_liveblogs === "number"
      ? analyticsSummary.active_liveblogs
      : liveblogRows.filter((lb) => lb.status === "active" || lb.status === null).length;
  const archivedLiveblogs =
    typeof analyticsSummary?.archived_liveblogs === "number"
      ? analyticsSummary.archived_liveblogs
      : liveblogRows.filter((lb) => lb.status === "archived" || lb.status === "completed").length;
  const uniqueFolders = new Set(
    liveblogRows
      .map((lb) => lb.folder?.trim())
      .filter((folder): folder is string => Boolean(folder && folder.length))
  ).size;

  return NextResponse.json({
    summary: analyticsSummary ?? null,
    topLiveblogs,
    topSponsors,
    referrers,
    timeseries,
    totals: {
      totalLiveblogs,
      activeLiveblogs,
      archivedLiveblogs,
      uniqueFolders,
    },
  });
}
