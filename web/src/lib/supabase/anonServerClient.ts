import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type GenericDatabase = Record<string, unknown>;

let cachedClient: SupabaseClient<GenericDatabase> | null = null;

export function createAnonServerClient(): SupabaseClient<GenericDatabase> {
  if (cachedClient) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured");
  }

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured");
  }

  cachedClient = createClient<GenericDatabase>(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cachedClient;
}
