import type { CSSProperties } from "react";

import type { CornerStyle, SurfaceStyle } from "./types";

export const CORNER_CLASS_MAP: Record<CornerStyle | string, string> = {
  rounded: "rounded-3xl",
  pill: "rounded-[2.5rem]",
  square: "rounded-2xl",
};

const SURFACE_BASE_CLASS_MAP: Record<SurfaceStyle | string, string> = {
  glass: "relative border border-white/15 bg-white/5 backdrop-blur-xl shadow-[0_22px_65px_-38px_rgba(6,8,20,0.85)] ring-1 ring-white/10",
  solid: "relative border border-border/80 bg-background shadow-[0_28px_80px_-40px_rgba(3,6,18,0.85)]",
  contrast: "relative border border-white/10 bg-black/75 shadow-[0_32px_96px_-48px_rgba(0,0,0,0.88)] ring-1 ring-white/8",
  liquid: "relative overflow-hidden border border-white/18 bg-white/10 backdrop-blur-2xl shadow-[0_34px_110px_-54px_rgba(0,0,0,0.9)] ring-1 ring-white/12",
};

export const SURFACE_CLASS_MAP: Record<SurfaceStyle | string, string> = SURFACE_BASE_CLASS_MAP;

export function accentOverlay(accentHex: string, alpha = 0.15): string {
  const normalized = accentHex.replace("#", "");
  const value = normalized.length === 3 ? normalized.split("").map((char) => char + char).join("") : normalized;
  const intValue = parseInt(value, 16);
  const r = (intValue >> 16) & 255;
  const g = (intValue >> 8) & 255;
  const b = intValue & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

type SurfaceVisual = {
  className: string;
  layers: string[];
  style?: CSSProperties;
};

const DEFAULT_ACCENT = "#8B5CF6";

const SURFACE_LIGHT_CLASS_MAP: Record<SurfaceStyle | string, string> = {
  glass:
    "relative border border-slate-200/60 bg-white/40 backdrop-blur-[28px] shadow-[0_40px_90px_-50px_rgba(15,23,42,0.42)] ring-1 ring-white/60",
  solid: "relative border border-slate-200 bg-white shadow-[0_32px_100px_-46px_rgba(15,23,42,0.32)]",
  contrast: "relative border border-black/20 bg-slate-900 text-white shadow-[0_30px_90px_-46px_rgba(15,23,42,0.36)] ring-1 ring-black/20",
  liquid:
    "relative overflow-hidden border border-slate-100/70 bg-white/30 backdrop-blur-[36px] shadow-[0_55px_140px_-64px_rgba(59,130,246,0.28)] ring-1 ring-white/60",
};

export function resolveSurfaceVisual(
  surface: SurfaceStyle | string,
  accentHex?: string | null,
  appearance: "dark" | "light" = "dark"
): SurfaceVisual {
  const accent = typeof accentHex === "string" && accentHex ? accentHex : DEFAULT_ACCENT;
  switch (surface) {
    case "solid":
      if (appearance === "light") {
        return {
          className: SURFACE_LIGHT_CLASS_MAP.solid,
          layers: [],
          style: {
            backgroundColor: "rgba(255,255,255,0.95)",
            backdropFilter: "none",
          },
        };
      }
      return {
        className: SURFACE_BASE_CLASS_MAP.solid,
        layers: [],
        style: {
          backgroundColor: "rgba(14,16,22,0.96)",
          backdropFilter: "none",
        },
      };
    case "contrast":
      if (appearance === "light") {
        return {
          className: SURFACE_LIGHT_CLASS_MAP.contrast,
          layers: [
            "linear-gradient(160deg, rgba(255,255,255,0.12), rgba(15,23,42,0.65) 68%)",
            "linear-gradient(320deg, rgba(71,85,105,0.35), transparent 55%)",
          ],
          style: {
            backgroundColor: "rgba(15,23,42,0.96)",
            backdropFilter: "blur(10px)",
            borderColor: "rgba(30,41,59,0.55)",
          },
        };
      }
      return {
        className: SURFACE_BASE_CLASS_MAP.contrast,
        layers: ["linear-gradient(165deg, rgba(255,255,255,0.08), rgba(0,0,0,0) 60%)"],
        style: {
          backgroundColor: "rgba(4,6,12,0.94)",
          backdropFilter: "blur(10px)",
        },
      };
    case "liquid": {
      const highlight = accentOverlay(accent, appearance === "light" ? 0.28 : 0.45);
      const bloom = accentOverlay(accent, appearance === "light" ? 0.12 : 0.18);
      if (appearance === "light") {
        return {
          className: SURFACE_LIGHT_CLASS_MAP.liquid,
          layers: [
            `radial-gradient(115% 140% at 20% 18%, ${highlight}, rgba(255,255,255,0.45) 56%)`,
            `radial-gradient(110% 130% at 82% 84%, ${bloom}, rgba(226,232,240,0.35) 68%)`,
            "linear-gradient(130deg, rgba(255,255,255,0.82) 0%, rgba(255,255,255,0.12) 52%, rgba(255,255,255,0.08) 100%)",
            "linear-gradient(320deg, rgba(148,163,184,0.28) 6%, transparent 60%)",
          ],
          style: {
            backgroundColor: "rgba(255,255,255,0.38)",
            backgroundBlendMode: "screen, soft-light, lighten, normal",
            backdropFilter: "blur(36px)",
            borderColor: "rgba(226,232,240,0.65)",
            boxShadow: "0 60px 160px -80px rgba(59,130,246,0.45)",
          },
        };
      }
      return {
        className: SURFACE_BASE_CLASS_MAP.liquid,
        layers: [
          `radial-gradient(120% 140% at 12% 10%, ${highlight}, rgba(12,14,24,0.05) 58%)`,
          `radial-gradient(120% 140% at 88% 82%, ${bloom}, rgba(8,10,18,0.82) 62%)`,
          "linear-gradient(140deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.04) 42%, rgba(0,0,0,0) 100%)",
        ],
        style: {
          backgroundColor: "rgba(10,12,20,0.5)",
          backgroundBlendMode: "screen, soft-light, normal",
          backdropFilter: "blur(28px)",
        },
      };
    }
    case "glass":
    default:
      if (appearance === "light") {
        return {
          className: SURFACE_LIGHT_CLASS_MAP.glass,
          layers: [
            "linear-gradient(150deg, rgba(255,255,255,0.85) 0%, rgba(226,232,240,0.32) 60%)",
            "linear-gradient(320deg, rgba(148,163,184,0.25) 10%, rgba(148,163,184,0.05) 55%)",
          ],
          style: {
            backgroundColor: "rgba(255,255,255,0.45)",
            backdropFilter: "blur(30px)",
            borderColor: "rgba(148,163,184,0.28)",
            boxShadow: "0 36px 120px -60px rgba(15,23,42,0.42)",
          },
        };
      }
      return {
        className: SURFACE_BASE_CLASS_MAP.glass,
        layers: ["linear-gradient(150deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.02) 60%)"],
        style: {
          backgroundColor: "rgba(15,18,27,0.58)",
          backdropFilter: "blur(22px)",
        },
      };
  }
}

type BackgroundComposeOptions = {
  coverLast?: boolean;
};

export function composeBackgroundStyles(
  layers: string[],
  options: BackgroundComposeOptions = {}
): Pick<CSSProperties, "backgroundImage" | "backgroundSize" | "backgroundPosition" | "backgroundRepeat"> {
  if (!layers.length) return {};
  const { coverLast = false } = options;
  const lastIndex = layers.length - 1;
  return {
    backgroundImage: layers.join(", "),
    backgroundSize: layers
      .map((_, index) => (coverLast && index === lastIndex ? "cover" : "100% 100%"))
      .join(", "),
    backgroundPosition: layers
      .map((_, index) => (coverLast && index === lastIndex ? "center" : "0% 0%"))
      .join(", "),
    backgroundRepeat: layers
      .map((_, index) => (coverLast && index === lastIndex ? "no-repeat" : "no-repeat"))
      .join(", "),
  };
}
