import type { NextRequest } from "next/server";
import type { PostgrestFilterBuilder, SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "./adminClient";

type BasicRequest = Request | NextRequest;

export type SupabaseFilter =
  | { column: string; op: "eq" | "neq" | "lt" | "lte" | "gt" | "gte" | "is"; value: unknown }
  | { column: string; op: "in"; value: unknown[] }
  | { column: string; op: "contains"; value: unknown }
  | { column: string; op: "match"; value: Record<string, unknown> }
  | { column: string; op: "not"; operator: string; value: unknown };

export type SupabaseOrder = {
  column: string;
  ascending?: boolean;
  nullsFirst?: boolean;
};

export type SupabaseOperation =
  | {
      action: "select";
      table: string;
      columns?: string;
      filters?: SupabaseFilter[];
      order?: SupabaseOrder | SupabaseOrder[];
      limit?: number;
      single?: boolean;
      maybeSingle?: boolean;
      head?: boolean;
      count?: "exact" | "planned" | "estimated";
      range?: { from: number; to: number };
      group?: string;
    }
  | {
      action: "insert";
      table: string;
      values: Record<string, unknown> | Record<string, unknown>[];
      returning?: "minimal" | "representation";
    }
  | {
      action: "upsert";
      table: string;
      values: Record<string, unknown> | Record<string, unknown>[];
      onConflict?: string;
      returning?: "minimal" | "representation";
    }
  | {
      action: "update";
      table: string;
      values: Record<string, unknown>;
      filters?: SupabaseFilter[];
      returning?: "minimal" | "representation";
      select?: string | null;
      count?: "exact" | "planned" | "estimated";
      head?: boolean;
    }
  | {
      action: "delete";
      table: string;
      filters?: SupabaseFilter[];
      returning?: "minimal" | "representation";
    }
  | {
      action: "rpc";
      name: string;
      args?: Record<string, unknown>;
    }
  | {
      action: "auth.getUserByEmail";
      email: string;
    };

export type SupabaseResponse<T = unknown> = {
  data: T | null;
  error: { message: string } | null;
  count?: number | null;
};

function resolveOrigin(request: BasicRequest, baseUrl?: string): string {
  if (baseUrl) return baseUrl;
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

function getGatewaySecret(): string | null {
  const secret = process.env.SUPABASE_GATEWAY_SECRET;
  if (!secret) return null;
  const trimmed = secret.trim();
  return trimmed.length ? trimmed : null;
}

async function runOperationDirect<T = unknown>(
  operation: SupabaseOperation
): Promise<SupabaseResponse<T>> {
  const supabase = createAdminClient();
  return executeSupabaseOperation<T>(supabase, operation);
}

export async function supabaseRequest<T = unknown>(
  request: BasicRequest,
  operation: SupabaseOperation,
  options?: { baseUrl?: string }
): Promise<SupabaseResponse<T>> {
  const secret = getGatewaySecret();
  if (!secret) {
    return runOperationDirect<T>(operation);
  }

  const origin = resolveOrigin(request, options?.baseUrl);
  try {
    const res = await fetch(`${origin}/api/internal/supabase`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-token": secret,
      },
      body: JSON.stringify(operation),
    });

    const payload = (await res.json().catch(() => null)) as SupabaseResponse<T> | null;
    if (!payload) {
      throw new Error(`Supabase gateway responded with invalid payload (status ${res.status})`);
    }

    if (!res.ok) {
      if (res.status === 403 || res.status === 404) {
        return runOperationDirect<T>(operation);
      }
    }

    return payload;
  } catch (error) {
    return runOperationDirect<T>(operation);
  }
}

export async function supabaseEnsure<T = unknown>(
  request: BasicRequest,
  operation: SupabaseOperation,
  options?: { baseUrl?: string }
): Promise<T> {
  const response = await supabaseRequest<T>(request, operation, options);
  if (response.error) {
    throw new Error(response.error.message || "Supabase gateway error");
  }
  return (response.data ?? null) as T;
}

export async function executeSupabaseOperation<T = unknown>(
  supabase: SupabaseClient,
  operation: SupabaseOperation
): Promise<SupabaseResponse<T>> {
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
      return {
        data: (data ?? null) as T | null,
        error: error ? { message: error.message } : null,
        count,
      };
    }
    case "insert": {
      const { data, error } = await supabase
        .from(operation.table)
        .insert(operation.values, { returning: operation.returning ?? "representation" });
      return { data: (data ?? null) as T | null, error: error ? { message: error.message } : null };
    }
    case "upsert": {
      const { data, error } = await supabase
        .from(operation.table)
        .upsert(operation.values, {
          returning: operation.returning ?? "representation",
          onConflict: operation.onConflict,
        });
      return { data: (data ?? null) as T | null, error: error ? { message: error.message } : null };
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
      return {
        data: (data ?? null) as T | null,
        error: error ? { message: error.message } : null,
        count,
      };
    }
    case "delete": {
      let query = supabase
        .from(operation.table)
        .delete({ returning: operation.returning ?? "minimal" });
      query = applyFilters(query, operation.filters);
      const { data, error } = await query;
      return { data: (data ?? null) as T | null, error: error ? { message: error.message } : null };
    }
    case "rpc": {
      const { data, error } = await supabase.rpc(operation.name, operation.args ?? {});
      return { data: (data ?? null) as T | null, error: error ? { message: error.message } : null };
    }
    case "auth.getUserByEmail": {
      const { data, error } = await supabase.auth.admin.getUserByEmail(operation.email);
      if (error) {
        return { data: null, error: { message: error.message } };
      }
      return { data: (data.user ?? null) as T | null, error: null };
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
