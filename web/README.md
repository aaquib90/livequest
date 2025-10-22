# Liveblog Studio

Liveblog Studio helps newsrooms and creators cover live events with a fast editor, polished embeds, and real-time analytics. It is built with Next.js App Router, Supabase, and Tailwind CSS.

## Feature Overview
- **Frictionless authoring**: Keyboard-first composer with autosave, media uploads, pinning, scheduling, and Supabase row-level security.
- **Embeds that feel native**: Drop-in iframe or inline script (`/embed.js`) powered by SSE updates, with automatic dark/light styling and graceful polling fallback.
- **Audience insights**: Viewer pings, session analytics, and concurrency helpers surface uniques, starts, and 24h performance right inside the studio.
- **Team-ready controls**: Supabase authentication, liveblog privacy settings, editor access control, and Discord webhook broadcasting for updates.
- **Sports integrations**: API-Football sync jobs, match centre templates, and fixtures API endpoints to power real-time scoreboards.
- **Operational tooling**: Supabase migrations, cron utilities, Sentry instrumentation, and TypeScript-first components for confident iteration.

## Tech Stack
- Next.js 15 App Router with React 19, Server Actions, and incremental revalidation (`src/app`).
- Supabase for authentication, Postgres storage, row-level security policies, storage buckets, and pg_cron scheduling (`supabase/migrations`).
- Tailwind CSS v4/PostCSS pipeline with custom shadcn-inspired UI components (`src/components`).
- Sentry for observability (`sentry.client.config.ts`, `sentry.server.config.ts`, `src/instrumentation.ts`).
- Streaming updates delivered via Supabase Realtime + Server-Sent Events (`src/app/api/embed/[id]/sse`).

## Project Structure
- `src/app`: App Router routes for marketing pages, auth, dashboard, embed, API handlers, and liveblog management UI.
- `src/components`: Shared UI elements, including layout chrome and liveblog-specific widgets.
- `src/lib`: Data-access utilities (Supabase clients, football integrations, Discord helpers, shared utils).
- `supabase/migrations`: Database schema (liveblogs, updates, analytics, matches, cron helpers) applied through Supabase CLI.
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
| `APIFOOTBALL_KEY` | ➖ | API-Football key for live match ingestion endpoints. Required to run `/api/matches/sync`. |
| `FOOTBALL_DATA_KEY` | ➖ | Optional Football-Data.org API key for alternative fixture sourcing. |
| `CRON_SECRET` | ➖ | Shared secret protecting scheduled sync endpoints (`/api/matches/sync`, `/api/matches/complete`, scheduled publish). |
| `SENTRY_DSN` | ➖ | Sentry project DSN to enable error and performance monitoring. |

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

Visit `http://localhost:3000` to access the marketing page. Sign up or sign in to reach the dashboard (`/dashboard`) and start creating liveblogs. Other useful commands:

- `npm run build` – production build (uses Next.js Turbopack).
- `npm run start` – run the compiled production server.
- `npm run lint` – lint the codebase with ESLint.

### Local Players Test Endpoints

Ensure `.env.local` has Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Then query:

```
curl "http://localhost:3000/api/players/by-team?team=Man%20Utd"
curl "http://localhost:3000/api/players/by-team?team=manchester-united"
curl "http://localhost:3000/api/players/search?q=rashford"
```

Players must be imported into Supabase beforehand.

## Workflows & Integrations

### Liveblog Management
- Create and organise liveblogs from `/dashboard` (`src/app/dashboard/page.tsx`).
- Each liveblog has:
  - **Coverage** tab for the composer (`ManageTabs`, `Composer` components) with autosave, pinning, and Supabase-backed updates.
  - **Planner** tab to review drafts and scheduled posts. Publishing triggers Discord broadcasts when enabled.
  - **Analytics** tab that surfaces uniques, session starts, and all-time engagement (powered by `viewer_pings` and `analytics_events` tables).
- Privacy, ordering, and template options are stored per-liveblog (`settings` column) and can be managed via the Settings dialog.

### Embeds
- The dashboard provides embed snippets via `EmbedButton`. You can choose between iframe and inline script.
- Inline script usage:
  ```html
  <div data-liveblog-id="LIVEBLOG_ID" data-mode="native" data-order="newest"></div>
  <script src="https://your-domain/embed.js" async></script>
  ```
  - `data-mode` supports `iframe` (default) or `native` rendering.
  - `data-order` can be `newest` or `oldest`.
- Embeds fetch `/api/embed/:id/feed`, subscribe to `/api/embed/:id/sse`, and fall back to polling with `data-mode="native"` handled by a Shadow DOM renderer.
- Analytics pings occur automatically via `/api/embed/:id/track` and feed into Supabase tables.

### Discord Broadcasts
- Add a Discord webhook URL in the liveblog settings to mirror updates to a channel (`discord_webhook_url` inside `settings`).
- The planner triggers `/api/liveblogs/:id/broadcast/discord` whenever you publish from the UI.
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
- Analytics are surfaced on the manage page and can be extended for bespoke dashboards.

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
