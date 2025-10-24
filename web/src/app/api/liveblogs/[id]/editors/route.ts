import { NextRequest, NextResponse } from "next/server";

import { fetchAccountFeaturesForUser } from "@/lib/billing/server";
import { supabaseEnsure } from "@/lib/supabase/gatewayClient";
import { createClient } from "@/lib/supabase/serverClient";

export const runtime = "edge";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const liveblogId = params.id;
    if (!liveblogId) return NextResponse.json({ error: "bad_request" }, { status: 400 });

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    // Owner check
    const lb = await supabaseEnsure<{ owner_id: string } | null>(req, {
      action: "select",
      table: "liveblogs",
      columns: "owner_id",
      filters: [{ column: "id", op: "eq", value: liveblogId }],
      single: true,
    });
    if (!lb || lb.owner_id !== user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const features = await fetchAccountFeaturesForUser(supabase).catch(() => null);
    if (!features?.can_manage_editors) {
      return NextResponse.json({ error: "subscription_required" }, { status: 402 });
    }

    const form = await req.formData().catch(() => null);
    const isForm = form instanceof FormData;
    const bodyJson = !isForm ? await req.json().catch(() => ({})) : {};

    const op = (isForm ? String(form!.get("op") || "") : String(bodyJson.op || "")).toLowerCase();
    if (op === "add") {
      const email = (isForm ? String(form!.get("email") || "") : String(bodyJson.email || "")).trim().toLowerCase();
      if (!email) return NextResponse.json({ error: "email_required" }, { status: 400 });
      const userRes = await supabaseEnsure<{ id: string } | null>(req, {
        action: "auth.getUserByEmail",
        email,
      });
      const editorId = userRes?.id;
      if (!editorId) return NextResponse.json({ error: "user_not_found" }, { status: 404 });
      await supabaseEnsure(req, {
        action: "upsert",
        table: "liveblog_editors",
        values: {
          liveblog_id: liveblogId,
          user_id: editorId,
          role: "editor",
        },
        onConflict: "liveblog_id,user_id",
        returning: "minimal",
      });
      const redirectTo = new URL(`/liveblogs/${liveblogId}/manage`, req.nextUrl.origin);
      return NextResponse.redirect(redirectTo, { status: 303 });
    }

    if (op === "remove") {
      const userId = (isForm ? String(form!.get("userId") || "") : String(bodyJson.userId || "")).trim();
      if (!userId) return NextResponse.json({ error: "userId_required" }, { status: 400 });
      await supabaseEnsure(req, {
        action: "delete",
        table: "liveblog_editors",
        filters: [
          { column: "liveblog_id", op: "eq", value: liveblogId },
          { column: "user_id", op: "eq", value: userId },
        ],
        returning: "minimal",
      });
      const redirectTo = new URL(`/liveblogs/${liveblogId}/manage`, req.nextUrl.origin);
      return NextResponse.redirect(redirectTo, { status: 303 });
    }

    return NextResponse.json({ error: "unsupported_op" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
