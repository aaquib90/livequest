interface Env {
  BASE_URL: string; // e.g., https://<pages-project>.pages.dev or your custom domain
  CRON_SECRET: string;
}

export default {
  async fetch(_req, _env) {
    return new Response("OK", { status: 200, headers: { "content-type": "text/plain" } });
  },
  async scheduled(_event, env) {
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


