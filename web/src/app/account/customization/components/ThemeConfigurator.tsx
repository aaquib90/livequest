"use client";

import { useMemo, useState, type CSSProperties } from "react";

import { Sparkles, Palette } from "lucide-react";

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
import { Select } from "@/components/ui/select";
import { PALETTE_PRESETS } from "@/lib/branding/constants";
import {
  CORNER_CLASS_MAP,
  accentOverlay,
  composeBackgroundStyles,
  resolveSurfaceVisual,
} from "@/lib/branding/presentation";
import type {
  AccountBranding,
  CornerStyle,
  PalettePresetKey,
  SurfaceStyle,
} from "@/lib/branding/types";
import { cn } from "@/lib/utils";

import { updateBrandingTheme } from "../actions";

const SUPABASE_PUBLIC_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";

function publicAssetUrl(path: string | null | undefined): string | null {
  if (!SUPABASE_PUBLIC_URL || !path) return null;
  const safePath = path
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
  return `${SUPABASE_PUBLIC_URL}/storage/v1/object/public/brand-assets/${safePath}`;
}

type ThemeConfiguratorProps = {
  branding: AccountBranding;
  paletteOptions: Array<[PalettePresetKey, { accent: string; name: string }]>;
  logoUrl: string | null;
  backgroundUrl: string | null;
};

const HEX_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const DEFAULT_PALETTE_KEY: PalettePresetKey = "violet";
const DARK_BASE_HEX = "#0F121B";
const LIGHT_BASE_HEX = "#FFFFFF";

type RGB = { r: number; g: number; b: number };

const toPaletteKey = (value: string): PalettePresetKey => {
  return (value in PALETTE_PRESETS ? value : DEFAULT_PALETTE_KEY) as PalettePresetKey;
};

const toCornerStyle = (value: string): CornerStyle => {
  return (["rounded", "pill", "square"].includes(value) ? value : "rounded") as CornerStyle;
};

const toSurfaceStyle = (value: string): SurfaceStyle => {
  return (["glass", "solid", "contrast", "liquid"].includes(value) ? value : "glass") as SurfaceStyle;
};

function hexToRgb(hex: string): RGB | null {
  const match = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(hex);
  if (!match) return null;
  const value = match[1];
  const normalized = value.length === 3 ? value.split("").map((c) => c + c).join("") : value;
  const intValue = parseInt(normalized, 16);
  return {
    r: (intValue >> 16) & 255,
    g: (intValue >> 8) & 255,
    b: intValue & 255,
  };
}

function channelToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(rgb: RGB): number {
  const r = channelToLinear(rgb.r);
  const g = channelToLinear(rgb.g);
  const b = channelToLinear(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hexA: string, hexB: string): number | null {
  const rgbA = hexToRgb(hexA);
  const rgbB = hexToRgb(hexB);
  if (!rgbA || !rgbB) return null;
  const lumA = relativeLuminance(rgbA);
  const lumB = relativeLuminance(rgbB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

function rgbChannelToHex(value: number): string {
  const clamped = Math.max(0, Math.min(255, Math.round(value)));
  return clamped.toString(16).padStart(2, "0");
}

function rgbToHex(rgb: RGB): string {
  return `#${rgbChannelToHex(rgb.r)}${rgbChannelToHex(rgb.g)}${rgbChannelToHex(rgb.b)}`.toUpperCase();
}

function blendHexColors(baseHex: string, overlayHex: string, alpha: number): string | null {
  const base = hexToRgb(baseHex);
  const overlay = hexToRgb(overlayHex);
  if (!base || !overlay) return null;
  const r = overlay.r * alpha + base.r * (1 - alpha);
  const g = overlay.g * alpha + base.g * (1 - alpha);
  const b = overlay.b * alpha + base.b * (1 - alpha);
  return rgbToHex({ r, g, b });
}

export function ThemeConfigurator({
  branding,
  paletteOptions,
  logoUrl,
  backgroundUrl,
}: ThemeConfiguratorProps) {
  const [palettePreset, setPalettePreset] = useState<PalettePresetKey>(
    toPaletteKey(branding.palette_preset)
  );
  const [cornerStyle, setCornerStyle] = useState<CornerStyle>(toCornerStyle(branding.corner_style));
  const [surfaceStyle, setSurfaceStyle] = useState<SurfaceStyle>(
    toSurfaceStyle(branding.surface_style)
  );
  const [accentInput, setAccentInput] = useState<string>(branding.accent_color ?? "");
  const [appearance, setAppearance] = useState<"dark" | "light">("dark");

  const accentColor = useMemo(() => {
    const candidate = accentInput.trim();
    if (candidate && HEX_PATTERN.test(candidate)) {
      return candidate.toUpperCase();
    }
    return PALETTE_PRESETS[palettePreset]?.accent ?? PALETTE_PRESETS[DEFAULT_PALETTE_KEY].accent;
  }, [accentInput, palettePreset]);

  const accentTrimmed = accentInput.trim();
  const accentIsValid = !accentTrimmed || HEX_PATTERN.test(accentTrimmed);
  const accentError = accentIsValid ? null : "Enter a valid 3 or 6 digit hex code (e.g. #0EA5E9).";

  const accentSoft = useMemo(
    () => accentOverlay(accentColor, appearance === "light" ? 0.12 : 0.15),
    [accentColor, appearance]
  );
  const surfaceVisual = useMemo(
    () => resolveSurfaceVisual(surfaceStyle, accentColor, appearance),
    [surfaceStyle, accentColor, appearance]
  );
  const previewLayers = useMemo(() => {
    const layers = [...surfaceVisual.layers];
    if (backgroundUrl) {
      const overlayGradient =
        appearance === "light"
          ? "linear-gradient(180deg, rgba(255,255,255,0.82), rgba(241,245,249,0.92))"
          : "linear-gradient(180deg, rgba(14,15,17,0.76), rgba(13,14,16,0.9))";
      layers.push(overlayGradient, `url(${backgroundUrl})`);
    }
    return layers;
  }, [appearance, backgroundUrl, surfaceVisual]);
  const previewCardStyle = useMemo(() => {
    const style = {
      borderColor: accentSoft,
      ...(surfaceVisual.style ?? {}),
      ...(previewLayers.length
        ? composeBackgroundStyles(previewLayers, { coverLast: Boolean(backgroundUrl) })
        : {}),
    } as CSSProperties;
    if (appearance === "light") {
      style.color = "#0F172A";
    }
    return style;
  }, [accentSoft, surfaceVisual, previewLayers, backgroundUrl, appearance]);

  const reactionPreview = useMemo(() => {
    const source = Array.isArray(branding.reactions) ? branding.reactions.slice(0, 4) : [];
    return source.map((reaction) => ({
      id: reaction.id,
      type: reaction.type,
      label: reaction.label,
      emoji: reaction.type === "emoji" ? reaction.emoji ?? "😀" : undefined,
      imageUrl:
        reaction.type === "image" ? publicAssetUrl(reaction.image_path ?? null) : null,
    }));
  }, [branding.reactions]);

  const accessibility = useMemo(() => {
    const evaluate = (mode: "dark" | "light") => {
      const baseHex = mode === "light" ? LIGHT_BASE_HEX : DARK_BASE_HEX;
      const overlayAlpha = mode === "light" ? 0.12 : 0.15;
      const notices: string[] = [];
      const baseContrast = contrastRatio(accentColor, baseHex);
      if (baseContrast !== null && baseContrast < 4.5) {
        notices.push(
          `Accent text on ${mode} surfaces is ${baseContrast.toFixed(2)}:1 — aim for ≥ 4.5:1 for body text.`
        );
      }
      const pillBackground = blendHexColors(baseHex, accentColor, overlayAlpha) ?? baseHex;
      const pillContrast = contrastRatio(accentColor, pillBackground);
      if (pillContrast !== null && pillContrast < 3) {
        notices.push(
          `Accent pill contrast on ${mode} surfaces is ${pillContrast.toFixed(2)}:1 — aim for ≥ 3:1.`
        );
      }
      return { notices, baseContrast, pillContrast };
    };
    return {
      dark: evaluate("dark"),
      light: evaluate("light"),
    };
  }, [accentColor]);
  const activeAccessibility = appearance === "light" ? accessibility.light : accessibility.dark;

  const currentPaletteName =
    PALETTE_PRESETS[palettePreset]?.name ?? PALETTE_PRESETS[DEFAULT_PALETTE_KEY].name;

  const previewFrameStyle =
    appearance === "light"
      ? {
          background: "linear-gradient(140deg, rgba(255,255,255,0.92), rgba(226,232,240,0.72))",
          borderColor: "rgba(148,163,184,0.45)",
        }
      : undefined;
  const previewMuted = appearance === "light" ? "rgba(15,23,42,0.66)" : undefined;
  const neutralPillBg = appearance === "light" ? "rgba(15,23,42,0.08)" : undefined;
  const neutralPillBorder = appearance === "light" ? "rgba(15,23,42,0.12)" : undefined;
  const watermarkStyle =
    appearance === "light"
      ? { backgroundColor: "rgba(15,23,42,0.12)", color: "rgba(15,23,42,0.6)" }
      : { backgroundColor: "rgba(0,0,0,0.4)", color: "rgba(255,255,255,0.7)" };
  const warningColor = appearance === "light" ? "#B45309" : "#FBBF24";
  const successColor = appearance === "light" ? "#047857" : "#34D399";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
      <Card className="border-border/70 bg-background/50">
        <CardHeader>
          <Badge variant="outline" className="mb-4 w-fit">
            Theme
          </Badge>
          <CardTitle className="text-2xl">Base palette</CardTitle>
          <CardDescription className="text-base">
            Choose your global accent, card silhouette, and surface finish. Changes apply to embeds immediately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateBrandingTheme} className="space-y-5" aria-label="Base theme settings">
            <div className="space-y-2">
              <Label htmlFor="palettePreset">Accent preset</Label>
              <Select
                id="palettePreset"
                name="palettePreset"
                value={palettePreset}
                onChange={(event) => setPalettePreset(toPaletteKey(event.target.value))}
              >
                {paletteOptions.map(([value, preset]) => (
                  <option key={value} value={value}>
                    {preset.name}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-muted-foreground">
                Pick a palette to auto-fill accent colors across cards, headlines, and buttons.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cornerStyle">Card silhouette</Label>
              <Select
                id="cornerStyle"
                name="cornerStyle"
                value={cornerStyle}
                onChange={(event) => setCornerStyle(toCornerStyle(event.target.value))}
              >
                <option value="rounded">Rounded corners</option>
                <option value="pill">Pill shaped</option>
                <option value="square">Squared corners</option>
              </Select>
              <p className="text-xs text-muted-foreground">
                Apply the same outline across liveblog embeds, dashboards, and newsletter cards.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="surfaceStyle">Surface finish</Label>
              <Select
                id="surfaceStyle"
                name="surfaceStyle"
                value={surfaceStyle}
                onChange={(event) => setSurfaceStyle(toSurfaceStyle(event.target.value))}
              >
                <option value="glass">Glassmorphism</option>
                <option value="solid">Solid fill</option>
                <option value="contrast">High contrast</option>
                  <option value="liquid">Liquid glass (Apple)</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="accentColor">Custom accent (optional)</Label>
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  id="accentColor"
                  name="accentColor"
                  type="text"
                  inputMode="text"
                  placeholder={accentColor}
                  value={accentInput}
                  onChange={(event) => setAccentInput(event.target.value.toUpperCase())}
                  className={cn(!accentIsValid ? "border-red-500/70 focus-visible:ring-red-500/50" : undefined)}
                />
                <span
                  aria-hidden="true"
                  className="h-9 w-9 shrink-0 rounded-full border border-border/40 shadow-inner"
                  style={{ backgroundColor: accentColor }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Provide a hex value (e.g. #0EA5E9) to override the {currentPaletteName} preset. Leave blank to stick with the preset accent.
              </p>
              {accentError ? (
                <p
                  className="text-xs font-medium"
                  style={{ color: appearance === "light" ? "#DC2626" : "#F87171" }}
                >
                  {accentError} We&apos;ll keep showing the preset accent until this is valid.
                </p>
              ) : (
                <div className="space-y-1 text-xs">
                  <p className="text-muted-foreground">
                    Contrast on {appearance} surfaces:{" "}
                    <span className="font-medium text-foreground">
                      {activeAccessibility.baseContrast
                        ? `${activeAccessibility.baseContrast.toFixed(2)}:1`
                        : "–"}
                    </span>
                  </p>
                  {activeAccessibility.notices.length ? (
                    <ul className="space-y-1" style={{ color: warningColor }}>
                      {activeAccessibility.notices.map((msg) => (
                        <li key={msg}>{msg}</li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ color: successColor }}>
                      Looks good — this accent clears WCAG targets.
                    </p>
                  )}
                </div>
              )}
            </div>
            <Button type="submit" size="sm" className="w-fit">
              Save theme
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card
        className={cn(
          "border-border/70 bg-background/50 transition-colors",
          appearance === "light" ? "bg-slate-100/80 text-slate-900" : undefined
        )}
        style={previewFrameStyle}
      >
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Badge variant="outline" className="w-fit">
              Preview
            </Badge>
            <div
              className="inline-flex overflow-hidden rounded-lg border border-border/60 bg-background/40 p-1"
              role="group"
              aria-label="Toggle preview appearance"
            >
              {(["dark", "light"] as Array<"dark" | "light">).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    appearance === mode
                      ? "bg-primary/90 text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  aria-pressed={appearance === mode}
                  onClick={() => setAppearance(mode)}
                >
                  {mode === "dark" ? "Dark" : "Light"}
                </button>
              ))}
            </div>
          </div>
          <CardTitle className="text-2xl">Liveblog preview</CardTitle>
          <CardDescription
            className="text-base"
            style={previewMuted ? { color: previewMuted } : undefined}
          >
            A quick look at how your accent color, surface finish, and corners update the embed card.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={cn(
              "relative overflow-hidden p-6 pb-16 shadow-lg shadow-black/10 transition-all duration-300",
              CORNER_CLASS_MAP[cornerStyle] ?? CORNER_CLASS_MAP.rounded,
              surfaceVisual.className
            )}
            style={previewCardStyle}
          >
            {logoUrl ? (
              <div className="absolute right-4 top-4 flex h-12 items-center justify-center overflow-hidden rounded-xl border border-border/40 bg-background/70 px-3 py-2 shadow-sm backdrop-blur">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoUrl} alt="Preview logo" className="max-h-8 w-auto" loading="lazy" />
              </div>
            ) : null}
            <div
              className="text-xs font-semibold uppercase tracking-[0.22em]"
              style={{ color: accentColor }}
            >
              Featured update
            </div>
            <h3
              className="mt-3 text-lg font-semibold"
              style={appearance === "light" ? { color: "#0F172A" } : undefined}
            >
              Halftime reactions rolling in
            </h3>
            <p
              className="mt-2 text-sm text-muted-foreground"
              style={previewMuted ? { color: previewMuted } : undefined}
            >
              Buttons, badges, and scorelines will inherit your accent color so the experience stays on brand everywhere.
            </p>
            <div
              className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground/80"
              style={previewMuted ? { color: previewMuted } : undefined}
            >
              <span
                className="inline-flex items-center gap-1 rounded-full px-3 py-1 font-medium"
                style={{ backgroundColor: accentSoft, color: accentColor }}
              >
                <Palette className="h-3.5 w-3.5" />
                Accent preview
              </span>
              <span
                className="inline-flex items-center gap-1 rounded-full border px-3 py-1 font-medium"
                style={
                  {
                    color: accentColor,
                    backgroundColor: neutralPillBg ?? "rgba(17,24,39,0.78)",
                    borderColor: neutralPillBorder ?? "rgba(148,163,184,0.22)",
                  } as CSSProperties
                }
              >
                <Sparkles className="h-3.5 w-3.5" />
                Spotlight title
              </span>
            </div>
            {reactionPreview.length ? (
              <div className="mt-6 flex flex-wrap items-center gap-2 text-xs">
                {reactionPreview.map((reaction) => (
                  <span
                    key={reaction.id}
                    className="inline-flex items-center gap-1 rounded-full border px-3 py-1"
                    style={{
                      borderColor: accentSoft,
                      backgroundColor: accentOverlay(accentColor, 0.08),
                      color: accentColor,
                    }}
                  >
                    {reaction.imageUrl ? (
                      <span className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-background/70">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={reaction.imageUrl} alt="" className="h-full w-full object-contain" />
                      </span>
                    ) : (
                      <span className="text-sm leading-none">{reaction.emoji ?? "😀"}</span>
                    )}
                    <span className="font-medium">{reaction.label}</span>
                  </span>
                ))}
              </div>
            ) : null}
            {branding.watermark ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-end px-4">
                <span
                  className="rounded-full px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.38em] backdrop-blur"
                  style={watermarkStyle}
                >
                  {branding.watermark}
                </span>
              </div>
            ) : null}
          </div>
          <div className="rounded-2xl border border-dashed border-border/60 bg-background/60 p-4">
            <p
              className="text-sm text-muted-foreground"
              style={previewMuted ? { color: previewMuted } : undefined}
            >
              Coming soon: preview any liveblog, toggle between dark/light, and test device breakpoints without leaving this page.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
