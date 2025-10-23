import type { PostgrestSingleResponse, SupabaseClient } from "@supabase/supabase-js";

type LiveblogStatus = "active" | "archived" | "completed" | "deleted";

type AccountLiveblogRow = {
  id: string;
  status: LiveblogStatus | null;
  folder: string | null;
};

export type AnalyticsSummaryRow = {
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

export type TopLiveblogRow = {
  liveblog_id: string;
  liveblog_title: string | null;
  status: string | null;
  unique_viewers: number;
  starts: number;
  updates_published: number;
  last_published_at: string | null;
};

export type SponsorLeaderboardRow = {
  slot_id: string;
  sponsor_name: string | null;
  liveblog_id: string;
  liveblog_title: string | null;
  status: string | null;
  impressions: number;
  clicks: number;
  ctr: string | number;
};

export type ReferrerRow = {
  referrer: string | null;
  sessions: number;
  unique_viewers: number;
};

export type TimeseriesRow = {
  day: string;
  unique_viewers: number;
  sessions: number;
  starts: number;
};

export type AccountAnalyticsResult = {
  summary: AnalyticsSummaryRow | null;
  topLiveblogs: TopLiveblogRow[];
  topSponsors: SponsorLeaderboardRow[];
  referrers: ReferrerRow[];
  timeseries: TimeseriesRow[];
  totals: {
    totalLiveblogs: number;
    activeLiveblogs: number;
    archivedLiveblogs: number;
    uniqueFolders: number;
  };
};

type FetchOptions = {
  userId: string;
  topLiveblogsLimit?: number;
  topSponsorsLimit?: number;
  topReferrersLimit?: number;
  includeTimeseries?: boolean;
  timeseriesDays?: number;
};

export async function fetchAccountAnalytics(
  supabase: SupabaseClient,
  {
    userId,
    topLiveblogsLimit = 5,
    topSponsorsLimit = 5,
    topReferrersLimit = 5,
    includeTimeseries = false,
    timeseriesDays = 14,
  }: FetchOptions
): Promise<AccountAnalyticsResult> {
  const liveblogsPromise = supabase
    .from("liveblogs")
    .select("id,status,folder")
    .eq("owner_id", userId);

  const summaryPromise = supabase.rpc("account_analytics_summary");
  const topLiveblogsPromise = supabase.rpc("account_top_liveblogs", {
    p_limit: topLiveblogsLimit,
  });
  const topSponsorsPromise = supabase.rpc("account_top_sponsors", {
    p_limit: topSponsorsLimit,
  });
  const referrersPromise = supabase.rpc("account_referrer_breakdown", {
    p_limit: topReferrersLimit,
  });
  const timeseriesPromise: Promise<PostgrestSingleResponse<TimeseriesRow[]>> = includeTimeseries
    ? supabase.rpc("account_viewer_timeseries", { p_days: timeseriesDays })
    : Promise.resolve({ data: [] as TimeseriesRow[], error: null, count: null, status: 200, statusText: "OK" });

  const [liveblogsRes, summaryRes, topLiveblogsRes, topSponsorsRes, referrersRes, timeseriesRes] =
    await Promise.all([
      liveblogsPromise,
      summaryPromise,
      topLiveblogsPromise,
      topSponsorsPromise,
      referrersPromise,
      timeseriesPromise,
    ]);

  if (liveblogsRes.error) throw liveblogsRes.error;
  if (summaryRes.error) throw summaryRes.error;
  if (topLiveblogsRes.error) throw topLiveblogsRes.error;
  if (topSponsorsRes.error) throw topSponsorsRes.error;
  if (referrersRes.error) throw referrersRes.error;
  if ("error" in timeseriesRes && timeseriesRes.error) throw timeseriesRes.error;

  const liveblogs = (liveblogsRes.data as AccountLiveblogRow[] | null) ?? [];
  const summary =
    ((summaryRes.data as AnalyticsSummaryRow[] | null)?.[0] as AnalyticsSummaryRow | undefined) ??
    null;
  const topLiveblogs = (topLiveblogsRes.data as TopLiveblogRow[] | null) ?? [];
  const topSponsors = (topSponsorsRes.data as SponsorLeaderboardRow[] | null) ?? [];
  const referrers = (referrersRes.data as ReferrerRow[] | null) ?? [];
  const timeseries = includeTimeseries ? timeseriesRes.data ?? [] : [];

  const totalLiveblogs =
    typeof summary?.total_liveblogs === "number" ? summary.total_liveblogs : liveblogs.length;

  const activeLiveblogs =
    typeof summary?.active_liveblogs === "number"
      ? summary.active_liveblogs
      : liveblogs.filter((lb) => lb.status === "active" || lb.status === null).length;

  const archivedLiveblogs =
    typeof summary?.archived_liveblogs === "number"
      ? summary.archived_liveblogs
      : liveblogs.filter((lb) => lb.status === "archived" || lb.status === "completed").length;

  const uniqueFolders = new Set(
    liveblogs
      .map((lb) => lb.folder?.trim())
      .filter((folder): folder is string => Boolean(folder && folder.length))
  ).size;

  return {
    summary,
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
  };
}
