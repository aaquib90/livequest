export const runtime = "edge";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/serverClient";
import BrandAssetUploader from "@/app/account/customization/components/BrandAssetUploader";
import WidgetSharePanel from "../components/WidgetSharePanel";
import ClipboardButton from "../components/ClipboardButton";

type Widget = {
  id: string;
  type: string;
  name: string | null;
  config: Record<string, unknown> | null;
  status: string;
  owner_id: string | null;
  created_at: string | null;
};
type Submission = { id: string; content: string; votes: number; status: string };
type HotStats = { mean: number; total: number; buckets: number[] };

async function approveSubmission(formData: FormData) {
  "use server";
  const submissionId = String(formData.get("submissionId") || "");
  const supabase = await createClient();
  await supabase.from("ugc_submissions").update({ status: "approved" }).eq("id", submissionId);
}

function formatRelative(input: string | null): string {
  if (!input) return "Unknown";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return input;
  const diffMs = date.getTime() - Date.now();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  if (Math.abs(diffDays) >= 7) {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  }
  return formatter.format(diffDays, "day");
}

function humaniseWidgetType(type: string): string {
  switch (type) {
    case "hot-take":
      return "Hot Take";
    case "caption-this":
      return "Caption This";
    default:
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
}

function StatusBadge({ status }: { status: string }) {
  const baseClass = "rounded-full border px-3 py-[2px] text-[10px] font-semibold uppercase tracking-[0.3em]";
  if (status === "active") {
    return <span className={`${baseClass} border-emerald-500/40 bg-emerald-500/10 text-emerald-400`}>Active</span>;
  }
  if (status === "paused") {
    return <span className={`${baseClass} border-amber-500/40 bg-amber-500/10 text-amber-400`}>Paused</span>;
  }
  return <span className={`${baseClass} border-border/60 bg-transparent text-muted-foreground`}>{status}</span>;
}

async function rejectSubmission(formData: FormData) {
  "use server";
  const submissionId = String(formData.get("submissionId") || "");
  const supabase = await createClient();
  await supabase.from("ugc_submissions").update({ status: "rejected" }).eq("id", submissionId);
}

export default async function EngagementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: widget, error: widgetError } = await supabase
    .from("engagement_widgets")
    .select("id,type,name,config,status,owner_id,created_at")
    .eq("id", id)
    .maybeSingle<Widget>();
  if (!widget) return notFound();

  const headerList = headers();
  const host = headerList.get("host") ?? "";
  const protocol = headerList.get("x-forwarded-proto") ?? "https";
  const baseUrl = host ? `${protocol}://${host}` : "";
  const embedSnippet = `<div data-widget-id="${widget.id}" data-type="${widget.type}"></div><script src="${baseUrl}/widget.js" async></script>`;
  const standaloneUrl = baseUrl ? `${baseUrl}/widgets/${widget.type}/${widget.id}` : `/widgets/${widget.type}/${widget.id}`;
  const createdRelative = formatRelative(widget.created_at);
  const config = (widget.config ?? {}) as Record<string, unknown>;
  const ownerId = widget.owner_id ?? "";
  const labelLeftDefault = typeof config.labelLeft === "string" && config.labelLeft ? String(config.labelLeft) : "Confident";
  const labelRightDefault = typeof config.labelRight === "string" && config.labelRight ? String(config.labelRight) : "Skeptical";
  const headerImagePath = typeof config.headerImageUrl === "string" ? config.headerImageUrl : "";

  const isCaption = widget.type === "caption-this";
  const isHotTake = widget.type === "hot-take";
  let submissions: Submission[] = [];
  let hotStats: HotStats | null = null;
  if (isCaption) {
    const { data } = await supabase
      .from("ugc_submissions")
      .select("id,content,votes,status")
      .eq("widget_id", id)
      .order("created_at", { ascending: false })
      .limit(100);
    submissions = (data as Submission[]) ?? [];
  }
  if (isHotTake) {
    const { data: aggregate } = await supabase
      .from("widget_events")
      .select("avg(value),count(*)")
      .eq("widget_id", id)
      .eq("event", "vote")
      .maybeSingle();
    const mean = Math.round(Number((aggregate as any)?.avg ?? 0));
    const total = Number((aggregate as any)?.count ?? 0);
    const { data: values } = await supabase
      .from("widget_events")
      .select("value")
      .eq("widget_id", id)
      .eq("event", "vote")
      .order("created_at", { descending: true })
      .limit(1000);
    const buckets = new Array(10).fill(0) as number[];
    (values || []).forEach((row: any) => {
      const v = Math.max(0, Math.min(100, Number(row?.value ?? 0)));
      const b = Math.min(9, Math.floor(v / 10));
      buckets[b] += 1;
    });
    hotStats = { mean: Number.isFinite(mean) ? mean : 0, total: Number.isFinite(total) ? total : 0, buckets };
  }

  return (
    <div className="space-y-10">
      <Card className="border-border/50 bg-background/60">
        <CardContent className="space-y-6 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-border/60 bg-transparent text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                  {humaniseWidgetType(widget.type)}
                </Badge>
                <StatusBadge status={widget.status} />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold text-foreground">
                  {widget.name?.trim() || `${humaniseWidgetType(widget.type)} widget`}
                </h1>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  {isHotTake
                    ? "Track supporter sentiment with a live heat meter. Share the link or drop the embed anywhere you want fans to vote."
                    : isCaption
                      ? "Collect punchy captions from your community and approve the best entries before they go live."
                      : "Manage configuration and distribution for this widget."}
                </p>
              </div>
              <dl className="grid gap-3 text-xs text-muted-foreground sm:grid-cols-2">
                <div className="space-y-1">
                  <dt className="uppercase tracking-[0.32em] text-muted-foreground/70">Widget ID</dt>
                  <dd className="font-mono text-foreground/90 truncate">{widget.id}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="uppercase tracking-[0.32em] text-muted-foreground/70">Created</dt>
                  <dd className="text-foreground/90">{createdRelative}</dd>
                </div>
                {widget.liveblog_id ? (
                  <div className="space-y-1">
                    <dt className="uppercase tracking-[0.32em] text-muted-foreground/70">Linked liveblog</dt>
                    <dd className="text-foreground/90 truncate">{String(widget.liveblog_id)}</dd>
                  </div>
                ) : null}
              </dl>
              <ClipboardButton value={widget.id} label="Copy ID" variant="ghost" size="sm" className="border-0 px-2 text-xs text-muted-foreground hover:text-foreground" />
            </div>

            <WidgetSharePanel
              embedSnippet={embedSnippet}
              standaloneUrl={standaloneUrl}
              previewUrl={standaloneUrl}
              className="w-full max-w-xl"
            />
          </div>
        </CardContent>
      </Card>

      {isHotTake && hotStats ? (
        <Card className="border-border/70 bg-background/40">
          <CardHeader>
            <CardTitle className="text-xl">Stats</CardTitle>
            <CardDescription>Live summary from the last 1000 votes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-6 text-sm">
              <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-3">
                <div className="text-xs text-muted-foreground">Mean</div>
                <div className="text-xl font-semibold">{hotStats.mean}</div>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-3">
                <div className="text-xs text-muted-foreground">Total votes</div>
                <div className="text-xl font-semibold tabular-nums">{hotStats.total}</div>
              </div>
            </div>
            <div>
              <div className="mb-2 text-xs text-muted-foreground">Distribution (0–100)</div>
              <div className="flex items-end gap-1 rounded-xl border border-border/60 bg-background/60 p-3">
                {hotStats.buckets.map((n, i) => {
                  const max = Math.max(1, ...hotStats!.buckets);
                  const h = Math.round((n / max) * 80) + 6;
                  return (
                    <div key={i} className="flex w-full flex-col items-center gap-1">
                      <div className="w-full rounded bg-[var(--lb-accent-soft,rgba(59,130,246,0.25))]" style={{ height: h }} />
                      <div className="text-[10px] text-muted-foreground">{i * 10}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {isCaption ? (
        <Card className="border-border/70 bg-background/40">
          <CardHeader>
            <CardTitle className="text-xl">Submissions</CardTitle>
            <CardDescription>Approve or reject captions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {submissions.length ? (
              submissions.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/60 p-3 text-sm">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="border-border/60 bg-transparent text-xs uppercase tracking-wider">{s.status}</Badge>
                    <span className="truncate max-w-[52ch]">{s.content}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="tabular-nums">{s.votes}</span>
                    {s.status !== "approved" ? (
                      <form action={approveSubmission}>
                        <input type="hidden" name="widgetId" value={widget.id} />
                        <input type="hidden" name="submissionId" value={s.id} />
                        <Button type="submit" size="sm" variant="outline">Approve</Button>
                      </form>
                    ) : null}
                    {s.status !== "rejected" ? (
                      <form action={rejectSubmission}>
                        <input type="hidden" name="submissionId" value={s.id} />
                        <Button type="submit" size="sm" variant="ghost">Reject</Button>
                      </form>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border/60 bg-background/60 p-12 text-center text-sm text-muted-foreground">No submissions yet.</div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {isHotTake ? (
        <Card className="border-border/60 bg-background/60">
          <CardHeader>
            <CardTitle className="text-xl">Live controls</CardTitle>
            <CardDescription>Keep the meter fresh or temporarily pause submissions.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <form
              action={async () => {
                "use server";
                const sb = await createClient();
                await sb
                  .from("engagement_widgets")
                  .update({ status: widget.status === "active" ? "paused" : "active" })
                  .eq("id", widget.id);
              }}
              className="space-y-2 rounded-xl border border-border/60 bg-background/70 p-4"
            >
              <div className="space-y-1 text-sm">
                <p className="font-medium text-foreground">Toggle voting</p>
                <p className="text-xs text-muted-foreground">
                  {widget.status === "active"
                    ? "Pause new votes instantly. Existing totals are preserved."
                    : "Resume collection to let supporters vote again."}
                </p>
              </div>
              <Button type="submit" variant="outline" className="w-full">
                {widget.status === "active" ? "Pause widget" : "Resume widget"}
              </Button>
            </form>
            <form
              action={async () => {
                "use server";
                const sb = await createClient();
                await sb.from("widget_events").delete().eq("widget_id", widget.id).eq("event", "vote");
              }}
              className="space-y-2 rounded-xl border border-destructive/40 bg-destructive/10 p-4"
            >
              <div className="space-y-1 text-sm">
                <p className="font-medium text-foreground">Reset all votes</p>
                <p className="text-xs text-muted-foreground">
                  Clears historical votes and restarts the meter from zero.
                </p>
              </div>
              <Button type="submit" variant="destructive" className="w-full">
                Reset votes
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {isHotTake ? (
        <Card className="border-border/60 bg-background/60">
          <CardHeader>
            <CardTitle className="text-xl">Hot Take configuration</CardTitle>
            <CardDescription>Update slider labels and upload an optional header image.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={async (fd: FormData) => {
                "use server";
                const left = String(fd.get("labelLeft") || "");
                const right = String(fd.get("labelRight") || "");
                const img = String(fd.get("headerImageUrl") || "");
                const sb = await createClient();
                const next = {
                  ...(widget.config || {}),
                  labelLeft: left || null,
                  labelRight: right || null,
                  headerImageUrl: img || null,
                };
                await sb.from("engagement_widgets").update({ config: next }).eq("id", widget.id);
              }}
              className="space-y-6"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="labelLeft" className="text-sm text-muted-foreground">Left label</label>
                  <input
                    id="labelLeft"
                    name="labelLeft"
                    defaultValue={labelLeftDefault}
                    className="mt-1 w-full rounded-lg border border-border/60 bg-background/70 px-3 py-2 text-sm"
                  />
                  <p className="mt-1 text-xs text-muted-foreground/80">Appears on the confident side of the slider.</p>
                </div>
                <div>
                  <label htmlFor="labelRight" className="text-sm text-muted-foreground">Right label</label>
                  <input
                    id="labelRight"
                    name="labelRight"
                    defaultValue={labelRightDefault}
                    className="mt-1 w-full rounded-lg border border-border/60 bg-background/70 px-3 py-2 text-sm"
                  />
                  <p className="mt-1 text-xs text-muted-foreground/80">Shown on the skeptical side of the slider.</p>
                </div>
              </div>

              <div className="space-y-2">
                <BrandAssetUploader
                  accountId={ownerId}
                  name="headerImageUrl"
                  label="Header image"
                  initialPath={headerImagePath}
                  placeholder={ownerId ? `${ownerId}/widget-header.jpg` : undefined}
                  description="Optional hero image displayed above the widget when users vote."
                  helperText={ownerId ? "Upload JPEG or PNG up to 4MB. We’ll host it for you." : "Sign in as the owner to upload images."}
                  bucket="media"
                  previewAspect="wide"
                  maxSizeMB={6}
                  disabled={!ownerId}
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit">Save changes</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
