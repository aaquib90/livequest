type TextContent = {
  type: "text";
  text: string;
  title?: string;
  image?: { path: string; width?: number; height?: number };
  // Optional match event enrichment (sent by the composer for football template)
  event?: string;
  event_meta?: Record<string, unknown> | null;
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
    color?: number; // hex color (e.g., 0x10B981)
    fields?: Array<{ name: string; value: string; inline?: boolean }>;
    timestamp?: string; // ISO string
  }>;
  username?: string;
  avatar_url?: string;
};

export function formatDiscordMessage(content: UpdateContent, opts?: { publicImageUrl?: string; sourceTitle?: string }): DiscordWebhookPayload | null {
  if (!content || typeof content !== "object" || !("type" in content)) return null;

  if (content.type === "text") {
    const c = content as TextContent;
    const hasEvent = typeof c.event === "string" && c.event.length > 0;
    if (hasEvent) {
      const parts = buildEventEmbedParts(c);
      if (parts) {
        const embed: NonNullable<DiscordWebhookPayload["embeds"]>[number] = {
          title: parts.title,
          description: parts.description,
          color: parts.color,
          fields: parts.fields && parts.fields.length ? parts.fields : undefined,
          footer: parts.footer ? { text: parts.footer } : undefined,
          timestamp: new Date().toISOString(),
        };
        const url = opts?.publicImageUrl;
        if (c.image && url) {
          embed.image = { url };
        }
        return { embeds: [embed] };
      }
      // Fall through to plain formatting if we couldn't build embed
    }

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

// Internal helpers
function buildEventEmbedParts(c: TextContent):
  | {
      title: string;
      description: string | undefined;
      fields: Array<{ name: string; value: string; inline?: boolean }> | undefined;
      color: number | undefined;
      footer: string | undefined;
    }
  | null {
  const event = String(c.event || "").trim();
  if (!event) return null;
  const meta = (c.event_meta || {}) as Record<string, unknown>;

  const presentation = getEventPresentation(event);
  const color = getEventColor(event);

  // Title: Emoji + Label + team label if present
  const teamLabel = typeof meta.teamLabel === "string" && meta.teamLabel.trim() ? String(meta.teamLabel).trim() : "";
  const title = `${presentation.emoji} ${presentation.label}${teamLabel ? ` — ${teamLabel}` : ""}`;

  // Description: combine editor-provided title + text
  const editorTitle = c.title?.trim();
  const editorText = c.text?.trim();
  const description = [editorTitle, editorText].filter(Boolean).join("\n\n").slice(0, 2000) || undefined;

  // Fields per event
  const fields: Array<{ name: string; value: string; inline?: boolean }> = [];
  const team = typeof meta.team === "string" ? String(meta.team) : ""; // home | away

  if (event === "goal" || event === "own_goal") {
    const player = typeof meta.player === "string" && meta.player.trim() ? String(meta.player).trim() : "";
    if (player) {
      fields.push({ name: event === "own_goal" ? "Final touch" : "Scorer", value: sanitizeField(player), inline: false });
    }
    if (teamLabel) fields.push({ name: "Team", value: sanitizeField(teamLabel), inline: true });
  } else if (event === "substitution") {
    const playerOut = typeof meta.playerOut === "string" && meta.playerOut.trim() ? String(meta.playerOut).trim() : "";
    const playerIn = typeof meta.playerIn === "string" && meta.playerIn.trim() ? String(meta.playerIn).trim() : "";
    if (playerOut) fields.push({ name: "Off", value: sanitizeField(playerOut), inline: true });
    if (playerIn) fields.push({ name: "On", value: sanitizeField(playerIn), inline: true });
    if (teamLabel) fields.push({ name: "Team", value: sanitizeField(teamLabel), inline: false });
  } else {
    // Other events: just show team if provided
    if (teamLabel) fields.push({ name: "Team", value: sanitizeField(teamLabel), inline: false });
  }

  // Footer: side label (Home/Away) + full club name when available
  const side = team === "home" ? "Home" : team === "away" ? "Away" : "";
  const footerPieces = [side ? `${side} side` : "", teamLabel].filter(Boolean);
  const footer = footerPieces.length ? footerPieces.join(" • ") : undefined;

  return { title, description, fields: fields.length ? fields : undefined, color, footer };
}

function getEventPresentation(event: string): { emoji: string; label: string } {
  switch (event) {
    case "goal":
      return { emoji: "⚽", label: "Goal" };
    case "own_goal":
      return { emoji: "🧲", label: "Own goal" };
    case "yellow_card":
      return { emoji: "🟨", label: "Yellow card" };
    case "red_card":
      return { emoji: "🟥", label: "Red card" };
    case "substitution":
      return { emoji: "🔁", label: "Substitution" };
    case "var_check":
      return { emoji: "🧑‍⚖️", label: "VAR check" };
    case "kick_off":
      return { emoji: "🟢", label: "Kick-off" };
    case "full_time":
      return { emoji: "⏱️", label: "Full time" };
    default:
      return { emoji: "🔹", label: capitalize(event.replaceAll("_", " ")) };
  }
}

function getEventColor(event: string): number | undefined {
  switch (event) {
    case "goal":
      return 0x10b981; // emerald-500
    case "own_goal":
      return 0xf43f5e; // rose-500
    case "yellow_card":
      return 0xf59e0b; // amber-500
    case "red_card":
      return 0xef4444; // red-500
    case "substitution":
      return 0x38bdf8; // sky-400
    case "var_check":
      return 0xa78bfa; // violet-400
    case "kick_off":
      return 0x94a3b8; // slate-400
    case "full_time":
      return 0xd4d4d8; // zinc-300
    default:
      return undefined;
  }
}

function sanitizeField(value: string): string {
  return value.slice(0, 1024);
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}


