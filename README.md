# Livequest Studio 

Livequest Studio helps newsrooms and creators cover live events with a fast editor, global analytics, polished embeds, and sponsorship tooling. It is built with Next.js App Router, Supabase, and Tailwind CSS.

## Feature Overview
- **Studio workspace**: Coverage, Planner, Analytics, and Sponsors tabs keep every liveblog in one place with autosave, scheduling, templating, and row-level security.
- **Account intelligence**: `/account` surfaces active liveblogs, audience reach, sponsor performance, and referrers so you can spot trends without exporting data.
- **Sponsorships & monetisation**: Manage reusable sponsor slots, flight windows, and real-time CTR tracking for every placement across embeds.
- **Realtime storytelling**: Keyboard-first composer, pinning, instant media uploads, Server Actions, SSE embed feeds, voice dictation via OpenAI Whisper mini, and optional push notifications for subscribers.
- **Team-ready controls**: Supabase auth, privacy modes, folder organisation, concurrency helpers, Discord broadcast webhooks, and scheduled publishing.
- **Sports integrations**: API-Football sync jobs, match centre templates, and fixtures API endpoints to power scoreboards and pre-built match commentary.
- **Operational tooling**: Supabase migrations, cron utilities, Sentry instrumentation, and TypeScript components for confident iteration.

## Tech Stack
- Next.js 15 App Router with React 19, Server Actions, and incremental revalidation (`src/app`).
- Supabase for authentication, Postgres storage, row-level security policies, storage buckets, and pg_cron scheduling (`supabase/migrations`).
- Tailwind CSS v4/PostCSS pipeline with custom shadcn-inspired UI components (`src/components`).
- Sentry for observability (`sentry.client.config.ts`, `sentry.server.config.ts`, `src/instrumentation.ts`).
- Streaming updates delivered via Supabase Realtime + Server-Sent Events (`src/app/api/embed/[id]/sse`).

## Project Structure
- `src/app`: App Router routes for marketing pages, auth, dashboard, embed, API handlers, and Livequest management UI.
- `src/components`: Shared UI elements, including layout chrome and Livequest-specific widgets.
- `src/lib`: Data-access utilities (Supabase clients, football integrations, Discord helpers, shared utils).
- `supabase/migrations`: Database schema (Livequests, updates, analytics, matches, cron helpers) applied through Supabase CLI.
- `public`: Static assets bundled with Next.js build.

## Getting Started

### Prerequisites
- Node.js 20.x (the project is built and tested against the current LTS release).
- npm 10.x (bundled with Node 20) or another package manager (`pnpm`, `yarn`, or `bun`).
- Supabase project access. Install the [Supabase CLI](https://supabase.com/docs/guides/cli) if you plan to run migrations locally.

### Environment Variables
Create `web/.env.local` (not committed) and add the following environment variables. Replace placeholder values with your own project secrets—do **not** paste production credentials into documentation or source control.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL used by browser and server clients. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key for public client-side operations. |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ (server only) | Service role key used by server actions that need elevated privileges (e.g. imports, scheduled publishing). |
| `NEXT_PUBLIC_BASE_URL` | ➖ | Base URL of the deployed app (used to generate embed snippets). Set to `http://localhost:3000` for local dev. |
| `NEXT_PUBLIC_SITE_URL` | ➖ | Canonical marketing URL used in outbound links, scheduled publish notifications, and push payloads. |
| `APIFOOTBALL_KEY` | ➖ | API-Football key for live match ingestion endpoints. Required to run `/api/matches/sync`. |
| `FOOTBALL_DATA_KEY` | ➖ | Optional Football-Data.org API key for alternative fixture sourcing. |
| `CRON_SECRET` | ➖ | Shared secret protecting scheduled sync endpoints (`/api/matches/sync`, `/api/matches/complete`, scheduled publish). |
| `SENTRY_DSN` | ➖ | Sentry project DSN to enable error and performance monitoring. |
| `OPENAI_API_KEY` | ➖ | Enables the voice composer by proxying audio to OpenAI `gpt-4o-mini-transcribe`. |
| `SUPABASE_SSR_MODULE_URL` | ➖ | Optional URL to a bundled `@supabase/ssr` module (e.g. hosted in R2). When set, the bundle is lazy-loaded at runtime to keep the edge worker size small. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | ➖ | Public VAPID key that enables browser push notifications on embeds. Required if push is enabled. |
| `VAPID_PRIVATE_KEY` | ➖ | Private VAPID key paired with the public key for sending pushes. |
| `VAPID_SUBJECT` | ➖ | Contact string (usually `mailto:`) attached to push notifications. |

Voice capture in the live composer is optional but requires `OPENAI_API_KEY`; without it, the microphone controls stay hidden and reporters can continue typing updates normally.

You may also want to configure Supabase storage bucket `media` (public) for image uploads.

### Supabase Setup
Link or start a Supabase project before running the app.

1. Authenticate the CLI and link a project:
   ```bash
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   ```
2. Apply the database schema:
   ```bash
   supabase db push
   # or run migrations individually
   supabase migration up
   ```
3. Ensure the `media` storage bucket exists and allows public reads (used for uploaded assets).

### Install Dependencies & Run Locally
```bash
cd web
npm install
npm run dev
```

Visit `http://localhost:3000` to access the marketing page. Sign up or sign in to reach the dashboard (`/dashboard`) and start creating Livequests. Other useful commands:

- `npm run build` – production build (uses Next.js Turbopack).
- `npm run start` – run the compiled production server.
- `npm run lint` – lint the codebase with ESLint.

## Workflows & Integrations

### Livequest Management
- `/dashboard` lists every liveblog with folder filters, privacy states, and status chips so you can archive, complete, or delete coverage quickly.
- Create new liveblogs with templates, default sponsors, and folder assignment directly from the `CreateLiveblogDialog`.
- Each Livequest ships with four workspaces (`ManageTabs`):
  - **Coverage**: Keyboard-first composer with autosave, pinning, sponsor assignment, media uploads, and voice dictation backed by OpenAI transcription.
  - **Planner**: Draft, schedule, or queue updates. Publishing fires Discord broadcasts and optional push notifications.
  - **Analytics**: Real-time uniques, starts, session concurrency, and 24h trends from `viewer_pings` and `analytics_events`.
  - **Sponsors**: Manage reusable sponsor slots, flight windows, creative assets, and live CTR metrics.
- Privacy, ordering, templates, and embed defaults live on each Livequest (`settings` column) and can be adjusted through the settings dialog.

### Account Workspace & Global Insights
- `/account` centralises profile preferences plus a global snapshot of your coverage footprint.
- Account analytics aggregate across every liveblog: active vs archived counts, audience reach (7/30 day), session heartbeats, and total updates.
- Drill into top liveblogs, referrer domains, and sponsor performance with quick links to the dedicated analytics workspace.
- Sponsor insights roll up impressions, clicks, and CTR so you can compare partners at a glance.

### Embeds
- The dashboard provides embed snippets via `EmbedButton`. You can choose between iframe and inline script.
- Inline script usage:
  ```html
  <div data-Livequest-id="Livequest_ID" data-mode="native" data-order="newest"></div>
  <script src="https://your-domain/embed.js" async></script>
  ```
  - `data-mode` supports `iframe` (default) or `native` rendering.
  - `data-order` can be `newest` or `oldest`.
- Embeds fetch `/api/embed/:id/feed`, subscribe to `/api/embed/:id/sse`, and fall back to polling with `data-mode="native"` handled by a Shadow DOM renderer.
- Analytics pings occur automatically via `/api/embed/:id/track` and feed into Supabase tables.

### Sponsorships & Monetisation
- Sponsor slots live on each liveblog and can be reused across coverage to keep brand assets consistent.
- Slots support status windows (`scheduled`, `active`, `completed`), optional logos, CTA URLs, affiliate codes, and layout presets.
- The embed tracks impressions and clicks automatically, syncing data to `sponsor_impressions` and `sponsor_clicks` for 30-day reporting.
- Account and liveblog analytics expose CTR, impressions, and click totals so partners see performance in real time.

### Push Notifications
- Embed readers can opt into browser push notifications (service worker served from `/push-sw.js`).
- Configure `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` for web-push support.
- Publishing an update triggers push payloads automatically; manual broadcasts are available via `POST /api/liveblogs/{id}/broadcast/notify`.

### Supabase SSR Bundles
- The edge runtime can lazy-load a pre-bundled copy of `@supabase/ssr` when `SUPABASE_SSR_MODULE_URL` is set. Bundle the module with `esbuild` (see `npx esbuild node_modules/@supabase/ssr/dist/module/index.js --bundle --format=esm --platform=browser --target=es2022 --minify --outfile=supabase-ssr.bundle.mjs`), upload it to public storage (e.g. Cloudflare R2), and point the env var at the resulting URL.
- If the variable is not provided, the app falls back to the npm package, which increases the edge worker size.

### Discord Broadcasts
- Add a Discord webhook URL in the Livequest settings to mirror updates to a channel (`discord_webhook_url` inside `settings`).
- The planner triggers `/api/Livequests/:id/broadcast/discord` whenever you publish from the UI.
- Messages are formatted in `src/lib/integrations/discord.ts` with optional image embedding for Supabase-hosted media.

### Football Matches & Fixtures
- `/api/matches/sync` ingests fixture data from API-Football for the last `days` window (defaults to 7). Protect it with `CRON_SECRET`.
- `/api/matches/complete` marks matches as finished; `/api/matches` lists fixtures with filtering by country, league, status, and date range.
- To run a manual sync:
  ```bash
  curl -X POST "https://your-domain/api/matches/sync" \
    -H "Content-Type: application/json" \
    -H "x-cron-secret: $CRON_SECRET" \
    -d '{"days":7}'
  ```
- The Supabase migrations include `app_config` key-value storage plus secure helpers (`call_matches_sync`, `call_matches_complete`) so you can schedule jobs with `pg_cron`.
  ```sql
  insert into app_config(key, value) values
    ('sync_url', 'https://your-domain/api/matches/sync'),
    ('complete_url', 'https://your-domain/api/matches/complete'),
    ('cron_secret', 'YOUR_CRON_SECRET')
  on conflict (key) do update set value = excluded.value;
  ```

### Analytics
- Viewer heartbeats land in `viewer_pings` and session events in `analytics_events` (`supabase/migrations/0002_analytics.sql`).
- Use `public.count_concurrent_viewers(liveblog_id)` (`0003_concurrent_viewers.sql`) to calculate active sessions in the last 30 seconds.
- Account-wide helpers (`account_analytics_summary`, `account_top_liveblogs`, `account_top_sponsors`, `account_top_referrers`) live in `0012_account_analytics.sql` for reporting rollups.
- Analytics are surfaced across the manage page, account workspace, and can be extended for bespoke dashboards.

### Sentry Instrumentation
- Sentry is optional but recommended. Supply a `SENTRY_DSN` to enable automatic tracing wrapped around database calls (`src/app/api/embed/[id]/feed/route.ts` and `src/instrumentation.ts`).

## Deployment
- Vercel is the recommended host. Set all required environment variables in the project settings (do not expose server-only secrets client-side).
- Add Supabase service role and cron secrets as encrypted environment variables only used in server functions.
- Provision the same storage buckets and run `supabase migration up` against production before the first deploy.
- Use `npm run build` locally or rely on Vercel’s build step (`next build --turbopack`).

## Useful Scripts
- `npm run dev` – Turbopack dev server with hot reload.
- `npm run build` – Production bundle.
- `npm run start` – Serve production bundle locally.
- `npm run lint` – ESLint (runs against `src`).

## Tips & Troubleshooting
- Keep `.env.local` out of version control; use `.env.example` with placeholders if you need to share configuration with collaborators.
- If embeds do not update in real time, ensure Supabase Realtime is enabled on the `updates` table and that the browser can reach `/api/embed/:id/sse`.
- Cron jobs require the `pg_cron` and `pg_net` extensions (enabled in migrations `0005` and `0006`). Check the Supabase dashboard if schedules are not firing.
- When working locally against a remote Supabase project, use `NEXT_PUBLIC_BASE_URL=http://localhost:3000` so generated embed snippets point to your dev server.
