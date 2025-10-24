import type { CSSProperties } from "react";

import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, Lock, Palette, Sparkles } from "lucide-react";

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
import { UpgradeHighlights } from "@/components/ui/upgrade-highlights";
import { fetchAccountFeaturesForUser } from "@/lib/billing/server";
import { PALETTE_PRESETS } from "@/lib/branding/constants";
import { fetchAccountBrandingForUser } from "@/lib/branding/server";
import { CORNER_CLASS_MAP, SURFACE_CLASS_MAP, accentOverlay } from "@/lib/branding/presentation";
import { normaliseBranding, resolveAccentColor } from "@/lib/branding/utils";
import type { PalettePresetKey } from "@/lib/branding/types";
import { createClient } from "@/lib/supabase/serverClient";
import { cn } from "@/lib/utils";

import AccountSectionTabs from "../components/AccountSectionTabs";
import { AccountHeaderCard } from "../components/AccountHeaderCard";
import BrandAssetUploader from "./components/BrandAssetUploader";
import { updateBrandAssets, updateBrandingTheme } from "./actions";

export const runtime = "edge";

type AccountCustomizationSearchParams = {
  status?: string;
  error?: string;
};

const statusMessages: Record<string, string> = {
  "theme-saved": "Theme preferences updated successfully.",
  "brand-saved": "Brand assets saved. These settings now flow through embeds and dashboards.",
};

const errorMessages: Record<string, string> = {
  "theme-save": "We couldn't update your theme just yet. Please try again.",
  "brand-save": "Brand assets weren't saved. Double-check the paths and retry.",
  "premium-required": "Upgrade to a paid plan to unlock logos, backgrounds, and watermarks.",
};

export default async function AccountCustomizationPage({
  searchParams,
}: {
  searchParams: Promise<AccountCustomizationSearchParams>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return redirect("/signin");
  }

  const sp = await searchParams;
  const successMessage = sp?.status ? statusMessages[sp.status] ?? null : null;
  const errorMessage = sp?.error ? errorMessages[sp.error] ?? "Something went wrong. Please try again." : null;

  const features = await fetchAccountFeaturesForUser(supabase).catch(() => null);
  const canUsePremiumThemes = Boolean(features?.can_use_premium_themes);

  const brandingRaw = await fetchAccountBrandingForUser(supabase).catch(() => null);
  const resolvedBranding = normaliseBranding(brandingRaw ?? undefined);
  const branding = resolvedBranding.account_id ? resolvedBranding : { ...resolvedBranding, account_id: user.id };

  const accentColor = resolveAccentColor(branding);
  const accentSoft = accentOverlay(accentColor, 0.15);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const buildPublicUrl = (path: string | null | undefined) => {
    if (!supabaseUrl || !path) return null;
    const safePath = path
      .split("/")
      .filter(Boolean)
      .map(encodeURIComponent)
      .join("/");
    return `${supabaseUrl}/storage/v1/object/public/brand-assets/${safePath}`;
  };
  const logoUrl = buildPublicUrl(branding.logo_path);
  const backgroundUrl = buildPublicUrl(branding.background_path);
  const selectedPreset = (branding.palette_preset in PALETTE_PRESETS
    ? branding.palette_preset
    : "violet") as PalettePresetKey;
  const selectedPresetName = PALETTE_PRESETS[selectedPreset]?.name ?? PALETTE_PRESETS.violet.name;

  const previewCardClass = cn(
    "relative overflow-hidden p-6 pb-16 shadow-lg shadow-black/10 transition-all duration-300",
    CORNER_CLASS_MAP[branding.corner_style] ?? CORNER_CLASS_MAP.rounded,
    SURFACE_CLASS_MAP[branding.surface_style] ?? SURFACE_CLASS_MAP.glass
  );
  const previewCardStyle: CSSProperties = {
    borderColor: accentSoft,
    ...(backgroundUrl
      ? {
          backgroundImage: `linear-gradient(180deg, rgba(14,15,17,0.76), rgba(13,14,16,0.9)), url(${backgroundUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }
      : {}),
  };

  const fullName =
    typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "";
  const displayName = fullName || user.email?.split("@")[0] || "Account";

  const paletteOptions = Object.entries(PALETTE_PRESETS) as Array<
    [PalettePresetKey, { accent: string; name: string }]
  >;

  return (
    <div className="space-y-8">
      <AccountHeaderCard
        badgeIcon={<Sparkles className="mr-1.5 h-3.5 w-3.5" />}
        badgeLabel="Customization"
        heading={displayName}
        description="Bring your liveblogs to life with reusable themes, brand palettes, and premium assets that stay in sync across embeds."
        actions={
          <Button asChild variant="outline" size="sm" className="border-border/70">
            <Link href="/dashboard">
              Back to dashboard
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        }
        successMessage={successMessage}
        errorMessage={errorMessage}
      />

      <AccountSectionTabs />

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
                <Select id="palettePreset" name="palettePreset" defaultValue={branding.palette_preset}>
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
                <Select id="cornerStyle" name="cornerStyle" defaultValue={branding.corner_style}>
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
                <Select id="surfaceStyle" name="surfaceStyle" defaultValue={branding.surface_style}>
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
                  defaultValue={branding.accent_color ?? ""}
                />
                <p className="text-xs text-muted-foreground">
                  Provide a hex value (e.g. #0EA5E9) to override the {selectedPresetName} preset. Leave blank to stick with the preset accent.
                </p>
              </div>
              <Button type="submit" size="sm" className="w-fit">
                Save theme
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-background/50">
          <CardHeader>
            <Badge variant="outline" className="mb-4 w-fit">
              Preview
            </Badge>
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
              {branding.watermark ? (
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
              <Badge variant="outline" className="mb-4 w-fit">
                Brand assets
              </Badge>
              {!canUsePremiumThemes ? (
                <Badge variant="muted" className="mb-4 border border-primary/40 bg-primary/10 text-primary">
                  Pro
                </Badge>
              ) : null}
            </div>
            <CardTitle className="text-2xl">Logos &amp; backgrounds</CardTitle>
            <CardDescription className="text-base">
              Store artwork once and we&apos;ll thread it through embeds, newsletters, and share cards automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {canUsePremiumThemes ? (
              <form action={updateBrandAssets} className="space-y-5" aria-label="Premium branding settings">
                <BrandAssetUploader
                  accountId={branding.account_id}
                  name="logoPath"
                  label="Primary logo"
                  initialPath={branding.logo_path}
                  placeholder={`brand-assets/${branding.account_id || "account-id"}/logo.svg`}
                  description="Prefer an SVG with a transparent background for the sharpest display across embeds."
                  helperText="Supported formats: SVG, PNG, JPG, WebP (max 2MB)."
                  maxSizeMB={2}
                  previewAspect="square"
                />
                <BrandAssetUploader
                  accountId={branding.account_id}
                  name="backgroundPath"
                  label="Embed background"
                  initialPath={branding.background_path}
                  placeholder={`brand-assets/${branding.account_id || "account-id"}/background.jpg`}
                  description="Large format imagery frames the entire embed. Opt for subtle gradients or textures."
                  helperText="Supported formats: PNG, JPG, WebP (max 6MB). Recommended size: 1920×1080."
                  maxSizeMB={6}
                  previewAspect="wide"
                />
                <p className="text-xs text-muted-foreground">
                  Assets are stored in <code>brand-assets/{branding.account_id}</code>. Reuse paths across liveblogs or swap them out per event as needed.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="watermark">Watermark text</Label>
                  <Input
                    id="watermark"
                    name="watermark"
                    placeholder="Presented by Acme FC"
                    defaultValue={branding.watermark ?? ""}
                  />
                  <p className="text-xs text-muted-foreground">
                    Appears in the lower frame of embeds and can be overridden per liveblog soon.
                  </p>
                </div>
                <Button type="submit" size="sm" className="w-fit">
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
              <Badge variant="outline" className="mb-4 w-fit">
                Status
              </Badge>
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
                      {branding.logo_path ? <code>{branding.logo_path}</code> : "Not set"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground/80">Background</dt>
                    <dd className="text-right text-foreground/90">
                      {branding.background_path ? <code>{branding.background_path}</code> : "Not set"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground/80">Watermark</dt>
                    <dd className="text-right text-foreground/90">{branding.watermark ?? "Not set"}</dd>
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
