import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/serverClient";
import { createAdminClient } from "@/lib/supabase/adminClient";

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
    const { data: lb } = await supabase
      .from("liveblogs")
      .select("owner_id")
      .eq("id", liveblogId)
      .single();
    if (!lb || lb.owner_id !== user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const form = await req.formData().catch(() => null);
    const isForm = form instanceof FormData;
    const bodyJson = !isForm ? await req.json().catch(() => ({})) : {};

    const op = (isForm ? String(form!.get("op") || "") : String(bodyJson.op || "")).toLowerCase();
    if (op === "add") {
      const email = (isForm ? String(form!.get("email") || "") : String(bodyJson.email || "")).trim().toLowerCase();
      if (!email) return NextResponse.json({ error: "email_required" }, { status: 400 });
      const admin = createAdminClient();
      const { data: userRes, error: admErr } = await admin.auth.admin.getUserByEmail(email);
      if (admErr) return NextResponse.json({ error: admErr.message }, { status: 400 });
      const editorId = userRes?.user?.id;
      if (!editorId) return NextResponse.json({ error: "user_not_found" }, { status: 404 });
      await supabase.from("liveblog_editors").upsert({ liveblog_id: liveblogId, user_id: editorId, role: "editor" }, { onConflict: "liveblog_id,user_id" });
      const redirectTo = new URL(`/liveblogs/${liveblogId}/manage`, req.nextUrl.origin);
      return NextResponse.redirect(redirectTo, { status: 303 });
    }

    if (op === "remove") {
      const userId = (isForm ? String(form!.get("userId") || "") : String(bodyJson.userId || "")).trim();
      if (!userId) return NextResponse.json({ error: "userId_required" }, { status: 400 });
      await supabase
        .from("liveblog_editors")
        .delete()
        .eq("liveblog_id", liveblogId)
        .eq("user_id", userId);
      const redirectTo = new URL(`/liveblogs/${liveblogId}/manage`, req.nextUrl.origin);
      return NextResponse.redirect(redirectTo, { status: 303 });
    }

    return NextResponse.json({ error: "unsupported_op" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}


