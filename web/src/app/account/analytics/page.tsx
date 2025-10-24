import AccountSectionTabs from "../components/AccountSectionTabs";
import AnalyticsDashboardClient from "./AnalyticsDashboardClient";

export default function AccountAnalyticsPage() {
  return (
    <div className="space-y-8">
      <AccountSectionTabs />
      <AnalyticsDashboardClient />
    </div>
  );
}
