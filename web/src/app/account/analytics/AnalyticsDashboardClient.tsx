'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, ArrowLeft, ArrowUpRight, Gauge, LineChart } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  type ChartConfig,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { createClient } from "@/lib/supabase/browserClient";
import {
  fetchAccountAnalytics,
  type AccountAnalyticsResult,
  type TopLiveblogRow,
} from "../lib/fetchAccountAnalytics";

type EnhancedLiveblog = TopLiveblogRow & {
  viewers: number;
  starts: number;
  updates: number;
  interactions: number;
};

const integerFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

export default function AnalyticsDashboardClient() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [data, setData] = useState<AccountAnalyticsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) {
          if (active) router.replace("/signin");
          return;
        }

        const analytics = await fetchAccountAnalytics(supabase, {
          userId: session.user.id,
          topLiveblogsLimit: 10,
          topSponsorsLimit: 8,
          topReferrersLimit: 8,
          includeTimeseries: true,
          timeseriesDays: 14,
        });

        if (active) {
          setData(analytics);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unexpected error loading analytics.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [router, supabase]);

  const summary = data?.summary ?? null;
  const topLiveblogs = data?.topLiveblogs ?? [];
  const sponsors = data?.topSponsors ?? [];
  const referrers = useMemo(() => data?.referrers ?? [], [data]);
  const timeseries = useMemo(() => data?.timeseries ?? [], [data]);
  const totals = data?.totals ?? null;
  const totalLiveblogs = totals?.totalLiveblogs ?? 0;
  const activeLiveblogs = totals?.activeLiveblogs ?? 0;
  const archivedLiveblogs = totals?.archivedLiveblogs ?? 0;
  const uniqueFolders = totals?.uniqueFolders ?? 0;

  const sponsorCtr = summary?.sponsor_ctr_30d ? Number(summary.sponsor_ctr_30d) : 0;
  const unique30d = summary?.unique_viewers_30d ?? 0;
  const sessions30d = summary?.session_pings_30d ?? 0;
  const starts30d = summary?.starts_30d ?? 0;
  const sessionsPerViewer = unique30d > 0 ? sessions30d / unique30d : 0;
  const startConversion = sessions30d > 0 ? (starts30d / sessions30d) * 100 : 0;

  const [chartRange, setChartRange] = useState<"7d" | "14d" | "30d" | "all">("14d");
  const [visibleSeries, setVisibleSeries] = useState({
    uniques: true,
    sessions: true,
    starts: true,
  });

  const rawChartData = useMemo(
    () =>
      timeseries.map((row) => ({
        date: row.day,
        uniques: Number(row.unique_viewers ?? 0),
        sessions: Number(row.sessions ?? 0),
        starts: Number(row.starts ?? 0),
      })),
    [timeseries]
  );

  const chartRangeOptions = useMemo(() => {
    const length = rawChartData.length;
    const options: Array<{ value: "7d" | "14d" | "30d" | "all"; label: string }> = [];
    if (length >= 7) options.push({ value: "7d", label: "7 days" });
    if (length >= 14) options.push({ value: "14d", label: "14 days" });
    if (length >= 30) options.push({ value: "30d", label: "30 days" });
    options.push({ value: "all", label: "All time" });
    return options;
  }, [rawChartData.length]);

  useEffect(() => {
    if (!chartRangeOptions.length) return;
    const preferred =
      chartRangeOptions.find((option) => option.value === "14d")?.value ??
      chartRangeOptions[0]?.value ??
      "all";
    setChartRange((current) => {
      const valid = chartRangeOptions.some((option) => option.value === current);
      return valid ? current : preferred;
    });
  }, [chartRangeOptions]);

  const chartData = useMemo(() => {
    if (!rawChartData.length) return [];
    if (chartRange === "all") return rawChartData;
    const count = parseInt(chartRange, 10);
    const sliceCount = Number.isFinite(count) && count > 0 ? Math.min(count, rawChartData.length) : rawChartData.length;
    return rawChartData.slice(-sliceCount);
  }, [rawChartData, chartRange]);

  const toggleSeriesVisibility = useCallback((key: keyof typeof visibleSeries) => {
    setVisibleSeries((prev) => {
      const currentlyActive = prev[key];
      const activeCount = Object.values(prev).filter(Boolean).length;
      if (currentlyActive && activeCount <= 1) {
        return prev;
      }
      return {
        ...prev,
        [key]: !currentlyActive,
      };
    });
  }, []);

  const chartConfig = useMemo<ChartConfig>(
    () => ({
      uniques: {
        label: "Unique viewers",
        color: "#34d399",
      },
      sessions: {
        label: "Sessions",
        color: "#38bdf8",
      },
      starts: {
        label: "Starts",
        color: "#c084fc",
      },
    }),
    []
  );

  const chartRangeLabel = useMemo(() => {
    if (chartRange === "all") return "All time";
    const days = parseInt(chartRange, 10);
    return `Last ${days} day${days === 1 ? "" : "s"}`;
  }, [chartRange]);

  const chartSeriesOptions = useMemo(
    () => [
      { key: "uniques" as const, label: "Uniques" },
      { key: "sessions" as const, label: "Sessions" },
      { key: "starts" as const, label: "Starts" },
    ],
    []
  );

  const enhancedLiveblogs = useMemo<EnhancedLiveblog[]>(() => {
    return topLiveblogs.map((lb) => {
      const viewers = Number(lb.unique_viewers ?? 0);
      const starts = Number(lb.starts ?? 0);
      const updates = Number(lb.updates_published ?? 0);
      const interactions = viewers + starts + updates;
      return {
        ...lb,
        viewers,
        starts,
        updates,
        interactions,
      } as EnhancedLiveblog;
    });
  }, [topLiveblogs]);

  const sortedTopLiveblogs = useMemo(() => {
    return [...enhancedLiveblogs].sort((a, b) => b.interactions - a.interactions);
  }, [enhancedLiveblogs]);

  const highlightLiveblog = sortedTopLiveblogs[0] ?? null;
  const remainingLiveblogs = useMemo(
    () => sortedTopLiveblogs.slice(1),
    [sortedTopLiveblogs]
  );

  const [expandedLiveblogId, setExpandedLiveblogId] = useState<string | null>(null);

  useEffect(() => {
    if (highlightLiveblog?.liveblog_id) {
      setExpandedLiveblogId((current) =>
        current === null ? highlightLiveblog.liveblog_id : current
      );
    }
  }, [highlightLiveblog?.liveblog_id]);

  const toggleLiveblogDetails = useCallback((id: string) => {
    setExpandedLiveblogId((current) => (current === id ? null : id));
  }, []);

  const totalReferrerSessions = useMemo(
    () => referrers.reduce((sum, row) => sum + Number(row.sessions ?? 0), 0),
    [referrers]
  );
  const totalReferrerUniques = useMemo(
    () => referrers.reduce((sum, row) => sum + Number(row.unique_viewers ?? 0), 0),
    [referrers]
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="border-border/60 bg-background/40">
          <CardContent className="h-32 animate-pulse" />
        </Card>
        <Card className="border-border/60 bg-background/40">
          <CardContent className="h-48 animate-pulse" />
        </Card>
      </div>
  );
}

type LeaderboardRowProps = {
  rank: number;
  liveblog: EnhancedLiveblog;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  highlight?: boolean;
};

function LeaderboardRow({
  rank,
  liveblog,
  isExpanded,
  onToggle,
  highlight = false,
}: LeaderboardRowProps) {
  const containerClasses = highlight
    ? "space-y-3 rounded-2xl border border-primary/50 bg-primary/5 p-5"
    : "space-y-3 rounded-2xl border border-border/60 bg-background/60 p-4";

  const toggleLabel = isExpanded ? "Hide details" : "View details";

  return (
    <div className={containerClasses}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-border/40 px-2 py-1 text-[11px] uppercase text-muted-foreground">
              #{rank}
            </span>
            <p className="text-sm font-medium text-foreground">
              {liveblog.liveblog_title || "Untitled liveblog"}
            </p>
            {highlight ? (
              <Badge variant="muted" className="uppercase">
                Peak
              </Badge>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            Last published{" "}
            {liveblog.last_published_at
              ? dateTimeFormatter.format(new Date(liveblog.last_published_at))
              : "—"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 font-medium text-primary">
            {integerFormatter.format(liveblog.interactions)} interactions
          </span>
          <Button
            type="button"
            size="sm"
            variant={highlight ? "secondary" : "outline"}
            className="h-7 rounded-full px-3 text-[11px]"
            onClick={() => onToggle(liveblog.liveblog_id)}
          >
            {toggleLabel}
          </Button>
        </div>
      </div>
      {isExpanded ? (
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-background/70 px-2 py-1">
            <Gauge className="h-3 w-3" />
            {integerFormatter.format(liveblog.viewers)} viewers
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-background/70 px-2 py-1">
            Starts {integerFormatter.format(liveblog.starts)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-background/70 px-2 py-1">
            Updates {integerFormatter.format(liveblog.updates)}
          </span>
          <Button
            asChild
            size="sm"
            variant={highlight ? "secondary" : "ghost"}
            className="h-7 rounded-full px-3 text-[11px]"
          >
            <Link href={`/liveblogs/${liveblog.liveblog_id}/manage`}>
              Manage
              <ArrowUpRight className="ml-1.5 h-3 w-3" />
            </Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}

  if (error) {
    return (
      <div className="rounded-3xl border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive-foreground">
        <p>{error}</p>
      </div>
    );
  }

  if (!data || !summary) {
    return null;
  }

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-border/60 bg-gradient-to-br from-slate-900/70 via-slate-900/30 to-slate-900/10 px-8 py-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <Badge variant="muted" className="w-fit border-border/40">
              <LineChart className="mr-1.5 h-3.5 w-3.5" />
              Analytics
            </Badge>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Workspace analytics
              </h1>
              <p className="max-w-2xl text-base text-muted-foreground">
                Measure the reach of every liveblog, understand traffic sources, and keep sponsor
                partners accountable from one consolidated dashboard.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm" className="border-border/70">
              <Link href="/account">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to account
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/dashboard">
                Go to dashboard
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        <Card className="border-border/70 bg-background/50">
          <CardHeader className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="w-fit">
                Trend
              </Badge>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <LineChart className="h-4 w-4" />
                {chartRangeLabel}
              </div>
            </div>
            <CardTitle className="text-2xl">Audience trajectory</CardTitle>
            <CardDescription className="text-base">
              Track how reach evolves each day to identify news cycles that resonate. Spikes can hint
              at traffic partners worth nurturing.
            </CardDescription>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                Range:
                <div className="inline-flex items-center gap-1">
                  {chartRangeOptions.map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      size="sm"
                      variant={chartRange === option.value ? "default" : "outline"}
                      className="h-7 rounded-full px-3 text-[11px]"
                      onClick={() => setChartRange(option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                Series:
                <div className="inline-flex items-center gap-1">
                  {chartSeriesOptions.map((option) => {
                    const active = visibleSeries[option.key];
                    return (
                      <Button
                        key={option.key}
                        type="button"
                        size="sm"
                        variant={active ? "default" : "outline"}
                        className="h-7 rounded-full px-3 text-[11px]"
                        onClick={() => toggleSeriesVisibility(option.key)}
                        aria-pressed={active}
                      >
                        {option.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {chartData.length ? (
              <ChartContainer config={chartConfig} className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ left: 0, right: 0, top: 16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="fillUniques" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--chart-uniques)" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="var(--chart-uniques)" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="fillSessions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--chart-sessions)" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="var(--chart-sessions)" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="fillStarts" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--chart-starts)" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="var(--chart-starts)" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="4 8"
                      className="stroke-border/60"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
                      }}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                      dy={8}
                      minTickGap={16}
                    />
                    <YAxis hide domain={[0, (dataMax: number) => dataMax * 1.2]} />
                    <ChartTooltip
                      cursor={{ strokeDasharray: "4 4", stroke: "hsl(var(--border))" }}
                      content={
                        <ChartTooltipContent
                          indicator="line"
                          className="bg-background/90"
                          labelFormatter={(value) =>
                            typeof value === "string"
                              ? new Intl.DateTimeFormat(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                }).format(new Date(value))
                              : value
                          }
                          valueFormatter={(value) =>
                            typeof value === "number"
                              ? integerFormatter.format(Math.max(value, 0))
                              : value
                          }
                        />
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="uniques"
                      stroke="var(--chart-uniques)"
                      strokeWidth={2.4}
                      fill="url(#fillUniques)"
                      activeDot={{ r: 4 }}
                      hide={!visibleSeries.uniques}
                    />
                    <Area
                      type="monotone"
                      dataKey="sessions"
                      stroke="var(--chart-sessions)"
                      strokeWidth={2}
                      fill="url(#fillSessions)"
                      activeDot={{ r: 4 }}
                      hide={!visibleSeries.sessions}
                    />
                    <Area
                      type="monotone"
                      dataKey="starts"
                      stroke="var(--chart-starts)"
                      strokeWidth={2}
                      fill="url(#fillStarts)"
                      activeDot={{ r: 4 }}
                      hide={!visibleSeries.starts}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-24 w-full rounded-xl border border-dashed border-border/60" />
            )}
            <div className="space-y-3">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Top liveblogs
              </div>
              {sortedTopLiveblogs.slice(0, 3).map((lb, index) => (
                <div
                  key={lb.liveblog_id}
                  className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/60 px-4 py-3 text-sm"
                >
                  <div className="flex flex-col gap-1 text-foreground">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-border/40 px-2 py-1 text-[11px] uppercase text-muted-foreground">
                        #{index + 1}
                      </span>
                      <span className="font-medium">
                        {lb.liveblog_title || "Untitled liveblog"}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {lb.last_published_at
                        ? `Last published ${dateTimeFormatter.format(new Date(lb.last_published_at))}`
                        : "No published updates yet"}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 font-medium text-primary">
                      {integerFormatter.format(lb.interactions)} interactions
                    </span>
                    <span className="flex gap-3">
                      <span>{integerFormatter.format(lb.viewers)} viewers</span>
                      <span>{integerFormatter.format(lb.starts)} starts</span>
                      <span>{integerFormatter.format(lb.updates)} updates</span>
                    </span>
                  </div>
                </div>
              ))}
              {!sortedTopLiveblogs.length ? (
                <p className="text-xs text-muted-foreground">
                  Publish a liveblog to start collecting performance data.
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Card className="border-border/70 bg-background/50">
          <CardHeader className="space-y-3">
            <Badge variant="outline" className="w-fit">
              Liveblogs
            </Badge>
            <CardTitle className="text-2xl">Leaderboard</CardTitle>
            <CardDescription className="text-base">
              Spot over-performers and identify coverage that may need a newsroom push.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {sortedTopLiveblogs.length ? (
              <>
                {highlightLiveblog ? (
                  <LeaderboardRow
                    rank={1}
                    liveblog={highlightLiveblog}
                    isExpanded={expandedLiveblogId === highlightLiveblog.liveblog_id}
                    onToggle={toggleLiveblogDetails}
                    highlight
                  />
                ) : null}
                {remainingLiveblogs.map((lb, index) => (
                  <LeaderboardRow
                    key={lb.liveblog_id}
                    rank={index + 2}
                    liveblog={lb}
                    isExpanded={expandedLiveblogId === lb.liveblog_id}
                    onToggle={toggleLiveblogDetails}
                  />
                ))}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Publish your first liveblog to see performance breakdowns here.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-background/50">
          <CardHeader className="space-y-3">
            <Badge variant="outline" className="w-fit">
              Sponsors
            </Badge>
            <CardTitle className="text-2xl">Partner performance</CardTitle>
            <CardDescription className="text-base">
              Aggregate impact of sponsorships with clarity on impressions, clicks, and CTR.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {sponsors.length ? (
              sponsors.map((slot) => (
                <div
                  key={slot.slot_id}
                  className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-background/60 p-4"
                >
                  <div className="flex items-center justify-between text-sm">
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">
                        {slot.sponsor_name || "Unnamed sponsor"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {slot.liveblog_title || "Liveblog"} · {slot.status || "scheduled"}
                      </p>
                    </div>
                    <span className="text-xs text-primary">
                      {percentFormatter.format(Number(slot.ctr ?? 0))}% CTR
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>{integerFormatter.format(slot.impressions ?? 0)} impressions</span>
                    <span>{integerFormatter.format(slot.clicks ?? 0)} clicks</span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-border/40 px-2 py-1">
                      <Activity className="h-3 w-3" />
                      ID ending {slot.slot_id.slice(0, 6)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Add sponsor slots to a liveblog to benchmark partner outcomes here.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="border-border/70 bg-background/50">
          <CardHeader className="space-y-3">
            <Badge variant="outline" className="w-fit">
              Traffic
            </Badge>
            <CardTitle className="text-2xl">Referrer breakdown</CardTitle>
            <CardDescription className="text-base">
              Use this distribution to double down on outlets delivering the highest engagement.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {referrers.length ? (
              referrers.map((row) => {
                const viewerCount = Number(row.unique_viewers ?? 0);
                const sessionCount = Number(row.sessions ?? 0);
                const sessionShare =
                  totalReferrerSessions > 0
                    ? Math.round((sessionCount / totalReferrerSessions) * 100)
                    : 0;
                const viewerShare =
                  totalReferrerUniques > 0
                    ? Math.round((viewerCount / totalReferrerUniques) * 100)
                    : 0;
                const label = row.referrer || "Direct / none";
                return (
                  <div
                    key={`${label}-${viewerShare}-${sessionShare}`}
                    className="space-y-2 rounded-2xl border border-border/60 bg-background/60 p-4"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <p className="font-medium text-foreground">{label}</p>
                      <span className="text-xs text-muted-foreground">
                        {integerFormatter.format(viewerCount)} viewers ·{' '}
                        {integerFormatter.format(sessionCount)} sessions
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Viewer share</span>
                        <span>{viewerShare}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-border/60">
                        <div
                          className="h-full rounded-full bg-emerald-500/50"
                          style={{ width: `${Math.min(Math.max(viewerShare, 4), 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Session share</span>
                        <span>{sessionShare}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-border/60">
                        <div
                          className="h-full rounded-full bg-sky-500/40"
                          style={{ width: `${Math.min(Math.max(sessionShare, 4), 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">
                We&apos;ll display sources once your liveblogs begin receiving traffic.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-background/50">
          <CardHeader className="space-y-3">
            <Badge variant="outline" className="w-fit">
              Data export
            </Badge>
            <CardTitle className="text-2xl">Need raw numbers?</CardTitle>
            <CardDescription className="text-base">
              Use the Livequest API or schedule exports to sync analytics with your BI tooling.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
              <p className="text-sm font-medium text-foreground">Supabase access</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Query tables like <code className="font-mono text-xs">viewer_pings</code> and{' '}
                <code className="font-mono text-xs">analytics_events</code> directly with SQL for bespoke
                dashboards.
              </p>
            </div>
          <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
            <p className="text-sm font-medium text-foreground">Scheduled exports</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Coming soon: automate CSV deliveries to sponsors or internal reporting systems.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="border border-border/50"
            onClick={() => window.Intercom?.("show")}
          >
            Discuss analytics integrations
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
