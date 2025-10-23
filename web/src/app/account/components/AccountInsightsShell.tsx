"use client";

import dynamic from "next/dynamic";

const AccountInsightsClient = dynamic(() => import("./AccountInsightsClient"), {
  ssr: false,
  loading: () => (
    <div className="space-y-6">
      <div className="h-28 animate-pulse rounded-3xl border border-border/60 bg-background/40" />
      <div className="h-36 animate-pulse rounded-3xl border border-border/60 bg-background/40" />
    </div>
  ),
});

export default AccountInsightsClient;
