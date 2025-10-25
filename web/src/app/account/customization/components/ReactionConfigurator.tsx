"use client";

import { useMemo, useRef, useState } from "react";
import { Plus, Sparkles, Trash2, Wand2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { DEFAULT_REACTIONS } from "@/lib/branding/constants";
import { accentOverlay } from "@/lib/branding/presentation";
import { normaliseReactions } from "@/lib/branding/utils";
import type { ReactionConfig, ReactionKind } from "@/lib/branding/types";
import { cn } from "@/lib/utils";

import { updateBrandReactions } from "../actions";
import { EmoteUploader } from "./EmoteUploader";

type ReactionConfiguratorProps = {
  accountId: string;
  accentColor: string;
  initialReactions: ReactionConfig[];
};

type ReactionDraft = {
  key: string;
  id: string | null;
  type: ReactionKind;
  label: string;
  emoji: string;
  imagePath: string;
  alt: string;
};

const MAX_REACTIONS = 4;
const QUICK_EMOJI = ["🔥", "👏", "😂", "😮", "🙌", "🎉", "👍", "❤️"];

function buildDraftKey(reaction: ReactionConfig, index: number): string {
  const base = reaction.id || `reaction-${index}`;
  return `${base}-${index}`;
}

function toDraft(reaction: ReactionConfig, index: number): ReactionDraft {
  return {
    key: buildDraftKey(reaction, index),
    id: reaction.id ?? null,
    type: reaction.type,
    label: reaction.label,
    emoji: reaction.type === "emoji" ? reaction.emoji ?? "" : "",
    imagePath: reaction.type === "image" ? reaction.image_path ?? "" : "",
    alt: reaction.type === "image" ? reaction.alt ?? "" : "",
  };
}

function createEmptyDraft(count: number): ReactionDraft {
  const base = DEFAULT_REACTIONS[Math.min(count, DEFAULT_REACTIONS.length - 1)];
  return toDraft(
    {
      ...base,
      id: null,
      label: base.label,
    },
    count
  );
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";

const buildPublicUrl = (path: string | null | undefined) => {
  if (!path || !supabaseUrl) return null;
  const safePath = path
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
  return `${supabaseUrl}/storage/v1/object/public/brand-assets/${safePath}`;
};

export function ReactionConfigurator({ accountId, accentColor, initialReactions }: ReactionConfiguratorProps) {
  const sanitizedInitial = useMemo(() => normaliseReactions(initialReactions), [initialReactions]);
  const tempKeyRef = useRef(0);
  const [reactions, setReactions] = useState<ReactionDraft[]>(() =>
    sanitizedInitial.slice(0, MAX_REACTIONS).map((reaction, index) => toDraft(reaction, index))
  );
  const payload = useMemo(
    () =>
      JSON.stringify(
        reactions.map((reaction) => ({
          id: reaction.id ?? undefined,
          type: reaction.type,
          label: reaction.label.trim(),
          emoji: reaction.type === "emoji" ? reaction.emoji.trim() : undefined,
          image_path: reaction.type === "image" ? reaction.imagePath.trim() : undefined,
          alt: reaction.type === "image" ? reaction.alt.trim() : undefined,
        }))
      ),
    [reactions]
  );

  const accentSoft = useMemo(() => accentOverlay(accentColor, 0.18), [accentColor]);
  const accentBg = useMemo(() => accentOverlay(accentColor, 0.08), [accentColor]);

  function updateReaction(key: string, updates: Partial<ReactionDraft>) {
    setReactions((prev) =>
      prev.map((reaction) => (reaction.key === key ? { ...reaction, ...updates } : reaction))
    );
  }

  function removeReaction(key: string) {
    setReactions((prev) => prev.filter((reaction) => reaction.key !== key));
  }

  function handleTypeChange(key: string, type: ReactionKind) {
    setReactions((prev) =>
      prev.map((reaction) => {
        if (reaction.key !== key) return reaction;
        if (type === reaction.type) return reaction;
        if (type === "emoji") {
          return {
            ...reaction,
            type,
            emoji: reaction.emoji || "😀",
            imagePath: "",
            alt: "",
          };
        }
        return {
          ...reaction,
          type,
          imagePath: reaction.imagePath,
          alt: reaction.alt,
          emoji: "",
        };
      })
    );
  }

  function resetToDefault() {
    setReactions(DEFAULT_REACTIONS.map((reaction, index) => toDraft(reaction, index)));
  }

  return (
    <Card className="border-border/70 bg-background/50">
      <CardHeader className="space-y-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="ml-auto inline-flex items-center gap-2 border-border/70"
          onClick={resetToDefault}
        >
          <Wand2 className="h-4 w-4" />
          Reset to defaults
        </Button>
        <CardTitle className="text-2xl">Audience reactions</CardTitle>
        <CardDescription className="text-base">
          Pick up to four emoji or emotes that readers can tap on each live update. Custom uploads must be
          SFW — we&apos;ll block anything that looks like adult content.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form action={updateBrandReactions} className="space-y-6" aria-label="Reaction configuration">
          <input type="hidden" name="reactionsPayload" value={payload} />
          {reactions.length ? (
            <div className="space-y-4">
              {reactions.map((reaction, index) => {
                const imageUrl =
                  reaction.type === "image" && reaction.imagePath ? buildPublicUrl(reaction.imagePath) : null;
                return (
                  <div
                    key={reaction.key}
                    className="rounded-2xl border border-border/60 bg-background/60 p-4 shadow-sm transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-3 flex-1">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex flex-col gap-1">
                            <Label htmlFor={`reaction-label-${reaction.key}`}>Label</Label>
                            <Input
                              id={`reaction-label-${reaction.key}`}
                              value={reaction.label}
                              maxLength={48}
                              placeholder={`Reaction ${index + 1}`}
                              onChange={(event) =>
                                updateReaction(reaction.key, { label: event.target.value })
                              }
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <Label htmlFor={`reaction-type-${reaction.key}`}>Type</Label>
                            <Select
                              id={`reaction-type-${reaction.key}`}
                              value={reaction.type}
                              onChange={(event) =>
                                handleTypeChange(reaction.key, event.target.value === "image" ? "image" : "emoji")
                              }
                            >
                              <option value="emoji">Emoji</option>
                              <option value="image">Custom emote</option>
                            </Select>
                          </div>
                        </div>
                        {reaction.type === "emoji" ? (
                          <div className="space-y-2">
                            <Label htmlFor={`reaction-emoji-${reaction.key}`}>Emoji</Label>
                            <Input
                              id={`reaction-emoji-${reaction.key}`}
                              value={reaction.emoji}
                              maxLength={10}
                              onChange={(event) =>
                                updateReaction(reaction.key, { emoji: event.target.value })
                              }
                              placeholder="Tap to pick or paste an emoji"
                            />
                            <div className="flex flex-wrap gap-2">
                              {QUICK_EMOJI.map((emoji) => (
                                <button
                                  key={emoji}
                                  type="button"
                                  className={cn(
                                    "rounded-lg border border-border/40 bg-background/70 px-2 py-1 text-lg transition hover:border-border/20",
                                    reaction.emoji === emoji && "border-primary/60 bg-primary/10"
                                  )}
                                  onClick={() => updateReaction(reaction.key, { emoji })}
                                  aria-label={`Use ${emoji}`}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <Label>Upload emote</Label>
                            <EmoteUploader
                              accountId={accountId}
                              value={reaction.imagePath}
                              onChange={(next) => updateReaction(reaction.key, { imagePath: next })}
                            />
                            <div className="flex flex-col gap-1">
                              <Label htmlFor={`reaction-alt-${reaction.key}`}>Alt text (optional)</Label>
                              <Input
                                id={`reaction-alt-${reaction.key}`}
                                value={reaction.alt}
                                maxLength={80}
                                placeholder="Describe the emote for screen readers"
                                onChange={(event) =>
                                  updateReaction(reaction.key, { alt: event.target.value })
                                }
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => removeReaction(reaction.key)}
                        aria-label={`Remove ${reaction.label}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mt-4">
                      <span className="text-xs text-muted-foreground">Preview</span>
                      <div
                        className="mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm shadow-sm"
                        style={{
                          borderColor: accentSoft,
                          color: accentColor,
                          background: accentBg,
                        }}
                      >
                        {reaction.type === "emoji" ? (
                          <span className="text-lg leading-none">{reaction.emoji || "😀"}</span>
                        ) : imageUrl ? (
                          <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-border/40 bg-background/80">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={imageUrl} alt="" className="h-full w-full object-contain" />
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Upload pending…</span>
                        )}
                        <span className="font-medium">{reaction.label || `Reaction ${index + 1}`}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No reactions configured yet. Add up to four emoji or emotes to help readers share quick
              feedback.
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="inline-flex items-center gap-2 border-border/70"
              disabled={reactions.length >= MAX_REACTIONS}
              onClick={() =>
                setReactions((prev) => {
                  const next = {
                    ...createEmptyDraft(prev.length),
                    key: `custom-${tempKeyRef.current++}`,
                    id: null,
                  };
                  return [...prev, next].slice(0, MAX_REACTIONS);
                })
              }
            >
              <Plus className="h-4 w-4" />
              Add reaction
            </Button>
            <Button type="submit" size="sm" className="inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Save reactions
            </Button>
          </div>
        </form>

        <div className="rounded-2xl border border-dashed border-border/60 bg-background/60 p-4">
          <p className="text-sm text-muted-foreground">
            Need more than four slots or automatic moderation? Ping us — we&apos;re prototyping reaction packs,
            shortlists, and built-in NSFW screening for enterprise teams.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
