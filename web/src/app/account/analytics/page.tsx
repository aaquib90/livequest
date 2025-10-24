import dynamic from "next/dynamic";

import AccountSectionTabs from "../components/AccountSectionTabs";

const AnalyticsDashboard = dynamic(() => import("./AnalyticsDashboardClient"), {
  ssr: false,
  loading: () => (
    <div className="space-y-6">
      <div className="h-36 animate-pulse rounded-3xl border border-border/60 bg-background/40" />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="h-32 animate-pulse rounded-3xl border border-border/60 bg-background/40" />
        <div className="h-32 animate-pulse rounded-3xl border border-border/60 bg-background/40" />
      </div>
      <div className="h-[360px] animate-pulse rounded-3xl border border-border/60 bg-background/40" />
    </div>
  ),
});

export default function AccountAnalyticsPage() {
  return (
    <div className="space-y-8">
      <AccountSectionTabs />
      <AnalyticsDashboard />
    </div>
  );
}
