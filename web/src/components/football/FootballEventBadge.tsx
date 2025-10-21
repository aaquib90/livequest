"use client";

import { cn } from "@/lib/utils";
import {
  type FootballEventKey,
  footballEventMeta,
} from "@/lib/football/events";
import { Sparkle } from "lucide-react";

type FootballEventBadgeProps = {
  event: FootballEventKey;
  size?: "sm" | "md";
  className?: string;
};

export function FootballEventBadge({
  event,
  size = "md",
  className,
}: FootballEventBadgeProps) {
  const meta = footballEventMeta[event];
  if (!meta) return null;
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em]",
        meta.badgeClass,
        size === "sm" && "px-2 py-1 text-[10px]",
        className
      )}
    >
      <Icon className={cn(size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />
      {meta.label}
    </span>
  );
}

type FootballEventBannerProps = {
  event: FootballEventKey;
  className?: string;
  subtle?: boolean;
  isNew?: boolean;
};

export function FootballEventBanner({
  event,
  className,
  subtle = false,
  isNew = false,
}: FootballEventBannerProps) {
  const meta = footballEventMeta[event];
  if (!meta) return null;
  const Icon = meta.icon;
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border px-4 py-3",
        subtle ? "text-sm" : "text-base",
        meta.bannerClass,
        className,
        isNew && event === "goal" && "[animation:lb-glow-sweep_900ms_ease-out_1]",
        isNew && event === "own_goal" && "[animation:lb-wobble_650ms_ease-out_1]",
        isNew && event === "var_check" && "[animation:lb-radar-pulse_900ms_ease-out_2]",
        isNew && event === "yellow_card" && "[animation:lb-amber-flash_700ms_ease-out_1]",
        isNew && event === "red_card" && "[animation:lb-wobble_520ms_ease-out_1]",
        isNew && event === "kick_off" && "[animation:lb-ripple_520ms_ease-out_1]",
        isNew && event === "full_time" && "[animation:lb-glow-sweep_1000ms_ease-out_1]"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur">
          <Icon className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <p className="font-semibold leading-tight">{meta.label}</p>
          <p className="text-xs text-white/70">{meta.description}</p>
        </div>
      </div>
      {event === "goal" ? (
        <GoalConfetti />
      ) : null}
      {isNew && event === "var_check" ? <VarScanOverlay /> : null}
      {isNew && event === "red_card" ? <SirenSweep /> : null}
      {isNew && event === "kick_off" ? <RippleOverlay /> : null}
      {isNew && event === "own_goal" ? <OwnGoalSweep /> : null}
      {isNew && event === "yellow_card" ? <AmberBorderFlash /> : null}
      {isNew && event === "full_time" ? <SilverConfetti /> : null}
      {event === "substitution" ? (
        <div className="pointer-events-none absolute -right-6 top-1/2 hidden h-24 w-24 -translate-y-1/2 rotate-12 items-center justify-center rounded-full border border-sky-400/30 bg-sky-500/10 text-sky-100 sm:flex">
          <Sparkle className="h-6 w-6 animate-spin" />
        </div>
      ) : null}
      {event === "substitution" ? <SwapArrows /> : null}
    </div>
  );
}

function GoalConfetti() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <span className="absolute left-[15%] top-2 h-2 w-2 animate-[confetti-fall_1.8s_linear_infinite] rounded-full bg-emerald-300 delay-[0ms]" />
      <span className="absolute left-[45%] top-1 h-2 w-2 animate-[confetti-fall_1.6s_linear_infinite] rounded-full bg-emerald-200 delay-[150ms]" />
      <span className="absolute left-[70%] top-3 h-2 w-2 animate-[confetti-fall_1.7s_linear_infinite] rounded-full bg-teal-200 delay-[300ms]" />
      <span className="absolute left-[90%] top-2 h-2 w-2 animate-[confetti-fall_1.9s_linear_infinite] rounded-full bg-lime-200 delay-[450ms]" />
    </div>
  );
}

function VarScanOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0 bg-gradient-to-b from-purple-300/0 via-purple-300/5 to-purple-300/0" />
      <div className="absolute inset-x-0 top-0 h-[2px] bg-purple-300/60 [animation:lb-siren-sweep_900ms_linear_2] [background-image:linear-gradient(90deg,transparent,rgba(216,180,254,0.8),transparent)] bg-[length:120%_2px]" />
    </div>
  );
}

function SirenSweep() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(248,113,113,0.16),transparent)] bg-[length:240%_100%] [animation:lb-siren-sweep_680ms_linear_1]" />
    </div>
  );
}

function RippleOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute left-4 top-4 h-10 w-10 rounded-full border border-white/20 [animation:lb-ripple_520ms_ease-out_1]" />
    </div>
  );
}

function OwnGoalSweep() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(244,63,94,0.12),transparent)] bg-[length:240%_100%] [animation:lb-sweep-rtl_700ms_linear_1]" />
    </div>
  );
}

function AmberBorderFlash() {
  return <div className="pointer-events-none absolute inset-0 rounded-2xl [animation:lb-amber-flash_700ms_ease-out_1]" />;
}

function SilverConfetti() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <span className="absolute left-[12%] top-2 h-1.5 w-1.5 animate-[confetti-fall_2.1s_linear_infinite] rounded-full bg-zinc-200/90 delay-[0ms]" />
      <span className="absolute left-[38%] top-3 h-1.5 w-1.5 animate-[confetti-fall_2.0s_linear_infinite] rounded-full bg-neutral-300/90 delay-[200ms]" />
      <span className="absolute left-[62%] top-1 h-1.5 w-1.5 animate-[confetti-fall_2.2s_linear_infinite] rounded-full bg-slate-200/90 delay-[350ms]" />
      <span className="absolute left-[85%] top-2 h-1.5 w-1.5 animate-[confetti-fall_2.3s_linear_infinite] rounded-full bg-stone-200/90 delay-[500ms]" />
    </div>
  );
}

function SwapArrows() {
  return (
    <div className="pointer-events-none absolute inset-0 hidden sm:block">
      <div className="absolute left-2 top-1/2 h-6 w-12 -translate-y-1/2 opacity-70">
        <div className="absolute inset-0 -translate-x-2 text-sky-300/70 [mask-image:linear-gradient(90deg,transparent,black)]">
          <svg viewBox="0 0 48 24" className="h-full w-full">
            <path d="M2 12h30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M28 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
      <div className="absolute right-2 top-1/2 h-6 w-12 -translate-y-1/2 opacity-70">
        <div className="absolute inset-0 translate-x-2 text-emerald-300/70 [mask-image:linear-gradient(270deg,transparent,black)]">
          <svg viewBox="0 0 48 24" className="h-full w-full">
            <path d="M46 12H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M20 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}
