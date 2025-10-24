"use client";

import { useMemo, useRef, useState } from "react";
import { Loader2, Trash2, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/browserClient";
import { cn } from "@/lib/utils";

type BrandAssetUploaderProps = {
  accountId: string;
  name: string;
  label: string;
  initialPath?: string | null;
  placeholder?: string;
  description?: string;
  helperText?: string;
  accept?: string;
  maxSizeMB?: number;
  bucket?: string;
  previewAspect?: "square" | "wide";
  disabled?: boolean;
};

export default function BrandAssetUploader({
  accountId,
  name,
  label,
  initialPath,
  placeholder,
  description,
  helperText,
  accept = "image/svg+xml,image/png,image/jpeg,image/webp",
  maxSizeMB = 4,
  bucket = "brand-assets",
  previewAspect = "square",
  disabled = false,
}: BrandAssetUploaderProps) {
  const supabase = useMemo(() => createClient(), []);
  const [value, setValue] = useState(initialPath ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const maxBytes = maxSizeMB * 1024 * 1024;

  const publicUrl = useMemo(() => {
    if (!value) return null;
    try {
      return supabase.storage.from(bucket).getPublicUrl(value).data.publicUrl || null;
    } catch {
      return null;
    }
  }, [bucket, supabase, value]);

  async function handleUpload(file: File) {
    if (!accountId) {
      setError("Missing account context. Please refresh and try again.");
      return;
    }
    if (file.size > maxBytes) {
      setError(`File is too large. Please keep it under ${maxSizeMB}MB.`);
      return;
    }
    setUploading(true);
    setError(null);
    setStatus("Uploading…");

    const extension = (file.name.split(".").pop() || "bin").replace(/[^a-z0-9]/gi, "").toLowerCase() || "bin";
    const safeNameCandidate = (name.replace(/Path$/i, "") || "asset").toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const safeName = safeNameCandidate.length ? safeNameCandidate : "asset";
    const uuid =
      typeof globalThis.crypto !== "undefined" && "randomUUID" in globalThis.crypto
        ? globalThis.crypto.randomUUID()
        : Math.random().toString(36).slice(2);
    const objectPath = `${accountId}/${safeName}-${uuid}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(objectPath, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type || "application/octet-stream",
      });

    if (uploadError) {
      setError(uploadError.message ?? "Upload failed. Please try again.");
      setStatus(null);
      setUploading(false);
      return;
    }

    setValue(objectPath);
    setStatus("Upload complete. Save changes to publish.");
    setUploading(false);
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          id={name}
          name={name}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(event) => {
            setValue(event.target.value);
            setStatus(null);
            setError(null);
          }}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
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
          className="inline-flex items-center gap-2 whitespace-nowrap"
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
          {uploading ? "Uploading…" : "Upload"}
        </Button>
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || uploading}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
            onClick={() => {
              setValue("");
              setStatus(null);
              setError(null);
            }}
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </Button>
        ) : null}
      </div>
      {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      {helperText ? <p className="text-xs text-muted-foreground/80">{helperText}</p> : null}
      {status ? <p className="text-xs text-emerald-400">{status}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {publicUrl ? (
        <div
          className={cn(
            "relative overflow-hidden rounded-xl border border-border/60 bg-background/60",
            previewAspect === "square" ? "h-28 w-28" : "h-32 w-full"
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={publicUrl}
            alt=""
            className={cn(
              "h-full w-full object-contain",
              previewAspect === "wide" ? "object-cover" : "object-contain"
            )}
            loading="lazy"
          />
        </div>
      ) : null}
    </div>
  );
}
