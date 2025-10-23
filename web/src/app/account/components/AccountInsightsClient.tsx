'use client';

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Folder, Gauge } from "lucide-react";

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

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

export default function AccountInsightsClient() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [data, setData] = useState<AccountAnalyticsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) {
          if (isMounted) {
            router.replace("/signin");
          }
          return;
        }

        const analytics = await fetchAccountAnalytics(supabase, {
          userId: session.user.id,
          topLiveblogsLimit: 3,
          topSponsorsLimit: 4,
          topReferrersLimit: 4,
          includeTimeseries: false,
        });

        if (isMounted) {
          setData(analytics);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Unexpected error loading analytics.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [router, supabase]);

  const summary = data?.summary ?? null;
  const totals = data?.totals;
  const topLiveblogs = data?.topLiveblogs ?? [];
  const topSponsors = data?.topSponsors ?? [];
  const referrers = useMemo(() => data?.referrers ?? [], [data]);
  const totalReferrerUniques = useMemo(
    () => referrers.reduce((sum, row) => sum + Number(row?.unique_viewers ?? 0), 0),
    [referrers]
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="border-border/60 bg-background/40">
          <CardContent className="h-28 animate-pulse" />
        </Card>
        <Card className="border-border/60 bg-background/40">
          <CardContent className="h-36 animate-pulse" />
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

  if (!data) {
    return null;
  }

  const sponsorCtr30d = summary?.sponsor_ctr_30d ? Number(summary.sponsor_ctr_30d) : 0;

  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/70 bg-background/50">
          <CardHeader>
            <CardTitle className="text-lg">Active liveblogs</CardTitle>
            <CardDescription>Projects currently driving coverage and analytics.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-baseline gap-3">
            <span className="text-4xl font-semibold text-foreground">
              {integerFormatter.format(totals?.activeLiveblogs ?? 0)}
            </span>
            <span className="text-sm text-muted-foreground">
              of {integerFormatter.format(totals?.totalLiveblogs ?? 0)} total
            </span>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-background/50">
          <CardHeader>
            <CardTitle className="text-lg">Audience reach (30d)</CardTitle>
            <CardDescription>
              Unique viewers recorded across all liveblogs in the past month.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-baseline gap-3">
            <span className="text-4xl font-semibold text-foreground">
              {integerFormatter.format(summary?.unique_viewers_30d ?? 0)}
            </span>
            <span className="text-sm text-muted-foreground">
              {integerFormatter.format(summary?.unique_viewers_7d ?? 0)} in last 7 days
            </span>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-background/50">
          <CardHeader>
            <CardTitle className="text-lg">Sessions tracked (30d)</CardTitle>
            <CardDescription>
              Total viewing sessions measured from embeds and live pages.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-baseline gap-3">
            <span className="text-4xl font-semibold text-foreground">
              {integerFormatter.format(summary?.session_pings_30d ?? 0)}
            </span>
            <span className="text-sm text-muted-foreground">
              {integerFormatter.format(summary?.session_pings_7d ?? 0)} in last 7 days
            </span>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-background/50">
          <CardHeader>
            <CardTitle className="text-lg">Sponsor performance (30d)</CardTitle>
            <CardDescription>
              Combined CTR across partner placements, with raw impressions.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-semibold text-foreground">
                {percentFormatter.format(sponsorCtr30d)}%
              </span>
              <span className="text-sm text-muted-foreground">
                {integerFormatter.format(summary?.sponsor_impressions_30d ?? 0)} impressions
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {integerFormatter.format(summary?.sponsor_clicks_30d ?? 0)} clicks captured globally.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-border/70 bg-background/50">
          <CardHeader>
            <CardTitle className="text-lg">Folders in use</CardTitle>
            <CardDescription>Keep coverage organised with custom collections.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-baseline gap-3">
            <span className="text-4xl font-semibold text-foreground">
              {integerFormatter.format(totals?.uniqueFolders ?? 0)}
            </span>
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Folder className="h-4 w-4" />
              labelled folders
            </span>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-background/50">
          <CardHeader>
            <CardTitle className="text-lg">Archived library</CardTitle>
            <CardDescription>Stories you&apos;ve completed or moved to read-only.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-baseline gap-3">
            <span className="text-4xl font-semibold text-foreground">
              {integerFormatter.format(totals?.archivedLiveblogs ?? 0)}
            </span>
            <span className="text-sm text-muted-foreground">archived liveblogs</span>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-background/50">
          <CardHeader>
            <CardTitle className="text-lg">Starts fired (30d)</CardTitle>
            <CardDescription>Times readers actively opened a liveblog experience.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-baseline gap-3">
            <span className="text-4xl font-semibold text-foreground">
              {integerFormatter.format(summary?.starts_30d ?? 0)}
            </span>
            <span className="text-sm text-muted-foreground">
              {integerFormatter.format(summary?.starts_7d ?? 0)} in last 7 days
            </span>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
        <Card className="border-border/70 bg-background/50">
          <CardHeader>
            <Badge variant="outline" className="mb-4 w-fit">
              Insights
            </Badge>
            <CardTitle className="text-2xl">Top liveblogs (30d)</CardTitle>
            <CardDescription className="text-base">
              Your best performers ranked by unique viewers. Drill deeper in the analytics workspace
              for full timelines.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topLiveblogs.length ? (
              <div className="space-y-4">
                {topLiveblogs.slice(0, 3).map((lb) => {
                  const viewers = integerFormatter.format(lb.unique_viewers ?? 0);
                  const starts = integerFormatter.format(lb.starts ?? 0);
                  const updates = integerFormatter.format(lb.updates_published ?? 0);
                  const lastPublished = lb.last_published_at
                    ? dateTimeFormatter.format(new Date(lb.last_published_at))
                    : "—";
                  return (
                    <div
                      key={lb.liveblog_id}
                      className="flex flex-col gap-2 rounded-2xl border border-border/50 bg-background/60 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">
                          {lb.liveblog_title || "Untitled liveblog"}
                        </p>
                        <p className="text-xs text-muted-foreground">Last published {lastPublished}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1 rounded-full border border-border/40 px-2 py-1">
                          <Gauge className="h-3 w-3" />
                          {viewers} viewers
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-border/40 px-2 py-1">
                          Starts {starts}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-border/40 px-2 py-1">
                          Updates {updates}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No analytics yet. Publish or embed a liveblog to start building audience insights.
              </p>
            )}
            <div className="mt-6 flex justify-end">
              <Button asChild variant="ghost" size="sm">
                <Link href="/account/analytics">
                  View full analytics
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-background/50">
          <CardHeader>
            <Badge variant="outline" className="mb-4 w-fit">
              Sponsors
            </Badge>
            <CardTitle className="text-2xl">Sponsor library snapshot</CardTitle>
            <CardDescription className="text-base">
              Reusable partner packages with performance at a glance.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {topSponsors.length ? (
              topSponsors.slice(0, 4).map((sponsor) => {
                const impressions = integerFormatter.format(sponsor.impressions ?? 0);
                const clicks = integerFormatter.format(sponsor.clicks ?? 0);
                const ctrValue = Number(sponsor.ctr ?? 0);
                return (
                  <div
                    key={sponsor.slot_id}
                    className="space-y-1 rounded-2xl border border-border/50 bg-background/60 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">
                          {sponsor.sponsor_name || "Unnamed sponsor"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {sponsor.liveblog_title || "Liveblog"} · {sponsor.status || "scheduled"}
                        </p>
                      </div>
                      <span className="text-xs text-primary">
                        {percentFormatter.format(ctrValue)}% CTR
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>{impressions} impressions</span>
                      <span>{clicks} clicks</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">
                No sponsor slots yet. Create placements from a liveblog to build your partner library.
              </p>
            )}
            <div className="text-xs text-muted-foreground">
              Manage slots in each liveblog to refresh assets, CTA links, and flight windows.
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card className="border-border/70 bg-background/50">
          <CardHeader>
            <Badge variant="outline" className="mb-4 w-fit">
              Traffic
            </Badge>
            <CardTitle className="text-2xl">Top referrers (30d)</CardTitle>
            <CardDescription className="text-base">
              Where viewers discover your coverage. Use this to prioritise syndication partners.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {referrers.length ? (
              referrers.slice(0, 5).map((row) => {
                const viewerCount = Number(row.unique_viewers ?? 0);
                const sessionCount = Number(row.sessions ?? 0);
                const share =
                  totalReferrerUniques > 0
                    ? Math.round((viewerCount / totalReferrerUniques) * 100)
                    : 0;
                return (
                  <div key={row.referrer || "direct"} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">
                        {row.referrer || "Direct"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {integerFormatter.format(viewerCount)} viewers ·{" "}
                        {integerFormatter.format(sessionCount)} sessions
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-border/60">
                      <div
                        className="h-full rounded-full bg-primary/60"
                        style={{ width: `${Math.min(Math.max(share, 4), 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">
                We&apos;ll show referring domains once viewers start engaging with your embeds.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-background/50">
          <CardHeader>
            <Badge variant="outline" className="mb-4 w-fit">
              Publishing
            </Badge>
            <CardTitle className="text-2xl">Global activity</CardTitle>
            <CardDescription className="text-base">
              Total published updates and starts help you monitor newsroom velocity.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 rounded-2xl border border-border/50 bg-background/60 p-4">
              <p className="text-sm font-medium text-foreground">Published updates (all time)</p>
              <p className="text-3xl font-semibold text-foreground">
                {integerFormatter.format(summary?.total_updates ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground">
                Includes all published updates across every liveblog you own.
              </p>
            </div>
            <div className="space-y-2 rounded-2xl border border-border/50 bg-background/60 p-4">
              <p className="text-sm font-medium text-foreground">Starts in the last 7 days</p>
              <p className="text-3xl font-semibold text-foreground">
                {integerFormatter.format(summary?.starts_7d ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground">
                Track how often audiences intentionally launch your coverage.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
