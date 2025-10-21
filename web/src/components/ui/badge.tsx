import * as React from "react";

import { cn } from "@/lib/utils";

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "outline" | "muted";
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium tracking-wide uppercase",
        variant === "default" &&
          "border-transparent bg-secondary/60 text-secondary-foreground shadow-[0_10px_30px_-18px_rgba(161,161,170,0.7)] backdrop-blur",
        variant === "outline" &&
          "border-border/70 bg-transparent text-muted-foreground",
        variant === "muted" && "border-transparent bg-muted text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}
