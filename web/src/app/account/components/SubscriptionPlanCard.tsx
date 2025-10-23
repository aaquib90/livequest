"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Loader2, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import type { AccountFeatures } from "@/lib/billing/types";
import { createClient } from "@/lib/supabase/browserClient";

type SubscriptionPlanCardProps = {
  features: AccountFeatures | null;
  monthlyUsage: number;
};

const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/6oU6oG30BdUjdYEfZx1Nu01";

export default function SubscriptionPlanCard({ features, monthlyUsage }: SubscriptionPlanCardProps) {
  const [loading, setLoading] = useState<"portal" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const isPaid = Boolean(features?.is_paid);
  const planName = isPaid ? "Pro" : "Free";
  const monthlyLimit =
    typeof features?.monthly_liveblog_limit === "number"
      ? features.monthly_liveblog_limit
      : null;
  const usageCopy =
    monthlyLimit === null
      ? "Unlimited liveblogs per month"
      : `${monthlyUsage}/${monthlyLimit} liveblogs this month`;
  const renewalDate = features?.current_period_end
    ? new Date(features.current_period_end).toLocaleDateString()
    : null;

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!isMounted) return;
        const email = data.user?.email;
        setUserEmail(typeof email === "string" && email.length ? email : null);
      })
      .catch(() => {
        if (!isMounted) return;
        setUserEmail(null);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  async function openPortal() {
    try {
      setLoading("portal");
      setError(null);
      const res = await fetch("/api/billing/customer-portal", {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.url) {
        throw new Error(json?.error || "Unable to open billing portal");
      }
      window.location.href = String(json.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to open billing portal");
    } finally {
      setLoading(null);
    }
  }

  const upgradeHref = userEmail
    ? `${STRIPE_PAYMENT_LINK}?prefilled_email=${encodeURIComponent(userEmail)}`
    : STRIPE_PAYMENT_LINK;

  return (
    <Card className="border-border/70 bg-background/60">
      <CardHeader className="space-y-4">
        <Badge variant="outline" className="w-fit border-border/50">
          <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
          Subscription
        </Badge>
        <div className="space-y-2">
          <CardTitle className="text-2xl">{planName} plan</CardTitle>
          <CardDescription className="text-base">
            {isPaid
              ? "Manage billing details, invoices, and renewals. Pro unlocks unlimited liveblogs, sponsor tooling, and advanced analytics."
              : "Upgrade to unlock unlimited liveblogs, sponsor management, team roles, and premium analytics."}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Usage</p>
          <p>{usageCopy}</p>
          {renewalDate ? <p>Renews on {renewalDate}</p> : null}
        </div>
        {error ? (
          <div className="rounded-xl border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
            {error}
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          {isPaid ? (
            <Button
              type="button"
              onClick={openPortal}
              disabled={loading === "portal"}
              className="bg-primary text-primary-foreground"
            >
              {loading === "portal" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowUpRight className="mr-2 h-4 w-4" />
              )}
              Manage billing
            </Button>
          ) : (
            <Button asChild className="bg-primary text-primary-foreground">
              <a href={upgradeHref} target="_blank" rel="noopener noreferrer">
                Upgrade to Pro
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          )}
          <Button asChild variant="outline" size="sm" className="border-border/60">
            <a href="https://livequest.app/#pricing" className="inline-flex items-center gap-2">
              See features
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
