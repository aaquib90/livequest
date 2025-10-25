import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/adminClient";
import { executeSupabaseOperation } from "@/lib/supabase/gatewayClient";
import type { SupabaseOperation } from "@/lib/supabase/gatewayClient";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const secret = process.env.SUPABASE_GATEWAY_SECRET;
  if (!secret) {
    return NextResponse.json({ error: { message: "gateway_not_configured" } }, { status: 500 });
  }

  if (req.headers.get("x-internal-token") !== secret) {
    return NextResponse.json({ error: { message: "forbidden" } }, { status: 403 });
  }

  let operation: SupabaseOperation | null = null;
  try {
    operation = (await req.json()) as SupabaseOperation;
  } catch {
    return NextResponse.json({ error: { message: "invalid_json_body" } }, { status: 400 });
  }

  if (!operation || typeof operation !== "object" || !("action" in operation)) {
    return NextResponse.json({ error: { message: "invalid_operation" } }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    const result = await executeSupabaseOperation(supabase, operation);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : typeof error === "string" ? error : "unknown_error";
    return NextResponse.json({ data: null, error: { message } }, { status: 500 });
  }
