import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { BarChart3, Radio, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import EmbedButton from "./ui/EmbedButton";
import SettingsButton from "./ui/SettingsButton";
import { createClient } from "@/lib/supabase/serverClient";

import ManageTabs from "./ui/ManageTabs";
import { matchTeam } from "@/lib/football/teams";

export const runtime = "edge";

export default async function ManageLiveblog({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { id } = await params;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect("/signin");

  const { data: liveblog } = await supabase
    .from("liveblogs")
    .select("id,title,owner_id,privacy,settings")
    .eq("id", id)
    .single();
  if (!liveblog) return notFound();
  if (liveblog.owner_id !== user.id) {
    const { count: isEditorCount = 0 } = await supabase
      .from("liveblog_editors")
      .select("user_id", { count: "exact", head: true })
      .eq("liveblog_id", id)
      .eq("user_id", user.id);
    if (!isEditorCount) return redirect("/dashboard");
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

  async function updateSettings(formData: FormData) {
    "use server";
    const supa = await createClient();
    const {
      data: { user: u },
    } = await supa.auth.getUser();
    if (!u) return redirect("/signin");
    const privacy = String(
      formData.get("privacy") || "public"
    ) as "public" | "unlisted" | "private";
    const order = String(
      formData.get("order") || "newest"
    ) as "newest" | "oldest";
    const { data: current } = await supa
      .from("liveblogs")
      .select("settings,owner_id")
      .eq("id", id)
      .single();
    if (!current || current.owner_id !== u.id) return redirect("/dashboard");
    const currentSettings =
      (current.settings as Record<string, unknown> | null) ?? {};
    const settings: Record<string, unknown> = {
      ...currentSettings,
      update_order: order,
    };
    await supa.from("liveblogs").update({ privacy, settings }).eq("id", id);
    return redirect(`/liveblogs/${id}/manage`);
  }

  const orderPref =
    (liveblog.settings?.update_order as "newest" | "oldest") || "newest";
  const template = (liveblog.settings?.template as string | undefined) ?? null;
  const discordWebhookUrl = (liveblog.settings?.discord_webhook_url as string | undefined) ?? null;

  // Resolve match teams if this is a football liveblog
  let homeTeamName: string | null = null;
  let awayTeamName: string | null = null;
  let homeTeamSlug: string | null = null;
  let awayTeamSlug: string | null = null;
  const matchId = (liveblog.settings?.match_id as string | number | undefined) ?? undefined;
  if (template === "football" && matchId) {
    const { data: match } = await supabase
      .from("matches")
      .select("home_team_name,away_team_name")
      .eq("id", matchId)
      .single();
    if (match) {
      homeTeamName = match.home_team_name as string;
      awayTeamName = match.away_team_name as string;
      const home = matchTeam(homeTeamName);
      const away = matchTeam(awayTeamName);
      homeTeamSlug = home?.slug ?? null;
      awayTeamSlug = away?.slug ?? null;
    }
  }

  // Analytics aggregates
  const { count: uniquesCount = 0 } = await supabase
    .from("viewer_pings")
    .select("session_id", { count: "exact", head: true })
    .eq("liveblog_id", liveblog.id)
    .gt("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString());
  const { count: startsCount = 0 } = await supabase
    .from("analytics_events")
    .select("id", { count: "exact", head: true })
    .eq("liveblog_id", liveblog.id)
    .eq("event", "start")
    .gt("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString());
  const { count: totalStartsCount = 0 } = await supabase
    .from("analytics_events")
    .select("id", { count: "exact", head: true })
    .eq("liveblog_id", liveblog.id)
    .eq("event", "start");
  const { data: concurrentData } = await supabase.rpc("count_concurrent_viewers", {
    p_liveblog_id: liveblog.id,
  });
  const concurrentNow =
    typeof concurrentData === "number"
      ? concurrentData
      : (concurrentData as number | null) ?? 0;

  const privacyLabel =
    liveblog.privacy.charAt(0).toUpperCase() + liveblog.privacy.slice(1);
  const orderLabel =
    orderPref === "newest" ? "Newest first" : "Oldest first";

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-border/60 bg-background/70 px-7 py-8 shadow-[0_18px_55px_-35px_rgba(9,9,11,0.8)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.28em] text-muted-foreground">
              <span className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/70 px-3 py-1">
                <Radio className="h-3.5 w-3.5" />
                Liveblog studio
              </span>
              {template === "football" ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-emerald-200">
                  Match centre
                </span>
              ) : null}
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {liveblog.title}
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Keep coverage flowing, from embeds to the matches hub. Updates you publish here are live for viewers instantly.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <EmbedButton liveblogId={liveblog.id} />
            <SettingsButton
              liveblogId={liveblog.id}
              orderPref={orderPref}
              privacy={liveblog.privacy}
              discordWebhookUrl={discordWebhookUrl}
            />
            <Button asChild size="sm" variant="ghost" className="bg-secondary/30">
              <a href="#composer">Jump to composer</a>
            </Button>
          </div>
        </div>
      </section>

      <ManageTabs
        liveblogId={liveblog.id}
        orderPref={orderPref}
        initialUpdates={updates || []}
        analytics={{
          uniques24h: uniquesCount || 0,
          starts24h: startsCount || 0,
          totalStarts: totalStartsCount || 0,
          concurrentNow: concurrentNow || 0,
        }}
        template={template}
        homeTeamSlug={homeTeamSlug || undefined}
        homeTeamName={homeTeamName || undefined}
        awayTeamSlug={awayTeamSlug || undefined}
        awayTeamName={awayTeamName || undefined}
      />
    </div>
  );
}

function Snippet({ label, code }: { label: string; code: string }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
        {label}
      </p>
      <pre className="rounded-2xl border border-border/60 bg-zinc-950/80 p-4 text-xs text-muted-foreground shadow-inner">
        <code className="whitespace-pre-wrap break-all">{code}</code>
      </pre>
    </div>
  );
}

function StatCard({
  title,
  description,
  value,
  icon,
}: {
  title: string;
  description: string;
  value: ReactNode;
  icon: ReactNode;
}) {
  return (
    <Card className="border-border/70 bg-background/60">
      <CardHeader className="space-y-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary/50 text-secondary-foreground">
          {icon}
        </span>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}

async function ConcurrentViewers({ liveblogId }: { liveblogId: string }) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("count_concurrent_viewers", {
    p_liveblog_id: liveblogId,
  });
  const num = (data as number | null) ?? 0;
  return <span>{num}</span>;
}

async function AnalyticsPanel({ liveblogId }: { liveblogId: string }) {
  const supabase = await createClient();
  const { count: uniquesCount = 0 } = await supabase
    .from("viewer_pings")
    .select("session_id", { count: "exact", head: true })
    .eq("liveblog_id", liveblogId)
    .gt("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString());
  const { count: startsCount = 0 } = await supabase
    .from("analytics_events")
    .select("id", { count: "exact", head: true })
    .eq("liveblog_id", liveblogId)
    .eq("event", "start")
    .gt("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString());
  const { count: totalStartsCount = 0 } = await supabase
    .from("analytics_events")
    .select("id", { count: "exact", head: true })
    .eq("liveblog_id", liveblogId)
    .eq("event", "start");

  return (
    <Card className="border-border/70 bg-background/60 md:col-span-2">
      <CardHeader className="space-y-3">
        <Badge variant="outline" className="w-fit">
          Analytics
        </Badge>
        <div>
          <CardTitle className="text-lg">Audience pulse</CardTitle>
          <CardDescription>
            Yesterday&apos;s performance plus all-time session starts.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        <AnalyticsStat
          icon={<Sparkles className="h-4 w-4" />}
          label="Uniques (24h)"
          value={typeof uniquesCount === "number" ? uniquesCount : 0}
        />
        <AnalyticsStat
          icon={<Radio className="h-4 w-4" />}
          label="Starts (24h)"
          value={typeof startsCount === "number" ? startsCount : 0}
        />
        <AnalyticsStat
          icon={<BarChart3 className="h-4 w-4" />}
          label="Total starts"
          value={typeof totalStartsCount === "number" ? totalStartsCount : 0}
        />
      </CardContent>
    </Card>
  );
}

function AnalyticsStat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/70 p-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-secondary/60 text-secondary-foreground">
          {icon}
        </span>
        {label}
      </div>
      <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
