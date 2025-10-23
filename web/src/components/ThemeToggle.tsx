"use client";

import { MoonStar, SunMedium } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme, isReady } = useTheme();
  const isLight = theme === "light";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
      onClick={toggleTheme}
      className={cn(
        "relative h-9 w-9 rounded-xl border border-border/70 bg-background/60 text-muted-foreground transition hover:border-border hover:text-foreground",
        className,
      )}
      disabled={!isReady}
    >
      <SunMedium
        className={cn(
          "h-4 w-4 transition-opacity duration-200",
          isLight ? "opacity-100" : "opacity-0 absolute",
        )}
      />
      <MoonStar
        className={cn(
          "h-4 w-4 transition-opacity duration-200",
          isLight ? "opacity-0 absolute" : "opacity-100",
        )}
      />
      <span className="sr-only">{isLight ? "Disable light mode" : "Enable light mode"}</span>
    </Button>
  );
}
