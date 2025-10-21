export const runtime = 'edge';
export async function POST(req: Request) {
  try {
    const { url } = await req.json().catch(() => ({ url: "" }));
    if (typeof url !== "string" || !/^https?:\/\//i.test(url)) {
      return new Response(
        JSON.stringify({ error: "Invalid or missing URL" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const res = await fetch(url, {
      method: "GET",
      headers: {
        // Basic UA helps some sites return full HTML
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      // Prevent hanging
      cache: "no-store",
    });
    const html = await res.text();

    const pick = (patterns: RegExp[]) => {
      for (const re of patterns) {
        const m = html.match(re);
        if (m && m[1]) return decode(m[1]);
      }
      return undefined;
    };
    const decode = (s: string) =>
      s
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .trim();

    const title = pick([
      /<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i,
      /<meta\s+name=["']twitter:title["']\s+content=["']([^"']+)["']/i,
      /<title[^>]*>([^<]+)<\/title>/i,
    ]);
    const description = pick([
      /<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i,
      /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i,
      /<meta\s+name=["']twitter:description["']\s+content=["']([^"']+)["']/i,
    ]);
    let image = pick([
      /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i,
      /<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i,
    ]);
    const siteName = pick([
      /<meta\s+property=["']og:site_name["']\s+content=["']([^"']+)["']/i,
    ]);

    // Resolve relative image URLs
    try {
      if (image) {
        const u = new URL(image, url);
        image = u.toString();
      }
    } catch {}

    // Identify social providers and try oEmbed where possible
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    let embed: undefined | { provider: string; html?: string; width?: number; height?: number };

    async function tryOEmbed(endpoint: string) {
      try {
        const r = await fetch(`${endpoint}${encodeURIComponent(url)}&format=json`, { cache: "no-store" });
        if (!r.ok) return undefined;
        const j = await r.json();
        return {
          html: typeof j.html === "string" ? j.html : undefined,
          width: typeof j.width === "number" ? j.width : undefined,
          height: typeof j.height === "number" ? j.height : undefined,
          title: typeof j.title === "string" ? j.title : undefined,
        } as { html?: string; width?: number; height?: number };
      } catch {
        return undefined;
      }
    }

    if (host.includes("youtube.com") || host === "youtu.be") {
      const data = await tryOEmbed("https://www.youtube.com/oembed?url=");
      embed = { provider: "youtube", ...(data || {}) };
    } else if (host.includes("tiktok.com")) {
      const data = await tryOEmbed("https://www.tiktok.com/oembed?url=");
      embed = { provider: "tiktok", ...(data || {}) };
    } else if (host.includes("twitter.com") || host.includes("x.com")) {
      // Best-effort: publish.twitter.com; may be rate-limited
      const data = await tryOEmbed("https://publish.twitter.com/oembed?omit_script=1&url=");
      embed = { provider: "twitter", ...(data || {}) };
    } else if (host.includes("instagram.com")) {
      // Instagram oEmbed typically requires an access token; fallback to OG
      embed = { provider: "instagram" };
    }

    const out = {
      url,
      title,
      description,
      image,
      siteName,
      embed,
    };
    return new Response(JSON.stringify(out), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Failed to fetch preview" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}


