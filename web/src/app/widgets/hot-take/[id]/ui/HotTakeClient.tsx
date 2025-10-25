"use client";
import { useCallback, useEffect, useMemo, useState } from "react";

import { accentOverlay } from "@/lib/branding/presentation";
import { cn } from "@/lib/utils";

import { themeContainerClass, useWidgetTheme } from "../../../shared/useWidgetTheme";
import "./hot-take-slider.css";

const DEVICE_KEY = "lb_widget_device_id";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const token = `${name}=`;
  const parts = document.cookie.split("; ");
  for (const part of parts) {
    if (part.startsWith(token)) {
      return decodeURIComponent(part.slice(token.length));
    }
  }
  return null;
}

function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  const encoded = encodeURIComponent(value);
  document.cookie = `${name}=${encoded}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

export default function HotTakeClient({ widgetId, apiBase }: { widgetId: string; apiBase: string }) {
  const [deviceId, setDeviceId] = useState<string>("");
  const [value, setValue] = useState<number>(50);
  const [mean, setMean] = useState<number>(50);
  const [total, setTotal] = useState<number>(0);
  const [busy, setBusy] = useState<boolean>(false);
  const [hasVoted, setHasVoted] = useState<boolean>(false);
  const [labelLeft, setLabelLeft] = useState<string>("Confident");
  const [labelRight, setLabelRight] = useState<string>("Skeptical");
  const [headerImageUrl, setHeaderImageUrl] = useState<string>("");

  const {
    accent,
    accentStrong,
    accentMuted,
    accentForeground,
    cornerClass,
    backgroundStyle,
    styleVars,
    logoUrl,
    widgetConfig,
  } = useWidgetTheme(widgetId, apiBase);

  useEffect(() => {
    const cfg = widgetConfig as Record<string, unknown> | undefined;
    if (!cfg) return;
    if (typeof cfg.labelLeft === "string" && cfg.labelLeft.trim()) setLabelLeft(cfg.labelLeft.trim());
    if (typeof cfg.labelRight === "string" && cfg.labelRight.trim()) setLabelRight(cfg.labelRight.trim());
    if (typeof cfg.headerImageUrl === "string" && cfg.headerImageUrl.trim()) {
      setHeaderImageUrl(cfg.headerImageUrl.trim());
    }
  }, [widgetConfig]);

  const voteKey = useMemo(() => `lb_hot_take_voted_${widgetId}`, [widgetId]);

  const markVoted = useCallback(() => {
    try {
      window.localStorage.setItem(voteKey, "1");
    } catch {}
    writeCookie(voteKey, "1");
    setHasVoted(true);
  }, [voteKey]);

  useEffect(() => {
    try {
      let id = readCookie(DEVICE_KEY) || window.localStorage.getItem(DEVICE_KEY) || "";
      if (!id) {
        id = crypto.randomUUID();
      }
      window.localStorage.setItem(DEVICE_KEY, id);
      writeCookie(DEVICE_KEY, id);
      setDeviceId(id);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(voteKey);
      const cookie = readCookie(voteKey);
      if ((stored === "1" || cookie === "1") && !hasVoted) {
        markVoted();
      }
    } catch {}
  }, [hasVoted, markVoted, voteKey]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/api/widgets/hot-take/${encodeURIComponent(widgetId)}/summary`, { cache: "no-store" });
      const json = await res.json();
      if (json && typeof json.mean === "number") setMean(Math.round(json.mean));
      if (json && typeof json.total === "number") setTotal(Number(json.total) || 0);
    } catch {}
  }, [apiBase, widgetId]);

  const track = useCallback(async () => {
    if (!deviceId || hasVoted) return;
    try {
      setBusy(true);
      const res = await fetch(`${apiBase}/api/widgets/hot-take/${encodeURIComponent(widgetId)}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value, deviceId }),
      });
      const json = await res.json().catch(() => null);
      if (json && typeof json.mean === "number") setMean(Math.round(json.mean));
      if (json && typeof json.total === "number") setTotal(Number(json.total) || 0);
      if (json?.ok) {
        markVoted();
      } else if (!res.ok && (json?.error || json?.message)) {
        console.error("Hot take vote failed", json?.message || json?.error);
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  }, [apiBase, widgetId, value, deviceId, hasVoted, markVoted, refresh]);

  useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, 5000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const gradient = useMemo(() => {
    const pct = Math.max(0, Math.min(100, mean));
    return `linear-gradient(90deg, ${accentOverlay(accent, 0.3)} 0%, ${accentOverlay(
      accent,
      0.65
    )} ${pct}%, rgba(255,255,255,0.08) ${pct}%)`;
  }, [accent, mean]);

  const containerClass = themeContainerClass("mx-auto w-full max-w-xl px-6 py-7", cornerClass);
  const containerStyle = useMemo(
    () => ({
      ...backgroundStyle,
      ...styleVars,
    }),
    [backgroundStyle, styleVars]
  );

  const softForeground = "#ecfeff";

  return (
    <div className={containerClass} style={containerStyle}>
      <div className="relative space-y-6">
        {headerImageUrl ? (
          <div className="overflow-hidden rounded-3xl border border-white/10 shadow-[0_28px_60px_-42px_rgba(0,0,0,0.65)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={headerImageUrl} alt="Hot Take" className="h-44 w-full object-cover" />
          </div>
        ) : null}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-[6px] text-[10px] font-semibold uppercase tracking-[0.28em] text-white/70">
              {logoUrl ? (
                <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-white/20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoUrl} alt="Brand logo" className="h-full w-full object-cover" />
                </span>
              ) : null}
              <span>Hot take</span>
            </div>
            <h2 className="text-xl font-semibold text-white">Hot Take Meter</h2>
            <p className="max-w-xl text-sm text-white/70">
              Slide to share your sentiment. We track one vote per device so the crowd stays honest.
            </p>
          </div>
          <div
            className="self-start rounded-full border px-6 py-[6px] text-[10px] font-semibold uppercase tracking-[0.25em] text-white/70 min-w-[160px] text-center"
            style={{
              borderColor: accentMuted,
              backgroundColor: accentOverlay(accent, 0.1),
              color: softForeground,
            }}
          >
            {total} votes logged
          </div>
        </div>

        <div
          className={cn(
            "space-y-3 rounded-[1.75rem] border px-5 py-4",
            "shadow-[0_24px_80px_-48px_rgba(5,8,20,0.85)]"
          )}
          style={{
            borderColor: accentOverlay(accent, 0.3),
            backgroundColor: accentOverlay(accent, 0.18),
            backdropFilter: "blur(20px)",
          }}
        >
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
            <span>{labelLeft}</span>
            <span>{labelRight}</span>
          </div>
          <div className="space-y-2">
            <div className="relative h-4 w-full overflow-hidden rounded-full border border-white/15" style={{ background: gradient }}>
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-5 w-[2px] -translate-x-1/2 -translate-y-1/2 bg-white/80" />
            </div>
            <div className="flex items-center justify-between text-sm text-white/80">
              <span className="font-medium text-white">Crowd heat: {mean}</span>
              <span className="text-xs text-white/60">Your slider: {value}</span>
            </div>
          </div>
        </div>

        <div className="pt-3">
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            onInput={(e) => setValue(Number((e.target as HTMLInputElement).value))}
            className="hot-take-slider block w-full cursor-pointer appearance-none rounded-full border border-white/10 bg-white/5 focus:outline-none mb-6"
            style={{
              touchAction: "pan-x",
              accentColor: accent,
              backgroundImage: `linear-gradient(90deg, ${accentOverlay(accent, 0.6)} 0%, ${accentOverlay(
                accent,
                0.6
              )} ${value}%, rgba(255,255,255,0.08) ${value}%)`,
            }}
            aria-label="Set your take"
            disabled={hasVoted}
          />
          <button
            type="button"
            onClick={track}
            disabled={!deviceId || busy || hasVoted}
            className="inline-flex w-full items-center justify-center rounded-full border border-transparent px-4 py-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-1 hover:-translate-y-[1px]"
            style={{
              backgroundColor: accent,
              color: accentForeground,
              boxShadow: `0 22px 65px -32px ${accentStrong}`,
              borderColor: accentOverlay(accent, 0.32),
              opacity: busy ? 0.9 : 1,
            }}
          >
            {busy ? "Submitting…" : hasVoted ? "Vote recorded" : "Submit your take"}
          </button>
        </div>
      {hasVoted ? (
        <p className="text-center text-xs text-slate-200/75">
          Thanks for weighing in. Come back later to see how the crowd shifts.
        </p>
      ) : null}
      </div>
    </div>
  );
}
