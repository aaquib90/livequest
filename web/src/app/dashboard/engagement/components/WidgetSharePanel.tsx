"use client";

import { Code2, ExternalLink, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import ClipboardButton from "./ClipboardButton";

type WidgetSharePanelProps = {
  embedSnippet: string;
  standaloneUrl: string;
  previewUrl: string;
  className?: string;
};

export default function WidgetSharePanel({ embedSnippet, standaloneUrl, previewUrl, className }: WidgetSharePanelProps) {
  return (
    <div
      className={cn(
        "space-y-3 rounded-2xl border border-border/60 bg-background/70 p-4 shadow-[0_12px_32px_-18px_rgba(8,12,20,0.55)]",
        className
      )}
    >
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground">Share widget</p>
        <p className="text-sm text-muted-foreground/80">Copy the embed code or send a standalone link.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="inline-flex items-center gap-2">
              <Code2 className="h-4 w-4" /> View embed snippet
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Embed snippet</DialogTitle>
              <DialogDescription>
                Highlight and copy the HTML below to place this widget on any site or landing page.
              </DialogDescription>
            </DialogHeader>
            <textarea
              readOnly
              value={embedSnippet}
              className="h-48 w-full resize-none rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-sm font-mono leading-relaxed text-muted-foreground focus:outline-none"
            />
            <div className="flex flex-wrap items-center gap-2">
              <ClipboardButton value={embedSnippet} label="Copy embed" className="border-border/70" />
              <ClipboardButton value={standaloneUrl} label="Copy link" leadingIcon={<Share2 className="h-4 w-4" />} className="border-border/70" />
              <Button asChild variant="secondary" className="bg-primary/10">
                <a href={previewUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" /> Open preview
                </a>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <ClipboardButton value={embedSnippet} label="Copy embed" />
        <ClipboardButton value={standaloneUrl} label="Copy link" leadingIcon={<Share2 className="h-4 w-4" />} />
        <Button asChild size="sm" variant="secondary" className="bg-primary/10 text-sm">
          <a href={previewUrl} target="_blank" rel="noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" /> Open preview
          </a>
        </Button>
      </div>
    </div>
  );
}
