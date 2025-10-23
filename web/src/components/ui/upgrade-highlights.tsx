import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type UpgradeHighlightsProps = {
  className?: string;
  items: readonly string[];
};

export function UpgradeHighlights({ className, items }: UpgradeHighlightsProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-zinc-900/80 via-zinc-900/50 to-zinc-800/40 p-5 shadow-[0_25px_80px_-40px_rgba(15,15,17,0.8)]",
        className,
      )}
    >
      <div className="pointer-events-none absolute -top-28 right-0 h-48 w-48 rounded-full bg-primary/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 left-10 h-52 w-52 rounded-full bg-emerald-500/30 blur-3xl" />
      <div className="relative flex flex-col gap-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Upgrade highlights
        </div>
        <ul className="space-y-3 text-sm text-muted-foreground/90">
          {items.map((item) => (
            <li
              key={item}
              className="flex items-start gap-3 rounded-2xl border border-border/40 bg-background/70 px-3 py-2 text-foreground/90 shadow-[inset_0_0_0_1px_rgba(244,244,245,0.04)]"
            >
              <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
