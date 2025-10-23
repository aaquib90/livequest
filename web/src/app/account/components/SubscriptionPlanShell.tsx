"use client";

import dynamic from "next/dynamic";

const SubscriptionPlanCard = dynamic(() => import("./SubscriptionPlanCard"), {
  ssr: false,
  loading: () => (
    <div className="h-48 animate-pulse rounded-3xl border border-border/60 bg-background/40" />
  ),
});

export default SubscriptionPlanCard;
