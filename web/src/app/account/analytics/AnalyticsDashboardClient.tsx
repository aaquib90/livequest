'use client';

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, ArrowLeft, ArrowUpRight, Gauge, LineChart } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/browserClient";
import {
  fetchAccountAnalytics,
  type AccountAnalyticsResult,
} from "../lib/fetchAccountAnalytics";

const integerFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});

const dayFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

function Sparkline({ values, strokeClass }: { values: number[]; strokeClass: string }) {
  if (!values.length) {
    return <div className="h-24 w-full rounded-xl border border-dashed border-border/60" />;
  }
  const maxValue = Math.max(...values, 1);
  const points = values.map((value, index) => {
    const x = values.length === 1 ? 0 : (index / (values.length - 1)) * 100;
    const verticalPadding = 8;
    const usableHeight = 100 - verticalPadding * 2;
    const y = 100 - verticalPadding - (value / maxValue) * usableHeight;
    return { x, y };
  });
  const pathData = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
  const areaData = `${pathData} L ${points[points.length - 1].x.toFixed(2)} 100 L ${points[0].x.toFixed(
    2
  )} 100 Z`;
  const lastPoint = points[points.length - 1];

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-24 w-full" aria-hidden="true">
      <path d={areaData} className={strokeClass} fill="currentColor" fillOpacity="0.12" />
      <path
        d={pathData}
        className={strokeClass}
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastPoint.x} cy={lastPoint.y} r={2.8} className={strokeClass} fill="currentColor" />
    </svg>
  );
}

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

  const sponsorCtr = summary?.sponsor_ctr_30d ? Number(summary.sponsor_ctr_30d) : 0;
  const unique30d = summary?.unique_viewers_30d ?? 0;
  const sessions30d = summary?.session_pings_30d ?? 0;
  const starts30d = summary?.starts_30d ?? 0;
  const sessionsPerViewer = unique30d > 0 ? sessions30d / unique30d : 0;
  const startConversion = sessions30d > 0 ? (starts30d / sessions30d) * 100 : 0;

  const timeseriesValues = useMemo(
    () => timeseries.map((row) => row.unique_viewers ?? 0),
    [timeseries]
  );

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

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/70 bg-background/50">
          <CardHeader>
            <CardTitle className="text-lg">Unique viewers (30d)</CardTitle>
            <CardDescription>Distinct sessions recorded across all liveblogs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-4xl font-semibold text-foreground">
              {integerFormatter.format(unique30d)}
            </p>
            <p className="text-xs text-muted-foreground">
              {integerFormatter.format(summary.unique_viewers_7d ?? 0)} in the last 7 days.
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-background/50">
          <CardHeader>
            <CardTitle className="text-lg">Sessions recorded (30d)</CardTitle>
            <CardDescription>
              Heartbeat pings that indicate dwell time and repeat visits.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-4xl font-semibold text-foreground">
              {integerFormatter.format(sessions30d)}
            </p>
            <p className="text-xs text-muted-foreground">
              Avg {percentFormatter.format(sessionsPerViewer)} sessions per viewer.
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-background/50">
          <CardHeader>
            <CardTitle className="text-lg">Starts (30d)</CardTitle>
            <CardDescription>Moments a viewer intentionally opened a liveblog experience.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-4xl font-semibold text-foreground">
              {integerFormatter.format(starts30d)}
            </p>
            <p className="text-xs text-muted-foreground">
              {percentFormatter.format(startConversion)}% of sessions converted to starts.
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-background/50">
          <CardHeader>
            <CardTitle className="text-lg">Sponsor performance (30d)</CardTitle>
            <CardDescription>
              Combined CTR across every placement with click tracking enabled.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-4xl font-semibold text-foreground">
              {percentFormatter.format(sponsorCtr)}%
            </p>
            <p className="text-xs text-muted-foreground">
              {integerFormatter.format(summary.sponsor_impressions_30d ?? 0)} impressions ·{' '}
              {integerFormatter.format(summary.sponsor_clicks_30d ?? 0)} clicks
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
        <Card className="border-border/70 bg-background/50">
          <CardHeader className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="w-fit">
                Trend
              </Badge>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <LineChart className="h-4 w-4" />
                Last 14 days
              </div>
            </div>
            <CardTitle className="text-2xl">Audience trajectory</CardTitle>
            <CardDescription className="text-base">
              Track how reach evolves each day to identify news cycles that resonate. Spikes can hint
              at traffic partners worth nurturing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Sparkline values={timeseriesValues} strokeClass="text-emerald-400" />
            <div className="space-y-3">
              {timeseries.slice(-7).map((row) => (
                <div
                  key={row.day}
                  className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/60 px-4 py-3 text-sm"
                >
                  <span className="text-foreground">{dayFormatter.format(new Date(row.day))}</span>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Gauge className="h-3.5 w-3.5" />
                      {integerFormatter.format(row.unique_viewers ?? 0)} viewers
                    </span>
                    <span>{integerFormatter.format(row.sessions ?? 0)} sessions</span>
                    <span>{integerFormatter.format(row.starts ?? 0)} starts</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-background/50">
          <CardHeader className="space-y-4">
            <Badge variant="outline" className="w-fit">
              Engagement
            </Badge>
            <CardTitle className="text-2xl">Session characteristics</CardTitle>
            <CardDescription className="text-base">
              Understand repeat visit behaviour and the ratio of sessions to deliberate starts to
              fine-tune retention.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">Sessions per unique</span>
                <span className="text-xs text-muted-foreground">30 day window</span>
              </div>
              <p className="mt-2 text-3xl font-semibold text-foreground">
                {percentFormatter.format(sessionsPerViewer)}×
              </p>
              <p className="text-xs text-muted-foreground">
                High repeat sessions indicate sticky storytelling or rolling coverage.
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">Start conversion</span>
                <span className="text-xs text-muted-foreground">Sessions → starts</span>
              </div>
              <p className="mt-2 text-3xl font-semibold text-foreground">
                {percentFormatter.format(startConversion)}%
              </p>
              <p className="text-xs text-muted-foreground">
                Pair this with referral data to spot channels that produce the most engaged readers.
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">Published updates</span>
                <span className="text-xs text-muted-foreground">All time</span>
              </div>
              <p className="mt-2 text-3xl font-semibold text-foreground">
                {integerFormatter.format(summary.total_updates ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground">
                Use this as a guardrail for newsroom output across formats and beats.
              </p>
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
            {topLiveblogs.length ? (
              topLiveblogs.map((lb) => (
                <div
                  key={lb.liveblog_id}
                  className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-background/60 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {lb.liveblog_title || "Untitled liveblog"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Last published{' '}
                      {lb.last_published_at
                        ? dateTimeFormatter.format(new Date(lb.last_published_at))
                        : "—"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 rounded-full border border-border/40 px-2 py-1">
                      <Gauge className="h-3 w-3" />
                      {integerFormatter.format(lb.unique_viewers ?? 0)} viewers
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-border/40 px-2 py-1">
                      Starts {integerFormatter.format(lb.starts ?? 0)}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-border/40 px-2 py-1">
                      Updates {integerFormatter.format(lb.updates_published ?? 0)}
                    </span>
                    <Button
                      asChild
                      size="sm"
                      variant="ghost"
                      className="h-7 rounded-full px-3 text-[11px]"
                    >
                      <Link href={`/liveblogs/${lb.liveblog_id}/manage`}>
                        Manage
                        <ArrowUpRight className="ml-1.5 h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))
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
            <Button asChild variant="ghost" size="sm" className="border border-border/50">
              <Link href="mailto:hello@livequest.studio">
                Discuss analytics integrations
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
