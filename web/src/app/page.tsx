import Link from "next/link";
import { ArrowRight, CalendarClock, PenSquare, Sparkle, Wand2, Radio } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const features = [
  {
    title: "Frictionless composer",
    description:
      "Write, edit, and publish in seconds with keyboard-forward shortcuts, auto-saving, and media uploads that feel instant.",
    icon: PenSquare,
  },
  {
    title: "Real-time presence",
    description:
      "Collaborate with teammates, see live viewers, and push updates simultaneously without collisions or race conditions.",
    icon: Radio,
  },
  {
    title: "Elegant embeds",
    description:
      "Drop the embed anywhere and it inherits your brand—responsive layouts, dark theme harmony, and SEO-friendly markup.",
    icon: Wand2,
  },
];

const workflow = [
  {
    title: "Set up your liveblog",
    description:
      "Create a liveblog room, configure privacy, and generate an embed link for your CMS or site—ready in under a minute.",
    stat: "60s setup",
  },
  {
    title: "Capture the moment",
    description:
      "Publish updates, images, and commentary from any device. Each update pings subscribers instantly and pins stay on top.",
    stat: "Realtime updates",
  },
  {
    title: "Measure the impact",
    description:
      "Viewer analytics show peak sessions, unique visits, and engagement so you can understand what resonated.",
    stat: "Actionable data",
  },
];

const pricing = [
  {
    name: "Creator",
    price: "$0",
    frequency: "per month",
    description:
      "Perfect for solo journalists and small teams getting started with live coverage.",
    highlights: [
      "Unlimited liveblogs",
      "Instant embeds",
      "Supabase authentication",
      "Media storage via buckets",
    ],
    cta: "Start creating",
    href: "/signup",
    featured: true,
  },
  {
    name: "Newsroom",
    price: "Coming soon",
    frequency: "",
    description:
      "Bring modern live storytelling to your newsroom with collaboration and analytics. Join the early waitlist to help shape it.",
    highlights: [
      "Multi-seat collaboration",
      "Audience analytics dashboards",
      "Advanced privacy controls",
      "Priority support",
    ],
    cta: "Join the waitlist",
    href: "mailto:hello@livequest.app?subject=Newsroom%20plan%20waitlist",
    comingSoon: true,
  },
];

const faqs = [
  {
    question: "Can we customise the embed to match our brand?",
    answer:
      "Yes—embeds inherit your typography and palette automatically. For fully bespoke styling, add a small CSS block targeting data-liveblog attributes.",
  },
  {
    question: "How do we moderate or retract updates?",
    answer:
      "Every update can be pinned, unpinned, or soft-deleted. Draft workflows are on our roadmap; today you can keep updates private until published.",
  },
  {
    question: "Is there an API for automations?",
    answer:
      "The Supabase backend exposes REST and realtime APIs. For bespoke workflows we recommend using edge functions or webhooks subscribed to update events.",
  },
  {
    question: "Do you support teams working in multiple languages?",
    answer:
      "Absolutely. Content is UTF-8 safe, and you can localise embeds or duplicate liveblogs per locale while retaining analytics.",
  },
];

export default function Home() {
  return (
    <div className="space-y-24">
      <section className="relative overflow-hidden rounded-[36px] border border-border/60 bg-[radial-gradient(circle_at_top_left,_rgba(161,161,170,0.18),_transparent_55%),radial-gradient(circle_at_bottom_right,_rgba(82,82,91,0.2),_transparent_55%),rgba(24,24,27,0.7)] px-6 py-16 shadow-[0_20px_60px_-25px_rgba(9,9,11,0.9)] sm:px-12 sm:py-20 lg:px-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(250,250,250,0.05),_transparent_60%)]" />
        <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center text-center">
          <Badge className="mb-6" variant="muted">
            <Sparkle className="mr-1 h-3.5 w-3.5" />
            Introducing the zinc interface
          </Badge>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Broadcast live moments with newsroom polish.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
            Livequest Studio streamlines rapid-fire coverage with a refined editor,
            cinematic embeds, and built-in analytics. Perfect for sports,
            culture, tech events, and beyond.
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
          <div className="mt-12 grid w-full gap-6 text-left sm:grid-cols-3">
            <div className="rounded-2xl border border-border/70 bg-background/60 p-5 backdrop-blur">
              <p className="text-sm text-muted-foreground">Average time to publish</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                14 seconds
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/60 p-5 backdrop-blur">
              <p className="text-sm text-muted-foreground">Embeds served last month</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                2.4 million
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/60 p-5 backdrop-blur">
              <p className="text-sm text-muted-foreground">Customer satisfaction</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                97% CSAT
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
            Launch your first liveblog today with the creator plan. Our collaborative newsroom tier is in development—join the waitlist and we&apos;ll reach out as soon as it&apos;s ready.
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
                  <Link href={tier.href}>
                    {tier.cta}
                  </Link>
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
