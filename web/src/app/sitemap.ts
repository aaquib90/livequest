import type { MetadataRoute } from "next";

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://livequest.app").replace(/\/$/, "");

const STATIC_ROUTES: Array<{ path: string; priority?: number }> = [
  { path: "/", priority: 1 },
  { path: "/signup", priority: 0.7 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return STATIC_ROUTES.map(({ path, priority = 0.5 }) => ({
    url: `${BASE_URL}${path}`,
    lastModified,
    changeFrequency: "weekly",
    priority,
  }));
}
