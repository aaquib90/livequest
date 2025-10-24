"use client";

import Link from "next/link";
import { ArrowUpRight, Zap } from "lucide-react";

const docsOverview = [
  {
    title: "Embeds quickstart",
    description:
      "Drop the Livequest script into any site and learn how feed, SSE, analytics, and sponsor endpoints fit together.",
    icon: Zap,
    href: "/docs/embeds",
  },
];

export default function DocsIndexPage() {
  return (
    <div className="space-y-12">
      <section className="space-y-6">
        <div className="inline-flex items-center rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs uppercase tracking-wide text-muted-foreground">
          Documentation
        </div>
        <div className="space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Livequest Studio knowledge base
          </h1>
          <p className="max-w-3xl text-base text-muted-foreground">
            Get up and running quickly with our embeds, push notifications, and operational
            workflows. Everything below lives alongside the product so it never drifts from the
            actual implementation.
          </p>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {docsOverview.map((doc) => {
          const Icon = doc.icon;
          return (
            <article
              key={doc.href}
              className="group flex h-full flex-col justify-between rounded-2xl border border-border/70 bg-background/60 p-5 transition-all hover:border-border hover:bg-background/80"
            >
              <div className="space-y-4">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary/50 text-secondary-foreground shadow-[0_10px_25px_-18px_rgba(161,161,170,0.9)]">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-foreground">{doc.title}</h2>
                  <p className="text-sm text-muted-foreground">{doc.description}</p>
                </div>
              </div>
              <Link
                href={doc.href}
                className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary/80"
              >
                View guide
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </article>
          );
        })}
      </section>

      <section className="space-y-4 rounded-2xl border border-border/60 bg-background/60 p-6">
        <h2 className="text-lg font-semibold text-foreground">Need something else?</h2>
        <p className="text-sm text-muted-foreground">
          We&apos;re expanding this library as the product grows. If you have a specific workflow or
          integration you&apos;d like documented, drop us a note at{" "}
          <Link href="mailto:hello@livequest.app" className="text-primary hover:text-primary/80">
            hello@livequest.app
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
