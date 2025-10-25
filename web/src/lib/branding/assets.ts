const SUPABASE_PUBLIC_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";

export function resolveBrandAssetUrl(path?: string | null): string | null {
  if (!SUPABASE_PUBLIC_URL || !path) return null;
  const safePath = path
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
  if (!safePath) return null;
  return `${SUPABASE_PUBLIC_URL}/storage/v1/object/public/brand-assets/${safePath}`;
}
