"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import { Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ButtonBaseProps = ComponentProps<typeof Button>;

type ClipboardButtonProps = {
  value: string;
  label: string;
  copiedLabel?: string;
  leadingIcon?: ReactNode;
  className?: string;
} & Omit<ButtonBaseProps, "onClick" | "children" | "value">;

export default function ClipboardButton({
  value,
  label,
  copiedLabel = "Copied",
  leadingIcon,
  className,
  variant = "outline",
  size = "sm",
  ...buttonProps
}: ClipboardButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error("Clipboard copy failed", error);
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleCopy}
      className={cn("inline-flex items-center gap-2", className)}
      disabled={copied}
      {...buttonProps}
    >
      {copied ? (
        copiedLabel
      ) : (
        <>
          {leadingIcon ?? <Copy className="h-4 w-4" />} {label}
        </>
      )}
    </Button>
  );
}
