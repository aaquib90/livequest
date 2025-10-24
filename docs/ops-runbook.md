# Operations Runbook

## Deploy
- Production runs on Cloudflare Containers via `cf-container-worker/`.
- Deploy: `cd cf-container-worker && npx wrangler deploy`.
- Ensure secrets are set with `npx wrangler secret put ...` (service role, Stripe, etc.).

## Logs
- Tail: `npx wrangler tail livequest-container-worker --format=pretty`.

## Scaling
- Adjust `instance_type` in `cf-container-worker/wrangler.toml` (e.g., `standard-2`).
- Redeploy to apply.

## Rollbacks
- Keep previous images available; redeploy a known-good commit.
- Verify DB migrations compatibility before rolling back.

## DB Migrations
- Apply via Supabase CLI: `supabase migration up` or `supabase db push`.
- Always migrate before deploying schema-dependent code.
- After applying migrations, sanity-check account analytics:
  1. Sign in to `/account/analytics`.
  2. Confirm summary counts render and no RPC errors appear in the console or network tab (`account_analytics_summary`, `account_top_liveblogs`, etc.).
  3. If blank, run `select * from public.viewer_pings limit 1;` and `select public.account_analytics_summary();` in Supabase SQL editor to verify data is present.

## Env & Secrets
- App env in `web/.env.local` for dev; production via platform secrets.
- `EMBED_ALLOW_ORIGINS` to restrict embed CORS.
- VAPID keys for push notifications if used.

## Troubleshooting
- SSE: ensure proxies don’t buffer/transform; check CORS.
- Embeds: verify `embed.js` reachable and `feed` returns 200 with ETag.
- Cron: ensure `pg_cron` enabled and helper functions present.
- Embed QA:
  1. Run `npm run dev` in `web/`.
  2. Open `http://localhost:3000/embed-demo.html`.
  3. Enter a liveblog ID and confirm lazy loading, SSE updates, impression tracking, and link clicks all reach the analytics endpoints (watch the Network tab for `/api/embed/:id/*` calls).
