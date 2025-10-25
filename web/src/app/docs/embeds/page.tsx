"use client";

import Link from "next/link";

const snippet = `<div data-liveblog-id="LIVEBLOG_ID" data-mode="native" data-order="newest" data-lazy="true"></div>
<script src="https://your-domain/embed.js" async></script>`;

const endpoints = [
  { method: "GET", path: "/api/embed/:id/feed", description: "JSON payload of recent updates" },
  { method: "GET", path: "/api/embed/:id/sse", description: "Server-sent events for realtime updates" },
  { method: "POST", path: "/api/embed/:id/track", description: "Session analytics + heartbeats" },
  { method: "GET", path: "/api/embed/:id/sponsors", description: "Active sponsor slots" },
  { method: "POST", path: "/api/embed/:id/sponsors/track|click", description: "Sponsor analytics" },
  { method: "POST/GET", path: "/api/embed/:id/reactions", description: "Emoji reactions (optional)" },
];

export default function EmbedsDocsPage() {
  return (
    <div className="space-y-12">
      <nav className="text-xs uppercase tracking-wide text-muted-foreground">
        <Link href="/docs" className="hover:text-foreground">
          Docs
        </Link>{" "}
        / Embeds
      </nav>

      <header className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Embeds quickstart</h1>
        <p className="max-w-3xl text-base text-muted-foreground">
          Drop-in script, realtime feed, and analytics wiring to embed any Livequest liveblog inside
          your site or app.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">1. Install the snippet</h2>
        <p className="text-sm text-muted-foreground">
          Paste the following snippet wherever you want the liveblog to appear. Switch{" "}
          <code className="rounded-md bg-muted px-1.5 py-0.5 text-xs">data-mode</code> to{" "}
          <code className="rounded-md bg-muted px-1.5 py-0.5 text-xs">iframe</code> for a framed
          experience, or keep <code className="rounded-md bg-muted px-1.5 py-0.5 text-xs">native</code> for inline Shadow DOM.
          Add <code className="rounded-md bg-muted px-1.5 py-0.5 text-xs">data-lazy</code> to defer loading until the mount nears the viewport.
        </p>
        <pre className="overflow-x-auto rounded-xl border border-border/60 bg-background/70 p-4 text-sm text-muted-foreground">
          <code>{snippet}</code>
        </pre>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Standalone widgets</h2>
        <p className="text-sm text-muted-foreground">Embed a Hot Take Meter anywhere with one line:</p>
        <pre className="overflow-x-auto rounded-xl border border-border/60 bg-background/70 p-4 text-sm text-muted-foreground">
{`<div data-widget-id="WIDGET_ID" data-type="hot-take"></div>
<script src="https://your-domain/widget.js" async></script>`}
        </pre>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">2. API endpoints in play</h2>
        <div className="grid gap-3">
          {endpoints.map((endpoint) => (
            <div
              key={`${endpoint.method}-${endpoint.path}`}
              className="flex flex-col gap-1 rounded-xl border border-border/70 bg-background/60 p-4 text-sm text-foreground sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="font-mono text-xs uppercase text-primary">
                {endpoint.method}
              </span>
              <span className="font-mono text-xs text-muted-foreground">{endpoint.path}</span>
              <span className="text-xs text-muted-foreground">{endpoint.description}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">3. Caching & real-time</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>
            The feed endpoint ships weak ETags and <code>stale-while-revalidate</code>; let your CDN
            cache responses aggressively.
          </li>
          <li>
            The SSE stream stays open for long periods. Avoid proxies that buffer or transform the
            response.
          </li>
        </ul>
      </section>


      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">5. Local testing</h2>
        <p className="text-sm text-muted-foreground">
          Run <code>npm run dev</code> then visit{" "}
          <code className="rounded-md bg-muted px-1.5 py-0.5 text-xs">/embed-demo.html</code>. Enter
          a liveblog ID to toggle between iframe and native renders and inspect network activity.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">4. Analytics captured automatically</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Session start/stop and heartbeat pings via the <code>/track</code> endpoint.</li>
          <li>
            Native embeds fire a one-time impression when 50% visible for at least a second, and log
            outbound clicks.
          </li>
          <li>Sponsor impressions/clicks are tracked in both iframe and native modes.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Troubleshooting</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>No updates? Check browser console for CORS errors and verify SSE reachability.</li>
          <li>
            Content looks stale? Ensure ETags are honoured and temporarily reduce CDN TTL during
            testing.
          </li>
        </ul>
      </section>
    </div>
  );
}
