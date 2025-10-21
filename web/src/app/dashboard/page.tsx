import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertCircle,
  ArrowUpRight,
  Briefcase,
  Folder,
  Radio,
  Trophy,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/serverClient";

import { CreateLiveblogDialog } from "./_components/create-liveblog-dialog";
import { FolderInput } from "./_components/folder-input";

export const runtime = "edge";

type LiveblogStatus = "active" | "archived" | "completed" | "deleted";
type LiveblogPrivacy = "public" | "unlisted" | "private";

type DashboardLiveblog = {
  id: string;
  title: string;
  created_at: string;
  status: LiveblogStatus | null;
  privacy: LiveblogPrivacy | null;
  folder: string | null;
  owner_id: string;
};

const statusCopy: Record<LiveblogStatus, { label: string; className: string }> =
  {
    active: {
      label: "Active",
      className: "bg-emerald-500/10 text-emerald-300 border-emerald-500/40",
    },
    archived: {
      label: "Archived",
      className: "bg-muted text-muted-foreground border-border/60",
    },
    completed: {
      label: "Completed",
      className: "bg-blue-500/10 text-blue-200 border-blue-500/40",
    },
    deleted: {
      label: "Deleted",
      className: "bg-destructive/10 text-destructive border-destructive/40",
    },
  };

const UNASSIGNED_KEY = "__unassigned__";

const normaliseFolderKey = (value: string | null | undefined): string => {
  if (!value) return UNASSIGNED_KEY;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed.length) return UNASSIGNED_KEY;
  return trimmed.replace(/\s+/g, "-");
};

const displayFolderLabel = (value: string | null | undefined): string =>
  value?.trim() || "Unsorted";

async function createLiveblog(formData: FormData) {
  "use server";
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const folder = String(formData.get("folder") || "").trim();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect("/signin");
  if (!title) return redirect("/dashboard?error=Title%20required");
  const { data, error } = await supabase
    .from("liveblogs")
    .insert({
      title,
      description,
      owner_id: user.id,
      folder: folder.length ? folder : null,
    })
    .select("id")
    .single();
  if (error)
    return redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
  return redirect(`/liveblogs/${data.id}/manage`);
}

async function mutateLiveblog(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  const intent = String(formData.get("intent") || "update");
  const folder = formData.get("folder");
  const statusInput = formData.get("status");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect("/signin");

  if (intent === "delete") {
    await supabase.from("liveblogs").delete().eq("id", id).eq("owner_id", user.id);
    return redirect("/dashboard");
  }

  const update: Record<string, unknown> = {};
  if (folder !== null) {
    const folderValue = String(folder).trim();
    update.folder = folderValue.length ? folderValue : null;
  }
  if (statusInput !== null) {
    const statusValue = String(statusInput) as LiveblogStatus;
    if (statusCopy[statusValue]) {
      update.status = statusValue;
    }
  }
  if (Object.keys(update).length) {
    await supabase.from("liveblogs").update(update).eq("id", id).eq("owner_id", user.id);
  }
  return redirect("/dashboard");
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; folder?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return redirect("/signin");
  }
  const sp = await searchParams;
  const { data: liveblogs } = await supabase
    .from("liveblogs")
    .select("id,title,created_at,status,privacy,folder,owner_id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });
  const liveblogList = (liveblogs as DashboardLiveblog[] | null) ?? [];
  const createdFormatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const folderMap = new Map<
    string,
    { key: string; label: string; count: number }
  >();
  for (const lb of liveblogList) {
    const key = normaliseFolderKey(lb.folder);
    const label = displayFolderLabel(lb.folder);
    if (!folderMap.has(key)) {
      folderMap.set(key, { key, label, count: 0 });
    }
    folderMap.get(key)!.count += 1;
  }

  if ((folderMap.get(UNASSIGNED_KEY)?.count ?? 0) === 0) {
    folderMap.delete(UNASSIGNED_KEY);
  }

  const folderSummaries = Array.from(folderMap.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.label.localeCompare(b.label);
  });
  const folderOptions = folderSummaries
    .filter((summary) => summary.key !== UNASSIGNED_KEY)
    .map((summary) => summary.label);

  const totalLiveblogs = liveblogList.length;
  const folderParam = sp?.folder ?? null;
  const activeFolderKey =
    folderParam && folderMap.has(folderParam) ? folderParam : null;
  const filteredLiveblogs = activeFolderKey
    ? liveblogList.filter(
        (lb) => normaliseFolderKey(lb.folder) === activeFolderKey
      )
    : liveblogList;
  const activeFolderLabel = activeFolderKey
    ? folderMap.get(activeFolderKey)?.label ?? "Unsorted"
    : null;

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-border/60 bg-gradient-to-br from-zinc-900/70 via-zinc-900/30 to-zinc-900/10 px-10 py-12 shadow-[0_20px_40px_-25px_rgba(9,9,11,0.75)]">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-4">
            <Badge variant="muted" className="w-fit border-border/40">
              <Radio className="mr-1.5 h-3.5 w-3.5" />
              Dashboard
            </Badge>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Welcome back, {user.email?.split("@")[0] || "creator"}.
              </h1>
              <p className="mt-3 text-base text-muted-foreground">
                Spin up a new liveblog or dive back into your ongoing coverage.
                Everything updates in realtime for your audience.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <CreateLiveblogDialog
              createLiveblog={createLiveblog}
              folderOptions={folderOptions}
            />
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-border/70 bg-background/60 px-6"
            >
              <Link href="/dashboard/matches">
                <Trophy className="mr-2 h-4 w-4" />
                Using Matches
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
        {sp?.error ? (
          <div
            className="mt-8 flex w-full items-center gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground/90"
            role="alert"
          >
            <AlertCircle className="h-4 w-4" />
            <p>{sp.error}</p>
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)]">
        <Card className="border-border/70 bg-background/40">
          <CardHeader className="space-y-4">
            <Badge variant="outline" className="w-fit">
              Folders
            </Badge>
            <div>
              <CardTitle className="text-2xl">Organise coverage</CardTitle>
              <CardDescription className="text-base">
                Group liveblogs into folders to keep tournaments, beats, and
                campaigns tidy. Create folders when you start a liveblog or edit
                one in place.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link
              href="/dashboard"
              className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/60 px-4 py-3 text-sm transition hover:border-border hover:text-foreground"
            >
              <span className="font-medium text-foreground">All liveblogs</span>
              <Badge variant="outline" className="border-border/60 bg-transparent">
                {totalLiveblogs}
              </Badge>
            </Link>
            <div className="space-y-3">
              {folderSummaries.length ? (
                folderSummaries.map((folder) => (
                  <Link
                    key={folder.key}
                    href={`/dashboard?folder=${encodeURIComponent(folder.key)}`}
                    className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm transition ${
                      folder.key === activeFolderKey
                        ? "border-border bg-background/70 ring-1 ring-border"
                        : "border-border/60 bg-background/40 hover:border-border hover:bg-background/60"
                    }`}
                  >
                    <div>
                      <p className="font-medium text-foreground">{folder.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {folder.key === UNASSIGNED_KEY
                          ? "Not yet assigned"
                          : "Custom folder"}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-border/60 bg-transparent text-xs"
                    >
                      {folder.count} {folder.count === 1 ? "liveblog" : "liveblogs"}
                    </Badge>
                  </Link>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border/60 bg-background/60 p-6 text-center text-sm text-muted-foreground">
                  Folders appear once you add them to liveblogs.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-background/40">
          <CardHeader className="space-y-4">
            <Badge variant="outline" className="w-fit">
              Your work
            </Badge>
            <div>
              <CardTitle className="text-2xl">Recent liveblogs</CardTitle>
              <CardDescription className="text-base">
                Jump back into an existing liveblog to publish updates, tweak
                settings, or grab an embed link.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {activeFolderKey ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/60 px-4 py-3 text-sm text-muted-foreground">
                <span>
                  Showing folder{" "}
                  <span className="font-semibold text-foreground">
                    {activeFolderLabel}
                  </span>
                  .
                </span>
                <Button asChild size="sm" variant="ghost" className="text-xs">
                  <Link href="/dashboard">Clear filter</Link>
                </Button>
              </div>
            ) : null}
            {filteredLiveblogs.length ? (
              filteredLiveblogs.map((lb) => {
                const resolvedStatus: LiveblogStatus =
                  lb.status && statusCopy[lb.status] ? lb.status : "active";
                const statusMeta = statusCopy[resolvedStatus];
                const privacy: LiveblogPrivacy =
                  (lb.privacy as LiveblogPrivacy | null) ?? "public";
                const privacyLabel =
                  privacy.charAt(0).toUpperCase() + privacy.slice(1);
                const createdLabel = createdFormatter.format(
                  new Date(lb.created_at)
                );
                const folderName = lb.folder?.trim() ?? "";
                const hasFolderName = folderName.length > 0;
                const rowFolderOptions = hasFolderName && !folderOptions.includes(folderName)
                  ? [...folderOptions, folderName]
                  : folderOptions;

                return (
                  <article
                    key={lb.id}
                    className="space-y-5 rounded-3xl border border-border/60 bg-background/60 p-6 shadow-[0_20px_35px_-30px_rgba(9,9,11,0.8)]"
                  >
                    <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-lg font-semibold text-foreground">
                            {lb.title}
                          </h3>
                          <Badge
                            className={`border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.24em] ${statusMeta.className}`}
                          >
                            {statusMeta.label}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="border-border/70 bg-transparent px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground"
                          >
                            {privacyLabel}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Briefcase className="h-3.5 w-3.5" />
                            {createdLabel}
                          </span>
                          {hasFolderName ? (
                            <span className="inline-flex items-center gap-1">
                              <Folder className="h-3.5 w-3.5" />
                              {folderName}
                            </span>
                          ) : null}
                          <span className="inline-flex items-center gap-1">
                            <Radio className="h-3.5 w-3.5" />
                            {privacyLabel} access
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="border-border/70"
                        >
                          <Link href={`/liveblogs/${lb.id}/manage`}>
                            Manage
                            <ArrowUpRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          asChild
                          size="sm"
                          variant="ghost"
                          className="bg-secondary/40"
                        >
                          <Link href={`/embed/${lb.id}`} target="_blank">
                            Embed preview
                            <ArrowUpRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                        <form action={mutateLiveblog}>
                          <input type="hidden" name="id" value={lb.id} />
                          <input type="hidden" name="intent" value="delete" />
                          <Button
                            type="submit"
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                          >
                            Delete
                          </Button>
                        </form>
                      </div>
                    </header>

                    <form
                      action={mutateLiveblog}
                      className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
                    >
                      <input type="hidden" name="id" value={lb.id} />
                      <div className="space-y-2">
                        <Label htmlFor={`folder-${lb.id}`}>Folder</Label>
                        <FolderInput
                          id={`folder-${lb.id}`}
                          name="folder"
                          defaultValue={folderName}
                          placeholder="Add to folder"
                          options={rowFolderOptions}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`status-${lb.id}`}>Status</Label>
                        <Select
                          id={`status-${lb.id}`}
                          name="status"
                          defaultValue={resolvedStatus}
                          className="bg-background/60"
                        >
                          <option value="active">Active</option>
                          <option value="archived">Archived</option>
                          <option value="completed">Completed</option>
                          <option value="deleted">Deleted</option>
                        </Select>
                      </div>
                      <Button
                        type="submit"
                        size="sm"
                        variant="outline"
                        className="w-full sm:w-auto"
                      >
                        Save changes
                      </Button>
                    </form>
                  </article>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-border/60 bg-background/60 p-12 text-center">
                <p className="text-sm text-muted-foreground">
                  {activeFolderKey
                    ? `No liveblogs found in “${activeFolderLabel}” just yet.`
                    : "No liveblogs yet. Create your first one to see it here."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
