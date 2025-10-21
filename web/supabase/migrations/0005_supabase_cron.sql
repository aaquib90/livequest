-- Enable pg_cron and pg_net, and schedule nightly sync via HTTP to Next route

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Store the sync endpoint and secret in DB settings to avoid hardcoding
-- Replace the URL with your deployed API URL; for local dev you can run manually
-- Example: https://<your-project>.vercel.app/api/matches/sync
-- We'll use supabase functions URL style or environment-configured base later.

-- Create a helper function to call sync endpoint
-- call_matches_sync now redefined in 0006_cron_config_table.sql to read from app_config

-- Schedule nightly at 02:00 UTC
select cron.schedule(
  'matches_sync_nightly',
  '0 2 * * *',
  $$select public.call_matches_sync();$$
);


-- Helper to call completion endpoint to mark past matches as FT
-- call_matches_complete now redefined in 0006_cron_config_table.sql to read from app_config

-- Run completion job hourly at :15 past the hour
select cron.schedule(
  'matches_complete_hourly',
  '15 * * * *',
  $$select public.call_matches_complete();$$
);


