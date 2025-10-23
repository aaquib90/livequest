import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type GenericDatabase = Record<string, unknown>;

export function createAdminClient(): SupabaseClient<GenericDatabase> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient<GenericDatabase>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

