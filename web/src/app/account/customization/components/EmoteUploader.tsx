"use client";

import { useMemo, useRef, useState } from "react";
import { Loader2, Trash2, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/browserClient";
import { cn } from "@/lib/utils";

type EmoteUploaderProps = {
  accountId: string;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  className?: string;
  maxSizeKB?: number;
};

const ACCEPTED_TYPES = ["image/png", "image/webp", "image/jpeg", "image/gif"];
const NSFW_KEYWORDS = ["nsfw", "porn", "nude", "nudity", "xxx", "sex", "boob", "butt", "cock", "dick", "pussy"];

export function EmoteUploader({
  accountId,
  value,
  onChange,
  disabled = false,
  className,
  maxSizeKB = 512,
}: EmoteUploaderProps) {
  const supabase = useMemo(() => createClient(), []);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const publicUrl = useMemo(() => {
    if (!value) return null;
    try {
      return supabase.storage.from("brand-assets").getPublicUrl(value).data.publicUrl || null;
    } catch {
      return null;
    }
  }, [supabase, value]);

  async function handleUpload(file: File) {
    if (!accountId) {
      setError("Missing account context. Please refresh and try again.");
      return;
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Unsupported file type. Please upload PNG, WebP, JPG, or GIF.");
      return;
    }
    if (file.size > maxSizeKB * 1024) {
      setError(`File is too large. Please keep it under ${maxSizeKB}KB.`);
      return;
    }
    const lowerName = file.name.toLowerCase();
    if (NSFW_KEYWORDS.some((keyword) => lowerName.includes(keyword))) {
      setError("File name contains restricted terms. Please choose another emote.");
      return;
    }

    setUploading(true);
    setStatus("Uploading…");
    setError(null);

    const extension = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
    const safeBase = lowerName.replace(/\.[^/.]+$/, "").replace(/[^a-z0-9]+/g, "-") || "emote";
    const uuid =
      typeof globalThis.crypto !== "undefined" && "randomUUID" in globalThis.crypto
        ? globalThis.crypto.randomUUID()
        : Math.random().toString(36).slice(2);
    const objectPath = `${accountId}/emotes/${safeBase.slice(0, 32)}-${uuid}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("brand-assets")
      .upload(objectPath, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type || "image/png",
      });

    if (uploadError) {
      setError(uploadError.message ?? "Upload failed. Please try again.");
      setStatus(null);
      setUploading(false);
      return;
    }

    onChange(objectPath);
    setStatus("Upload complete. Save changes to publish.");
    setUploading(false);
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          className="hidden"
          disabled={disabled || uploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            void handleUpload(file);
            event.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || uploading}
          className="inline-flex items-center gap-2"
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
          {uploading ? "Uploading…" : "Upload emote"}
        </Button>
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-destructive"
            disabled={disabled || uploading}
            onClick={() => {
              onChange("");
              setStatus(null);
              setError(null);
            }}
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </Button>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        PNG, WebP, JPG or GIF. Max {maxSizeKB}KB. Uploads are moderated — NSFW artwork isn&apos;t allowed.
      </p>
      {status ? <p className="text-xs text-emerald-400">{status}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {publicUrl ? (
        <div className="h-16 w-16 overflow-hidden rounded-xl border border-border/60 bg-background/70">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={publicUrl} alt="" className="h-full w-full object-contain" loading="lazy" />
        </div>
      ) : null}
    </div>
  );
}
