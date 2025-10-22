"use client";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, BellOff } from "lucide-react";

import {
  FootballEventBadge,
  FootballEventBanner,
} from "@/components/football/FootballEventBadge";
import { FootballEventDetails } from "@/components/football/FootballEventDetails";
import type { FootballEventKey } from "@/lib/football/events";
import { createClient } from "@/lib/supabase/browserClient";
import { cn } from "@/lib/utils";
type ReactionType = "smile" | "heart" | "thumbs_up";

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
};

export default function EmbedClient({
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
  const [pushSupported, setPushSupported] = useState<boolean>(false);
  const [pushEnabled, setPushEnabled] = useState<boolean>(false);
  const [pushBusy, setPushBusy] = useState<boolean>(false);
  const [deviceId, setDeviceId] = useState<string>("");
  const [sessionId, setSessionId] = useState<string>("");
  const [analyticsMode, setAnalyticsMode] = useState<"pending" | "iframe" | "page">("pending");
  const [reactionCounts, setReactionCounts] = useState<Record<string, { smile: number; heart: number; thumbs_up: number }>>({});
  const [reactionActive, setReactionActive] = useState<Record<string, { smile: boolean; heart: boolean; thumbs_up: boolean }>>({});

  useEffect(() => {
    // Ensure a stable per-device id (scoped to origin)
    try {
      const key = `lb_device_id`;
      let id = typeof window !== "undefined" ? window.localStorage.getItem(key) || "" : "";
      if (!id) {
        id = crypto.randomUUID();
        window.localStorage.setItem(key, id);
      }
      setDeviceId(id);
    } catch {}

    // Ensure a stable per-session id (scoped per liveblog)
    try {
      if (typeof window !== "undefined") {
        const key = `lb_sid_${liveblogId}`;
        let sid = window.localStorage.getItem(key) || "";
        if (!sid) {
          sid = Math.random().toString(36).slice(2);
          window.localStorage.setItem(key, sid);
        }
        setSessionId(sid);
      }
    } catch {}

    // Detect mode (iframe vs standalone)
    if (typeof window !== "undefined") {
      let mode: "iframe" | "page" = "page";
      try {
        if (window.top && window.top !== window.self) mode = "iframe";
      } catch {
        mode = "iframe";
      }
      setAnalyticsMode(mode);
    } else {
      setAnalyticsMode("pending");
    }

    // Register service worker if supported
    const supported = typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
    setPushSupported(supported);
    if (supported) {
      navigator.serviceWorker
        .register("/push-sw.js")
        .then(() => navigator.serviceWorker.ready)
        .then(async (reg) => {
          const sub = await reg.pushManager.getSubscription();
          setPushEnabled(!!sub);
        })
        .catch(() => {});
    }
  }, [liveblogId]);

  const trackEvent = useCallback(
    async (event: string, metadata?: Record<string, unknown>) => {
      if (!sessionId || analyticsMode === "pending") return;
      try {
        await fetch(`/api/embed/${liveblogId}/track`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            event,
            mode: analyticsMode,
            metadata,
          }),
        });
      } catch {}
    },
    [analyticsMode, liveblogId, sessionId],
  );

  useEffect(() => {
    if (!sessionId || analyticsMode === "pending") return;
    trackEvent("start");
    const interval = window.setInterval(() => trackEvent("ping"), 15000);
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        trackEvent("ping");
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      trackEvent("stop");
    };
  }, [analyticsMode, sessionId, trackEvent]);

  async function subscribePush() {
    try {
      setPushBusy(true);
      if (!pushSupported) return;
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setPushEnabled(false);
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const vapidKey = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string) || "";
      const appServerKey = urlBase64ToUint8Array(vapidKey);
      const subscription = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: appServerKey });
      await fetch(`/api/embed/${liveblogId}/push/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription }),
      });
      setPushEnabled(true);
      trackEvent("push_subscribed");
    } finally {
      setPushBusy(false);
    }
  }

  async function unsubscribePush() {
    try {
      setPushBusy(true);
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await fetch(`/api/embed/${liveblogId}/push/unsubscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
        await sub.unsubscribe();
      }
      setPushEnabled(false);
      trackEvent("push_unsubscribed");
    } finally {
      setPushBusy(false);
  }
  }
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
            const status = (inserted as any)?.status;
            if (status && status !== "published") return;
            setUpdates((prev) => [inserted, ...prev]);
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
            }, 1400);
          } else if (payload.eventType === "UPDATE" && payload.new) {
            const updated = payload.new;
            const newStatus = (updated as any)?.status;
            let insertedViaUpdate = false;
            setUpdates((prev) => {
              const exists = prev.some((u) => u.id === updated.id);
              if (exists) {
                return prev.map((u) => (u.id === updated.id ? updated : u));
              }
              if (newStatus === "published") {
                insertedViaUpdate = true;
                return [updated, ...prev];
              }
              return prev;
            });
            if (insertedViaUpdate) {
              setNewIds((prev) => {
                const next = new Set(prev);
                next.add(updated.id);
                return next;
              });
              setTimeout(() => {
                setNewIds((prev) => {
                  const next = new Set(prev);
                  next.delete(updated.id);
                  return next;
                });
              }, 1400);
            }
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

  // Hydrate reaction counts/active once we know deviceId and updates
  useEffect(() => {
    if (!deviceId || !updates.length) return;
    const ids = updates.map((u) => u.id).join(",");
    fetch(`/api/embed/${liveblogId}/reactions/summary?updateIds=${encodeURIComponent(ids)}&deviceId=${encodeURIComponent(deviceId)}`)
      .then((r) => r.json())
      .then((res) => {
        if (res && res.counts) setReactionCounts(res.counts);
        if (res && res.active) setReactionActive(res.active);
      })
      .catch(() => {});
  }, [deviceId, updates, liveblogId]);

  // Realtime subscription for reactions
  useEffect(() => {
    const channel = supabase
      .channel(`reactions:${liveblogId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "update_reactions", filter: `liveblog_id=eq.${liveblogId}` },
        (payload: RealtimePostgresChangesPayload<any>) => {
          const type = payload.eventType;
          if (type !== "INSERT" && type !== "DELETE") return;
          const row: any = type === "INSERT" ? payload.new : payload.old;
          const updateId = row?.update_id as string | undefined;
          const reaction = row?.reaction as ReactionType | undefined;
          if (!updateId || !reaction) return;
          const delta = type === "INSERT" ? 1 : -1;
          setReactionCounts((prev) => {
            const prevCounts = prev[updateId] || { smile: 0, heart: 0, thumbs_up: 0 };
            const next = { ...prevCounts, [reaction]: Math.max(0, (prevCounts as any)[reaction] + delta) } as typeof prevCounts;
            return { ...prev, [updateId]: next };
          });
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

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center justify-end">
        {pushSupported ? (
          <button
            type="button"
            onClick={() => (pushEnabled ? unsubscribePush() : subscribePush())}
            disabled={pushBusy}
            aria-label={pushEnabled ? "Disable notifications" : "Enable notifications"}
            className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs text-muted-foreground hover:border-border/50"
          >
            {pushEnabled ? <BellOff className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
            {pushEnabled ? "Notifications on" : "Notify me"}
          </button>
        ) : (
          <span className="text-[11px] text-muted-foreground">Notifications unavailable</span>
        )}
      </div>
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
            "group relative overflow-hidden rounded-3xl border border-border/60 bg-background/80 p-5 shadow-[0_24px_60px_-42px_rgba(7,8,14,0.92)] transition-all duration-500 hover:border-border/40",
            u.pinned &&
              "border-amber-400/60 bg-gradient-to-br from-amber-500/12 via-background/75 to-background/90",
            isNew &&
              "will-change-transform animate-[lb-slide-fade-in_460ms_cubic-bezier(0.22,1,0.36,1)_both]"
          )}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_100%_0%,rgba(129,140,248,0.15),transparent)] opacity-80 transition-opacity duration-500 group-hover:opacity-100" />
          {u.pinned ? (
            <span className="pointer-events-none absolute -top-10 right-6 h-20 w-20 rounded-full bg-amber-400/15 blur-3xl" />
          ) : null}
          <div className="relative z-[1] space-y-4">
            {u.pinned || eventKey ? (
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                {u.pinned ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/50 bg-amber-500/10 px-3 py-1 text-amber-200">
                    Pinned
                  </span>
                ) : null}
                {eventKey ? (
                  <FootballEventBadge event={eventKey} size="sm" />
                ) : null}
              </div>
            ) : null}
            {eventKey ? (
              <FootballEventBanner
                event={eventKey}
                subtle
                isNew={isNew}
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
            <ReactionBar
              liveblogId={liveblogId}
              updateId={u.id}
              deviceId={deviceId}
              counts={reactionCounts[u.id] || { smile: 0, heart: 0, thumbs_up: 0 }}
              active={reactionActive[u.id] || { smile: false, heart: false, thumbs_up: false }}
              onChange={(nextCounts, nextActive) => {
                setReactionCounts((prev) => ({ ...prev, [u.id]: nextCounts }));
                setReactionActive((prev) => ({ ...prev, [u.id]: nextActive }));
              }}
              onTrack={trackEvent}
            />
            <p className="pt-1 text-xs text-muted-foreground">
              {u.published_at ? formatDate(u.published_at) : ""}
            </p>
          </div>
        </article>
      );
      })}
      {!sorted.length ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-background/60 p-10 text-center text-sm text-muted-foreground">
          Updates will appear here the moment they are published.
        </div>
      ) : null}
    </div>
  );
}
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = typeof window !== 'undefined' ? window.atob(base64) : Buffer.from(base64, 'base64').toString('binary');
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
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
          <figure className="overflow-hidden rounded-2xl border border-border/60 bg-black/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt=""
              className="h-auto w-full max-h-[420px] object-cover"
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
      <figure className="overflow-hidden rounded-2xl border border-border/60 bg-black/30">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt=""
          className="h-auto w-full max-h-[420px] object-cover"
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

function ReactionBar({
  liveblogId,
  updateId,
  deviceId,
  counts,
  active,
  onChange,
  onTrack,
}: {
  liveblogId: string;
  updateId: string;
  deviceId: string;
  counts: { smile: number; heart: number; thumbs_up: number };
  active: { smile: boolean; heart: boolean; thumbs_up: boolean };
  onChange: (
    nextCounts: { smile: number; heart: number; thumbs_up: number },
    nextActive: { smile: boolean; heart: boolean; thumbs_up: boolean }
  ) => void;
  onTrack?: (event: string, metadata?: Record<string, unknown>) => void;
}) {
  async function toggle(type: ReactionType) {
    if (!deviceId) return;
    const currentlyActive = active[type];
    const optimisticCounts = { ...counts, [type]: Math.max(0, counts[type] + (currentlyActive ? -1 : 1)) } as typeof counts;
    const optimisticActive = { ...active, [type]: !currentlyActive } as typeof active;
    onChange(optimisticCounts, optimisticActive);
    let tracked = false;
    try {
      const res = await fetch(`/api/embed/${liveblogId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updateId, type, deviceId }),
      });
       if (res.ok) tracked = true;
      const json = await res.json().catch(() => null);
      if (json && json.counts && json.active) {
        onChange(json.counts, json.active);
      }
    } catch {}
    if (tracked) {
      const analyticsEvent = currentlyActive ? "reaction_removed" : "reaction_added";
      onTrack?.(analyticsEvent, { updateId, type });
    }
  }

  return (
    <div className="mt-1.5 flex items-center gap-2 text-xs">
      <ReactionButton
        label="Smile"
        emoji="😊"
        count={counts.smile}
        active={active.smile}
        onClick={() => toggle("smile")}
      />
      <ReactionButton
        label="Heart"
        emoji="❤️"
        count={counts.heart}
        active={active.heart}
        onClick={() => toggle("heart")}
      />
      <ReactionButton
        label="Thumbs up"
        emoji="👍"
        count={counts.thumbs_up}
        active={active.thumbs_up}
        onClick={() => toggle("thumbs_up")}
      />
    </div>
  );
}

function ReactionButton({
  label,
  emoji,
  count,
  active,
  onClick,
}: {
  label: string;
  emoji: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-1",
        active ? "border-emerald-500/70 bg-emerald-500/10 text-emerald-300" : "border-border/60 bg-background/60 text-muted-foreground hover:border-border/40"
      )}
    >
      <span className="text-sm leading-none">{emoji}</span>
      <span className="min-w-[1ch] tabular-nums">{count}</span>
    </button>
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
      <div className="grid grid-cols-[1fr] gap-0">
        <div className="p-4">
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
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={content.image!}
              alt=""
              className="h-auto w-full object-cover"
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
