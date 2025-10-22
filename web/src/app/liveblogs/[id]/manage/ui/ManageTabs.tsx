"use client";
import { useEffect, useState } from "react";
import { Activity, BarChart3, Radio, Clock, Send, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Composer from "./Composer";
import Feed from "./Feed";
import { createClient } from "@/lib/supabase/browserClient";

type Update = {
  id: string;
  content: any;
  published_at: string | null;
  pinned: boolean;
};

export default function ManageTabs({
  liveblogId,
  orderPref,
  initialUpdates,
  analytics,
  template,
  homeTeamSlug,
  homeTeamName,
  awayTeamSlug,
  awayTeamName,
}: {
  liveblogId: string;
  orderPref: "newest" | "oldest";
  initialUpdates: Update[];
  analytics: { uniques24h: number; starts24h: number; totalStarts: number };
  template?: string | null;
  homeTeamSlug?: string;
  homeTeamName?: string;
  awayTeamSlug?: string;
  awayTeamName?: string;
}) {
  const [tab, setTab] = useState<"coverage" | "planner" | "analytics">("coverage");
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <TabButton active={tab === "coverage"} onClick={() => setTab("coverage")}>Coverage</TabButton>
        <TabButton active={tab === "planner"} onClick={() => setTab("planner")}>Planner</TabButton>
        <TabButton active={tab === "analytics"} onClick={() => setTab("analytics")}>Analytics</TabButton>
      </div>

      {tab === "coverage" ? (
        <div className="space-y-6">
          <div id="composer">
            <Composer
              liveblogId={liveblogId}
              template={template}
              layout="full"
              homeTeamSlug={homeTeamSlug}
              homeTeamName={homeTeamName}
              awayTeamSlug={awayTeamSlug}
              awayTeamName={awayTeamName}
            />
          </div>

          <Card className="border-border/70 bg-background/60">
            <CardHeader className="space-y-3">
              <Badge variant="outline" className="w-fit">Updates</Badge>
              <div>
                <CardTitle className="text-2xl">Latest coverage</CardTitle>
                <CardDescription className="text-base">Manage pinned updates and keep the conversation flowing.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Feed
                initialUpdates={initialUpdates || []}
                liveblogId={liveblogId}
                order={orderPref}
                template={template}
                homeTeamName={homeTeamName}
                homeTeamSlug={homeTeamSlug}
                awayTeamName={awayTeamName}
                awayTeamSlug={awayTeamSlug}
              />
            </CardContent>
          </Card>
        </div>
      ) : tab === "planner" ? (
        <Card className="border-border/70 bg-background/60">
          <CardHeader className="space-y-3">
            <Badge variant="outline" className="w-fit">Planner</Badge>
            <div>
              <CardTitle className="text-lg">Drafts & Scheduled</CardTitle>
              <CardDescription>Review drafts and scheduled posts. Publish or delete as needed.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Planner liveblogId={liveblogId} />
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/70 bg-background/60">
          <CardHeader className="space-y-3">
            <Badge variant="outline" className="w-fit">Analytics</Badge>
            <div>
              <CardTitle className="text-lg">Audience pulse</CardTitle>
              <CardDescription>Performance from yesterday plus all-time session starts.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <AnalyticsStat icon={<Radio className="h-4 w-4" />} label="Uniques (24h)" value={analytics.uniques24h} />
            <AnalyticsStat icon={<Activity className="h-4 w-4" />} label="Starts (24h)" value={analytics.starts24h} />
            <AnalyticsStat icon={<BarChart3 className="h-4 w-4" />} label="Total starts" value={analytics.totalStarts} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button type="button" variant={active ? "default" : "outline"} size="sm" onClick={onClick}>
      {children}
    </Button>
  );
}

function AnalyticsStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/70 p-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-secondary/60 text-secondary-foreground">
          {icon}
        </span>
        {label}
      </div>
      <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function Planner({ liveblogId }: { liveblogId: string }) {
  const supabase = createClient();
  const [items, setItems] = useState<Array<{
    id: string;
    content: any;
    status: "draft" | "scheduled" | "published";
    scheduled_at: string | null;
    created_at: string;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("updates")
      .select("id,content,status,scheduled_at,created_at")
      .eq("liveblog_id", liveblogId)
      .in("status", ["draft", "scheduled"])
      .is("deleted_at", null)
      .order("status", { ascending: true })
      .order("scheduled_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  }

  async function publishNow(u: { id: string; content: any }) {
    setActingId(u.id);
    try {
      await supabase
        .from("updates")
        .update({ status: "published", published_at: new Date().toISOString() })
        .eq("id", u.id);
      // broadcast to Discord if configured
      try {
        fetch(`/api/liveblogs/${liveblogId}/broadcast/discord`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: u.content }),
          keepalive: true,
        }).catch(() => {});
      } catch {}
      await load();
    } finally {
      setActingId(null);
    }
  }

  async function remove(u: { id: string }) {
    setActingId(u.id);
    try {
      await supabase
        .from("updates")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", u.id);
      await load();
    } finally {
      setActingId(null);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveblogId]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (!items.length) {
    return <p className="text-sm text-muted-foreground">No drafts or scheduled posts yet.</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((u) => (
        <div key={u.id} className="flex items-start justify-between rounded-2xl border border-border/60 bg-background/60 p-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">{u.status === "draft" ? "Draft" : "Scheduled"}</Badge>
              {u.status === "scheduled" && u.scheduled_at ? (
                <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {new Date(u.scheduled_at).toLocaleString()}</span>
              ) : null}
            </div>
            <div className="text-sm text-foreground/90">
              {renderSummary(u.content)}
            </div>
          </div>
          <div className="ml-4 flex shrink-0 items-center gap-2">
            <Button type="button" size="sm" onClick={() => publishNow(u)} disabled={actingId === u.id}>
              <Send className="mr-2 h-3.5 w-3.5" /> Publish now
            </Button>
            <Button type="button" size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => remove(u)} disabled={actingId === u.id}>
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function renderSummary(content: any) {
  if (!content || typeof content !== "object") return <span className="text-muted-foreground">(empty)</span>;
  const type = (content as any).type;
  if (type === "text") {
    const title = (content as any).title as string | undefined;
    const text = (content as any).text as string | undefined;
    return <span>{title || (text ? text.slice(0, 120) : "(text)")}</span>;
  }
  if (type === "link") {
    const url = (content as any).url as string;
    const title = (content as any).title as string | undefined;
    return <span>{title || url}</span>;
  }
  if (type === "image") {
    return <span>Image</span>;
  }
  return <span>({String(type)})</span>;
}
