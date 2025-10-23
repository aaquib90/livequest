"use client";
import { useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, Radio, Users, Clock, Send, Trash2, Upload, Trash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  analytics: { uniques24h: number; starts24h: number; totalStarts: number; concurrentNow: number };
  template?: string | null;
  homeTeamSlug?: string;
  homeTeamName?: string;
  awayTeamSlug?: string;
  awayTeamName?: string;
}) {
  const [tab, setTab] = useState<"coverage" | "planner" | "analytics" | "sponsors">("coverage");
  const [stats, setStats] = useState(analytics);
  const supabaseClient = useMemo(() => createClient(), []);
  const [sponsors, setSponsors] = useState<Array<{
    id: string;
    name: string;
    status: string;
    starts_at: string | null;
    ends_at: string | null;
    impressions: number;
    clicks: number;
    impressions24h: number;
    clicks24h: number;
    ctr: number;
    ctr24h: number;
  }>>([]);

  const activeSponsorOptions = useMemo(
    () =>
      sponsors
        .filter((slot) => slot.status === "active")
        .map((slot) => ({ id: slot.id, name: slot.name })),
    [sponsors],
  );

  useEffect(() => {
    setStats(analytics);
  }, [analytics]);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const {
          data: { session },
        } = await supabaseClient.auth.getSession();
        const authHeaders = session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : undefined;
        const [analyticsRes, sponsorsRes] = await Promise.all([
          fetch(`/api/liveblogs/${liveblogId}/analytics`, {
            cache: "no-store",
            credentials: "include",
            headers: authHeaders,
          }),
          fetch(`/api/liveblogs/${liveblogId}/sponsors`, {
            cache: "no-store",
            credentials: "include",
            headers: authHeaders,
          }),
        ]);
        if (!cancelled && analyticsRes.ok) {
          const json = await analyticsRes.json();
          setStats({
            uniques24h: Number(json.uniques24h) || 0,
            starts24h: Number(json.starts24h) || 0,
            totalStarts: Number(json.totalStarts) || 0,
            concurrentNow: Number(json.concurrentNow) || 0,
          });
        }
        if (!cancelled && sponsorsRes.ok) {
          const json = await sponsorsRes.json();
          if (json && Array.isArray(json.slots)) {
            setSponsors(
              (json.slots as any[]).map((slot) => ({
                id: String(slot.id),
                name: String(slot.name ?? ""),
                status: String(slot.status ?? "scheduled"),
                starts_at: slot.starts_at ?? null,
                ends_at: slot.ends_at ?? null,
                impressions: Number(slot.impressions ?? 0),
                clicks: Number(slot.clicks ?? 0),
                impressions24h: Number(slot.impressions24h ?? 0),
                clicks24h: Number(slot.clicks24h ?? 0),
                ctr: Number(slot.ctr ?? 0),
                ctr24h: Number(slot.ctr24h ?? 0),
              })),
            );
          }
        }
      } catch {
        // ignore network errors
      }
    }

    refresh();
    const id = window.setInterval(refresh, 20000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [liveblogId, supabaseClient]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <TabButton active={tab === "coverage"} onClick={() => setTab("coverage")}>Coverage</TabButton>
        <TabButton active={tab === "planner"} onClick={() => setTab("planner")}>Planner</TabButton>
        <TabButton active={tab === "analytics"} onClick={() => setTab("analytics")}>Analytics</TabButton>
        <TabButton active={tab === "sponsors"} onClick={() => setTab("sponsors")}>Sponsors</TabButton>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/70 px-3 py-1">
          <Radio className="h-3.5 w-3.5 text-emerald-400" />
          Live viewers
          <span className="text-sm font-semibold text-foreground">{stats.concurrentNow}</span>
        </span>
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
              sponsorOptions={activeSponsorOptions}
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
      ) : tab === "analytics" ? (
        <div className="space-y-4">
          <Card className="border-border/70 bg-background/60">
            <CardHeader className="space-y-3">
              <Badge variant="outline" className="w-fit">Analytics</Badge>
              <div>
                <CardTitle className="text-lg">Audience pulse</CardTitle>
                <CardDescription>Performance from yesterday plus all-time session starts.</CardDescription>
              </div>
            </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <AnalyticsStat icon={<Radio className="h-4 w-4" />} label="Live viewers" value={stats.concurrentNow} />
                <AnalyticsStat icon={<Users className="h-4 w-4" />} label="Uniques (24h)" value={stats.uniques24h} />
                <AnalyticsStat icon={<Activity className="h-4 w-4" />} label="Starts (24h)" value={stats.starts24h} />
                <AnalyticsStat icon={<BarChart3 className="h-4 w-4" />} label="Total starts" value={stats.totalStarts} />
              </CardContent>
            </Card>
        </div>
      ) : (
          <SponsorManager
            liveblogId={liveblogId}
            slots={sponsors}
            onRefresh={async () => {
              try {
                const {
                  data: { session },
                } = await supabaseClient.auth.getSession();
                const authHeaders = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined;
                const res = await fetch(`/api/liveblogs/${liveblogId}/sponsors`, {
                  cache: "no-store",
                  credentials: "include",
                  headers: authHeaders,
                });
                if (!res.ok) return;
                const json = await res.json();
                if (json && Array.isArray(json.slots)) {
                  setSponsors(
                    (json.slots as any[]).map((slot) => ({
                      id: String(slot.id),
                      name: String(slot.name ?? ""),
                      status: String(slot.status ?? "scheduled"),
                      starts_at: slot.starts_at ?? null,
                      ends_at: slot.ends_at ?? null,
                      impressions: Number(slot.impressions ?? 0),
                      clicks: Number(slot.clicks ?? 0),
                      impressions24h: Number(slot.impressions24h ?? 0),
                      clicks24h: Number(slot.clicks24h ?? 0),
                      ctr: Number(slot.ctr ?? 0),
                      ctr24h: Number(slot.ctr24h ?? 0),
                    })),
                  );
                }
              } catch {}
            }}
        />
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
  const supabase = useMemo(() => createClient(), []);
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
          credentials: "include",
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

function SponsorManager({ liveblogId, slots, onRefresh }: { liveblogId: string; slots: Array<{ id: string; name: string; status: string; starts_at: string | null; ends_at: string | null; impressions: number; clicks: number; impressions24h: number; clicks24h: number; ctr: number; ctr24h: number }>; onRefresh: () => Promise<void> | void }) {
  const supabase = createClient();
  const [name, setName] = useState("");
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [ctaText, setCtaText] = useState("Learn more");
  const [ctaUrl, setCtaUrl] = useState("");
  const [affiliateCode, setAffiliateCode] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [pinned, setPinned] = useState(false);
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogo(file: File) {
    setUploading(true);
    setError(null);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const key = `sponsors/${liveblogId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(key, file, { upsert: false, contentType: file.type });
      if (uploadError) {
        setError(uploadError.message);
        setUploading(false);
        return;
      }
      const url = supabase.storage.from("media").getPublicUrl(key).data.publicUrl;
      setLogoPath(key);
      setLogoPreview(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "upload_failed");
    } finally {
      setUploading(false);
    }
  }

  async function submitSponsor(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!ctaUrl.trim()) {
      setError("CTA URL is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const authHeaders = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
      const res = await fetch(`/api/liveblogs/${liveblogId}/sponsors`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          headline: headline.trim() || null,
          description: description.trim() || null,
          cta_text: ctaText.trim() || "Learn more",
          cta_url: ctaUrl.trim(),
          affiliate_code: affiliateCode.trim() || null,
          image_path: logoPath,
          pinned,
          status: "active",
          starts_at: startsAt ? new Date(startsAt).toISOString() : null,
          ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json?.error || "Unable to save sponsor");
      } else {
        setName("");
        setHeadline("");
        setDescription("");
        setCtaText("Learn more");
        setCtaUrl("");
        setAffiliateCode("");
        setStartsAt("");
        setEndsAt("");
        setPinned(false);
        setLogoPath(null);
        setLogoPreview(null);
        await onRefresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save sponsor");
    } finally {
      setSaving(false);
    }
  }

  async function removeSponsor(id: string) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const authHeaders = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined;
      await fetch(`/api/liveblogs/${liveblogId}/sponsors/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: authHeaders,
      });
      await onRefresh();
    } catch {}
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/70 bg-background/60">
        <CardHeader className="space-y-3">
          <Badge variant="outline" className="w-fit">New sponsor</Badge>
          <CardTitle className="text-lg">Highlight a partner</CardTitle>
          <CardDescription>
            Upload a logo, set the call to action, and choose when the placement should run. Pinned sponsors appear above live coverage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitSponsor} className="space-y-4">
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sponsor-name">Sponsor name</Label>
                <Input
                  id="sponsor-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Acme Corp"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sponsor-cta-text">CTA label</Label>
                <Input
                  id="sponsor-cta-text"
                  value={ctaText}
                  onChange={(e) => setCtaText(e.target.value)}
                  placeholder="Learn more"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sponsor-headline">Headline</Label>
                <Input
                  id="sponsor-headline"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="Matchday offer"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sponsor-cta-url">CTA URL</Label>
                <Input
                  id="sponsor-cta-url"
                  type="url"
                  value={ctaUrl}
                  onChange={(e) => setCtaUrl(e.target.value)}
                  placeholder="https://partner.example.com/offer"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sponsor-description">Description</Label>
              <Textarea
                id="sponsor-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add supporting copy to appear beneath the headline."
                rows={4}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sponsor-affiliate">Affiliate code (optional)</Label>
                <Input
                  id="sponsor-affiliate"
                  value={affiliateCode}
                  onChange={(e) => setAffiliateCode(e.target.value)}
                  placeholder="AFF-123"
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  id="sponsor-pinned"
                  type="checkbox"
                  checked={pinned}
                  onChange={(e) => setPinned(e.target.checked)}
                  className="h-4 w-4 rounded border-border bg-background"
                />
                <Label htmlFor="sponsor-pinned" className="text-sm">Pin above coverage</Label>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sponsor-start">Starts at</Label>
                <Input
                  id="sponsor-start"
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sponsor-end">Ends at</Label>
                <Input
                  id="sponsor-end"
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-2 text-sm text-muted-foreground hover:border-border/40">
                  <Upload className="h-4 w-4" />
                  <span>{uploading ? "Uploading…" : "Upload logo"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleLogo(file);
                    }}
                    disabled={uploading}
                  />
                </label>
                {logoPreview ? (
                  <img src={logoPreview} alt="Sponsor logo preview" className="h-12 rounded border border-border/60 bg-background/60" />
                ) : null}
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={saving || uploading}>
                {saving ? "Saving…" : "Create sponsor"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-background/60">
        <CardHeader className="space-y-3">
          <Badge variant="outline" className="w-fit">Active sponsors</Badge>
          <CardDescription>Monitor delivery and manage existing slots.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {slots.length ? (
            slots.map((slot) => (
              <div key={slot.id} className="space-y-2 rounded-2xl border border-border/60 bg-background/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{slot.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {slot.status}
                      {slot.starts_at ? ` · Starts ${new Date(slot.starts_at).toLocaleString()}` : ""}
                      {slot.ends_at ? ` · Ends ${new Date(slot.ends_at).toLocaleString()}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="button" size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => removeSponsor(slot.id)}>
                      <Trash className="mr-2 h-3.5 w-3.5" /> Remove
                    </Button>
                  </div>
                </div>
                <div className="grid gap-3 text-xs text-muted-foreground sm:grid-cols-3">
                  <div>
                    <p className="uppercase tracking-[0.22em] text-[10px]">Total impressions</p>
                    <p className="text-sm font-semibold text-foreground">{slot.impressions}</p>
                    <p>24h: {slot.impressions24h}</p>
                  </div>
                  <div>
                    <p className="uppercase tracking-[0.22em] text-[10px]">Total clicks</p>
                    <p className="text-sm font-semibold text-foreground">{slot.clicks}</p>
                    <p>24h: {slot.clicks24h}</p>
                  </div>
                  <div>
                    <p className="uppercase tracking-[0.22em] text-[10px]">CTR</p>
                    <p className="text-sm font-semibold text-foreground">{formatPercent(slot.ctr)}</p>
                    <p>24h: {formatPercent(slot.ctr24h)}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No sponsors yet. Create your first placement above.</p>
          )}
        </CardContent>
      </Card>
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

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "0%";
  return `${(value * 100).toFixed(1)}%`;
}
