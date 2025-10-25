import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type GenericDatabase = Record<string, unknown>;

export function createAdminClient(): SupabaseClient<GenericDatabase> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured");
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }

  return createClient<GenericDatabase>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
