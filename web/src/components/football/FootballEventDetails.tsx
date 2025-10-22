"use client";

import { useMemo } from "react";
import { ArrowRightLeft, Sparkles } from "lucide-react";

import type { FootballEventKey } from "@/lib/football/events";
import { cn } from "@/lib/utils";
import { getPremierLeaguePlayersIndex } from "@/lib/football/players-index";
import {
  findPlayersByName,
  type PlayerRecord,
} from "@/lib/football/players";
import {
  matchTeam,
  PREMIER_LEAGUE_TEAMS,
  type PremierLeagueTeam,
} from "@/lib/football/teams";
import {
  getTeamVisual,
  type TeamVisual,
} from "@/lib/football/team-visuals";

type FootballEventDetailsProps = {
  event: FootballEventKey;
  meta?: Record<string, unknown> | null;
  className?: string;
  isNew?: boolean;
  context?: {
    homeTeamName?: string;
    awayTeamName?: string;
    homeTeamSlug?: string;
    awayTeamSlug?: string;
  };
};

type ResolvedTeam = {
  slug: string | null;
  name: string;
  shortName: string;
  sideLabel?: "Home" | "Away";
};

type GoalData = {
  kind: "goal" | "own_goal";
  playerName: string;
  playerRecord: PlayerRecord | null;
  teamInfo: ResolvedTeam;
  visual: TeamVisual;
  footnote?: string;
};

type SubstitutionData = {
  kind: "substitution";
  playerIn: string | null;
  playerOut: string | null;
  playerInRecord: PlayerRecord | null;
  playerOutRecord: PlayerRecord | null;
  teamInfo: ResolvedTeam;
  visual: TeamVisual;
  footnote?: string;
};

type EnrichedEvent = GoalData | SubstitutionData;

export function FootballEventDetails({
  event,
  meta,
  className,
  isNew = false,
  context,
}: FootballEventDetailsProps) {
  const playersIndex = useMemo(() => getPremierLeaguePlayersIndex(), []);
  const ctxHomeTeamName = context?.homeTeamName;
  const ctxHomeTeamSlug = context?.homeTeamSlug;
  const ctxAwayTeamName = context?.awayTeamName;
  const ctxAwayTeamSlug = context?.awayTeamSlug;
  const enriched = useMemo(
    () =>
      enrichFootballEvent(event, meta ?? null, playersIndex, {
        homeTeamName: ctxHomeTeamName,
        homeTeamSlug: ctxHomeTeamSlug,
        awayTeamName: ctxAwayTeamName,
        awayTeamSlug: ctxAwayTeamSlug,
      }),
    [
      event,
      meta,
      playersIndex,
      ctxHomeTeamName,
      ctxHomeTeamSlug,
      ctxAwayTeamName,
      ctxAwayTeamSlug,
    ]
  );

  if (!enriched) return null;

  if (enriched.kind === "goal" || enriched.kind === "own_goal") {
    return (
      <GoalDetailCard
        data={enriched}
        isNew={isNew}
        className={className}
      />
    );
  }
  if (enriched.kind === "substitution") {
    return (
      <SubstitutionDetailCard
        data={enriched}
        isNew={isNew}
        className={className}
      />
    );
  }
  return null;
}

function GoalDetailCard({
  data,
  className,
  isNew,
}: {
  data: GoalData;
  className?: string;
  isNew?: boolean;
}) {
  const { visual, teamInfo, playerName, footnote, kind, playerRecord } = data;
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[22px] border px-5 py-4 shadow-[0_26px_65px_-38px_rgba(8,8,12,0.9)] backdrop-blur-sm transition-all duration-500",
        isNew && "[animation:lb-glow-sweep_900ms_ease-out_1]",
        className
      )}
      style={{
        backgroundImage: `radial-gradient(120% 120% at -5% 0%, ${visual.gradientFrom} 0%, rgba(9,9,12,0.82) 55%), linear-gradient(145deg, rgba(8,9,14,0.72) 0%, ${visual.gradientTo} 98%)`,
        borderColor: visual.border,
        boxShadow: `0 26px 65px -40px ${visual.shadow}`,
        color: visual.text,
      }}
    >
      <AccentHalo accent={visual.accentSoft} />
      <div className="relative z-[1] space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.32em]"
              style={{ color: visual.mutedText }}
            >
              {kind === "own_goal" ? "Own goal recorded" : "Goal for"}
            </p>
            <p className="mt-1 text-xl font-semibold leading-tight">
              {teamInfo.shortName}
            </p>
          </div>
          <span
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em]"
            style={{
              borderColor: visual.accent,
              backgroundColor: visual.accentSoft,
              color: visual.text,
            }}
          >
            {teamInfo.name}
          </span>
        </div>
        <div
          className="rounded-2xl border px-4 py-3 backdrop-blur-sm"
          style={{
            borderColor: visual.accentSoft,
            backgroundColor: "rgba(8,9,14,0.28)",
          }}
        >
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.32em]"
            style={{ color: visual.mutedText }}
          >
            {kind === "own_goal" ? "Final touch" : "Scorer"}
          </p>
          <p className="mt-2 text-lg font-semibold leading-tight">
            {playerName}
          </p>
          {playerRecord?.team?.shortName &&
          playerRecord.team.shortName !== teamInfo.shortName ? (
            <p
              className="mt-1 text-xs font-medium"
              style={{ color: visual.mutedText }}
            >
              {playerRecord.team.shortName}
            </p>
          ) : null}
          {footnote ? (
            <p
              className="mt-2 text-[11px]"
              style={{ color: visual.mutedText }}
            >
              {footnote}
            </p>
          ) : null}
        </div>
        <EnrichedBadge muted={visual.mutedText} accent={visual.accentSoft} />
      </div>
    </div>
  );
}

function SubstitutionDetailCard({
  data,
  className,
  isNew,
}: {
  data: SubstitutionData;
  className?: string;
  isNew?: boolean;
}) {
  const {
    visual,
    teamInfo,
    playerIn,
    playerOut,
    playerInRecord,
    playerOutRecord,
    footnote,
  } = data;
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[22px] border px-5 py-4 shadow-[0_26px_65px_-38px_rgba(8,8,12,0.9)] backdrop-blur-sm transition-all duration-500",
        isNew && "[animation:lb-glow-sweep_900ms_ease-out_1]",
        className
      )}
      style={{
        backgroundImage: `radial-gradient(130% 130% at -10% 5%, ${visual.gradientFrom} 0%, rgba(9,9,12,0.78) 58%), linear-gradient(150deg, rgba(8,9,14,0.7) 0%, ${visual.gradientTo} 96%)`,
        borderColor: visual.border,
        boxShadow: `0 26px 65px -40px ${visual.shadow}`,
        color: visual.text,
      }}
    >
      <AccentHalo accent={visual.accentSoft} />
      <div className="relative z-[1] space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.32em]"
              style={{ color: visual.mutedText }}
            >
              Calculated change
            </p>
            <p className="mt-1 text-lg font-semibold leading-tight">
              {teamInfo.name}
            </p>
          </div>
          {teamInfo.sideLabel ? (
            <span
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.32em]"
              style={{
                borderColor: visual.accent,
                backgroundColor: visual.accentSoft,
                color: visual.text,
              }}
            >
              {teamInfo.sideLabel} bench
            </span>
          ) : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-stretch">
          <SubPlayerCard
            variant="out"
            name={playerOut}
            record={playerOutRecord}
            visual={visual}
          />
          <div className="flex items-center justify-center sm:py-0">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur-sm sm:h-11 sm:w-11">
              <ArrowRightLeft className="h-5 w-5 text-white/80" />
            </div>
          </div>
          <SubPlayerCard
            variant="in"
            name={playerIn}
            record={playerInRecord}
            visual={visual}
          />
        </div>
        {footnote ? (
          <p
            className="text-[11px]"
            style={{ color: visual.mutedText }}
          >
            {footnote}
          </p>
        ) : null}
        <EnrichedBadge muted={visual.mutedText} accent={visual.accentSoft} />
      </div>
    </div>
  );
}

function SubPlayerCard({
  variant,
  name,
  record,
  visual,
}: {
  variant: "in" | "out";
  name: string | null;
  record: PlayerRecord | null;
  visual: TeamVisual;
}) {
  const label = variant === "in" ? "On" : "Off";
  const accent =
    variant === "in" ? "rgba(16,185,129,0.9)" : "rgba(248,113,113,0.92)";
  const accentSoft =
    variant === "in" ? "rgba(167,243,208,0.18)" : "rgba(254,205,211,0.18)";
  return (
    <div
      className="rounded-2xl border px-4 py-3 backdrop-blur-sm"
      style={{
        borderColor: visual.accentSoft,
        backgroundColor: "rgba(8,9,14,0.26)",
      }}
    >
      <span
        className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.32em]"
        style={{
          color: accent,
          backgroundColor: accentSoft,
        }}
      >
        {label}
      </span>
      <p className="mt-2 text-base font-semibold leading-tight">
        {name || (variant === "in" ? "Incoming player" : "Leaving player")}
      </p>
      {record?.team?.shortName ? (
        <p
          className="mt-1 text-xs font-medium"
          style={{ color: visual.mutedText }}
        >
          {record.team.shortName}
        </p>
      ) : null}
      {record?.teamNameRaw && !record.team ? (
        <p
          className="mt-1 text-xs font-medium"
          style={{ color: visual.mutedText }}
        >
          {record.teamNameRaw}
        </p>
      ) : null}
    </div>
  );
}

function EnrichedBadge({
  muted,
  accent,
}: {
  muted: string;
  accent: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.34em]"
      style={{ borderColor: accent, color: muted, backgroundColor: "rgba(8,9,14,0.2)" }}
    >
      <Sparkles className="h-3 w-3" />
      Enriched insight
    </span>
  );
}

function AccentHalo({ accent }: { accent: string }) {
  return (
    <>
      <span
        className="pointer-events-none absolute -right-12 top-0 h-32 w-32 rounded-full blur-3xl"
        style={{ background: accent }}
      />
      <span
        className="pointer-events-none absolute -bottom-10 left-4 h-28 w-28 rounded-full blur-3xl"
        style={{ background: accent }}
      />
    </>
  );
}

function enrichFootballEvent(
  event: FootballEventKey,
  meta: Record<string, unknown> | null,
  playersIndex: ReturnType<typeof getPremierLeaguePlayersIndex>,
  context: {
    homeTeamName?: string;
    awayTeamName?: string;
    homeTeamSlug?: string;
    awayTeamSlug?: string;
  }
): EnrichedEvent | null {
  if (!meta) return null;
  if (event === "goal" || event === "own_goal") {
    const rawPlayer =
      typeof meta.player === "string" ? meta.player.trim() : "";
    const playerName =
      rawPlayer || (event === "own_goal" ? "Deflection" : "Unlisted scorer");
    const teamInfo = resolveTeam(meta, context);
    const playerRecord = rawPlayer
      ? pickPlayer(playersIndex, rawPlayer, teamInfo.slug)
      : null;
    const pieces = new Set<string>();
    if (teamInfo.sideLabel) pieces.add(`${teamInfo.sideLabel} side`);
    if (teamInfo.name) pieces.add(teamInfo.name);
    const footnote = pieces.size ? Array.from(pieces).join(" • ") : undefined;

    return {
      kind: event,
      playerName,
      playerRecord,
      teamInfo,
      visual: getTeamVisual(teamInfo.slug),
      footnote,
    };
  }
  if (event === "substitution") {
    const playerIn =
      typeof meta.playerIn === "string" ? meta.playerIn.trim() : "";
    const playerOut =
      typeof meta.playerOut === "string" ? meta.playerOut.trim() : "";
    if (!playerIn && !playerOut) return null;
    const teamInfo = resolveTeam(meta, context);
    const playerInRecord = playerIn
      ? pickPlayer(playersIndex, playerIn, teamInfo.slug)
      : null;
    const playerOutRecord = playerOut
      ? pickPlayer(playersIndex, playerOut, teamInfo.slug)
      : null;
    const pieces = new Set<string>();
    if (teamInfo.sideLabel) pieces.add(`${teamInfo.sideLabel} dugout`);
    if (teamInfo.name) pieces.add(teamInfo.name);
    const footnote = pieces.size ? Array.from(pieces).join(" • ") : undefined;
    return {
      kind: "substitution",
      playerIn: playerIn || null,
      playerOut: playerOut || null,
      playerInRecord,
      playerOutRecord,
      teamInfo,
      visual: getTeamVisual(teamInfo.slug),
      footnote,
    };
  }
  return null;
}

function resolveTeam(
  meta: Record<string, unknown>,
  context: {
    homeTeamName?: string;
    awayTeamName?: string;
    homeTeamSlug?: string;
    awayTeamSlug?: string;
  }
): ResolvedTeam {
  const teamSide =
    typeof meta.team === "string" ? (meta.team as "home" | "away" | string) : null;
  const explicitLabel =
    typeof meta.teamLabel === "string" ? meta.teamLabel.trim() : "";
  const metaName =
    typeof meta.teamName === "string" ? meta.teamName.trim() : "";
  const metaSlug =
    typeof meta.teamSlug === "string" ? meta.teamSlug.trim() : "";

  let slug: string | null = metaSlug || null;
  let name = metaName || explicitLabel || "";

  if (teamSide === "home") {
    if (!slug && context.homeTeamSlug) slug = context.homeTeamSlug;
    if (!name && context.homeTeamName) name = context.homeTeamName;
  } else if (teamSide === "away") {
    if (!slug && context.awayTeamSlug) slug = context.awayTeamSlug;
    if (!name && context.awayTeamName) name = context.awayTeamName;
  }

  let team: PremierLeagueTeam | null = null;
  if (slug) {
    team = PREMIER_LEAGUE_TEAMS.find((t) => t.slug === slug) ?? null;
  }
  if (!team && name) {
    team = matchTeam(name);
  }
  if (!team && explicitLabel) {
    team = matchTeam(explicitLabel);
  }

  const resolvedSlug = team?.slug ?? slug;
  const resolvedName = team?.name ?? (name || explicitLabel);
  const shortName =
    team?.shortName ??
    resolvedName ||
    (teamSide === "home"
      ? "Home side"
      : teamSide === "away"
        ? "Away side"
        : "Club");
  const finalName =
    resolvedName ||
    (teamSide === "home"
      ? "Home side"
      : teamSide === "away"
        ? "Away side"
        : shortName);

  return {
    slug: resolvedSlug ?? null,
    name: finalName,
    shortName,
    sideLabel: teamSide === "home" ? "Home" : teamSide === "away" ? "Away" : undefined,
  };
}

function pickPlayer(
  index: ReturnType<typeof getPremierLeaguePlayersIndex>,
  name: string,
  teamSlug: string | null
): PlayerRecord | null {
  const matches = findPlayersByName(index, name);
  if (!matches.length) return null;
  if (teamSlug) {
    const teamMatch = matches.find((p) => p.team?.slug === teamSlug);
    if (teamMatch) return teamMatch;
  }
  return matches[0] ?? null;
}
