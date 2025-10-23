-- Aggregate metrics for marketing experiences

create or replace function public.marketing_metrics()
returns table (
  total_unique_viewers bigint,
  total_views bigint,
  total_interactions bigint,
  sponsor_impressions bigint,
  sponsor_clicks bigint,
  sponsor_ctr numeric
)
language sql
security definer
set search_path = pg_catalog, public
as $$
  with unique_sessions as (
    select count(distinct session_id) as cnt
    from public.viewer_pings
  ),
  view_events as (
    select count(*) as cnt
    from public.analytics_events
    where event = 'start'
  ),
  interactions as (
    select count(*) as cnt
    from public.analytics_events
  ),
  impressions as (
    select count(*) as cnt
    from public.sponsor_impressions
  ),
  clicks as (
    select count(*) as cnt
    from public.sponsor_clicks
  )
  select
    coalesce((select cnt from unique_sessions), 0)::bigint as total_unique_viewers,
    coalesce((select cnt from view_events), 0)::bigint as total_views,
    coalesce((select cnt from interactions), 0)::bigint as total_interactions,
    coalesce((select cnt from impressions), 0)::bigint as sponsor_impressions,
    coalesce((select cnt from clicks), 0)::bigint as sponsor_clicks,
    case
      when coalesce((select cnt from impressions), 0) = 0 then 0
      else round(
        (coalesce((select cnt from clicks), 0)::numeric / nullif((select cnt from impressions), 0)::numeric) * 100,
        2
      )
    end as sponsor_ctr
$$;

comment on function public.marketing_metrics() is
  'Returns aggregate audience and sponsorship metrics for marketing surfaces.';

grant execute on function public.marketing_metrics() to anon, authenticated, service_role;
