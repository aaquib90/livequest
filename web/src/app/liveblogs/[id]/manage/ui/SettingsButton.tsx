"use client";
import { useState } from "react";
import { BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function SettingsButton({ liveblogId, orderPref, privacy, discordWebhookUrl }: { liveblogId: string; orderPref: "newest" | "oldest"; privacy: "public" | "unlisted" | "private"; discordWebhookUrl?: string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <BadgeCheck className="mr-2 h-4 w-4" /> Settings
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Liveblog preferences</DialogTitle>
            <DialogDescription>
              Adjust reader-facing privacy and ordering. These changes apply immediately.
            </DialogDescription>
          </DialogHeader>
          <form
            action={`/api/liveblogs/${liveblogId}/settings`}
            method="post"
            className="grid gap-5 md:grid-cols-2"
          >
            <input type="hidden" name="liveblog_id" value={liveblogId} />
            <div className="space-y-2">
              <Label htmlFor="privacy">Privacy</Label>
              <Select id="privacy" name="privacy" defaultValue={privacy}>
                <option value="public">Public</option>
                <option value="unlisted">Unlisted</option>
                <option value="private">Private</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="order">Update ordering</Label>
              <Select id="order" name="order" defaultValue={orderPref}>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="discord_webhook_url">Discord Webhook URL</Label>
              <input
                id="discord_webhook_url"
                name="discord_webhook_url"
                defaultValue={discordWebhookUrl || ""}
                placeholder="https://discord.com/api/webhooks/..."
                className="w-full rounded-md border border-border/60 bg-background/60 px-3 py-2 text-sm"
                type="url"
                inputMode="url"
                pattern="https?://.*"
              />
              <p className="text-xs text-muted-foreground">Paste a channel webhook. New updates will be posted there.</p>
            </div>
            <DialogFooter className="md:col-span-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

