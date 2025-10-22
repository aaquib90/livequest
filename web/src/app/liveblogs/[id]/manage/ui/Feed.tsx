"use client";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";
import { Pin, PinOff, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FootballEventBadge,
  FootballEventBanner,
} from "@/components/football/FootballEventBadge";
import { FootballEventDetails } from "@/components/football/FootballEventDetails";
import type { FootballEventKey } from "@/lib/football/events";
import { createClient } from "@/lib/supabase/browserClient";
import { cn } from "@/lib/utils";

type TextContent = {
  type: "text";
  text: string;
  title?: string;
  event?: FootballEventKey | "" | null;
  event_meta?: Record<string, unknown> | null;
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
  embed?: { provider: string; html?: string; width?: number; height?: number };
};
type UnknownContent = { type: string; [key: string]: unknown };
type UpdateContent = TextContent | ImageContent | LinkContent | UnknownContent | null;

type Update = {
  id: string;
  content: UpdateContent;
  published_at: string | null;
  pinned: boolean;
  status?: "draft" | "scheduled" | "published";
};

export default function Feed({
  initialUpdates,
  liveblogId,
  order = "newest",
  template,
  homeTeamName,
  homeTeamSlug,
  awayTeamName,
  awayTeamSlug,
}: {
  initialUpdates: Update[];
  liveblogId: string;
  order?: "newest" | "oldest";
  template?: string | null;
  homeTeamName?: string;
  homeTeamSlug?: string;
  awayTeamName?: string;
  awayTeamSlug?: string;
}) {
  const supabase = createClient();
  const [updates, setUpdates] = useState<Update[]>(initialUpdates);
  const isFootball = template === "football";
  const [newIds, setNewIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const channel = supabase
      .channel(`updates:${liveblogId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "updates",
          filter: `liveblog_id=eq.${liveblogId}`,
        },
        (payload: RealtimePostgresChangesPayload<Update>) => {
          if (payload.eventType === "INSERT" && payload.new) {
            const inserted = payload.new;
            if (
              !inserted ||
              inserted.status === "published" ||
              typeof inserted.status === "undefined"
            ) {
              setUpdates((prev) => [inserted, ...prev]);
              // mark as new to trigger enter animations briefly
              setNewIds((prev) => {
                const next = new Set(prev);
                next.add(inserted.id);
                return next;
              });
              setTimeout(() => {
                setNewIds((prev) => {
                  const next = new Set(prev);
                  next.delete(inserted.id);
                  return next;
                });
              }, 1600);
            }
          } else if (payload.eventType === "UPDATE" && payload.new) {
            const updated = payload.new;
            setUpdates((prev) =>
              prev.map((u) => (u.id === updated.id ? updated : u))
            );
          } else if (payload.eventType === "DELETE" && payload.old) {
            const removed = payload.old;
            setUpdates((prev) => prev.filter((u) => u.id !== removed.id));
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [liveblogId, supabase]);

  const sorted = useMemo(() => {
    return [...updates].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      const at = a.published_at ? new Date(a.published_at).getTime() : 0;
      const bt = b.published_at ? new Date(b.published_at).getTime() : 0;
      return order === "newest" ? bt - at : at - bt;
    });
  }, [updates, order]);

  async function togglePin(id: string, pinned: boolean) {
    await supabase.from("updates").update({ pinned: !pinned }).eq("id", id);
  }

  async function remove(id: string) {
    await supabase
      .from("updates")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
  }

  return (
    <div className="space-y-4">
      {sorted.map((u) => {
        const textContent = isTextContent(u.content) ? u.content : null;
        const eventKey =
          isFootball && textContent?.event
            ? (textContent.event as FootballEventKey)
            : undefined;
        const isNew = newIds.has(u.id);

        return (
        <article
          key={u.id}
          className={cn(
            "group relative overflow-hidden rounded-3xl border border-border/60 bg-background/75 p-6 shadow-[0_28px_62px_-42px_rgba(8,8,12,0.95)] transition-all duration-500 hover:border-border/40",
            u.pinned &&
              "border-amber-400/60 bg-gradient-to-br from-amber-500/12 via-background/70 to-background/90",
            isNew &&
              "will-change-transform animate-[lb-slide-fade-in_520ms_cubic-bezier(0.22,1,0.36,1)_both]"
          )}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_100%_0%,rgba(59,130,246,0.14),transparent)] opacity-80 transition-opacity duration-500 group-hover:opacity-100" />
          {u.pinned ? (
            <span className="pointer-events-none absolute -top-12 left-1/2 h-28 w-28 -translate-x-1/2 rounded-full bg-amber-500/15 blur-3xl" />
          ) : null}
          <div className="relative z-[1] flex flex-col gap-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {u.pinned ? (
                  <Badge variant="muted" className="border-border/40 bg-amber-500/10 text-amber-200">
                    <Pin className="mr-1.5 h-3.5 w-3.5" />
                    Pinned
                  </Badge>
                ) : null}
                {eventKey ? (
                  <FootballEventBadge event={eventKey} size="sm" />
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                {u.published_at ? formatDate(u.published_at) : ""}
              </p>
            </div>
            {eventKey ? (
              <FootballEventBanner
                event={eventKey}
                isNew={isNew}
                subtle
                className="border border-white/10"
              />
            ) : null}
            {eventKey && textContent?.event_meta ? (
              <FootballEventDetails
                event={eventKey}
                meta={textContent.event_meta}
                isNew={isNew}
                context={{
                  homeTeamName,
                  homeTeamSlug,
                  awayTeamName,
                  awayTeamSlug,
                }}
              />
            ) : null}
            <RenderContent content={u.content} isNew={isNew} />
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => togglePin(u.id, u.pinned)}
              >
                {u.pinned ? (
                  <>
                    <PinOff className="mr-2 h-3.5 w-3.5" /> Unpin
                  </>
                ) : (
                  <>
                    <Pin className="mr-2 h-3.5 w-3.5" /> Pin
                  </>
                )}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-xs text-destructive hover:text-destructive"
                onClick={() => remove(u.id)}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Delete
              </Button>
            </div>
          </div>
        </article>
        );
      })}
      {!sorted.length ? (
        <div className="rounded-3xl border border-dashed border-border/60 bg-background/60 p-10 text-center text-sm text-muted-foreground">
          No updates yet. Draft your first post in the composer to kick things
          off.
        </div>
      ) : null}
    </div>
  );
}

function isTextContent(content: UpdateContent): content is TextContent {
  return (
    typeof content === "object" &&
    content !== null &&
    "type" in content &&
    content.type === "text" &&
    typeof (content as TextContent).text === "string"
  );
}

function isImageContent(content: UpdateContent): content is ImageContent {
  return (
    typeof content === "object" &&
    content !== null &&
    "type" in content &&
    content.type === "image" &&
    typeof (content as ImageContent).path === "string"
  );
}

function isLinkContent(content: UpdateContent): content is LinkContent {
  return (
    typeof content === "object" &&
    content !== null &&
    "type" in content &&
    content.type === "link" &&
    typeof (content as LinkContent).url === "string"
  );
}

function RenderContent({ content, isNew }: { content: UpdateContent; isNew?: boolean }) {
  if (!content) return null;
  if (isTextContent(content)) {
    const maybeImage = content.image;
    const supabase = createClient();
    const imageUrl = maybeImage
      ? supabase.storage.from("media").getPublicUrl(maybeImage.path).data.publicUrl
      : null;
    return (
      <div className="space-y-2">
        <div className="space-y-1.5">
          {content.title ? (
            <h3 className="text-base font-semibold leading-tight text-foreground">
              {content.title}
            </h3>
          ) : null}
          {content.text ? (
            <p className="whitespace-pre-wrap text-sm text-foreground/90">
              {content.text}
            </p>
          ) : null}
        </div>
        {imageUrl ? (
          <figure className="overflow-hidden rounded-2xl border border-border/60 bg-black/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt=""
              className="h-auto w-full max-h-[420px] rounded-2xl object-cover"
            />
          </figure>
        ) : null}
      </div>
    );
  }
  if (isImageContent(content)) {
    const supabase = createClient();
    const url = supabase.storage
      .from("media")
      .getPublicUrl(content.path).data.publicUrl;
    return (
      <figure className="overflow-hidden rounded-2xl border border-border/60 bg-black/40">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt=""
          className="h-auto w-full max-h-[420px] rounded-2xl object-cover"
        />
      </figure>
    );
  }
  if (isLinkContent(content)) {
    return content.embed ? (
      <SocialEmbed content={content} isNew={isNew} />
    ) : (
      <LinkCard content={content} isNew={isNew} />
    );
  }
  return (
    <pre className="overflow-auto rounded-2xl border border-border/60 bg-zinc-950/80 p-4 text-xs text-muted-foreground">
      {JSON.stringify(content, null, 2)}
    </pre>
  );
}

function LinkCard({ content, isNew }: { content: LinkContent; isNew?: boolean }) {
  const href = content.url;
  const hasImage = typeof content.image === "string" && content.image.length > 0;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group block overflow-hidden rounded-2xl border border-border/60 bg-background/60 hover:border-border/50",
        isNew && "[animation:lb-link-glow-sweep_900ms_ease-out_1]"
      )}
    >
      <div className="grid grid-cols-[1fr] gap-0 sm:grid-cols-[minmax(0,1fr)_220px]">
        <div className="p-4 sm:p-5">
          {content.siteName ? (
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">
              {content.siteName}
            </p>
          ) : null}
          <p className="mt-1 text-sm font-semibold text-foreground">
            {content.title || href}
          </p>
          {content.description ? (
            <p className="mt-1.5 line-clamp-3 text-xs text-muted-foreground">
              {content.description}
            </p>
          ) : null}
          <p className="mt-2 text-[11px] text-muted-foreground underline decoration-dotted">
            {href}
          </p>
        </div>
        {hasImage ? (
          <div className="relative hidden sm:block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={content.image!}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        ) : null}
      </div>
    </a>
  );
}

function SocialEmbed({ content, isNew }: { content: LinkContent; isNew?: boolean }) {
  const provider = content.embed?.provider;
  const html = content.embed?.html;
  const title = content.embed && (content.embed as any).title ? String((content.embed as any).title) : content.title;
  if (provider === "youtube" && !html) {
    try {
      const u = new URL(content.url);
      let id = u.searchParams.get("v") || "";
      if (!id && u.hostname === "youtu.be") id = u.pathname.slice(1);
      if (id) {
        const src = `https://www.youtube.com/embed/${id}`;
        return (
          <div className={cn("overflow-hidden rounded-2xl border border-border/60 bg-black/80", isNew && "[animation:lb-link-glow-sweep_900ms_ease-out_1]")}> 
            {title ? (
              <div className="bg-zinc-900/70 p-3 text-sm font-semibold text-white/90">
                {title}
              </div>
            ) : null}
            <div className="relative aspect-video w-full">
              <iframe
                src={src}
                className="absolute inset-0 h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
              />
            </div>
          </div>
        );
      }
    } catch {}
  }
  if (html) {
    return (
      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-border/60 bg-background/60",
          isNew && "[animation:lb-link-glow-sweep_900ms_ease-out_1]"
        )}
      >
        {title ? (
          <div className="bg-background/70 p-3 text-sm font-semibold">
            {title}
          </div>
        ) : null}
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    );
  }
  return <LinkCard content={content} isNew={isNew} />;
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "UTC",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}
