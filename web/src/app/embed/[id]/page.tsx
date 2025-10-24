export const runtime = 'edge';
import type { CSSProperties } from "react";

import { notFound } from "next/navigation";
import { Sparkle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchAccountBrandingForLiveblog } from "@/lib/branding/server";
import { CORNER_CLASS_MAP, SURFACE_CLASS_MAP, accentOverlay } from "@/lib/branding/presentation";
import { normaliseBranding, resolveAccentColor } from "@/lib/branding/utils";
import { matchTeam } from "@/lib/football/teams";
import { createClient } from "@/lib/supabase/serverClient";
import { cn } from "@/lib/utils";

import EmbedClient from "./ui/EmbedClient";

export const revalidate = 5;

export default async function EmbedPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { id } = await params;
  const { data: liveblog } = await supabase
    .from("liveblogs")
    .select("id,title,privacy,settings")
    .eq("id", id)
    .single();
  if (!liveblog) return notFound();

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
    () => null
  );
  const branding = brandingRaw ? normaliseBranding(brandingRaw) : null;
  const accentColor = branding ? resolveAccentColor(branding) : null;
  const accentSoft = accentColor ? accentOverlay(accentColor, 0.18) : null;
  const cornerClass = branding?.corner_style
    ? CORNER_CLASS_MAP[branding.corner_style] ?? CORNER_CLASS_MAP.rounded
    : "rounded-3xl";
  const surfaceClass = branding?.surface_style
    ? SURFACE_CLASS_MAP[branding.surface_style] ?? SURFACE_CLASS_MAP.glass
    : "border border-border/70 bg-background/60 backdrop-blur";
  const logoUrl =
    branding?.logo_path && branding.logo_path.length
      ? supabase.storage.from("brand-assets").getPublicUrl(branding.logo_path).data.publicUrl
      : null;
  const backgroundUrl =
    branding?.background_path && branding.background_path.length
      ? supabase.storage.from("brand-assets").getPublicUrl(branding.background_path).data.publicUrl
      : null;

  const cardStyle = {
    ...(accentSoft ? { borderColor: accentSoft } : {}),
    ...(backgroundUrl
      ? {
          backgroundImage: `linear-gradient(180deg, rgba(12,13,17,0.82), rgba(12,13,18,0.94)), url(${backgroundUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }
      : {}),
  } as CSSProperties;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <Card className={cn(surfaceClass, cornerClass, "transition-colors")} style={cardStyle}>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-4">
            <Badge
              variant="muted"
              className="w-fit border-border/40"
              style={accentSoft ? { borderColor: accentSoft, color: accentColor ?? undefined } : undefined}
            >
              <Sparkle
                className="mr-1.5 h-3.5 w-3.5"
                style={accentColor ? { color: accentColor } : undefined}
              />
              Live
            </Badge>
            <CardTitle
              className="mt-4 text-2xl font-semibold"
              style={accentColor ? { color: accentColor } : undefined}
            >
              {liveblog.title}
            </CardTitle>
          </div>
          <div className="flex flex-col items-end gap-2">
            {logoUrl ? (
              <div className="overflow-hidden rounded-2xl border border-border/40 bg-background/70 px-3 py-2 shadow-sm backdrop-blur">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoUrl} alt="" className="max-h-10 w-auto" loading="lazy" />
              </div>
            ) : null}
            <p className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
              Powered by Livequest Studio
            </p>
          </div>
        </CardHeader>
        <CardContent className="pb-0">
          <EmbedClient
            initialUpdates={updates || []}
            liveblogId={liveblog.id}
            order={orderPref}
            template={template}
            homeTeamName={homeTeamName || undefined}
            homeTeamSlug={homeTeamSlug || undefined}
            awayTeamName={awayTeamName || undefined}
            awayTeamSlug={awayTeamSlug || undefined}
            branding={branding}
            brandingAssets={{ logoUrl, backgroundUrl }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
