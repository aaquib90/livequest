"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CircleUserRound, Radio, Trophy } from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/browserClient";

export default function Chrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isEmbed = pathname?.startsWith("/embed");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let active = true;

    async function hydrateAuth() {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      setIsAuthenticated(Boolean(data.user));
    }

    hydrateAuth();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setIsAuthenticated(Boolean(session?.user));
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  if (isEmbed) {
    return <main className="flex-1 py-0">{children}</main>;
  }

  return (
    <>
      <header className="sticky top-4 z-50">
        <div className="flex items-center justify-between gap-4 rounded-3xl border border-border/60 bg-background/80 px-4 py-3 shadow-[0_0_60px_rgba(9,9,11,0.45)] backdrop-blur-md sm:px-6">
          <Link href="/" className="group flex items-center gap-3">
            <span className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-border/70 bg-zinc-950/80 shadow-[inset_0_0_0_1px_rgba(244,244,245,0.04)] transition-all group-hover:shadow-[0_0_25px_rgba(161,161,170,0.18)]">
              <img
                src="https://yjcoinrerbshwmkmlytx.supabase.co/storage/v1/object/public/media/Logo/Livequest%20(1).svg"
                alt="Livequest logo"
                className="h-full w-full object-contain p-1.5 transition-transform duration-300 group-hover:scale-105"
              />
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-zinc-900/0 via-zinc-900/0 to-zinc-100/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </span>
            <div className="flex flex-col">
              <span className="font-semibold tracking-tight text-lg sm:text-xl">Livequest</span>
              <span className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Studio</span>
            </div>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            <Link href="/#features" className="transition-colors hover:text-foreground">
              Features
            </Link>
            <Link href="/#workflow" className="transition-colors hover:text-foreground">
              Workflow
            </Link>
            <Link href="/#pricing" className="transition-colors hover:text-foreground">
              Pricing
            </Link>
            <Link href="/#faq" className="transition-colors hover:text-foreground">
              FAQ
            </Link>
            <Link
              href="/dashboard/matches"
              className="inline-flex items-center gap-2 transition-colors hover:text-foreground"
            >
              <Trophy className="h-3.5 w-3.5 text-zinc-400" />
              Matches
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            {isAuthenticated === false ? (
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="hidden sm:flex text-sm"
              >
                <Link href="/signin">Sign in</Link>
              </Button>
            ) : null}
            {isAuthenticated ? (
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="hidden sm:flex text-sm"
              >
                <Link href="/account">
                  <CircleUserRound className="mr-2 h-4 w-4" />
                  Account
                </Link>
              </Button>
            ) : null}
            <Button asChild size="sm" className="text-sm">
              <Link href="/dashboard"><Radio className="mr-2 h-4 w-4" />Go to dashboard</Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 py-16 sm:py-20">{children}</main>
      <footer className="mt-auto border-t border-border/60 py-8">
        <div className="flex flex-col gap-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Livequest. Crafted for live storytellers.</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/privacy" className="transition-colors hover:text-foreground">Privacy</Link>
            <Link href="/terms" className="transition-colors hover:text-foreground">Terms</Link>
            <Link href="mailto:hello@livequest.app" className="transition-colors hover:text-foreground">Contact</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
