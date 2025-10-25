"use client";
import { useEffect, useMemo, useRef, useState, type FocusEvent, type MouseEvent } from "react";
import Link from "next/link";
import { CircleUserRound, Radio, Trophy, Sparkle, ChevronDown } from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/browserClient";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Chrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMinimal = pathname?.startsWith("/embed") || pathname?.startsWith("/widgets");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [productsOpen, setProductsOpen] = useState(false);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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

  if (isMinimal) {
    return <main className="flex-1 py-0">{children}</main>;
  }

  return (
    <>
      <header className="sticky top-4 z-50">
        <div className="flex items-center justify-between gap-4 rounded-3xl border border-border/60 bg-background/80 px-4 py-3 shadow-[0_0_60px_rgba(9,9,11,0.45)] backdrop-blur-md sm:px-6">
          <Link href="/" className="group flex items-center">
            <span className="relative inline-flex">
              <img
                src="https://yjcoinrerbshwmkmlytx.supabase.co/storage/v1/object/public/media/Logo/Copy%20of%20Livequest.svg"
                alt="Livequest Studio"
                className="block h-9 w-auto object-contain transition-transform duration-300 group-hover:scale-[1.02] dark:hidden sm:h-11"
              />
              <img
                src="https://yjcoinrerbshwmkmlytx.supabase.co/storage/v1/object/public/media/Logo/Livequest%20(1).svg"
                alt="Livequest Studio"
                className="hidden h-9 w-auto object-contain transition-transform duration-300 group-hover:scale-[1.02] dark:block sm:h-11"
              />
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            <div
              className="relative"
              onMouseEnter={() => {
                if (closeTimeoutRef.current) {
                  clearTimeout(closeTimeoutRef.current);
                  closeTimeoutRef.current = null;
                }
                setProductsOpen(true);
              }}
              onMouseLeave={(event: MouseEvent<HTMLDivElement>) => {
                const currentTarget = event.currentTarget;
                closeTimeoutRef.current = setTimeout(() => {
                  if (!currentTarget.contains(document.activeElement)) {
                    setProductsOpen(false);
                  }
                }, 200);
              }}
              onFocus={() => {
                if (closeTimeoutRef.current) {
                  clearTimeout(closeTimeoutRef.current);
                  closeTimeoutRef.current = null;
                }
                setProductsOpen(true);
              }}
              onBlur={(event: FocusEvent<HTMLDivElement>) => {
                if (closeTimeoutRef.current) {
                  clearTimeout(closeTimeoutRef.current);
                  closeTimeoutRef.current = null;
                }
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  closeTimeoutRef.current = setTimeout(() => {
                    setProductsOpen(false);
                  }, 200);
                }
              }}
            >
              <button
                type="button"
                className="inline-flex items-center gap-1 transition-colors hover:text-foreground focus:outline-none"
                aria-haspopup="true"
                aria-expanded={productsOpen}
              >
                Products
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              <div
                className={`absolute left-0 top-full z-50 mt-3 min-w-[220px] rounded-2xl border border-border/60 bg-background/95 p-3 text-sm text-muted-foreground shadow-[0_18px_40px_-24px_rgba(10,10,15,0.75)] backdrop-blur-lg transition-all duration-150 ${
                  productsOpen ? "block opacity-100" : "hidden opacity-0"
                }`}
              >
                <div className="flex flex-col gap-1">
                  <Link
                    href="/liveblog"
                    className="rounded-xl px-3 py-2 transition-colors hover:bg-background/80 hover:text-foreground"
                  >
                    Liveblog Studio
                  </Link>
                  <Link
                    href="/engagement"
                    className="rounded-xl px-3 py-2 transition-colors hover:bg-background/80 hover:text-foreground"
                  >
                    Engagement Widgets
                  </Link>
                </div>
              </div>
            </div>
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
            <Link
              href="/dashboard/engagement"
              className="inline-flex items-center gap-2 transition-colors hover:text-foreground"
            >
              <Sparkle className="h-3.5 w-3.5 text-zinc-400" />
              Engagement
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle className="hidden sm:inline-flex" />
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
            <ThemeToggle className="sm:hidden" />
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
            <Link href="/docs" className="transition-colors hover:text-foreground">Documentation</Link>
            <button
              type="button"
              onClick={() => window.Intercom?.("show")}
              className="text-left transition-colors hover:text-foreground"
            >
              Contact
            </button>
          </div>
        </div>
      </footer>
    </>
  );
}
