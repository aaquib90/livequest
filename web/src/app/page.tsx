import Link from "next/link";
import { ArrowRight, BadgeDollarSign, BarChart3, CalendarClock, PenSquare, Sparkle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/adminClient";

export const revalidate = 1800;

type MarketingMetrics = {
  total_unique_viewers: number;
  total_views: number;
  total_interactions: number;
  sponsor_impressions: number;
  sponsor_clicks: number;
  sponsor_ctr: number;
};

const integerFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});

async function getMarketingMetrics(): Promise<MarketingMetrics> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      total_unique_viewers: 0,
      total_views: 0,
      total_interactions: 0,
      sponsor_impressions: 0,
      sponsor_clicks: 0,
      sponsor_ctr: 0,
    };
  }

  const supabase = createAdminClient();
  try {
    const { data, error } = await supabase.rpc("marketing_metrics").single();
    if (error) throw error;
    return {
      total_unique_viewers: Number(data?.total_unique_viewers ?? 0),
      total_views: Number(data?.total_views ?? 0),
      total_interactions: Number(data?.total_interactions ?? 0),
      sponsor_impressions: Number(data?.sponsor_impressions ?? 0),
      sponsor_clicks: Number(data?.sponsor_clicks ?? 0),
      sponsor_ctr: Number(data?.sponsor_ctr ?? 0),
    };
  } catch (err) {
    console.error("Failed to load marketing metrics", err);
    return {
      total_unique_viewers: 0,
      total_views: 0,
      total_interactions: 0,
      sponsor_impressions: 0,
      sponsor_clicks: 0,
      sponsor_ctr: 0,
    };
  }
}

const audiences = [
  "Newsrooms",
  "Sports clubs",
  "Esports orgs",
  "Campus media",
  "Community leagues",
  "Streamers & creators",
];

const features = [
  {
    title: "Unified liveblog studio",
    description:
      "Run breaking news, match-day updates, or live shows from one workspace with autosave, templating, and scheduling built in.",
    icon: PenSquare,
  },
  {
    title: "Account-wide intelligence",
    description:
      "Spot audience spikes and referrers across every channel so editors, coaches, and community leads stay in sync.",
    icon: BarChart3,
  },
  {
    title: "Monetise every moment",
    description:
      "Manage sponsor slots, flight windows, and creative assets while real-time CTR keeps partners and supporters in the loop.",
    icon: BadgeDollarSign,
  },
];

const workflow = [
  {
    title: "Organise your coverage",
    description:
      "Spin up a liveblog, assign privacy, drop it into a folder, and pre-load templates or sponsor slots before the first whistle.",
    stat: "Folders & statuses",
  },
  {
    title: "Publish with polish",
    description:
      "Compose with keyboard shortcuts, autosave, and inline media while attaching sponsor packages and Discord or push alerts.",
    stat: "Instant delivery",
  },
  {
    title: "Report in one place",
    description:
      "Account analytics highlight reach, starts, referrers, and sponsor CTR so you can debrief every campaign without spreadsheets.",
    stat: "Live analytics",
  },
];

const pricing = [
  {
    name: "Free",
    price: "$0",
    frequency: "per month",
    description:
      "Launch live coverage with core analytics, notifications, and folders. Ideal for creators testing the waters.",
    highlights: [
      "Up to 10 liveblogs each month",
      "Account summary analytics",
      "Discord & push notifications",
      "Community support",
    ],
    cta: "Start free",
    href: "/signup",
  },
  {
    name: "Pro",
    price: "$3.99",
    frequency: "per month",
    description:
      "Unlimited coverage, sponsor tooling, and exportable analytics for teams who live inside the action.",
    highlights: [
      "Unlimited liveblogs & storage",
      "Full sponsor management suite",
      "Editor invites & collaboration",
      "Downloadable analytics & webhooks",
    ],
    cta: "Upgrade to Pro",
    href: "/account?focus=billing",
    featured: true,
  },
];

const faqs = [
  {
    question: "What analytics do we get out of the box?",
    answer:
      "Account insights track active liveblogs, reach, starts, referrers, and sponsor CTR for the last 7/30 days. Drill into any liveblog for per-update performance.",
  },
  {
    question: "How do sponsor slots work?",
    answer:
      "Create reusable sponsor packages with logos, CTAs, flight windows, and affiliate codes. Impressions and clicks are captured automatically across embeds.",
  },
  {
    question: "Can we customise the embed to match our brand?",
    answer:
      "Yes—embeds inherit your typography and palette automatically. For fully bespoke styling, add a small CSS block targeting data-liveblog attributes.",
  },
  {
    question: "Can viewers opt in to notifications?",
    answer:
      "Once you add VAPID keys, embeds ship with a push bell so readers can opt in. Publishing fires notifications automatically, and you can broadcast manually if needed.",
  },
];

export default async function Home() {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://livequest.app").replace(/\/$/, "");
  const logoUrl =
    "https://yjcoinrerbshwmkmlytx.supabase.co/storage/v1/object/public/media/Logo/Livequest%20(500%20x%20500%20px).svg";
  const metrics = await getMarketingMetrics();
  const uniqueViewers = integerFormatter.format(Math.max(metrics.total_unique_viewers, 0));
  const totalViews = integerFormatter.format(Math.max(metrics.total_views, 0));
  const totalInteractions = integerFormatter.format(Math.max(metrics.total_interactions, 0));
  const sponsorCtr = percentFormatter.format(Math.max(metrics.sponsor_ctr, 0));
  const sponsorImpressions = integerFormatter.format(Math.max(metrics.sponsor_impressions, 0));
  const sponsorClicks = integerFormatter.format(Math.max(metrics.sponsor_clicks, 0));
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Livequest Studio",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: siteUrl,
    image: logoUrl,
    description:
      "Livequest Studio helps newsrooms, sports clubs, and creators publish live updates with analytics, sponsorship tooling, and polished embeds.",
    offers: {
      "@type": "Offer",
      price: "0.00",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    publisher: {
      "@type": "Organization",
      name: "Livequest Studio",
      url: siteUrl,
      logo: logoUrl,
    },
    potentialAction: {
      "@type": "JoinAction",
      target: `${siteUrl}/signup`,
      name: "Create a Livequest Studio account",
    },
  };

  return (
    <div className="space-y-24">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <section className="relative overflow-hidden rounded-[36px] border border-border/60 bg-[radial-gradient(circle_at_top_left,_rgba(161,161,170,0.18),_transparent_55%),radial-gradient(circle_at_bottom_right,_rgba(82,82,91,0.2),_transparent_55%),rgba(24,24,27,0.7)] px-6 py-16 shadow-[0_20px_60px_-25px_rgba(9,9,11,0.9)] sm:px-12 sm:py-20 lg:px-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(250,250,250,0.05),_transparent_60%)]" />
        <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center text-center">
          <Badge className="mb-6" variant="muted">
            <Sparkle className="mr-1 h-3.5 w-3.5" />
            Built for storytellers across every arena
          </Badge>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Broadcast every moment with the polish your fans deserve.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
            Livequest Studio unifies rapid-fire coverage, account-wide analytics, and sponsor tooling—whether you&apos;re a newsroom on deadline, a sports club updating supporters, or a streamer running live shows.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="px-8">
              <Link href="/dashboard">
                Launch the studio
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="ghost"
              className="border border-border/60 bg-background/40 px-7 backdrop-blur"
            >
              <Link href="/#workflow">See how it works</Link>
            </Button>
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-2 text-xs text-muted-foreground sm:text-sm">
            {audiences.map((audience) => (
              <span
                key={audience}
                className="inline-flex items-center rounded-full border border-border/60 bg-background/50 px-3 py-1.5 backdrop-blur"
              >
                {audience}
              </span>
            ))}
          </div>
          <div className="mt-12 grid w-full gap-6 text-left sm:grid-cols-3">
            <div className="rounded-2xl border border-border/70 bg-background/60 p-5 backdrop-blur">
              <p className="text-sm text-muted-foreground">Total unique viewers</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{uniqueViewers}</p>
              <p className="text-xs text-muted-foreground">{totalViews} total views recorded</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/60 p-5 backdrop-blur">
              <p className="text-sm text-muted-foreground">Interactions captured</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{totalInteractions}</p>
              <p className="text-xs text-muted-foreground">Starts, reactions, and sponsor activity</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/60 p-5 backdrop-blur">
              <p className="text-sm text-muted-foreground">Sponsor CTR</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{sponsorCtr}</p>
              <p className="text-xs text-muted-foreground">
                {sponsorImpressions} impressions · {sponsorClicks} clicks
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="space-y-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge variant="outline" className="mb-4">
              Features
            </Badge>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Designed for live storytellers
            </h2>
          </div>
          <p className="max-w-xl text-base text-muted-foreground">
            From newsroom-grade publishing to developer-friendly embeds, Livequest
            Studio takes care of the heavy lifting so your team can focus on
            telling unforgettable stories.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title}>
              <CardHeader className="flex flex-col gap-4">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary/50 text-secondary-foreground shadow-[0_10px_25px_-18px_rgba(161,161,170,0.9)]">
                  <feature.icon className="h-5 w-5" />
                </span>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section id="workflow" className="space-y-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge variant="outline" className="mb-4">
              Workflow
            </Badge>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Three steps to a polished liveblog
            </h2>
          </div>
          <p className="max-w-xl text-base text-muted-foreground">
            Launch a new liveblog in less than a minute, then focus on capturing
            the energy of the moment while we handle realtime delivery.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {workflow.map((step, index) => (
            <Card key={step.title} className="relative">
              <CardHeader className="flex min-h-[180px] flex-col gap-5">
                <Badge variant="muted" className="w-fit border-border/40">
                  <CalendarClock className="mr-1.5 h-3.5 w-3.5" />
                  Step {index + 1}
                </Badge>
                <CardTitle className="text-2xl">{step.title}</CardTitle>
                <CardDescription className="text-base">
                  {step.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="rounded-2xl border border-border/60 bg-background/60 px-5 py-4 text-sm text-muted-foreground">
                  {step.stat}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="pricing" className="space-y-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge variant="outline" className="mb-4">
              Pricing
            </Badge>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Start free today — newsroom tools coming soon
            </h2>
          </div>
          <p className="max-w-xl text-base text-muted-foreground">
            Start free with essential tooling, or step up to Pro for unlimited liveblogs, sponsor workflows, and deeper reporting.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {pricing.map((tier) => (
            <Card
              key={tier.name}
              className={[
                tier.featured ? "border-border bg-card/90" : "",
                tier.comingSoon ? "border-dashed border-border/70 bg-background/40" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <CardHeader className="space-y-5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-3xl">{tier.name}</CardTitle>
                  {tier.featured ? (
                    <Badge className="bg-primary text-primary-foreground">
                      Most popular
                    </Badge>
                  ) : tier.comingSoon ? (
                    <Badge variant="outline" className="border-dashed border-border/60 bg-transparent text-muted-foreground">
                      Coming soon
                    </Badge>
                  ) : null}
                </div>
                <CardDescription className="text-base">
                  {tier.description}
                </CardDescription>
                <div>
                  <span className="text-4xl font-semibold text-foreground">
                    {tier.price}
                  </span>{" "}
                  {tier.frequency ? (
                    <span className="text-sm text-muted-foreground">
                      {tier.frequency}
                    </span>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <ul className="space-y-3 text-sm text-muted-foreground">
                  {tier.highlights.map((highlight) => (
                    <li
                      key={highlight}
                      className="flex items-center gap-2 text-foreground/90"
                    >
                      <Sparkle className="h-4 w-4 text-zinc-300" />
                      {highlight}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardContent className="pt-0">
                <Button
                  asChild
                  variant={
                    tier.comingSoon
                      ? "outline"
                      : tier.featured
                        ? "default"
                        : "secondary"
                  }
                  className="w-full"
                  size="lg"
                >
                  {tier.external ? (
                    <a href={tier.href} target="_blank" rel="noopener noreferrer">
                      {tier.cta}
                    </a>
                  ) : (
                    <Link href={tier.href}>
                      {tier.cta}
                    </Link>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="faq" className="space-y-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge variant="outline" className="mb-4">
              FAQ
            </Badge>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Answers for editors and developers
            </h2>
          </div>
          <p className="max-w-xl text-base text-muted-foreground">
            Everything you need to know before bringing Livequest Studio into your
            workflow. Need something custom? Reach out and we&apos;ll help.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {faqs.map((item) => (
            <Card key={item.question} className="border-border/70 bg-background/50">
              <CardHeader>
                <CardTitle className="text-xl">{item.question}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{item.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
