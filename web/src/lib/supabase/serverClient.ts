import type { CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

const DEFAULT_SUPABASE_SSR_MODULE =
  "https://esm.sh/@supabase/ssr@0.5.1?bundle&target=es2022";

const SUPABASE_SSR_MODULE =
  process.env.SUPABASE_SSR_MODULE_URL?.trim() ||
  DEFAULT_SUPABASE_SSR_MODULE;

type SupabaseSSRModule = typeof import("@supabase/ssr");

let cachedCreateServerClient:
  | SupabaseSSRModule["createServerClient"]
  | null = null;

async function resolveCreateServerClient() {
  if (!cachedCreateServerClient) {
    const mod: SupabaseSSRModule = await import(
      /* webpackIgnore: true */ SUPABASE_SSR_MODULE
    );
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
