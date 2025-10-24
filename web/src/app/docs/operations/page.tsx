"use client";

import Link from "next/link";

const runbookSections = [
  {
    title: "Deploy",
    items: [
      "Production runs on the Cloudflare Container Worker project in `cf-container-worker/`.",
      "Deploy with `cd cf-container-worker && npx wrangler deploy`.",
      "Set required secrets (service role, billing keys, etc.) via `npx wrangler secret put` before first deploy.",
    ],
  },
  {
    title: "Logs & scaling",
    items: [
      "Tail logs with `npx wrangler tail livequest-container-worker --format=pretty`.",
      "Change `instance_type` in `cf-container-worker/wrangler.toml` (e.g. `standard-2`) and redeploy to scale.",
    ],
  },
  {
    title: "Rollbacks",
    items: [
      "Keep previous images available so you can redeploy a known-good commit.",
      "Confirm database migrations remain compatible before rolling back application code.",
    ],
  },
  {
    title: "Database migrations",
    items: [
      "Apply schema changes with `supabase migration up` or `supabase db push`.",
      "After migrating, sign into `/account/analytics` and ensure RPCs return data (check network tab).",
      "If analytics look empty, run `select * from public.viewer_pings limit 1;` and `select public.account_analytics_summary();` in Supabase SQL to verify data flow.",
    ],
  },
  {
    title: "Environment & secrets",
    items: [
      "Development env lives in `web/.env.local`; production secrets are injected via platform tooling.",
      "Set `EMBED_ALLOW_ORIGINS` to restrict embed traffic.",
      "Configure VAPID keys when enabling push notifications.",
    ],
  },
  {
    title: "Troubleshooting checklist",
    items: [
      "SSE issues? Ensure upstream proxies don’t buffer responses and confirm CORS allowlists.",
      "Embeds failing to refresh? Check `embed.js`, verify the feed endpoint returns 200 with ETags.",
      "Cron jobs: confirm `pg_cron` is enabled and helper functions are installed.",
      "Embed QA: run `npm run dev`, open `http://localhost:3000/embed-demo.html`, and confirm lazy loading, SSE updates, impressions, and link clicks all reach `/api/embed/:id/*`.",
    ],
  },
];

export default function OperationsDocsPage() {
  return (
    <div className="space-y-12">
      <nav className="text-xs uppercase tracking-wide text-muted-foreground">
        <Link href="/docs" className="hover:text-foreground">
          Docs
        </Link>{" "}
        / Operations runbook
      </nav>

      <header className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Operations runbook</h1>
        <p className="max-w-3xl text-base text-muted-foreground">
          Deployment, observability, and maintenance checklists for Livequest Studio.
        </p>
      </header>

      <section className="space-y-6">
        {runbookSections.map((section) => (
          <article
            key={section.title}
            className="rounded-2xl border border-border/70 bg-background/60 p-5"
          >
            <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              {section.items.map((item, idx) => (
                <li key={`${section.title}-${idx}`}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </div>
  );
}
