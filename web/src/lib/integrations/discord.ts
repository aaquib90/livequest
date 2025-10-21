type TextContent = {
  type: "text";
  text: string;
  title?: string;
  image?: { path: string; width?: number; height?: number };
};
type ImageContent = {
  type: "image";
  path: string;
  width?: number;
  height?: number;
};
type LinkContent = {
  type: "link";
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
};
type UnknownContent = { type: string; [key: string]: unknown };
export type UpdateContent = TextContent | ImageContent | LinkContent | UnknownContent | null;

export type DiscordWebhookPayload = {
  content?: string;
  embeds?: Array<{
    title?: string;
    url?: string;
    description?: string;
    image?: { url: string };
    footer?: { text: string };
  }>;
  username?: string;
  avatar_url?: string;
};

export function formatDiscordMessage(content: UpdateContent, opts?: { publicImageUrl?: string; sourceTitle?: string }): DiscordWebhookPayload | null {
  if (!content || typeof content !== "object" || !("type" in content)) return null;

  if (content.type === "text") {
    const c = content as TextContent;
    const title = c.title?.trim();
    const text = c.text?.trim();
    const lines = [title ? `**${title}**` : null, text || null].filter(Boolean) as string[];
    const base: DiscordWebhookPayload = { content: lines.join("\n\n").slice(0, 1900) };
    const url = opts?.publicImageUrl;
    if (c.image && url) {
      base.embeds = [{ image: { url } }];
    }
    return base;
  }

  if (content.type === "link") {
    const c = content as LinkContent;
    const embed: DiscordWebhookPayload["embeds"][number] = {
      title: c.title || c.url,
      url: c.url,
      description: c.description?.slice(0, 2000),
      footer: c.siteName ? { text: c.siteName } : undefined,
    };
    if (c.image && c.image.startsWith("http")) {
      embed.image = { url: c.image };
    }
    return { embeds: [embed] };
  }

  if (content.type === "image") {
    const url = opts?.publicImageUrl;
    if (!url) return null;
    return { embeds: [{ image: { url } }] };
  }

  return { content: `Update: ${"type" in content ? String((content as any).type) : "unknown"}` };
}

export async function postToDiscord(webhookUrl: string, payload: DiscordWebhookPayload): Promise<{ ok: boolean; status: number }> {
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}


