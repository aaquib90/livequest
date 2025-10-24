import type { NextRequest } from "next/server";

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

function getGatewaySecret(): string {
  const secret = process.env.SUPABASE_GATEWAY_SECRET;
  if (!secret) {
    throw new Error("SUPABASE_GATEWAY_SECRET is not configured");
  }
  return secret;
}

export async function supabaseRequest<T = unknown>(
  request: BasicRequest,
  operation: SupabaseOperation,
  options?: { baseUrl?: string }
): Promise<SupabaseResponse<T>> {
  const origin = resolveOrigin(request, options?.baseUrl);
  const res = await fetch(`${origin}/api/internal/supabase`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-internal-token": getGatewaySecret(),
    },
    body: JSON.stringify(operation),
  });

  const payload = (await res.json().catch(() => null)) as SupabaseResponse<T> | null;
  if (!payload) {
    throw new Error(`Supabase gateway responded with invalid payload (status ${res.status})`);
  }

  return payload;
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
