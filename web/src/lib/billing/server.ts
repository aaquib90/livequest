import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/adminClient";

import type { AccountFeatures } from "./types";

type GenericSupabaseClient = SupabaseClient<Record<string, unknown>>;

function normaliseFeatureResult(result: AccountFeatures[] | AccountFeatures | null): AccountFeatures | null {
  if (!result) return null;
  if (Array.isArray(result)) {
    if (!result.length) return null;
    return result[0] ?? null;
  }
  return result;
}

export async function fetchAccountFeaturesForUser(supabase: GenericSupabaseClient): Promise<AccountFeatures | null> {
  const { data, error } = await supabase.rpc("account_features");
  if (error) throw error;
  return normaliseFeatureResult(data ?? null);
}

export async function fetchAccountFeaturesForAccount(accountId: string): Promise<AccountFeatures | null> {
  const admin = createAdminClient() as GenericSupabaseClient;
  const { data, error } = await admin.rpc("account_features", { p_account_id: accountId });
  if (error) throw error;
  return normaliseFeatureResult(data ?? null);
}

export function canManageSponsors(features: AccountFeatures | null | undefined): boolean {
  return Boolean(features?.can_manage_sponsors);
}

export function isPaidAccount(features: AccountFeatures | null | undefined): boolean {
  return Boolean(features?.is_paid);
}
