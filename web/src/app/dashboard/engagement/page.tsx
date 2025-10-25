export const runtime = "edge";
import Link from "next/link";
import { cookies, headers } from "next/headers";
import { Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

import WidgetList from "./components/WidgetList";

type Widget = { id: string; type: string; name: string | null; liveblog_id: string | null; status: string; created_at: string };

export default async function EngagementDashboardPage() {
  const headerList = headers();
  const cookieHeader = cookies().toString();
  const host = headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? "https";

  const res = await fetch(`${protocol}://${host}/api/engagement/widgets`, {
    headers: { ...(cookieHeader ? { Cookie: cookieHeader } : {}) },
    cache: "no-store",
  });
  if (res.status === 401) {
    return (
      <div className="p-8 text-sm text-muted-foreground">Please sign in.</div>
    );
  }
  if (!res.ok) {
    throw new Error(`Failed to load widgets (${res.status})`);
  }
  const json = await res.json();
  const widgets: Widget[] = json.widgets || [];
  const baseUrl = `${protocol}://${host}`;

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-border/60 bg-gradient-to-br from-zinc-900/70 via-zinc-900/30 to-zinc-900/10 px-10 py-12">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-4">
            <Badge variant="muted" className="w-fit border-border/40">
              Engagement
            </Badge>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Engagement tools</h1>
              <p className="mt-3 text-base text-muted-foreground">Create embeddable widgets like Hot Take and Caption This. Use them standalone or attach to a liveblog.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="outline" className="border-border/70 bg-background/60">
              <Link href="/dashboard/engagement/new">
                <Plus className="mr-2 h-4 w-4" /> New widget
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <Card className="border-border/70 bg-background/40">
        <CardHeader>
          <CardTitle className="text-2xl">Your widgets</CardTitle>
          <CardDescription>Copy embed codes and manage status.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {widgets.length ? (
            <WidgetList widgets={widgets} baseUrl={baseUrl} />
          ) : (
            <div className="rounded-2xl border border-dashed border-border/60 bg-background/60 p-12 text-center text-sm text-muted-foreground">No widgets yet. Create one to get started.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

