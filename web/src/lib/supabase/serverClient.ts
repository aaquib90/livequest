import type { CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

type SupabaseSSRModule = typeof import("@supabase/ssr");

const EXTERNAL_SUPABASE_MODULE_URL =
  process.env.SUPABASE_SSR_MODULE_URL?.trim() || "";

let supabaseModulePromise: Promise<SupabaseSSRModule> | null = null;
let cachedCreateServerClient:
  | SupabaseSSRModule["createServerClient"]
  | null = null;

async function resolveCreateServerClient() {
  if (!cachedCreateServerClient) {
    if (!supabaseModulePromise) {
      supabaseModulePromise = EXTERNAL_SUPABASE_MODULE_URL
        ? import(
            /* webpackIgnore: true */ EXTERNAL_SUPABASE_MODULE_URL
          )
        : import("@supabase/ssr");
    }
    const mod = await supabaseModulePromise;
    cachedCreateServerClient = mod.createServerClient;
  }
  return cachedCreateServerClient;
}

export async function createClient() {
  const createServerClient = await resolveCreateServerClient();
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Cannot set headers in some server contexts
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // Ignore if not possible
          }
        },
      },
    }
  );
}
