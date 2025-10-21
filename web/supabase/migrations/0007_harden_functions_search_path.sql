-- Harden SECURITY DEFINER functions by pinning a safe search_path
-- This addresses the "Function Search Path Mutable" advisory.

-- Ensure built-ins resolve from pg_catalog first, then our schemas only.
alter function public.call_matches_sync() set search_path = pg_catalog, public, net;
alter function public.call_matches_complete() set search_path = pg_catalog, public, net;


