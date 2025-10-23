import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertCircle,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  CircleUserRound,
  Folder,
  Gauge,
  LogOut,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/serverClient";

export const runtime = "edge";

type LiveblogStatus = "active" | "archived" | "completed" | "deleted";

type AccountPageSearchParams = {
  status?: string;
  error?: string;
};

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

async function updateProfile(formData: FormData) {
  "use server";
  const fullName = String(formData.get("fullName") || "").trim();
  const organisation = String(formData.get("organisation") || "").trim();
  const bio = String(formData.get("bio") || "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return redirect("/signin");
  }

  await supabase.auth.updateUser({
    data: {
      full_name: fullName || null,
      organisation: organisation || null,
      bio: bio || null,
    },
  });

  return redirect("/account?status=profile-saved");
}

async function signOutAction() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect("/signin");
}

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

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<AccountPageSearchParams>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return redirect("/signin");
  }

  const sp = await searchParams;

  const [liveblogsResult, summaryResult, topLiveblogsResult, topSponsorsResult, referrerResult] =
    await Promise.all([
      supabase
        .from("liveblogs")
        .select("id,title,status,folder")
        .eq("owner_id", user.id),
      supabase.rpc("account_analytics_summary"),
      supabase.rpc("account_top_liveblogs", { p_limit: 3 }),
      supabase.rpc("account_top_sponsors", { p_limit: 4 }),
      supabase.rpc("account_referrer_breakdown", { p_limit: 4 }),
    ]);

  const liveblogRows = (liveblogsResult.data as AccountLiveblogRow[] | null) ?? [];
  const analyticsSummary =
    ((summaryResult.data as AnalyticsSummaryRow[] | null)?.[0] as AnalyticsSummaryRow | undefined) ??
    undefined;
  const topLiveblogs = (topLiveblogsResult.data as TopLiveblogRow[] | null) ?? [];
  const topSponsors = (topSponsorsResult.data as SponsorLeaderboardRow[] | null) ?? [];
  const referrers = (referrerResult.data as ReferrerRow[] | null) ?? [];

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
  const sponsorCtr30d =
    analyticsSummary && analyticsSummary.sponsor_ctr_30d !== null
      ? Number(analyticsSummary.sponsor_ctr_30d)
      : 0;

  const uniqueFolders = new Set(
    liveblogRows
      .map((lb) => lb.folder?.trim())
      .filter((folder): folder is string => Boolean(folder && folder.length))
  ).size;

  const memberSince = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date(user.created_at));
  const lastSignedIn = user.last_sign_in_at
    ? dateTimeFormatter.format(new Date(user.last_sign_in_at))
    : "—";

  const fullName =
    typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "";
  const organisation =
    typeof user.user_metadata?.organisation === "string"
      ? user.user_metadata.organisation
      : "";
  const bio = typeof user.user_metadata?.bio === "string" ? user.user_metadata.bio : "";

  const successMessage =
    sp?.status === "profile-saved"
      ? "Profile preferences updated successfully."
      : null;
  const errorMessage = sp?.error ?? null;

  const totalReferrerUniques = referrers.reduce(
    (sum, row) => sum + Number(row?.unique_viewers ?? 0),
    0
  );

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-border/60 bg-gradient-to-br from-zinc-900/70 via-zinc-900/30 to-zinc-900/10 px-8 py-12 shadow-[0_20px_40px_-25px_rgba(9,9,11,0.75)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <Badge variant="muted" className="w-fit border-border/40">
              <CircleUserRound className="mr-1.5 h-3.5 w-3.5" />
              Account
            </Badge>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {fullName || user.email?.split("@")[0] || "Account"}
              </h1>
              <p className="max-w-2xl text-base text-muted-foreground">
                Manage your Livequest Studio identity, global analytics, and partner tooling from
                one place.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm" className="border-border/70">
              <Link href="/dashboard">
                Back to dashboard
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="sm" className="bg-primary/80 text-primary-foreground">
              <Link href="/account/analytics">
                Open analytics
                <BarChart3 className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <form action={signOutAction}>
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Button>
            </form>
          </div>
        </div>
        {successMessage ? (
          <div className="mt-8 flex w-full items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            <BadgeCheck className="h-4 w-4" />
            <p>{successMessage}</p>
          </div>
        ) : null}
        {errorMessage ? (
          <div
            className="mt-8 flex w-full items-center gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground/90"
            role="alert"
          >
            <AlertCircle className="h-4 w-4" />
            <p>{errorMessage}</p>
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/70 bg-background/50">
          <CardHeader>
            <CardTitle className="text-lg">Active liveblogs</CardTitle>
            <CardDescription>
              Projects currently driving coverage and analytics.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-baseline gap-3">
            <span className="text-4xl font-semibold text-foreground">
              {integerFormatter.format(activeLiveblogs)}
            </span>
            <span className="text-sm text-muted-foreground">
              of {integerFormatter.format(totalLiveblogs)} total
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
              {integerFormatter.format(analyticsSummary?.unique_viewers_30d ?? 0)}
            </span>
            <span className="text-sm text-muted-foreground">
              {integerFormatter.format(analyticsSummary?.unique_viewers_7d ?? 0)} in last 7 days
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
              {integerFormatter.format(analyticsSummary?.session_pings_30d ?? 0)}
            </span>
            <span className="text-sm text-muted-foreground">
              {integerFormatter.format(analyticsSummary?.session_pings_7d ?? 0)} in last 7 days
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
                {integerFormatter.format(analyticsSummary?.sponsor_impressions_30d ?? 0)} impressions
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {integerFormatter.format(analyticsSummary?.sponsor_clicks_30d ?? 0)} clicks captured
              globally.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-border/70 bg-background/50">
          <CardHeader>
            <CardTitle className="text-lg">Folders in use</CardTitle>
            <CardDescription>
              Keep coverage organised with custom collections.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-baseline gap-3">
            <span className="text-4xl font-semibold text-foreground">
              {integerFormatter.format(uniqueFolders)}
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
            <CardDescription>
              Stories you&apos;ve completed or moved to read-only.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-baseline gap-3">
            <span className="text-4xl font-semibold text-foreground">
              {integerFormatter.format(archivedLiveblogs)}
            </span>
            <span className="text-sm text-muted-foreground">archived liveblogs</span>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-background/50">
          <CardHeader>
            <CardTitle className="text-lg">Starts fired (30d)</CardTitle>
            <CardDescription>
              Times readers actively opened a liveblog experience.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-baseline gap-3">
            <span className="text-4xl font-semibold text-foreground">
              {integerFormatter.format(analyticsSummary?.starts_30d ?? 0)}
            </span>
            <span className="text-sm text-muted-foreground">
              {integerFormatter.format(analyticsSummary?.starts_7d ?? 0)} in last 7 days
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
              Your best performers ranked by unique viewers. Drill deeper in the analytics
              workspace for full timelines.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topLiveblogs.length ? (
              <div className="space-y-4">
                {topLiveblogs.map((lb) => {
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
                        <p className="text-xs text-muted-foreground">
                          Last published {lastPublished}
                        </p>
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
              topSponsors.map((sponsor) => {
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
                No sponsor slots yet. Create placements from a liveblog to build your partner
                library.
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
              referrers.map((row) => {
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
                {integerFormatter.format(analyticsSummary?.total_updates ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground">
                Includes all published updates across every liveblog you own.
              </p>
            </div>
            <div className="space-y-2 rounded-2xl border border-border/50 bg-background/60 p-4">
              <p className="text-sm font-medium text-foreground">Starts in the last 7 days</p>
              <p className="text-3xl font-semibold text-foreground">
                {integerFormatter.format(analyticsSummary?.starts_7d ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground">
                Track how often audiences intentionally launch your coverage.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Card className="border-border/70 bg-background/50">
          <CardHeader>
            <Badge variant="outline" className="mb-4 w-fit">
              Profile
            </Badge>
            <CardTitle className="text-2xl">Personal details</CardTitle>
            <CardDescription className="text-base">
              Update how your byline appears across liveblogs and newsletters. Changes apply
              immediately.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateProfile} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  defaultValue={fullName}
                  placeholder="Your public byline"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="organisation">Organisation</Label>
                <Input
                  id="organisation"
                  name="organisation"
                  defaultValue={organisation}
                  placeholder="Publication, agency, or brand"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Signature</Label>
                <Textarea
                  id="bio"
                  name="bio"
                  defaultValue={bio}
                  placeholder="Short sign-off that appears in newsletters or embeds."
                  className="min-h-[120px]"
                />
              </div>
              <div className="flex flex-wrap justify-between gap-3">
                <div className="text-xs text-muted-foreground">
                  Member since {memberSince}. Last signed in {lastSignedIn}.
                </div>
                <Button type="submit" className="px-6">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Save profile
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-background/50">
          <CardHeader>
            <Badge variant="outline" className="mb-4 w-fit">
              Security
            </Badge>
            <CardTitle className="text-2xl">Account security</CardTitle>
            <CardDescription className="text-base">
              Manage how you access Livequest Studio. Contact support for newsroom-wide SSO.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">Email address</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
                <Badge variant="outline" className="border-border/60 bg-transparent">
                  Primary
                </Badge>
              </div>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">Two-factor authentication</p>
                  <p className="text-sm text-muted-foreground">
                    Enable via the matches dashboard for newsroom-wide access policies.
                  </p>
                </div>
                <Button asChild size="sm" variant="ghost" className="text-xs">
                  <Link href="/matches">
                    Manage in Matches
                    <ArrowUpRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">Reset password</p>
                  <p className="text-sm text-muted-foreground">
                    Password changes are handled through secure email links.
                  </p>
                </div>
                <Button asChild size="sm" variant="outline" className="border-border/60">
                  <Link href="/signin?reset=1">Send reset email</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
