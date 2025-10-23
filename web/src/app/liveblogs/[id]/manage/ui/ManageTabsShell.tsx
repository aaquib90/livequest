"use client";

import dynamic from "next/dynamic";

import type { ManageTabsProps } from "./ManageTabs";

const ManageTabsLazy = dynamic(() => import("./ManageTabs"), {
  ssr: false,
  loading: () => (
    <div className="space-y-6">
      <div className="h-10 w-full animate-pulse rounded-2xl bg-muted/40" />
      <div className="h-[480px] animate-pulse rounded-3xl border border-border/60 bg-background/40" />
    </div>
  ),
});

export default function ManageTabsShell(props: ManageTabsProps) {
  return <ManageTabsLazy {...props} />;
}
