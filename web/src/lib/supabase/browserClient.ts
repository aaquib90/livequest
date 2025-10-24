const SUPABASE_SSR_BROWSER_MODULE =
  process.env.NEXT_PUBLIC_SUPABASE_SSR_MODULE_URL ??
  process.env.SUPABASE_SSR_MODULE_URL ??
  "https://esm.sh/@supabase/ssr@0.5.1?bundle&target=es2022";

type SupabaseSSRModule = typeof import("@supabase/ssr");

const supabaseSsrPromise: Promise<SupabaseSSRModule> = import(
  /* webpackIgnore: true */ SUPABASE_SSR_BROWSER_MODULE
);

const { createBrowserClient } = await supabaseSsrPromise;

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
