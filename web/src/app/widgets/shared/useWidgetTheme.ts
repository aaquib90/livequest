"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";

import { CORNER_CLASS_MAP, accentOverlay } from "@/lib/branding/presentation";
import { cn } from "@/lib/utils";

type ThemePayload = {
  accent: string;
  cornerStyle: string;
  surfaceStyle: string;
  backgroundUrl: string | null;
  logoUrl: string | null;
};

type ThemeResponse = {
  ok?: boolean;
  theme?: ThemePayload;
  widget?: {
    id: string;
    type: string;
    status: string;
    config: Record<string, unknown>;
  };
};

type WidgetTheme = {
  accent: string;
  accentSoft: string;
  accentStrong: string;
  accentMuted: string;
  accentForeground: string;
  cornerClass: string;
  backgroundStyle: CSSProperties;
  styleVars: CSSProperties;
  logoUrl: string | null;
  widgetConfig: Record<string, unknown>;
  widgetType: string | null;
};

const DEFAULT_THEME: ThemePayload = {
  accent: "#22d3ee",
  cornerStyle: "rounded",
  surfaceStyle: "glass",
  backgroundUrl: null,
  logoUrl: null,
};

function clampHex(input: string): string {
  if (!input) return DEFAULT_THEME.accent;
  const value = input.trim();
  if (!value.startsWith("#")) return `#${value}`;
  return value;
}

function contrastForeground(hex: string): string {
  const normalized = clampHex(hex).replace("#", "");
  const full = normalized.length === 3 ? normalized.split("").map((c) => c + c).join("") : normalized;
  const intValue = parseInt(full, 16);
  const r = (intValue >> 16) & 255;
  const g = (intValue >> 8) & 255;
  const b = intValue & 255;
  const luminance = 0.2126 * Math.pow(r / 255, 2.2) + 0.7152 * Math.pow(g / 255, 2.2) + 0.0722 * Math.pow(b / 255, 2.2);
  return luminance > 0.55 ? "#0f172a" : "#f8fafc";
}

export function useWidgetTheme(widgetId: string, apiBase: string): WidgetTheme {
  const [theme, setTheme] = useState<ThemePayload>(DEFAULT_THEME);
  const [widgetConfig, setWidgetConfig] = useState<Record<string, unknown>>({});
  const [widgetType, setWidgetType] = useState<string | null>(null);

  useEffect(() => {
    if (!widgetId || !apiBase) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`${apiBase}/api/widgets/${encodeURIComponent(widgetId)}/theme`, {
          cache: "no-store",
        });
        const json = (await res.json().catch(() => null)) as ThemeResponse | null;
        if (!json || !json.theme || cancelled) return;
        const nextTheme: ThemePayload = {
          ...DEFAULT_THEME,
          ...json.theme,
          accent: clampHex(json.theme.accent || DEFAULT_THEME.accent),
        };
        setTheme(nextTheme);
        setWidgetConfig(json.widget?.config ?? {});
        setWidgetType(json.widget?.type ?? null);
      } catch {
        if (!cancelled) {
          setTheme(DEFAULT_THEME);
          setWidgetConfig({});
          setWidgetType(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [apiBase, widgetId]);

  const accent = theme.accent || DEFAULT_THEME.accent;
  const accentSoft = useMemo(() => accentOverlay(accent, 0.24), [accent]);
  const accentStrong = useMemo(() => accentOverlay(accent, 0.4), [accent]);
  const accentMuted = useMemo(() => accentOverlay(accent, 0.14), [accent]);
  const accentForeground = useMemo(() => contrastForeground(accent), [accent]);

  const cornerClass = useMemo(() => CORNER_CLASS_MAP[theme.cornerStyle] ?? CORNER_CLASS_MAP.rounded, [theme.cornerStyle]);

  const backgroundStyle = useMemo(() => {
    const layers = [
      `radial-gradient(120% 140% at 0% 0%, ${accentOverlay(accent, 0.46)}, rgba(10,13,25,0.92) 60%)`,
      `radial-gradient(120% 140% at 100% 0%, ${accentOverlay(accent, 0.12)}, rgba(6,8,18,0.96) 60%)`,
    ];
    if (theme.backgroundUrl) {
      layers.push(`url(${theme.backgroundUrl})`);
    }

    const backgroundSize = layers
      .map((_, index) => (theme.backgroundUrl && index === layers.length - 1 ? "cover" : "120% 120%"))
      .join(", ");
    const backgroundPosition = layers
      .map((_, index) => (theme.backgroundUrl && index === layers.length - 1 ? "center" : "0% 0%"))
      .join(", ");
    const backgroundRepeat = layers.map(() => "no-repeat").join(", ");

    return {
      backgroundImage: layers.join(", "),
      backgroundSize,
      backgroundPosition,
      backgroundRepeat,
      borderColor: accentOverlay(accent, 0.28),
      boxShadow: `0 46px 120px -64px ${accentOverlay(accent, 0.55)}`,
    } satisfies CSSProperties;
  }, [accent, theme.backgroundUrl]);

  const styleVars = useMemo(
    () =>
      ({
        "--widget-accent": accent,
        "--widget-accent-soft": accentSoft,
        "--widget-accent-strong": accentStrong,
        "--widget-accent-muted": accentMuted,
        "--widget-accent-foreground": accentForeground,
      }) as CSSProperties,
    [accent, accentSoft, accentStrong, accentMuted, accentForeground]
  );

  return {
    accent,
    accentSoft,
    accentStrong,
    accentMuted,
    accentForeground,
    cornerClass,
    backgroundStyle,
    styleVars,
    logoUrl: theme.logoUrl,
    widgetConfig,
    widgetType,
  };
}

export function themeContainerClass(base?: string, cornerClass?: string): string {
  return cn(
    "relative overflow-hidden border bg-black/60 text-slate-100 shadow-[0_36px_120px_-64px_rgba(6,10,25,0.9)] backdrop-blur-xl",
    cornerClass ?? CORNER_CLASS_MAP.rounded,
    base
  );
}
