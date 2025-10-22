"use client";
import { useRef, useState, type DragEvent, useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  CalendarClock,
  Flag,
  ImagePlus,
  Link2,
  Send,
  Sparkles,
  Type,
} from "lucide-react";
import { createClient } from "@/lib/supabase/browserClient";
import {
  type FootballEventKey,
  footballEventOptions,
} from "@/lib/football/events";
import { matchTeam } from "@/lib/football/teams";
import { normalizeImageFile } from "@/lib/images/convert";

export default function Composer({
  liveblogId,
  template,
  layout = "sidebar",
  homeTeamSlug,
  homeTeamName,
  awayTeamSlug,
  awayTeamName,
}: {
  liveblogId: string;
  template?: string | null;
  layout?: "sidebar" | "full";
  homeTeamSlug?: string;
  homeTeamName?: string;
  awayTeamSlug?: string;
  awayTeamName?: string;
}) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<"published" | "draft" | "scheduled">("published");
  const [scheduledAt, setScheduledAt] = useState<string>("");
  const [eventType, setEventType] = useState<"" | FootballEventKey>("");
  const [teamSide, setTeamSide] = useState<"home" | "away">("home");
  const [squadHome, setSquadHome] = useState<Array<{ id: string; name: string }>>([]);
  const [squadAway, setSquadAway] = useState<Array<{ id: string; name: string }>>([]);
  const [player, setPlayer] = useState<string>("");
  const [playerIn, setPlayerIn] = useState<string>("");
  const [playerOut, setPlayerOut] = useState<string>("");
  const [manualName, setManualName] = useState<string>("");
  const [manualIn, setManualIn] = useState<string>("");
  const [manualOut, setManualOut] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [attachedImage, setAttachedImage] = useState<{ path: string; width?: number; height?: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const attachInputRef = useRef<HTMLInputElement | null>(null);
  const quickPublishInputRef = useRef<HTMLInputElement | null>(null);
  const supabase = createClient();
  const isFootball = template === "football";
  const isFullLayout = layout === "full";
  const hasTypedContent = [title, text].some((v) => v.trim());
  const canSend = hasTypedContent || isValidUrl(url);
  const sendDisabled =
    sending || !canSend || (status === "scheduled" && !scheduledAt);
  const statusExplainer =
    status === "draft"
      ? "Drafts stay in your planner until you publish them."
      : status === "scheduled"
        ? "We will send this live at the scheduled time."
        : "Publishing now pushes the update instantly to viewers.";
  const statusBadgeLabel =
    status === "draft"
      ? "Draft only"
      : status === "scheduled"
        ? "Scheduled send"
        : "Instant publish";
  const charCount = text.trim().length;
  const actionLabel = sending
    ? "Sending…"
    : status === "draft"
      ? "Save draft"
      : status === "scheduled"
        ? "Schedule update"
        : "Publish update";

  function isValidUrl(u: string): boolean {
    if (!u) return false;
    try {
      const parsed = new URL(u);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    const hasText = [title, text].some((v) => v.trim());
    const hasUrl = isValidUrl(url);
    if (!(hasText || hasUrl) || sending) return;
    setSending(true);
    let payload: Record<string, unknown>;
    if (hasUrl) {
      try {
        const res = await fetch("/api/links/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: url.trim() }),
        });
        const preview = await res.json().catch(() => ({}));
        payload = {
          type: "link",
          url: url.trim(),
          title: (preview && preview.title) || undefined,
          description: (preview && preview.description) || undefined,
          image: (preview && preview.image) || undefined,
          siteName: (preview && preview.siteName) || undefined,
          embed: (preview && preview.embed) || undefined,
        };
      } catch {
        payload = { type: "link", url: url.trim() };
      }
    } else {
      payload = {
        type: "text",
        title: title.trim() || undefined,
        text: text.trim(),
        image: attachedImage ? { path: attachedImage.path, width: attachedImage.width, height: attachedImage.height } : undefined,
      };
      if (isFootball && eventType) {
        payload.event = eventType;
        // Attach event_meta (names only, FE enrichment)
        if (eventType === "goal" || eventType === "own_goal") {
          const chosen = (teamSide === "home" ? player : player) || manualName.trim();
          payload.event_meta = {
            team: teamSide,
            player: chosen || undefined,
            teamLabel: teamSide === "home" ? (homeTeamName || "Home") : (awayTeamName || "Away"),
          };
        } else if (eventType === "substitution") {
          const outName = playerOut || manualOut.trim();
          const inName = playerIn || manualIn.trim();
          payload.event_meta = {
            team: teamSide,
            playerOut: outName || undefined,
            playerIn: inName || undefined,
            teamLabel: teamSide === "home" ? (homeTeamName || "Home") : (awayTeamName || "Away"),
          };
        }
      }
    }
    const { data: userData } = await supabase.auth.getUser();
    const author_id = userData.user?.id ?? null;
    let scheduled_at: string | null = null;
    if (status === "scheduled" && scheduledAt) {
      try {
        const dt = new Date(scheduledAt);
        if (!isNaN(dt.getTime())) scheduled_at = dt.toISOString();
      } catch {}
    }
    const { error } = await Sentry.startSpan(
      { op: "ui.submit", name: "Composer publish" },
      async () => {
        return await supabase
          .from("updates")
          .insert({
            liveblog_id: liveblogId,
            content: payload,
            status,
            scheduled_at,
            author_id,
          });
      }
    );
    if (!error) {
      setTitle("");
      setText("");
      setUrl("");
      setEventType("");
      setStatus("published");
      setScheduledAt("");
      setAttachedImage(null);
      // reset event selections
      setEventType("");
      setPlayer("");
      setPlayerIn("");
      setPlayerOut("");
      setManualName("");
      setManualIn("");
      setManualOut("");
      // Fire-and-forget broadcast to Discord (if webhook configured)
      if (status === "published") {
        try {
          fetch(`/api/liveblogs/${liveblogId}/broadcast/discord`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: payload }),
            keepalive: true,
          }).catch(() => {});
        } catch {}
        // Fire-and-forget push notification
        try {
          const text = (payload as any)?.title || (payload as any)?.text || 'New update';
          const site = process.env.NEXT_PUBLIC_SITE_URL || '';
          fetch(`/api/liveblogs/${liveblogId}/broadcast/notify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ payload: { title: 'New live update', body: String(text).slice(0, 140), url: `${site}/embed/${liveblogId}`, tag: `lb-${liveblogId}` } }),
            keepalive: true,
          }).catch(() => {});
        } catch {}
      }
    }
    setSending(false);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const nextTarget = e.relatedTarget as Node | null;
    if (nextTarget && e.currentTarget.contains(nextTarget)) return;
    setIsDragging(false);
  }

  async function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer?.files || []);
    const image = files.find((file) => file.type.startsWith("image/"));
    if (image) {
      await handleAttach(image);
    }
  }

  async function uploadToStorage(file: File): Promise<{ key: string; width?: number; height?: number } | null> {
    if (!file || uploading) return;
    setUploading(true);
    // Normalize file (convert HEIC→JPEG, keep GIFs as-is, others passthrough)
    const normalized = await normalizeImageFile(file);
    const ext = normalized.ext || (file.name.split(".").pop()?.toLowerCase() || "jpg");
    const key = `${liveblogId}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;
    const { width, height } = await readImageSize(normalized.file);
    const { error: upErr } = await Sentry.startSpan(
      { op: "storage.upload", name: "Upload image" },
      async () => {
        return await supabase.storage
          .from("media")
          .upload(key, normalized.file, { upsert: false, contentType: normalized.contentType || normalized.file.type });
      }
    );
    if (upErr) {
      setUploading(false);
      return null;
    }

    const { data: userData } = await supabase.auth.getUser();
    const uploader_id = userData.user?.id ?? null;
    try {
      await supabase
        .from("media_assets")
        .insert({
          liveblog_id: liveblogId,
          uploader_id,
          path: key,
          type: normalized.contentType || normalized.file.type,
          width,
          height,
        });
    } catch (err) {
      Sentry.captureException(err);
    }
    setUploading(false);
    return { key, width, height };
  }

  async function handleAttach(file: File) {
    const uploaded = await uploadToStorage(file);
    if (uploaded) {
      setAttachedImage({ path: uploaded.key, width: uploaded.width, height: uploaded.height });
    }
  }

  async function handleQuickPublish(file: File) {
    const uploaded = await uploadToStorage(file);
    if (uploaded) {
      const { key, width, height } = uploaded;
      try {
        await supabase
          .from("updates")
          .insert({
            liveblog_id: liveblogId,
            status: "published",
            content: { type: "image", path: key, width, height },
          });
        try {
          const content = { type: "image", path: key, width, height } as const;
          fetch(`/api/liveblogs/${liveblogId}/broadcast/discord`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content }),
            keepalive: true,
          }).catch(() => {});
        } catch {}
      } catch (err) {
        Sentry.captureException(err);
      }
    }
  }

  async function loadSquad(input?: string): Promise<Array<{ id: string; name: string }>> {
    const team = input ? matchTeam(input)?.slug || input : undefined;
    if (!team) return [];
    try {
      const { data, error } = await supabase
        .from("players")
        .select("id,name")
        .eq("competition_id", "premier-league")
        .eq("team_slug", team);
      if (error) return [];
      return (data || []).map((p: any) => ({ id: String(p.id), name: String(p.name) }));
    } catch {
      return [];
    }
  }

  // Load squads on mount or when slugs change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    (async () => {
      const [h, a] = await Promise.all([
        loadSquad(homeTeamSlug || homeTeamName),
        loadSquad(awayTeamSlug || awayTeamName),
      ]);
      setSquadHome(h);
      setSquadAway(a);
    })();
  }, [homeTeamSlug, awayTeamSlug, homeTeamName, awayTeamName]);

  const introCard = (
    <div className="flex flex-col gap-4 rounded-2xl border border-border/50 bg-background/60 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-[0.7rem] uppercase tracking-[0.28em] text-muted-foreground">
          <Sparkles className="h-3 w-3" />
          Live composer
        </span>
        <Badge variant="muted" className="bg-background/60 text-muted-foreground">
          Editors workspace
        </Badge>
      </div>
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-foreground">Shape the next update</h2>
        <p className="text-sm text-muted-foreground">
          Capture the play-by-play, enrich it with media, and decide when it should hit the feed.
        </p>
      </div>
    </div>
  );

  const commentaryCard = (
    <div className="space-y-4 rounded-2xl border border-border/50 bg-background/60 p-5">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
          <Type className="h-4 w-4 text-muted-foreground" />
          Commentary
        </span>
        <span className="text-xs text-muted-foreground">{charCount} characters</span>
      </div>

      <div className="space-y-2">
        <Label htmlFor="liveblog-title">Title (optional)</Label>
        <Input
          id="liveblog-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Headline or intro"
          className="bg-background/70"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="liveblog-text">Main text</Label>
        <Textarea
          id="liveblog-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              onSend(e);
            }
          }}
          onPaste={async (e) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            for (let i = 0; i < items.length; i++) {
              const it = items[i];
              if (it.kind === "file") {
                const file = it.getAsFile();
                if (file && file.type.startsWith("image/")) {
                  e.preventDefault();
                  await handleAttach(file);
                  return;
                }
              }
            }
          }}
          placeholder="Paint the picture…"
          className="min-h-[180px] resize-none bg-background/70"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Use Cmd ⌘ / Ctrl ⌃ + Enter for a quick send.
      </p>
    </div>
  );

  const publishCard = (
    <div className="space-y-3 rounded-2xl border border-border/50 bg-background/60 p-5">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <CalendarClock className="h-4 w-4 text-muted-foreground" />
        Publish controls
      </div>
      <div className="space-y-2">
        <Label htmlFor="liveblog-status">Publish mode</Label>
        <Select
          id="liveblog-status"
          value={status}
          onChange={(e) =>
            setStatus(
              e.target.value as "published" | "draft" | "scheduled"
            )
          }
          className="bg-background/70"
        >
          <option value="published">Publish now</option>
          <option value="scheduled">Schedule</option>
          <option value="draft">Save as draft</option>
        </Select>
      </div>
      {status === "scheduled" ? (
        <div className="space-y-2">
          <Label htmlFor="liveblog-scheduled-at">Schedule time</Label>
          <input
            id="liveblog-scheduled-at"
            type="datetime-local"
            className="w-full rounded-md border border-border/60 bg-background/70 px-3 py-2 text-sm"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Local timezone</p>
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground">{statusExplainer}</p>
    </div>
  );

  const linkCard = (
    <div className="space-y-3 rounded-2xl border border-border/50 bg-background/60 p-5">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Link2 className="h-4 w-4 text-muted-foreground" />
        Link preview
      </div>
      <div className="space-y-2">
        <Label htmlFor="liveblog-url">URL (optional)</Label>
        <Input
          id="liveblog-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/article"
          className="bg-background/70"
          inputMode="url"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Add a link to generate a rich preview card in the feed.
      </p>
    </div>
  );

  const eventCard = !isFootball
    ? null
    : (
      <div className="space-y-3 rounded-2xl border border-border/50 bg-background/60 p-5">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Flag className="h-4 w-4 text-muted-foreground" />
          Match event
        </div>
        <div className="space-y-2">
          <Label htmlFor="liveblog-event">Tag with an event</Label>
          <Select
            id="liveblog-event"
            value={eventType}
            onChange={(e) => setEventType(e.target.value as FootballEventKey | "")}
            className="bg-background/70"
          >
            <option value="">No event</option>
            {footballEventOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        {eventType ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Team</Label>
                <Select
                  value={teamSide}
                  onChange={(e) => setTeamSide((e.target.value as "home" | "away") || "home")}
                  className="bg-background/70"
                >
                  <option value="home">{homeTeamName || "Home"}</option>
                  <option value="away">{awayTeamName || "Away"}</option>
                </Select>
              </div>
            </div>

            {(eventType === "goal" || eventType === "own_goal") ? (
              <div className="grid gap-3">
                <div className="space-y-2">
                  <Label>Player</Label>
                  <Select
                    value={player}
                    onChange={(e) => setPlayer(e.target.value)}
                    className="bg-background/70"
                  >
                    <option value="">— Select —</option>
                    {(teamSide === "home" ? squadHome : squadAway).map((p) => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Or type a name</Label>
                  <Input value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="Player name" className="bg-background/70" />
                </div>
              </div>
            ) : null}

            {eventType === "substitution" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Off (player out)</Label>
                  <Select
                    value={playerOut}
                    onChange={(e) => setPlayerOut(e.target.value)}
                    className="bg-background/70"
                  >
                    <option value="">— Select —</option>
                    {(teamSide === "home" ? squadHome : squadAway).map((p) => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </Select>
                  <Input value={manualOut} onChange={(e) => setManualOut(e.target.value)} placeholder="Or type a name" className="bg-background/70" />
                </div>
                <div className="space-y-2">
                  <Label>On (player in)</Label>
                  <Select
                    value={playerIn}
                    onChange={(e) => setPlayerIn(e.target.value)}
                    className="bg-background/70"
                  >
                    <option value="">— Select —</option>
                    {(teamSide === "home" ? squadHome : squadAway).map((p) => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </Select>
                  <Input value={manualIn} onChange={(e) => setManualIn(e.target.value)} placeholder="Or type a name" className="bg-background/70" />
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Events power the supporter-facing timeline and match widgets.
        </p>
      </div>
    );

  const dropzoneCard = (
    <div
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`rounded-2xl border border-dashed border-border/60 bg-background/60 p-5 transition-colors ${
        isDragging ? "border-primary/60 bg-primary/10" : ""
      }`}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <ImagePlus className="h-4 w-4 text-muted-foreground" />
          Imagery
        </div>
        {attachedImage ? (
          <div className="overflow-hidden rounded-lg border border-border/60">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={createClient().storage.from("media").getPublicUrl(attachedImage.path).data.publicUrl}
              alt=""
              className="h-auto w-full max-h-[220px] object-cover"
            />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Drag an image in to attach it to your next text update.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={attachInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) await handleAttach(f);
              if (attachInputRef.current) attachInputRef.current.value = "";
            }}
          />
          <input
            ref={quickPublishInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) await handleQuickPublish(f);
              if (quickPublishInputRef.current) quickPublishInputRef.current.value = "";
            }}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={uploading}
            onClick={() => attachInputRef.current?.click()}
            className="gap-2 border border-border/70 bg-background/70"
          >
            <ImagePlus className="h-4 w-4" />
            {uploading ? "Uploading…" : attachedImage ? "Replace image" : "Attach image"}
          </Button>
          {attachedImage ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setAttachedImage(null)}
              className="text-xs text-muted-foreground"
            >
              Remove
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={uploading}
            onClick={() => quickPublishInputRef.current?.click()}
            className="text-xs text-muted-foreground"
          >
            Quick publish image only
          </Button>
          <span className="text-xs text-muted-foreground">JPEG, PNG, GIF, HEIC up to 10 MB.</span>
        </div>
      </div>
    </div>
  );

  return (
    <form
      onSubmit={onSend}
      className={
        isFullLayout
          ? "flex flex-col gap-6 rounded-[32px] border border-border/60 bg-background/70 p-6 shadow-[0_32px_80px_-42px_rgba(9,9,11,0.85)]"
          : "sticky top-6 flex flex-col gap-6 rounded-[28px] border border-border/60 bg-background/70 p-6 shadow-[0_28px_70px_-40px_rgba(9,9,11,0.85)] backdrop-blur"
      }
    >
      {introCard}

      {isFullLayout ? (
        <div className="xl:grid xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)] xl:gap-6">
          <div className="space-y-5">
            {commentaryCard}
            {dropzoneCard}
          </div>
          <div className="mt-6 space-y-5 xl:mt-0">
            {publishCard}
            {linkCard}
            {eventCard}
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {commentaryCard}
          <div className="grid gap-5 lg:grid-cols-2">
            {publishCard}
            {linkCard}
          </div>
          {eventCard}
          {dropzoneCard}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
        <Button type="submit" disabled={sendDisabled} size="sm" className="gap-2">
          <Send className="h-4 w-4" />
          {actionLabel}
        </Button>
        <Badge variant="outline" className="bg-background/60 text-muted-foreground">
          {statusBadgeLabel}
        </Badge>
      </div>
    </form>
  );
}

async function readImageSize(
  file: File
): Promise<{ width?: number; height?: number }> {
  try {
    const url = URL.createObjectURL(file);
    const img = new Image();
    const dims = await new Promise<{ width: number; height: number }>(
      (resolve, reject) => {
        img.onload = () =>
          resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = reject;
        img.src = url;
      }
    );
    URL.revokeObjectURL(url);
    return dims;
  } catch {
    return {};
  }
}
