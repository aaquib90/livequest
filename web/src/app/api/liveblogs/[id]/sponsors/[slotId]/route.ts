import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

import { canManageSponsors, fetchAccountFeaturesForAccount } from "@/lib/billing/server";
import { createClient } from "@/lib/supabase/serverClient";

export const runtime = "nodejs";

type AccessCheckResult = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: User | null;
  allowed: boolean;
  featureAllowed: boolean;
};

async function requireEditorAccess(liveblogId: string, req: Request): Promise<AccessCheckResult> {
  const supabase = await createClient();
  let token: string | null = null;
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice(7).trim() || null;
  }
  const {
    data: { user },
  } = token ? await supabase.auth.getUser(token) : await supabase.auth.getUser();
  if (!user) {
    return { supabase, user: null, allowed: false, featureAllowed: false };
  }
  const { data: lb } = await supabase
    .from("liveblogs")
    .select("owner_id")
    .eq("id", liveblogId)
    .single();
  if (!lb) return { supabase, user, allowed: false, featureAllowed: false };
  const ownerId = lb.owner_id as string;
  let allowed = ownerId === user.id;
  if (!allowed) {
    const { count = 0 } = await supabase
      .from("liveblog_editors")
      .select("user_id", { count: "exact", head: true })
      .eq("liveblog_id", liveblogId)
      .eq("user_id", user.id);
    allowed = count > 0;
  }
  const features = await fetchAccountFeaturesForAccount(ownerId).catch(() => null);
  const featureAllowed = canManageSponsors(features);
  return { supabase, user, allowed, featureAllowed };
}

export async function PATCH(req: Request, { params }: { params: { id: string; slotId: string } }) {
  try {
    const liveblogId = params.id;
    const slotId = params.slotId;
    if (!liveblogId || !slotId) {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }
    const { supabase, allowed, featureAllowed } = await requireEditorAccess(liveblogId, req);
    if (!allowed) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    if (!featureAllowed) return NextResponse.json({ error: "subscription_required" }, { status: 402 });

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const fields: Array<keyof typeof body> = [
      "name",
      "headline",
      "description",
      "cta_text",
      "cta_url",
      "affiliate_code",
      "image_path",
      "layout",
      "pinned",
      "priority",
      "status",
      "starts_at",
      "ends_at",
    ];
    for (const key of fields) {
      if (!Object.prototype.hasOwnProperty.call(body, key)) continue;
      const value = body[key];
      if (key === "starts_at" || key === "ends_at") {
        if (typeof value === "string" && value.length) {
          update[key] = new Date(value).toISOString();
        } else {
          update[key] = null;
        }
        continue;
      }
      if (key === "priority") {
        const numberValue = typeof value === "number" ? value : Number(value ?? 0);
        update[key] = Number.isFinite(numberValue) ? numberValue : 0;
        continue;
      }
      if (key === "pinned") {
        update[key] = Boolean(value);
        continue;
      }
      update[key as string] = value;
    }

    const { data, error } = await supabase
      .from("sponsor_slots")
      .update(update)
      .eq("id", slotId)
      .eq("liveblog_id", liveblogId)
      .select()
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ slot: data }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "server_error" },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string; slotId: string } }) {
  try {
    const liveblogId = params.id;
    const slotId = params.slotId;
    if (!liveblogId || !slotId) {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }
    const { supabase, allowed, featureAllowed } = await requireEditorAccess(liveblogId, _req);
    if (!allowed) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    if (!featureAllowed) return NextResponse.json({ error: "subscription_required" }, { status: 402 });

    const { error } = await supabase
      .from("sponsor_slots")
      .delete()
      .eq("id", slotId)
      .eq("liveblog_id", liveblogId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "server_error" },
      { status: 500 },
    );
  }
}
