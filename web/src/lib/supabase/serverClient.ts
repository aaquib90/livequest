import type { CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

const SUPABASE_SSR_MODULE =
  process.env.SUPABASE_SSR_MODULE_URL ??
  "https://esm.sh/@supabase/ssr@0.5.1?bundle&target=es2022";

type SupabaseSSRModule = typeof import("@supabase/ssr");

const supabaseSsrPromise: Promise<SupabaseSSRModule> = import(
  /* webpackIgnore: true */ SUPABASE_SSR_MODULE
);

const { createServerClient } = await supabaseSsrPromise;

export async function createClient() {
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
