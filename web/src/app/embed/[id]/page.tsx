export const runtime = 'edge';
import type { CSSProperties } from "react";

import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Sparkle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AccountBranding } from "@/lib/branding/types";
import { CORNER_CLASS_MAP, SURFACE_CLASS_MAP, accentOverlay } from "@/lib/branding/presentation";
import { normaliseBranding, resolveAccentColor } from "@/lib/branding/utils";
import { cn } from "@/lib/utils";

import EmbedClient from "./ui/EmbedClient";

export const revalidate = 5;

type EmbedOverviewResponse = {
  liveblog: {
    id: string;
    title: string;
    privacy: string;
    settings: Record<string, unknown>;
  };
  updates: Array<{ id: string; content: any; published_at: string | null; pinned: boolean }>;
  orderPref: "newest" | "oldest";
  template: string | null;
  match: {
    homeTeamName: string | null;
    awayTeamName: string | null;
    homeTeamSlug: string | null;
    awayTeamSlug: string | null;
  };
  branding: AccountBranding | null;
  brandingAssets: { logoUrl: string | null; backgroundUrl: string | null };
};

export default async function EmbedPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const headerList = headers();
  const host = headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? "https";

  const overviewRes = await fetch(`${protocol}://${host}/api/internal/overview?target=embed&id=${encodeURIComponent(id)}`, {
    cache: "no-store",
  });

  if (overviewRes.status === 404) return notFound();
  if (!overviewRes.ok) {
    throw new Error(`Failed to load embed (${overviewRes.status})`);
  }

  const { liveblog, updates, orderPref, template, match, branding: brandingRaw, brandingAssets } =
    (await overviewRes.json()) as EmbedOverviewResponse;

  const branding = brandingRaw ? normaliseBranding(brandingRaw as any) : null;
  const accentColor = branding ? resolveAccentColor(branding) : null;
  const accentSoft = accentColor ? accentOverlay(accentColor, 0.18) : null;
  const cornerClass = branding?.corner_style
    ? CORNER_CLASS_MAP[branding.corner_style] ?? CORNER_CLASS_MAP.rounded
    : "rounded-3xl";
  const surfaceClass = branding?.surface_style
    ? SURFACE_CLASS_MAP[branding.surface_style] ?? SURFACE_CLASS_MAP.glass
    : "border border-border/70 bg-background/60 backdrop-blur";
  const { logoUrl, backgroundUrl } = brandingAssets;

  const { homeTeamName, awayTeamName, homeTeamSlug, awayTeamSlug } = match || {};

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
