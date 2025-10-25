"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ExternalLink, Settings2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import ClipboardButton from "./ClipboardButton";
import WidgetSharePanel from "./WidgetSharePanel";

type Widget = {
  id: string;
  type: string;
  name: string | null;
  liveblog_id: string | null;
  status: string;
  created_at: string;
};

type WidgetListProps = {
  widgets: Widget[];
  baseUrl: string;
};

export default function WidgetList({ widgets, baseUrl }: WidgetListProps) {
  return (
    <div className="flex flex-col gap-4">
      {widgets.map((widget) => (
        <WidgetRow key={widget.id} widget={widget} baseUrl={baseUrl} />
      ))}
    </div>
  );
}

function WidgetRow({ widget, baseUrl }: { widget: Widget; baseUrl: string }) {
  const embedSnippet = useMemo(
    () =>
      `<div data-widget-id="${widget.id}" data-type="${widget.type}"></div><script src="${baseUrl}/widget.js" async></script>`,
    [widget.id, widget.type, baseUrl]
  );

  const standaloneUrl = `${baseUrl}/widgets/${widget.type}/${widget.id}`;
  const manageUrl = `/dashboard/engagement/${widget.id}`;

  return (
    <div className="flex flex-col gap-5 rounded-3xl border border-border/50 bg-background/70 p-6 shadow-[0_22px_48px_-30px_rgba(5,10,25,0.55)]">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-border/60 bg-transparent text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
            {capitalise(widget.type)}
          </Badge>
          <StatusPill status={widget.status} />
        </div>
        <Link href={manageUrl} className="text-lg font-semibold text-foreground underline-offset-4 hover:underline">
          {widget.name?.trim() || `${capitalise(widget.type)} widget`}
        </Link>
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground/80">
          <span className="font-mono">ID: {widget.id}</span>
          <span>Created {formatRelative(widget.created_at)}</span>
          {widget.liveblog_id ? <span>Linked to {widget.liveblog_id}</span> : null}
        </div>
      </div>

      <WidgetSharePanel embedSnippet={embedSnippet} standaloneUrl={standaloneUrl} previewUrl={standaloneUrl} className="bg-background/60" />

      <div className="flex flex-wrap items-center gap-2">
        <ClipboardButton
          value={widget.id}
          label="Copy ID"
          variant="ghost"
          size="sm"
          className="border-0 px-2 text-xs text-muted-foreground hover:text-foreground"
        />
        <Button asChild size="sm" variant="secondary" className="bg-primary/10">
          <Link href={manageUrl}>
            <Settings2 className="mr-2 h-4 w-4" /> Manage widget
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="border-border/60 bg-background/70">
          <Link href={standaloneUrl} target="_blank" rel="noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" /> Open preview
          </Link>
        </Button>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const variant = status === "active" ? "text-emerald-400" : status === "paused" ? "text-amber-400" : "text-muted-foreground";
  return (
    <span
      className={cn(
        "rounded-full border border-border/60 px-3 py-[2px] text-[10px] font-semibold uppercase tracking-[0.3em]",
        variant
      )}
    >
      {status}
    </span>
  );
}

function capitalise(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatRelative(input: string): string {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return input;
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const diffMs = date.getTime() - Date.now();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (Math.abs(diffDays) >= 7) {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  }
  return formatter.format(diffDays, "day");
}
