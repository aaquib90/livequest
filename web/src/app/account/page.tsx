import Link from "next/link";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowUpRight, BarChart3, CircleUserRound, LogOut, Sparkles } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import type { AccountFeatures } from "@/lib/billing/types";
import AccountInsightsShell from "./components/AccountInsightsShell";
import AccountSectionTabs from "./components/AccountSectionTabs";
import { AccountHeaderCard } from "./components/AccountHeaderCard";
import SubscriptionPlanShell from "./components/SubscriptionPlanShell";
import { updateProfileAction, signOutAction } from "./actions";

export const runtime = "edge";

type AccountPageSearchParams = {
  status?: string;
  error?: string;
};

type AccountOverviewResponse = {
  user: {
    id: string;
    email: string | null;
    created_at: string;
    last_sign_in_at: string | null;
    user_metadata: Record<string, any>;
  };
  features: AccountFeatures | null;
  liveblogsThisMonth: number;
};

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<AccountPageSearchParams>;
}) {
  const sp = await searchParams;

  const headerList = headers();
  const cookieHeader = cookies().toString();
  const host = headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? "https";

  const overviewRes = await fetch(`${protocol}://${host}/api/internal/overview?target=account`, {
    headers: {
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
    cache: "no-store",
  });

  if (overviewRes.status === 401) {
    return redirect("/signin");
  }
  if (!overviewRes.ok) {
    throw new Error(`Failed to load account overview (${overviewRes.status})`);
  }

  const { user, features, liveblogsThisMonth } = (await overviewRes.json()) as AccountOverviewResponse;

  const memberSince = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date(user.created_at));
  const lastSignedIn = user.last_sign_in_at
    ? dateTimeFormatter.format(new Date(user.last_sign_in_at))
    : "—";

  const fullName =
    typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "";
  const organisation =
    typeof user.user_metadata?.organisation === "string"
      ? user.user_metadata.organisation
      : "";
  const bio = typeof user.user_metadata?.bio === "string" ? user.user_metadata.bio : "";

  const displayName = fullName || user.email?.split("@")[0] || "Account";

  const successMessage =
    sp?.status === "profile-saved"
      ? "Profile preferences updated successfully."
      : null;
  const errorMessage = sp?.error ?? null;

  return (
    <div className="space-y-8">
      <AccountHeaderCard
        badgeIcon={<CircleUserRound className="mr-1.5 h-3.5 w-3.5" />}
        heading={displayName}
        description="Manage your Livequest Studio identity, global analytics, and partner tooling from one place."
        actions={
          <>
            <Button asChild variant="outline" size="sm" className="border-border/70">
              <Link href="/dashboard">
                Back to dashboard
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="sm" className="bg-primary/80 text-primary-foreground">
              <Link href="/account/analytics">
                Open analytics
                <BarChart3 className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <form action={signOutAction}>
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Button>
            </form>
          </>
        }
        successMessage={successMessage}
        errorMessage={errorMessage}
      />

      <AccountSectionTabs />

      <SubscriptionPlanShell features={features} monthlyUsage={liveblogsThisMonth || 0} />

      <AccountInsightsShell />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Card className="border-border/70 bg-background/50">
          <CardHeader>
            <Badge variant="outline" className="mb-4 w-fit">
              Profile
            </Badge>
            <CardTitle className="text-2xl">Personal details</CardTitle>
            <CardDescription className="text-base">
              Update how your byline appears across liveblogs and newsletters. Changes apply
              immediately.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateProfileAction} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  defaultValue={fullName}
                  placeholder="Your public byline"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="organisation">Organisation</Label>
                <Input
                  id="organisation"
                  name="organisation"
                  defaultValue={organisation}
                  placeholder="Publication, agency, or brand"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Signature</Label>
                <Textarea
                  id="bio"
                  name="bio"
                  defaultValue={bio}
                  placeholder="Short sign-off that appears in newsletters or embeds."
                  className="min-h-[120px]"
                />
              </div>
              <div className="flex flex-wrap justify-between gap-3">
                <div className="text-xs text-muted-foreground">
                  Member since {memberSince}. Last signed in {lastSignedIn}.
                </div>
                <Button type="submit" className="px-6">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Save profile
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-background/50">
          <CardHeader>
            <Badge variant="outline" className="mb-4 w-fit">
              Security
            </Badge>
            <CardTitle className="text-2xl">Account security</CardTitle>
            <CardDescription className="text-base">
              Manage how you access Livequest Studio. Contact support for newsroom-wide SSO.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">Email address</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
                <Badge variant="outline" className="border-border/60 bg-transparent">
                  Primary
                </Badge>
              </div>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">Two-factor authentication</p>
                  <p className="text-sm text-muted-foreground">
                    Enable via the matches dashboard for newsroom-wide access policies.
                  </p>
                </div>
                <Button asChild size="sm" variant="ghost" className="text-xs">
                  <Link href="/matches">
                    Manage in Matches
                    <ArrowUpRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">Reset password</p>
                  <p className="text-sm text-muted-foreground">
                    Password changes are handled through secure email links.
                  </p>
                </div>
                <Button asChild size="sm" variant="outline" className="border-border/60">
                  <Link href="/signin?reset=1">Send reset email</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
