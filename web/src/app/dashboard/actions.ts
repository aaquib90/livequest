"use server";

import { redirect } from "next/navigation";

import { fetchAccountFeaturesForUser } from "@/lib/billing/server";
import { createClient } from "@/lib/supabase/serverClient";

type LiveblogStatus = "active" | "archived" | "completed" | "deleted";
const allowedStatuses = new Set<LiveblogStatus>([
  "active",
  "archived",
  "completed",
  "deleted",
]);

export async function createLiveblogAction(formData: FormData) {
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const folder = String(formData.get("folder") || "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect("/signin");
  if (!title) return redirect("/dashboard?error=Title%20required");

  const features = await fetchAccountFeaturesForUser(supabase).catch(() => null);
  const monthlyLimit =
    typeof features?.monthly_liveblog_limit === "number"
      ? features.monthly_liveblog_limit
      : null;

  if (monthlyLimit !== null) {
    const now = new Date();
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const { count = 0 } = await supabase
      .from("liveblogs")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id)
      .gte("created_at", periodStart.toISOString());
    if (count >= monthlyLimit) {
      return redirect(
        "/dashboard?error=" +
          encodeURIComponent("Monthly liveblog limit reached. Upgrade for unlimited projects."),
      );
    }
  }

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

  if (error) {
    return redirect(
      `/dashboard?error=${encodeURIComponent(
        error.message.includes("liveblog_monthly_limit_reached")
          ? "Monthly liveblog limit reached. Upgrade for unlimited projects."
          : error.message,
      )}`,
    );
  }

  return redirect(`/liveblogs/${data.id}/manage`);
}

export async function mutateLiveblogAction(formData: FormData) {
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
    if (allowedStatuses.has(statusValue)) {
      update.status = statusValue;
    }
  }
  if (Object.keys(update).length) {
    await supabase.from("liveblogs").update(update).eq("id", id).eq("owner_id", user.id);
  }
  return redirect("/dashboard");
}
