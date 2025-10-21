"use client";

import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type FolderInputProps = {
  id: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  options: string[];
  className?: string;
};

export function FolderInput({
  id,
  name,
  defaultValue = "",
  placeholder = "Add to folder",
  options,
  className,
}: FolderInputProps) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);

  const suggestionList = useMemo(() => {
    const entries = new Set<string>();
    options.forEach((opt) => {
      if (opt.trim()) entries.add(opt.trim());
    });
    if (defaultValue.trim()) {
      entries.add(defaultValue.trim());
    }
    const formatted = Array.from(entries).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );
    const query = value.trim().toLowerCase();
    if (!query.length) {
      return formatted.slice(0, 8);
    }
    return formatted.filter((opt) => opt.toLowerCase().includes(query)).slice(0, 8);
  }, [defaultValue, options, value]);

  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        value={value}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => {
          // Delay closing so click handlers can run
          requestAnimationFrame(() => setOpen(false));
        }}
        autoComplete="off"
        className={cn("bg-background/60", className)}
      />
      {open && suggestionList.length ? (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-border/60 bg-background/95 shadow-[0_16px_40px_-24px_rgba(9,9,11,0.68)] backdrop-blur">
          <ul className="max-h-48 overflow-auto py-1 text-sm">
            {suggestionList.map((suggestion) => (
              <li key={suggestion}>
                <button
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    setValue(suggestion);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
                >
                  <span className="truncate">{suggestion}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
