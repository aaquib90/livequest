# Push Notifications for Embeds

## Prerequisites
- HTTPS on your site
- Browser support for Push API and Service Workers

## Configure VAPID
- Generate a VAPID keypair using `web-push` or your preferred tool.
- Set env vars:
  - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
  - `VAPID_PRIVATE_KEY`
  - `VAPID_SUBJECT` (e.g. `mailto:admin@yourdomain.com`)

## Service worker
- Served from `/push-sw.js` in `public/`.
- Embeds register the worker and expose a bell UI on the embed page for users to opt in or out.

## Storage
- Subscriptions are stored in `push_subscriptions`.

## Sending
- On publish, the app can send pushes via server utilities in `src/lib/notifications/push.ts`.
- Manual trigger is available at `POST /api/liveblogs/{id}/broadcast/notify`.

## Troubleshooting
- Ensure `NEXT_PUBLIC_SITE_URL` is correct and uses HTTPS.
- Permission prompts require a user gesture.
- Clean up 404/410 endpoints automatically handled in the sending routine.
