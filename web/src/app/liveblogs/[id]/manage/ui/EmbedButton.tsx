"use client";
import { useState } from "react";
import { Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function EmbedButton({ liveblogId }: { liveblogId: string }) {
  const [open, setOpen] = useState(false);
  const base = process.env.NEXT_PUBLIC_BASE_URL || "";
  const iframe = `<iframe src="${base}/embed/${liveblogId}" width="100%" height="600" loading="lazy"></iframe>`;
  const script = `<div data-liveblog-id="${liveblogId}"></div>\n<script src="${base}/embed.js" async></script>`;
  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Link2 className="mr-2 h-4 w-4" /> Embed
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Embed liveblog</DialogTitle>
            <DialogDescription>
              Copy the snippet you need below and drop it into your CMS or site builder.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Snippet label="Iframe" code={iframe} />
            <Snippet label="Inline script" code={script} />
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Snippet({ label, code }: { label: string; code: string }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">{label}</p>
      <pre className="rounded-2xl border border-border/60 bg-zinc-950/80 p-4 text-xs text-muted-foreground shadow-inner">
        <code className="whitespace-pre-wrap break-all">{code}</code>
      </pre>
    </div>
  );
}

