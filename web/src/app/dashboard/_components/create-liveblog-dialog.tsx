"use client";

import { useMemo, useState } from "react";
import { PenLine, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FolderInput } from "./folder-input";

type CreateLiveblogDialogProps = {
  createLiveblog: (formData: FormData) => Promise<void>;
  folderOptions: string[];
};

export function CreateLiveblogDialog({
  createLiveblog,
  folderOptions,
}: CreateLiveblogDialogProps) {
  const [open, setOpen] = useState(false);
  const suggestions = useMemo(
    () =>
      Array.from(
        new Set(folderOptions.map((option) => option.trim()).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })),
    [folderOptions]
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="px-7">
          <PenLine className="mr-2 h-4 w-4" />
          Start from scratch
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader className="space-y-3">
          <Badge variant="muted" className="mx-auto w-fit border-border/40">
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            New liveblog
          </Badge>
          <DialogTitle>Start a fresh liveblog</DialogTitle>
          <DialogDescription>
            Give it a name, drop it into a folder, and add context for your team.
            You can fine-tune everything later inside the studio.
          </DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            await createLiveblog(formData);
            setOpen(false);
          }}
          className="space-y-5"
        >
          <div className="space-y-2 text-left">
            <Label htmlFor="new-liveblog-title">Title</Label>
            <Input
              id="new-liveblog-title"
              name="title"
              required
              placeholder="Champions League Final — Live reactions"
            />
          </div>
          <div className="space-y-2 text-left">
            <Label htmlFor="new-liveblog-folder">
              Folder <span className="text-xs text-muted-foreground">(optional)</span>
            </Label>
            <FolderInput
              id="new-liveblog-folder"
              name="folder"
              options={suggestions}
              placeholder="Add to folder e.g. Sport, Tech"
            />
          </div>
          <div className="space-y-2 text-left">
            <Label htmlFor="new-liveblog-description">
              Description <span className="text-xs text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="new-liveblog-description"
              name="description"
              placeholder="Optional context for your team and embeds."
              className="min-h-[120px]"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit">
              <PenLine className="mr-2 h-4 w-4" />
              Create liveblog
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
