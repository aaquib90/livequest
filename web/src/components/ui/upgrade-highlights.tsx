import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type UpgradeHighlightsProps = {
  className?: string;
  items: readonly string[];
};

export function UpgradeHighlights({ className, items }: UpgradeHighlightsProps) {
  return (
    <section
      aria-labelledby="upgrade-highlights-heading"
      className={cn(
        "rounded-2xl border border-border/70 bg-card px-5 py-6 shadow-sm",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground" id="upgrade-highlights-heading">
        <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        Upgrade highlights
      </div>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-3">
            <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-xs font-semibold text-primary">
              {String.fromCharCode(8226)}
            </span>
            <p className="text-sm text-foreground/90">{item}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
