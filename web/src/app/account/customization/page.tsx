import Link from "next/link";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowUpRight, Lock, Sparkles } from "lucide-react";

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
import { UpgradeHighlights } from "@/components/ui/upgrade-highlights";
import type { AccountFeatures } from "@/lib/billing/types";
import { PALETTE_PRESETS } from "@/lib/branding/constants";
import { normaliseBranding, resolveAccentColor } from "@/lib/branding/utils";
import type { AccountBranding, PalettePresetKey } from "@/lib/branding/types";

import AccountSectionTabs from "../components/AccountSectionTabs";
import { AccountHeaderCard } from "../components/AccountHeaderCard";
import BrandAssetUploader from "./components/BrandAssetUploader";
import { ReactionConfigurator } from "./components/ReactionConfigurator";
import { ThemeConfigurator } from "./components/ThemeConfigurator";
import { updateBrandAssets } from "./actions";

export const runtime = "edge";

type AccountCustomizationSearchParams = {
  status?: string;
  error?: string;
};

type AccountCustomizationResponse = {
  user: {
    id: string;
    email: string | null;
    user_metadata: Record<string, any>;
  };
  features: AccountFeatures | null;
  branding: AccountBranding;
};

const statusMessages: Record<string, string> = {
  "theme-saved": "Theme preferences updated successfully.",
  "brand-saved": "Brand assets saved. These settings now flow through embeds and dashboards.",
  "reactions-saved": "Reactions updated. New emoji and emotes will appear on embeds instantly.",
};

const errorMessages: Record<string, string> = {
  "theme-save": "We couldn't update your theme just yet. Please try again.",
  "brand-save": "Brand assets weren't saved. Double-check the paths and retry.",
  "premium-required": "Upgrade to a paid plan to unlock logos, backgrounds, and watermarks.",
  "reactions-save": "We couldn't update your reactions just yet. Please try again.",
  "reactions-invalid": "Those reactions didn't look quite right. Keep labels short, pick emoji, or upload an image.",
  "reactions-nsfw": "One of the emotes tripped our safety checks. Please swap it for something SFW.",
};

export default async function AccountCustomizationPage({
  searchParams,
}: {
  searchParams: Promise<AccountCustomizationSearchParams>;
}) {
  const sp = await searchParams;
  const successMessage = sp?.status ? statusMessages[sp.status] ?? null : null;
  const errorMessage = sp?.error ? errorMessages[sp.error] ?? "Something went wrong. Please try again." : null;

  const headerList = headers();
  const cookieHeader = cookies().toString();
  const host = headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? "https";

  const dataRes = await fetch(`${protocol}://${host}/api/internal/overview?target=account-customization`, {
    headers: {
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
    cache: "no-store",
  });

  if (dataRes.status === 401) {
    return redirect("/signin");
  }
  if (!dataRes.ok) {
    throw new Error(`Failed to load customization data (${dataRes.status})`);
  }

  const { user, features, branding: brandingPayload } = (await dataRes.json()) as AccountCustomizationResponse;
  const canUsePremiumThemes = Boolean(features?.can_use_premium_themes);

  const resolvedBranding = normaliseBranding(brandingPayload ?? undefined);
  const branding = resolvedBranding.account_id ? resolvedBranding : { ...resolvedBranding, account_id: user.id };
  const accentColor = resolveAccentColor(branding);

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
  const fullName =
    typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "";
  const displayName = fullName || user.email?.split("@")[0] || "Account";

  const paletteOptions = Object.entries(PALETTE_PRESETS) as Array<
    [PalettePresetKey, { accent: string; name: string }]
  >;

  return (
    <div className="space-y-8">
      <AccountSectionTabs />

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

      <ThemeConfigurator
        branding={branding}
        paletteOptions={paletteOptions}
        logoUrl={logoUrl}
        backgroundUrl={backgroundUrl}
      />

      <ReactionConfigurator
        accountId={branding.account_id}
        accentColor={accentColor}
        initialReactions={branding.reactions}
      />

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
