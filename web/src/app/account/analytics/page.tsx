import { redirect } from "next/navigation";

import AnalyticsDashboardClient from "./AnalyticsDashboardClient";
import { createClient } from "@/lib/supabase/serverClient";

export const runtime = "edge";

export default async function AccountAnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return redirect("/signin");
  }

  return <AnalyticsDashboardClient />;
}
