-- Cron configuration via table (avoids ALTER DATABASE set parameter permissions)

create table if not exists public.app_config (
  key text primary key,
  value text not null
);

alter table public.app_config enable row level security;

-- No public policies; access via SECURITY DEFINER functions and SQL editor

create or replace function public.get_app_config(k text)
returns text
language sql
stable
as $$
  select value from public.app_config where key = k limit 1;
$$;

-- Rewire existing cron helper functions to read from app_config instead of current_setting
create or replace function public.call_matches_sync()
returns void
language plpgsql
security definer
as $$
declare
  _url text := public.get_app_config('sync_url');
  _secret text := public.get_app_config('cron_secret');
  _res jsonb;
begin
  if _url is null then
    raise notice 'sync_url is not set; skipping';
    return;
  end if;

  select
    (select status from net.http_post(
      url := _url,
      headers := jsonb_build_object('Content-Type','application/json','x-cron-secret', coalesce(_secret,'')),
      body := jsonb_build_object('days', 7)
    )) as status
  into _res;
end;
$$;

create or replace function public.call_matches_complete()
returns void
language plpgsql
security definer
as $$
declare
  _url text := public.get_app_config('complete_url');
  _secret text := public.get_app_config('cron_secret');
  _res jsonb;
begin
  if _url is null then
    raise notice 'complete_url is not set; skipping';
    return;
  end if;

  select
    (select status from net.http_post(
      url := _url,
      headers := jsonb_build_object('Content-Type','application/json','x-cron-secret', coalesce(_secret,'')),
      body := jsonb_build_object('bufferMinutes', 180)
    )) as status
  into _res;
end;
$$;


