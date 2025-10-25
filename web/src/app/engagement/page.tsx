import Link from "next/link";
import { BarChart3, Sparkles, MessageCircle, Share2, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

const heroPoints = [
  "Launch Hot Take meters, Caption This prompts, and more in seconds",
  "Collect votes or submissions without forcing viewers to log in",
  "Share polished standalone links or embed snippets everywhere your fans hang out",
];

const widgetHighlights = [
  {
    title: "Hot Take Meter",
    description:
      "Capture sentiment with a 0–100 slider, deduplicate votes, and view real-time averages and distribution charts.",
    icon: BarChart3,
  },
  {
    title: "Caption This",
    description:
      "Crowdsource witty captions with built-in moderation, approvals, and share-ready embeds for social recaps.",
    icon: MessageCircle,
  },
  {
    title: "Share-anywhere embeds",
    description:
      "Each widget is instantly deployable via a clean link or drop-in snippet, styled with your brand accents.",
    icon: Share2,
  },
];

const workflow = [
  {
    label: "Create",
    copy: "Spin up a widget from the dashboard, set a name, and link it to a liveblog if you want cross-promotion.",
  },
  {
    label: "Share",
    copy: "Copy the standalone URL for quick social drops or embed the snippet into any CMS, page builder, or newsletter.",
  },
  {
    label: "Moderate & report",
    copy: "Approve submissions, pause collection, or reset votes. Export stats to recap engagement back to sponsors or editors.",
  },
];

const trustPoints = [
  "Widgets respect your brand palette automatically",
  "RLS-secured moderation keeps spam at bay",
  "Every CTA funnels towards your live coverage or membership flows",
];

export default function EngagementMarketingPage() {
  return (
    <div className="space-y-24">
      <section className="relative overflow-hidden rounded-[36px] border border-border/60 bg-[radial-gradient(circle_at_top,_rgba(192,132,252,0.18),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(59,130,246,0.25),_transparent_60%),rgba(24,24,27,0.85)] px-6 py-16 shadow-[0_24px_70px_-30px_rgba(15,23,42,0.65)] sm:px-12 sm:py-20 lg:px-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle,_rgba(15,23,42,0.35),_transparent_70%)]" />
        <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center text-center">
          <Badge variant="muted" className="mb-6 uppercase tracking-[0.35em]">
            Engagement suite
          </Badge>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Turn viewers into contributors in seconds.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
            Hot Take meters, Caption This prompts, and more—ready to share via clean links or embeddable snippets that inherit your brand.
          </p>
          <div className="mt-8 space-y-2 text-sm text-muted-foreground">
            {heroPoints.map((point) => (
              <div key={point} className="flex items-center justify-center gap-2">
                <Sparkles className="h-4 w-4 text-secondary" />
                <span>{point}</span>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="px-8">
              <Link href="/dashboard/engagement">Manage engagement</Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="border border-border/60 bg-background/30 px-7 backdrop-blur">
              <Link href="/signin?redirect=%2Fdashboard%2Fengagement">Sign in to launch</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge variant="outline" className="mb-4 uppercase tracking-[0.32em]">
              Widgets
            </Badge>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Built-in formats fans love.
            </h2>
          </div>
          <p className="max-w-xl text-base text-muted-foreground">
            Pick a format, drop it into your channels, and watch participation roll in. Everything inherits your branding, supports moderation, and ships with ready-to-share links.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {widgetHighlights.map((item) => (
            <Card key={item.title} className="border-border/70 bg-background/60">
              <CardHeader className="flex flex-col gap-4">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/40 text-secondary-foreground shadow-[0_14px_30px_-20px_rgba(161,161,170,0.9)]">
                  <item.icon className="h-5 w-5" />
                </span>
                <CardTitle className="text-xl">{item.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed text-muted-foreground/90">
                  {item.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge variant="outline" className="mb-4 uppercase tracking-[0.32em]">
              Workflow
            </Badge>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              From idea to live widget in under a minute.
            </h2>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {workflow.map((step) => (
            <Card key={step.label} className="border-border/70 bg-background/60">
              <CardHeader className="space-y-3">
                <Badge variant="muted" className="w-fit uppercase tracking-[0.32em]">{step.label}</Badge>
                <CardDescription className="text-sm leading-relaxed text-foreground/90">
                  {step.copy}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge variant="outline" className="mb-4 uppercase tracking-[0.32em]">
              Why it sticks
            </Badge>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Engagement that respects your brand and audience.
            </h2>
          </div>
        </div>
        <Card className="border-border/70 bg-background/60">
          <CardContent className="flex flex-col gap-4 p-6 text-sm text-muted-foreground/90 sm:flex-row sm:items-center sm:justify-between">
            {trustPoints.map((point) => (
              <div key={point} className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-secondary" />
                <span>{point}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="rounded-3xl border border-border/60 bg-background/70 p-10 shadow-[0_24px_70px_-30px_rgba(15,23,42,0.55)] text-center">
        <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">
          Ready to fire up engagement?
        </h2>
        <p className="mt-3 text-base text-muted-foreground">
          Launch a widget right now or invite your team to experiment with our free tier.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="px-8">
            <Link href="/dashboard/engagement">Create a widget</Link>
          </Button>
          <Button asChild size="lg" variant="ghost" className="border border-border/60 bg-background/40 px-7 backdrop-blur">
            <Link href="/signup">Start free</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
