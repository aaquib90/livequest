import { createElement, type ComponentType, type SVGProps } from "react";
import {
  ShieldAlert,
  ShieldX,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";

export type FootballEventKey =
  | "goal"
  | "own_goal"
  | "var_check"
  | "substitution"
  | "yellow_card"
  | "red_card"
  | "kick_off"
  | "full_time";

type FootballEventMeta = {
  key: FootballEventKey;
  label: string;
  description: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  badgeClass: string;
  bannerClass: string;
};

export const footballEventOptions: { value: FootballEventKey; label: string }[] = [
  { value: "goal", label: "Goal" },
  { value: "own_goal", label: "Own goal" },
  { value: "var_check", label: "VAR check" },
  { value: "substitution", label: "Substitution" },
  { value: "yellow_card", label: "Yellow card" },
  { value: "red_card", label: "Red card" },
  { value: "kick_off", label: "Kick-off" },
  { value: "full_time", label: "Full time" },
];

const YellowCardIcon: ComponentType<SVGProps<SVGSVGElement>> = ({
  width = 24,
  height = 24,
  ...props
}) =>
  createElement(
    "svg",
    {
      width,
      height,
      viewBox: "0 0 24 24",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      ...props,
    },
    createElement("rect", {
      x: 6,
      y: 3,
      width: 12,
      height: 18,
      rx: 2,
      fill: "currentColor",
    })
  );

const RedCardIcon: ComponentType<SVGProps<SVGSVGElement>> = ({
  width = 24,
  height = 24,
  ...props
}) =>
  createElement(
    "svg",
    {
      width,
      height,
      viewBox: "0 0 24 24",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      ...props,
    },
    createElement("rect", {
      x: 7,
      y: 2,
      width: 10,
      height: 20,
      rx: 2,
      fill: "currentColor",
    })
  );

const SubstitutionIcon: ComponentType<SVGProps<SVGSVGElement>> = ({
  width = 24,
  height = 24,
  ...props
}) =>
  createElement(
    "svg",
    {
      width,
      height,
      viewBox: "0 0 24 24",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      ...props,
    },
    createElement("path", {
      d: "M8 17h5m0 0V6m0 0-2.5 2.5M13 6l2.5 2.5",
      stroke: "currentColor",
      strokeWidth: 1.8,
      strokeLinecap: "round",
      strokeLinejoin: "round",
    }),
    createElement("path", {
      d: "M16 7h-5m0 0v11m0 0 2.5-2.5M11 18l-2.5-2.5",
      stroke: "currentColor",
      strokeWidth: 1.8,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      opacity: 0.85,
    })
  );

export const footballEventMeta: Record<FootballEventKey, FootballEventMeta> = {
  goal: {
    key: "goal",
    label: "Goal!",
    description: "Back of the net. Cue the celebrations.",
    icon: Trophy,
    badgeClass: "border-emerald-400/50 bg-emerald-500/15 text-emerald-200",
    bannerClass:
      "border-emerald-400/40 bg-gradient-to-r from-emerald-500/20 via-emerald-600/15 to-emerald-500/20 text-emerald-50",
  },
  own_goal: {
    key: "own_goal",
    label: "Own goal",
    description: "Deflection off the wrong shirt.",
    icon: ShieldX,
    badgeClass: "border-rose-400/50 bg-rose-500/15 text-rose-200",
    bannerClass:
      "border-rose-400/40 bg-gradient-to-r from-rose-500/20 via-rose-600/15 to-rose-500/20 text-rose-50",
  },
  var_check: {
    key: "var_check",
    label: "VAR check",
    description: "Hold on while the booth has a look.",
    icon: ShieldAlert,
    badgeClass: "border-purple-400/50 bg-purple-500/15 text-purple-200",
    bannerClass:
      "border-purple-400/40 bg-gradient-to-r from-purple-500/20 via-purple-600/15 to-purple-500/20 text-purple-50",
  },
  substitution: {
    key: "substitution",
    label: "Substitution",
    description: "Fresh legs on the pitch.",
    icon: SubstitutionIcon,
    badgeClass: "border-sky-400/50 bg-sky-500/15 text-sky-200",
    bannerClass:
      "border-sky-400/40 bg-gradient-to-r from-sky-500/20 via-sky-600/15 to-sky-500/20 text-sky-50",
  },
  yellow_card: {
    key: "yellow_card",
    label: "Yellow card",
    description: "The ref reaches for their pocket.",
    icon: YellowCardIcon,
    badgeClass: "border-amber-400/50 bg-amber-500/15 text-amber-200",
    bannerClass:
      "border-amber-400/40 bg-gradient-to-r from-amber-500/20 via-amber-600/15 to-amber-500/20 text-amber-50",
  },
  red_card: {
    key: "red_card",
    label: "Red card",
    description: "Off you go. Discipline shifts the match.",
    icon: RedCardIcon,
    badgeClass: "border-red-400/50 bg-red-500/15 text-red-200",
    bannerClass:
      "border-red-400/40 bg-gradient-to-r from-red-500/20 via-red-600/15 to-red-500/20 text-red-50",
  },
  kick_off: {
    key: "kick_off",
    label: "Kick-off",
    description: "The whistle blows and we are underway.",
    icon: Sparkles,
    badgeClass: "border-slate-400/50 bg-slate-500/15 text-slate-200",
    bannerClass:
      "border-slate-400/40 bg-gradient-to-r from-slate-500/20 via-slate-600/15 to-slate-500/20 text-slate-50",
  },
  full_time: {
    key: "full_time",
    label: "Full time",
    description: "Another chapter closed.",
    icon: Zap,
    badgeClass: "border-zinc-400/50 bg-zinc-500/15 text-zinc-200",
    bannerClass:
      "border-zinc-400/40 bg-gradient-to-r from-zinc-500/20 via-zinc-600/15 to-zinc-500/20 text-zinc-50",
  },
};
