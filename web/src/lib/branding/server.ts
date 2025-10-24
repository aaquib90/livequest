import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/adminClient";

import type { AccountBranding } from "./types";

type GenericSupabaseClient = SupabaseClient<Record<string, unknown>>;

function unwrapBrandingResult(result: AccountBranding[] | AccountBranding | null): AccountBranding | null {
  if (!result) return null;
  if (Array.isArray(result)) {
    if (!result.length) return null;
    return result[0] ?? null;
  }
  return result;
}

export async function fetchAccountBrandingForUser(supabase: GenericSupabaseClient): Promise<AccountBranding | null> {
  const { data, error } = await supabase.rpc("account_branding");
  if (error) throw error;
  return unwrapBrandingResult(data ?? null);
}

export async function fetchAccountBrandingForAccount(accountId: string): Promise<AccountBranding | null> {
  const admin = createAdminClient() as GenericSupabaseClient;
  const { data, error } = await admin.rpc("account_branding", { p_account_id: accountId });
  if (error) throw error;
  return unwrapBrandingResult(data ?? null);
}

export async function fetchAccountBrandingForLiveblog(
  supabase: GenericSupabaseClient,
  liveblogId: string
): Promise<AccountBranding | null> {
  const { data, error } = await supabase.rpc("account_branding_for_liveblog", { p_liveblog_id: liveblogId });
  if (error) throw error;
  return unwrapBrandingResult(data ?? null);
}
