"use client";

import Link from "next/link";

export default function PushDocsPage() {
  return (
    <div className="space-y-12">
      <nav className="text-xs uppercase tracking-wide text-muted-foreground">
        <Link href="/docs" className="hover:text-foreground">
          Docs
        </Link>{" "}
        / Push notifications
      </nav>

      <header className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Push notifications for embeds
        </h1>
        <p className="max-w-3xl text-base text-muted-foreground">
          Allow readers to subscribe to liveblog alerts and get notified the moment new updates go
          out.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">1. Prerequisites</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Serve your site over HTTPS.</li>
          <li>Target browsers must support the Push API and Service Workers.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">2. Configure VAPID keys</h2>
        <p className="text-sm text-muted-foreground">
          Generate a VAPID keypair (using <code>web-push</code> or similar) and add the following
          environment variables:
        </p>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>
            <code className="rounded-md bg-muted px-1.5 py-0.5 text-xs">NEXT_PUBLIC_VAPID_PUBLIC_KEY</code>
          </li>
          <li>
            <code className="rounded-md bg-muted px-1.5 py-0.5 text-xs">VAPID_PRIVATE_KEY</code>
          </li>
          <li>
            <code className="rounded-md bg-muted px-1.5 py-0.5 text-xs">VAPID_SUBJECT</code>{" "}
            (usually a <code>mailto:</code> contact)
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">3. Service worker</h2>
        <p className="text-sm text-muted-foreground">
          The worker lives at <code>/push-sw.js</code> (served from <code>public/</code>). When the
          embed mounts, it registers the worker and shows a bell UI so readers can opt in or out.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">4. Subscription storage</h2>
        <p className="text-sm text-muted-foreground">
          Subscriptions are stored in the <code>push_subscriptions</code> table. The embed handles
          create/update/delete via the public API.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">5. Sending notifications</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>
            Publishing a liveblog update can automatically fan out pushes via{" "}
            <code>src/lib/notifications/push.ts</code>.
          </li>
          <li>
            Manual broadcasts are available through{" "}
            <code className="rounded-md bg-muted px-1.5 py-0.5 text-xs">
              POST /api/liveblogs/&lt;id&gt;/broadcast/notify
            </code>
            .
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Troubleshooting</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>
            Double-check that <code>NEXT_PUBLIC_SITE_URL</code> points to the HTTPS origin your
            embeds run on.
          </li>
          <li>Browsers require a user gesture before showing notification prompts.</li>
          <li>
            Expired/404 subscriptions are removed automatically during send—no manual cleanup
            needed.
          </li>
        </ul>
      </section>
    </div>
  );
}
