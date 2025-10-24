import type { ReactNode } from "react";

import { AlertCircle, BadgeCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type AccountHeaderCardProps = {
  badgeLabel?: string;
  badgeIcon?: ReactNode;
  heading: string;
  description: string;
  actions?: ReactNode;
  successMessage?: string | null;
  errorMessage?: string | null;
  className?: string;
  children?: ReactNode;
};

export function AccountHeaderCard({
  badgeLabel = "Account",
  badgeIcon = null,
  heading,
  description,
  actions,
  successMessage,
  errorMessage,
  className,
  children,
}: AccountHeaderCardProps) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-border/60 bg-gradient-to-br from-zinc-900/70 via-zinc-900/30 to-zinc-900/10 px-8 py-12 shadow-[0_20px_40px_-25px_rgba(9,9,11,0.75)]",
        className
      )}
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-4">
          {badgeLabel ? (
            <Badge variant="muted" className="w-fit border-border/40">
              {badgeIcon}
              {badgeLabel}
            </Badge>
          ) : null}
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{heading}</h1>
            <p className="max-w-2xl text-base text-muted-foreground">{description}</p>
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {successMessage ? (
        <div className="mt-8 flex w-full items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          <BadgeCheck className="h-4 w-4" />
          <p>{successMessage}</p>
        </div>
      ) : null}
      {errorMessage ? (
        <div
          className="mt-8 flex w-full items-center gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground/90"
          role="alert"
        >
          <AlertCircle className="h-4 w-4" />
          <p>{errorMessage}</p>
        </div>
      ) : null}
      {children ? <div className="mt-8">{children}</div> : null}
    </div>
  );
}
