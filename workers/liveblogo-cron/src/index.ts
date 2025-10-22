/// <reference types="@cloudflare/workers-types" />
interface Env {
  BASE_URL: string; // e.g., https://<pages-project>.pages.dev or your custom domain
  CRON_SECRET: string;
  PUSH_DISPATCH_TOKEN?: string; // optional bearer token check for /notify
}

export default {
  async fetch(req: Request, env: Env, _ctx: ExecutionContext) {
    const url = new URL(req.url);

    // Optional bearer token guard for dispatcher endpoint
    const token = env.PUSH_DISPATCH_TOKEN || "";
    if (url.pathname.startsWith("/notify/") && token) {
      const auth = req.headers.get("authorization") || "";
      if (!auth.startsWith("Bearer ") || auth.slice(7) !== token) {
        return new Response("unauthorized", { status: 401 });
      }
    }

    // Notification dispatcher: accepts payload and returns ack
    if (req.method === "POST" && url.pathname.startsWith("/notify/")) {
      const liveblogId = url.pathname.split("/").pop() || "";
      const { payload } = await req.json().catch(() => ({} as any));
      if (!payload || typeof payload.url !== "string") {
        return new Response(JSON.stringify({ error: "invalid_payload" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      // At this point, implement actual Web Push delivery (VAPID) if desired.
      // For now, just acknowledge.
      return new Response(JSON.stringify({ ok: true, liveblogId }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("OK", { status: 200, headers: { "content-type": "text/plain" } });
  },
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext) {
    const base = env.BASE_URL?.replace(/\/$/, "") || "";
    if (!base) return;

    const headers = { "X-CRON-SECRET": env.CRON_SECRET } as Record<string, string>;
    const endpoints = [
      "/api/matches/sync",
      "/api/matches/complete",
      "/api/liveblogs/publish/scheduled",
    ];

    await Promise.all(
      endpoints.map((p) => fetch(base + p, { method: "POST", headers }))
    );
  },
} satisfies ExportedHandler<Env>;


