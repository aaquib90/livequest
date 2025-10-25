"use client";
import { useCallback, useEffect, useMemo, useState } from "react";

import { accentOverlay } from "@/lib/branding/presentation";
import { cn } from "@/lib/utils";

import { themeContainerClass, useWidgetTheme } from "../../../shared/useWidgetTheme";

export default function CaptionThisClient({ widgetId, apiBase }: { widgetId: string; apiBase: string }) {
  const [deviceId, setDeviceId] = useState<string>("");
  const [text, setText] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);
  const [items, setItems] = useState<Array<{ id: string; content: string; votes: number }>>([]);
  const {
    accent,
    accentSoft,
    accentStrong,
    accentMuted,
    accentForeground,
    cornerClass,
    backgroundStyle,
    styleVars,
    logoUrl,
  } = useWidgetTheme(widgetId, apiBase);

  useEffect(() => {
    try {
      const key = `lb_widget_device_id`;
      let id = window.localStorage.getItem(key) || "";
      if (!id) {
        id = crypto.randomUUID();
        window.localStorage.setItem(key, id);
      }
      setDeviceId(id);
    } catch {}
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/api/widgets/caption-this/${encodeURIComponent(widgetId)}/list`, { cache: "no-store" });
      const json = await res.json();
      if (json && Array.isArray(json.items)) setItems(json.items);
    } catch {}
  }, [apiBase, widgetId]);

  useEffect(() => {
    load();
    const id = window.setInterval(load, 5000);
    return () => window.clearInterval(id);
  }, [load]);

  const submit = useCallback(async () => {
    if (!deviceId || !text.trim()) return;
    try {
      setBusy(true);
      await fetch(`${apiBase}/api/widgets/caption-this/${encodeURIComponent(widgetId)}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), deviceId }),
      });
      setText("");
    } finally {
      setBusy(false);
    }
  }, [apiBase, widgetId, deviceId, text]);

  const vote = useCallback(async (submissionId: string) => {
    if (!deviceId) return;
    try {
      await fetch(`${apiBase}/api/widgets/caption-this/${encodeURIComponent(widgetId)}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, deviceId }),
      });
      load();
    } catch {}
  }, [apiBase, widgetId, deviceId, load]);

  const containerClass = themeContainerClass("mx-auto w-full max-w-3xl space-y-7 px-6 py-7", cornerClass);
  const containerStyle = useMemo(
    () => ({
      ...backgroundStyle,
      ...styleVars,
    }),
    [backgroundStyle, styleVars]
  );

  const softForeground = "#f8fafc";

  return (
    <div className={containerClass} style={containerStyle}>
      <div className="relative space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white/80">
              <span>Caption this</span>
            </div>
            <h2 className="text-xl font-semibold text-white">Drop your sharpest caption</h2>
            <p className="text-sm text-white/70">
              Share a punchy one-liner. Editors will spotlight the strongest submissions in the stream.
            </p>
          </div>
          {logoUrl ? (
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-white/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoUrl} alt="Brand logo" className="h-full w-full object-cover" />
            </div>
          ) : null}
        </div>

        <div
          className={cn(
            "space-y-4 rounded-[1.75rem] border px-5 py-5",
            "shadow-[0_26px_90px_-52px_rgba(5,8,20,0.75)] backdrop-blur-xl"
          )}
          style={{
            borderColor: accentOverlay(accent, 0.32),
            backgroundColor: accentOverlay(accent, 0.18),
          }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write a witty caption..."
              className="flex-1 rounded-2xl border border-white/20 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--widget-accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-black/60"
              maxLength={200}
              style={{
                boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.06)`
              }}
            />
            <button
              type="button"
              onClick={submit}
              disabled={!deviceId || busy || !text.trim()}
              className="inline-flex items-center justify-center rounded-full border border-transparent px-5 py-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-1 hover:-translate-y-[1px]"
              style={{
                backgroundColor: accent,
                color: accentForeground,
                boxShadow: `0 20px 60px -28px ${accentStrong}`,
                borderColor: accentOverlay(accent, 0.3),
                opacity: busy ? 0.9 : 1,
              }}
            >
              {busy ? "Sending…" : "Submit"}
            </button>
          </div>
          <p className="text-xs text-white/60">Need inspiration? Think of the moment, give it a twist, keep it to 200 characters.</p>
        </div>

        <div className="space-y-3">
          {items.length ? (
            items.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "group relative flex flex-col gap-3 rounded-2xl border px-5 py-4 transition",
                  "shadow-[0_18px_60px_-40px_rgba(6,10,20,0.7)] transition-transform hover:-translate-y-0.5"
                )}
                style={{
                  borderColor: accentOverlay(accent, 0.22),
                  backgroundColor: accentOverlay(accent, 0.1),
                }}
              >
                <p className="text-base font-medium leading-relaxed text-white">{item.content}</p>
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-white/70">
                  <span
                    className="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-semibold uppercase tracking-wide"
                    style={{
                      borderColor: accentOverlay(accent, 0.25),
                      backgroundColor: accentSoft,
                      color: softForeground,
                    }}
                  >
                    <span className="tabular-nums text-sm">{item.votes}</span>
                    votes
                  </span>
                  <button
                    type="button"
                    onClick={() => vote(item.id)}
                    className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/35 focus-visible:ring-offset-1 hover:-translate-y-[1px]"
                    style={{
                      backgroundColor: accentOverlay(accent, 0.12),
                      border: `1px solid ${accentOverlay(accent, 0.35)}`,
                      color: softForeground,
                      boxShadow: `0 16px 45px -30px ${accentStrong}`,
                    }}
                  >
                    Upvote
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div
              className="rounded-2xl border border-dashed px-6 py-12 text-center text-sm text-slate-200/70"
              style={{ borderColor: accentMuted, backgroundColor: accentOverlay(accent, 0.08) }}
            >
              No captions yet. Be the first to spark the thread.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
