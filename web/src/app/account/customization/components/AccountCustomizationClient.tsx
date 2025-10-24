"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Loader2, Lock, Palette, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { UpgradeHighlights } from "@/components/ui/upgrade-highlights";
import type { AccountFeatures } from "@/lib/billing/types";
import { PALETTE_PRESETS } from "@/lib/branding/constants";
import type { AccountBranding } from "@/lib/branding/types";
import { accentOverlay, CORNER_CLASS_MAP, SURFACE_CLASS_MAP } from "@/lib/branding/presentation";
import { resolveAccentColor } from "@/lib/branding/utils";

import AccountSectionTabs from "../../components/AccountSectionTabs";
import BrandAssetUploader from "./BrandAssetUploader";

type BrandingResponse = {
  displayName: string;
  email: string | null;
  features: AccountFeatures | null;
  branding: AccountBranding | null;
  accountId: string;
};

type StatusState = {
  message: string | null;
  tone: "success" | "error" | null;
};

export default function AccountCustomizationClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<StatusState>({ message: null, tone: null });
  const [themePending, startThemeTransition] = useTransition();
  const [assetsPending, startAssetsTransition] = useTransition();
  const [data, setData] = useState<BrandingResponse | null>(null);
  const [authError, setAuthError] = useState(false);

  const branding = data?.branding ?? null;
  const canUsePremiumThemes = Boolean(data?.features?.can_use_premium_themes);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/account/branding", { cache: "no-store" });
        if (cancelled) return;
        if (res.status === 401) {
          setAuthError(true);
          setLoading(false);
          return;
        }
        if (!res.ok) throw new Error("Failed to load");
        const payload: BrandingResponse = await res.json();
        if (cancelled) return;
        setData({
          ...payload,
          branding: payload.branding
            ? { ...payload.branding, account_id: payload.branding.account_id || payload.accountId }
            : null,
        });
        setLoading(false);
      } catch (error) {
        console.error("Unable to load branding", error);
        if (!cancelled) {
          setStatus({ message: "We couldn't load your branding settings. Try again shortly.", tone: "error" });
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const accentColor = useMemo(() => resolveAccentColor(branding ?? undefined), [branding]);
  const accentSoft = useMemo(() => accentOverlay(accentColor, 0.15), [accentColor]);
  const logoUrl = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
    if (!base || !data?.accountId || !branding?.logo_path) return null;
    const safePath = branding.logo_path
      .split("/")
      .filter(Boolean)
      .map(encodeURIComponent)
      .join("/");
    return `${base}/storage/v1/object/public/brand-assets/${safePath}`;
  }, [branding?.logo_path, data?.accountId]);
  const backgroundUrl = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
    if (!base || !data?.accountId || !branding?.background_path) return null;
    const safePath = branding.background_path
      .split("/")
      .filter(Boolean)
      .map(encodeURIComponent)
      .join("/");
    return `${base}/storage/v1/object/public/brand-assets/${safePath}`;
  }, [branding?.background_path, data?.accountId]);

  const previewCardClass = useMemo(
    () =>
      [
        "relative overflow-hidden p-6 pb-16 shadow-lg shadow-black/10 transition-all duration-300",
        CORNER_CLASS_MAP[branding?.corner_style ?? "rounded"],
        SURFACE_CLASS_MAP[branding?.surface_style ?? "glass"],
      ]
        .filter(Boolean)
        .join(" "),
    [branding?.corner_style, branding?.surface_style]
  );

  const previewCardStyle = useMemo(() => {
    const style: Record<string, string> = { borderColor: accentSoft };
    if (backgroundUrl) {
      style.backgroundImage = `linear-gradient(180deg, rgba(14,15,17,0.76), rgba(13,14,16,0.9)), url(${backgroundUrl})`;
      style.backgroundSize = "cover";
      style.backgroundPosition = "center";
      style.backgroundRepeat = "no-repeat";
    }
    return style;
  }, [accentSoft, backgroundUrl]);

  const paletteOptions = useMemo(
    () => Object.entries(PALETTE_PRESETS) as Array<[keyof typeof PALETTE_PRESETS, { accent: string; name: string }]>,
    []
  );

  const selectedPreset = branding?.palette_preset && branding.palette_preset in PALETTE_PRESETS
    ? (branding.palette_preset as keyof typeof PALETTE_PRESETS)
    : "violet";
  const selectedPresetName = PALETTE_PRESETS[selectedPreset]?.name ?? PALETTE_PRESETS.violet.name;

  const handleThemeSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      const payload = {
        palettePreset: formData.get("palettePreset")?.toString(),
        cornerStyle: formData.get("cornerStyle")?.toString(),
        surfaceStyle: formData.get("surfaceStyle")?.toString(),
        accentColor: formData.get("accentColor")?.toString(),
      };

      startThemeTransition(async () => {
        try {
          const res = await fetch("/api/account/branding/theme", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (res.status === 401) {
            setAuthError(true);
            return;
          }
          if (!res.ok) throw new Error("Failed to save theme");
          const json = await res.json();
          const nextBranding = json.branding
            ? { ...json.branding, account_id: json.branding.account_id || data?.accountId }
            : null;
          setData((prev) =>
            prev
              ? {
                  ...prev,
                  branding: nextBranding ?? prev.branding,
                }
              : prev
          );
          setStatus({ message: "Theme preferences updated successfully.", tone: "success" });
        } catch (error) {
          console.error("Theme update failed", error);
          setStatus({ message: "We couldn't update your theme. Try again shortly.", tone: "error" });
        }
      });
    },
    [data?.accountId, startThemeTransition]
  );

  const handleAssetsSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      const payload = {
        logoPath: formData.get("logoPath")?.toString() ?? null,
        backgroundPath: formData.get("backgroundPath")?.toString() ?? null,
        watermark: formData.get("watermark")?.toString() ?? null,
      };

      startAssetsTransition(async () => {
        try {
          const res = await fetch("/api/account/branding/assets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (res.status === 401) {
            setAuthError(true);
            return;
          }
          if (res.status === 402) {
            setStatus({ message: "Upgrade to a paid plan to unlock premium branding.", tone: "error" });
            return;
          }
          if (!res.ok) throw new Error("Failed to save assets");
          const json = await res.json();
          const nextBranding = json.branding
            ? { ...json.branding, account_id: json.branding.account_id || data?.accountId }
            : null;
          setData((prev) =>
            prev
              ? {
                  ...prev,
                  branding: nextBranding ?? prev.branding,
                }
              : prev
          );
          setStatus({ message: "Brand assets saved. These settings now flow through embeds and dashboards.", tone: "success" });
        } catch (error) {
          console.error("Asset update failed", error);
          setStatus({ message: "Brand assets weren't saved. Double-check the paths and retry.", tone: "error" });
        }
      });
    },
    [data?.accountId, startAssetsTransition]
  );

  const resetStatus = useCallback(() => setStatus({ message: null, tone: null }), []);

  useEffect(() => {
    if (status.message) {
      const timer = setTimeout(() => setStatus({ message: null, tone: null }), 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [status]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-52 animate-pulse rounded-3xl bg-muted/20" />
        <div className="h-10 w-60 animate-pulse rounded-full bg-muted/20" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="h-96 animate-pulse rounded-3xl bg-muted/10" />
          <div className="h-96 animate-pulse rounded-3xl bg-muted/10" />
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="flex flex-col items-start gap-6 rounded-3xl border border-border/60 bg-background/70 p-10">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Sign in required</h1>
          <p className="text-sm text-muted-foreground">Log in to customise how your liveblogs look across embeds.</p>
        </div>
        <Button onClick={() => router.push("/signin")}>
          Sign in
          <ArrowUpRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-3xl border border-destructive/40 bg-destructive/10 p-8 text-destructive-foreground">
        Something went wrong while loading your customisation settings.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-border/60 bg-gradient-to-br from-zinc-900/70 via-zinc-900/30 to-zinc-900/10 px-8 py-12 shadow-[0_20px_40px_-25px_rgba(9,9,11,0.75)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/40 bg-background/40 px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              Customization
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{data.displayName}</h1>
              <p className="max-w-2xl text-base text-muted-foreground">
                Bring your liveblogs to life with reusable themes, brand palettes, and premium assets that stay in sync across embeds.
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="border-border/70">
            <Link href="/dashboard">
              Back to dashboard
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        {status.message && status.tone === "success" ? (
          <div className="mt-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {status.message}
          </div>
        ) : null}
        {status.message && status.tone === "error" ? (
          <div className="mt-8 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground/90">
            {status.message}
          </div>
        ) : null}
      </div>

      <AccountSectionTabs />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Card className="border-border/70 bg-background/50">
          <CardHeader>
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Theme
            </div>
            <CardTitle className="text-2xl">Base palette</CardTitle>
            <CardDescription className="text-base">
              Choose your global accent, card silhouette, and surface finish. Changes apply to embeds immediately.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" aria-label="Base theme settings" onSubmit={handleThemeSubmit} onChange={resetStatus}>
              <div className="space-y-2">
                <Label htmlFor="palettePreset">Accent preset</Label>
                <Select id="palettePreset" name="palettePreset" defaultValue={branding?.palette_preset ?? "violet"}>
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
                <Select id="cornerStyle" name="cornerStyle" defaultValue={branding?.corner_style ?? "rounded"}>
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
                <Select id="surfaceStyle" name="surfaceStyle" defaultValue={branding?.surface_style ?? "glass"}>
                  <option value="glass">Glassmorphism</option>
                  <option value="solid">Solid fill</option>
                  <option value="contrast">High contrast</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="accentColor">Custom accent (optional)</Label>
                <Input
                  id="accentColor"
                  name="accentColor"
                  type="text"
                  inputMode="text"
                  placeholder={accentColor}
                  defaultValue={branding?.accent_color ?? ""}
                />
                <p className="text-xs text-muted-foreground">
                  Provide a hex value (e.g. #0EA5E9) to override the {selectedPresetName} preset. Leave blank to stick with the preset accent.
                </p>
              </div>
              <Button type="submit" size="sm" className="w-fit" disabled={themePending}>
                {themePending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save theme
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-background/50">
          <CardHeader>
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Preview
            </div>
            <CardTitle className="text-2xl">Liveblog preview</CardTitle>
            <CardDescription className="text-base">
              A quick look at how your accent color, surface finish, and corners update the embed card.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={previewCardClass} style={previewCardStyle}>
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
              <h3 className="mt-3 text-lg font-semibold text-foreground">Halftime reactions rolling in</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Buttons, badges, and scorelines will inherit your accent color so the experience stays on brand everywhere.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground/80">
                <span
                  className="inline-flex items-center gap-1 rounded-full px-3 py-1 font-medium"
                  style={{ backgroundColor: accentSoft, color: accentColor }}
                >
                  <Palette className="h-3.5 w-3.5" />
                  Accent preview
                </span>
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-background/80 px-3 py-1 font-medium"
                  style={{ color: accentColor }}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Spotlight title
                </span>
              </div>
              {branding?.watermark ? (
                <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-end px-4">
                  <span className="rounded-full bg-black/40 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.38em] text-white/70 backdrop-blur">
                    {branding.watermark}
                  </span>
                </div>
              ) : null}
            </div>
            <div className="rounded-2xl border border-dashed border-border/60 bg-background/60 p-4">
              <p className="text-sm text-muted-foreground">
                Coming soon: preview any liveblog, toggle between dark/light, and test device breakpoints without leaving this page.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Card className="border-border/70 bg-background/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Brand assets
              </div>
              {!canUsePremiumThemes ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  Pro
                </span>
              ) : null}
            </div>
            <CardTitle className="text-2xl">Logos &amp; backgrounds</CardTitle>
            <CardDescription className="text-base">
              Store artwork once and we&apos;ll thread it through embeds, newsletters, and share cards automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {canUsePremiumThemes ? (
              <form
                className="space-y-5"
                aria-label="Premium branding settings"
                onSubmit={handleAssetsSubmit}
                onChange={resetStatus}
              >
                <BrandAssetUploader
                  accountId={data.accountId}
                  name="logoPath"
                  label="Primary logo"
                  initialPath={branding?.logo_path ?? ""}
                  placeholder={`brand-assets/${data.accountId}/logo.svg`}
                  description="Prefer an SVG with a transparent background for the sharpest display across embeds."
                  helperText="Supported formats: SVG, PNG, JPG, WebP (max 2MB)."
                  maxSizeMB={2}
                  previewAspect="square"
                />
                <BrandAssetUploader
                  accountId={data.accountId}
                  name="backgroundPath"
                  label="Embed background"
                  initialPath={branding?.background_path ?? ""}
                  placeholder={`brand-assets/${data.accountId}/background.jpg`}
                  description="Large format imagery frames the entire embed. Opt for subtle gradients or textures."
                  helperText="Supported formats: PNG, JPG, WebP (max 6MB). Recommended size: 1920×1080."
                  maxSizeMB={6}
                  previewAspect="wide"
                />
                <p className="text-xs text-muted-foreground">
                  Assets are stored in <code>brand-assets/{data.accountId}</code>. Reuse paths across liveblogs or swap them out per event as needed.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="watermark">Watermark text</Label>
                  <Input
                    id="watermark"
                    name="watermark"
                    placeholder="Presented by Acme FC"
                    defaultValue={branding?.watermark ?? ""}
                  />
                  <p className="text-xs text-muted-foreground">
                    Appears in the lower frame of embeds and can be overridden per liveblog soon.
                  </p>
                </div>
                <Button type="submit" size="sm" className="w-fit" disabled={assetsPending}>
                  {assetsPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save brand assets
                </Button>
              </form>
            ) : (
              <div className="space-y-4 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 text-primary">
                  <Lock className="h-4 w-4" />
                  Premium branding
                </div>
                <p>
                  Paid plans unlock logo uploads, custom backgrounds, and per-event overrides. Your audience will see your brand—not ours.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button asChild size="sm" className="bg-primary/90 text-primary-foreground">
                    <Link href="/pricing">
                      See plans
                      <ArrowUpRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="border-border/70">
                    <Link href="/account/analytics">
                      Check usage
                      <ArrowUpRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {canUsePremiumThemes ? (
          <Card className="border-border/70 bg-background/50">
            <CardHeader>
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Status
              </div>
              <CardTitle className="text-2xl">Premium branding unlocked</CardTitle>
              <CardDescription className="text-base">
                Your plan supports logos, backgrounds, and watermarking. We&apos;ll reach out ahead of the asset uploader beta.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Current settings
                </div>
                <dl className="mt-3 space-y-2">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground/80">Logo</dt>
                    <dd className="text-right text-foreground/90">
                      {branding?.logo_path ? <code>{branding.logo_path}</code> : "Not set"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground/80">Background</dt>
                    <dd className="text-right text-foreground/90">
                      {branding?.background_path ? <code>{branding.background_path}</code> : "Not set"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground/80">Watermark</dt>
                    <dd className="text-right text-foreground/90">{branding?.watermark ?? "Not set"}</dd>
                  </div>
                </dl>
              </div>
              <p>
                Need bespoke presets or newsroom-wide overrides? Let us know and we&apos;ll prioritise it for the beta.
              </p>
            </CardContent>
          </Card>
        ) : (
          <UpgradeHighlights
            className="bg-background/60"
            items={[
              "Upload bespoke logos, watermarks, and sponsor treatments.",
              "Add large-format backgrounds or gradients to every embed.",
              "Swap typography and layout presets to match your newsroom.",
            ]}
          />
        )}
      </div>
    </div>
  );
}
