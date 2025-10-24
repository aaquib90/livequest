import type { PostgrestFilterBuilder, SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/adminClient";
import type { SupabaseFilter, SupabaseOperation, SupabaseResponse } from "@/lib/supabase/gatewayClient";

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
    const result = await handleOperation(supabase, operation);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : typeof error === "string" ? error : "unknown_error";
    return NextResponse.json({ data: null, error: { message } }, { status: 500 });
  }
}

async function handleOperation(
  supabase: SupabaseClient,
  operation: SupabaseOperation
): Promise<SupabaseResponse> {
  switch (operation.action) {
    case "select": {
      let query = supabase.from(operation.table).select(operation.columns ?? "*", {
        head: operation.head ?? false,
        count: operation.count,
      });
      query = applyFilters(query, operation.filters);

      if (operation.order) {
        const orders = Array.isArray(operation.order) ? operation.order : [operation.order];
        for (const order of orders) {
          query = query.order(order.column, {
            ascending: order.ascending ?? true,
            nullsFirst: order.nullsFirst ?? false,
          });
        }
      }

      if (operation.range) {
        query = query.range(operation.range.from, operation.range.to);
      } else if (operation.limit) {
        query = query.limit(operation.limit);
      }

      if (operation.group) {
        query = query.group(operation.group);
      }

      if (operation.single) {
        query = query.single();
      } else if (operation.maybeSingle) {
        query = query.maybeSingle();
      }

      const { data, error, count } = await query;
      return { data: data ?? null, error: error ? { message: error.message } : null, count };
    }
    case "insert": {
      const { data, error } = await supabase
        .from(operation.table)
        .insert(operation.values, { returning: operation.returning ?? "representation" });
      return { data: data ?? null, error: error ? { message: error.message } : null };
    }
    case "upsert": {
      const { data, error } = await supabase
        .from(operation.table)
        .upsert(operation.values, {
          returning: operation.returning ?? "representation",
          onConflict: operation.onConflict,
        });
      return { data: data ?? null, error: error ? { message: error.message } : null };
    }
    case "update": {
      let query = supabase
        .from(operation.table)
        .update(operation.values, { returning: operation.returning ?? "representation" });
      query = applyFilters(query, operation.filters);
      const selectColumns = operation.select ?? undefined;
      if (selectColumns) {
        query = query.select(selectColumns, {
          count: operation.count,
          head: operation.head ?? false,
        });
      } else if (operation.count || operation.head) {
        query = query.select("*", {
          count: operation.count,
          head: operation.head ?? false,
        });
      }

      const { data, error, count } = await query;
      return { data: data ?? null, error: error ? { message: error.message } : null, count };
    }
    case "delete": {
      let query = supabase
        .from(operation.table)
        .delete({ returning: operation.returning ?? "minimal" });
      query = applyFilters(query, operation.filters);
      const { data, error } = await query;
      return { data: data ?? null, error: error ? { message: error.message } : null };
    }
    case "rpc": {
      const { data, error } = await supabase.rpc(operation.name, operation.args ?? {});
      return { data: data ?? null, error: error ? { message: error.message } : null };
    }
    case "auth.getUserByEmail": {
      const { data, error } = await supabase.auth.admin.getUserByEmail(operation.email);
      if (error) {
        return { data: null, error: { message: error.message } };
      }
      return { data: data.user ?? null, error: null };
    }
    default:
      throw new Error(`Unsupported Supabase operation: ${(operation as { action: string }).action}`);
  }
}

function applyFilters<T>(
  query: PostgrestFilterBuilder<T, T[], unknown>,
  filters: SupabaseFilter[] | undefined
) {
  if (!filters?.length) return query;
  for (const filter of filters) {
    switch (filter.op) {
      case "eq":
        query = query.eq(filter.column, filter.value);
        break;
      case "neq":
        query = query.neq(filter.column, filter.value);
        break;
      case "lt":
        query = query.lt(filter.column, filter.value);
        break;
      case "lte":
        query = query.lte(filter.column, filter.value);
        break;
      case "gt":
        query = query.gt(filter.column, filter.value);
        break;
      case "gte":
        query = query.gte(filter.column, filter.value);
        break;
      case "is":
        query = query.is(filter.column, filter.value as any);
        break;
      case "in":
        query = query.in(filter.column, filter.value as any[]);
        break;
      case "contains":
        query = query.contains(filter.column, filter.value as any);
        break;
      case "match":
        query = query.match(filter.value as any);
        break;
      case "not":
        query = query.not(filter.column, (filter as any).operator ?? "eq", filter.value as any);
        break;
      default:
        throw new Error(`Unsupported filter operator: ${(filter as any).op}`);
    }
  }
  return query;
}
