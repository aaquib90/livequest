-- Function to count concurrent viewers by distinct session over last 30 seconds
create or replace function public.count_concurrent_viewers(p_liveblog_id uuid)
returns integer
language sql
as $$
  select count(*)::int from (
    select distinct session_id
    from public.viewer_pings
    where liveblog_id = p_liveblog_id
      and created_at > now() - interval '30 seconds'
  ) s;
$$;


