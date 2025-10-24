import AccountSectionTabs from "../components/AccountSectionTabs";
import AnalyticsDashboardShell from "./AnalyticsDashboardShell";

export default function AccountAnalyticsPage() {
  return (
    <div className="space-y-8">
      <AccountSectionTabs />
      <AnalyticsDashboardShell />
    </div>
  );
}
