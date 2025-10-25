import Link from "next/link";
import { CalendarClock, PenSquare, BadgeDollarSign, Share2, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

const heroBullets = [
  "Compose blazing-fast updates with autosave and keyboard shortcuts",
  "Trigger Discord, push, and sponsor automations when you publish",
  "Style embeds automatically with your brand palette and typography",
];

const studioHighlights = [
  {
    title: "Control room ready",
    description:
      "Folders, statuses, scheduling, and editor invites keep the team in sync during the busiest news cycles.",
    icon: CalendarClock,
  },
  {
    title: "Sponsor friendly",
    description:
      "Drop sponsor slots, flight windows, and affiliate CTAs directly inside the composer with live analytics.",
    icon: BadgeDollarSign,
  },
  {
    title: "Instant embeds",
    description:
      "Every liveblog ships with a responsive embed and fully branded standalone page—no CSS hacking required.",
    icon: Share2,
  },
];

const workflow = [
  {
    title: "Prep the briefing",
    copy: "Spin up a liveblog, add folders & privacy, pre-load templates, and attach sponsor creatives before the first whistle.",
  },
  {
    title: "Publish with polish",
    copy: "Drop in updates, media, and widgets from one composer. Trigger Discord, push, and sponsor automations on publish.",
  },
  {
    title: "Report instantly",
    copy: "Account-wide analytics track reach, starts, referrers, and sponsor CTR so every stakeholder stays informed.",
  },
];

const trustItems = [
  "Embeds inherit your fonts and palette automatically",
  "Granular access control keeps private coverage locked down",
  "Exporter API and webhooks keep your downstream tools in sync",
];

export default function LiveblogMarketingPage() {
  return (
    <div className="space-y-24">
      <section className="relative overflow-hidden rounded-[36px] border border-border/60 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.22),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(14,165,233,0.3),_transparent_60%),rgba(23,23,26,0.9)] px-6 py-16 shadow-[0_24px_70px_-32px_rgba(14,116,179,0.6)] sm:px-12 sm:py-20 lg:px-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle,_rgba(14,116,179,0.18),_transparent_70%)]" />
        <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center text-center">
          <Badge variant="muted" className="mb-6 uppercase tracking-[0.35em]">
            Liveblog studio
          </Badge>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            The control room for real-time storytellers.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
            Compose, publish, monetise, and analyse every moment from one workspace. No plugins, scripts, or patchwork dashboards required.
          </p>
          <div className="mt-8 space-y-2 text-sm text-muted-foreground">
            {heroBullets.map((point) => (
              <div key={point} className="flex items-center justify-center gap-2">
                <PenSquare className="h-4 w-4 text-secondary" />
                <span>{point}</span>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="px-8">
              <Link href="/dashboard">Launch studio</Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="border border-border/60 bg-background/30 px-7 backdrop-blur">
              <Link href="/signin?redirect=%2Fdashboard">Sign in to start</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge variant="outline" className="mb-4 uppercase tracking-[0.32em]">
              Studio highlights
            </Badge>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Everything you need to orchestrate live coverage.
            </h2>
          </div>
          <p className="max-w-xl text-base text-muted-foreground">
            Livequest Studio keeps your writers, producers, and partners aligned while delivering pixel-perfect embeds for every platform.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {studioHighlights.map((item) => (
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
              A newsroom-ready playbook in three steps.
            </h2>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {workflow.map((step) => (
            <Card key={step.title} className="border-border/70 bg-background/60">
              <CardHeader className="space-y-3">
                <Badge variant="muted" className="w-fit uppercase tracking-[0.32em]">{step.title}</Badge>
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
              Built for trust
            </Badge>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Why teams rely on Livequest Studio.
            </h2>
          </div>
        </div>
        <Card className="border-border/70 bg-background/60">
          <CardContent className="flex flex-col gap-4 p-6 text-sm text-muted-foreground/90 sm:flex-row sm:items-center sm:justify-between">
            {trustItems.map((point) => (
              <div key={point} className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-secondary" />
                <span>{point}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="rounded-3xl border border-border/60 bg-background/70 p-10 shadow-[0_24px_70px_-30px_rgba(14,116,179,0.55)] text-center">
        <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">
          Cover your next live moment with ease.
        </h2>
        <p className="mt-3 text-base text-muted-foreground">
          Fire up the studio and invite collaborators in minutes.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="px-8">
            <Link href="/dashboard">Launch studio</Link>
          </Button>
          <Button asChild size="lg" variant="ghost" className="border border-border/60 bg-background/40 px-7 backdrop-blur">
            <Link href="/signup">Start free</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
