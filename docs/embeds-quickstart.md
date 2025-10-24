# Embeds Quickstart

## Snippet

```html
<div data-liveblog-id="LIVEBLOG_ID" data-mode="native" data-order="newest" data-lazy="true"></div>
<script src="https://your-domain/embed.js" async></script>
```

- data-mode: `iframe` (default) or `native`
- data-order: `newest` or `oldest`
- data-lazy: `true` to defer loading until near viewport

## Endpoints used

- GET `/api/embed/:id/feed` – JSON payload of recent updates
- GET `/api/embed/:id/sse` – server-sent events for realtime updates
- POST `/api/embed/:id/track` – session analytics + heartbeats
- GET `/api/embed/:id/sponsors` – active sponsor slots
- POST `/api/embed/:id/sponsors/{track|click}` – sponsor analytics
- POST/GET `/api/embed/:id/reactions` – emoji reactions (optional)

## Caching

- Feed supports ETag and `stale-while-revalidate`; use a CDN for best results.
- SSE is long-lived; avoid proxy buffering or transformation.

## CORS and CSP

- Set `EMBED_ALLOW_ORIGINS` to a comma-separated allowlist (e.g. `https://newsroom.com,https://partner.com`).
- Responses set `Vary: Origin`. If origin not allowed, `Access-Control-Allow-Origin: null`.
- Suggested host page CSP additions:
  - `script-src` includes your domain that serves `embed.js` and any social embed frames used (e.g. YouTube).
  - `frame-src` includes your app origin and social providers.
  - `connect-src` includes your app origin for `/api/embed/*` and SSE.

## Local testing

- Run the app and visit `/embed-demo.html`. Enter a liveblog id and click Load for iframe/native.

## Analytics

- Session start/stop and pings are automatic.
- Native renderer tracks link clicks and a one-time impression after 1s of 50% visibility.
- Sponsor impressions/clicks are tracked in the embed page UI; inline native focuses on updates.

## Troubleshooting

- If updates don’t appear, check SSE reachability and browser console for CORS blocks.
- If caching prevents fresh content, verify ETag behavior and lower CDN TTLs during dev.
