-- Ensure analytics source tables exist (compatible with earlier migrations)

create table if not exists public.viewer_pings (
  id uuid primary key default gen_random_uuid(),
  liveblog_id uuid not null references public.liveblogs(id) on delete cascade,
  session_id text not null,
  event text not null default 'ping',
  mode text,
  user_agent text,
  referrer text,
  ip_hash text,
  created_at timestamptz not null default now()
);
create index if not exists viewer_pings_liveblog_time_idx on public.viewer_pings(liveblog_id, created_at desc);
create index if not exists viewer_pings_session_idx on public.viewer_pings(session_id);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  liveblog_id uuid not null references public.liveblogs(id) on delete cascade,
  session_id text,
  event text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index if not exists analytics_events_liveblog_time_idx on public.analytics_events(liveblog_id, created_at desc);

create table if not exists public.sponsor_slots (
  id uuid primary key default gen_random_uuid(),
  liveblog_id uuid not null references public.liveblogs(id) on delete cascade,
  name text not null,
  headline text,
  description text,
  cta_text text,
  cta_url text,
  affiliate_code text,
  image_path text,
  layout text not null default 'card',
  pinned boolean not null default false,
  priority integer not null default 0,
  status text not null default 'scheduled',
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists sponsor_slots_liveblog_idx on public.sponsor_slots(liveblog_id);
create index if not exists sponsor_slots_liveblog_window_idx on public.sponsor_slots(liveblog_id, starts_at, ends_at);

create table if not exists public.sponsor_impressions (
  id bigserial primary key,
  slot_id uuid not null references public.sponsor_slots(id) on delete cascade,
  liveblog_id uuid not null,
  session_id text,
  device_id text,
  mode text,
  user_agent text,
  referrer text,
  ip_hash text,
  view_ms integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists sponsor_impressions_slot_idx on public.sponsor_impressions(slot_id);
create index if not exists sponsor_impressions_liveblog_idx on public.sponsor_impressions(liveblog_id, created_at desc);

create table if not exists public.sponsor_clicks (
  id bigserial primary key,
  slot_id uuid not null references public.sponsor_slots(id) on delete cascade,
  liveblog_id uuid not null,
  session_id text,
  device_id text,
  mode text,
  target_url text,
  created_at timestamptz not null default now()
);
create index if not exists sponsor_clicks_slot_idx on public.sponsor_clicks(slot_id);
create index if not exists sponsor_clicks_liveblog_idx on public.sponsor_clicks(liveblog_id, created_at desc);

-- Account-level analytics helper functions

create or replace function public.account_analytics_summary(p_days integer default 30)
returns table (
  total_liveblogs bigint,
  active_liveblogs bigint,
  archived_liveblogs bigint,
  unique_viewers_7d bigint,
  unique_viewers_30d bigint,
  session_pings_7d bigint,
  session_pings_30d bigint,
  starts_7d bigint,
  starts_30d bigint,
  total_updates bigint,
  sponsor_impressions_30d bigint,
  sponsor_clicks_30d bigint,
  sponsor_ctr_30d numeric
)
language sql
security invoker
set search_path = pg_catalog, public
as $$
  with me as (
    select coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid) as uid
  ),
  liveblogs as (
    select id, status
    from public.liveblogs
    where owner_id = (select uid from me)
  ),
  total_updates as (
    select count(*) as cnt
    from public.updates u
    where u.liveblog_id in (select id from liveblogs)
      and u.status = 'published'
      and u.deleted_at is null
  ),
  pings_7 as (
    select
      count(*) as total_pings,
      count(distinct v.session_id) as unique_sessions
    from public.viewer_pings v
    where v.liveblog_id in (select id from liveblogs)
      and v.created_at >= now() - interval '7 days'
  ),
  pings_30 as (
    select
      count(*) as total_pings,
      count(distinct v.session_id) as unique_sessions
    from public.viewer_pings v
    where v.liveblog_id in (select id from liveblogs)
      and v.created_at >= now() - make_interval(days => p_days)
  ),
  starts_7 as (
    select count(*) as total_starts
    from public.analytics_events e
    where e.liveblog_id in (select id from liveblogs)
      and e.event = 'start'
      and e.created_at >= now() - interval '7 days'
  ),
  starts_30 as (
    select count(*) as total_starts
    from public.analytics_events e
    where e.liveblog_id in (select id from liveblogs)
      and e.event = 'start'
      and e.created_at >= now() - make_interval(days => p_days)
  ),
  sponsor_impressions_30 as (
    select count(*) as total_impressions
    from public.sponsor_impressions si
    where si.liveblog_id in (select id from liveblogs)
      and si.created_at >= now() - make_interval(days => p_days)
  ),
  sponsor_clicks_30 as (
    select count(*) as total_clicks
    from public.sponsor_clicks sc
    where sc.liveblog_id in (select id from liveblogs)
      and sc.created_at >= now() - make_interval(days => p_days)
  )
  select
    (select count(*) from liveblogs)::bigint as total_liveblogs,
    (
      select count(*)
      from liveblogs
      where coalesce(status, 'active') not in ('archived', 'completed', 'deleted')
    )::bigint as active_liveblogs,
    (
      select count(*)
      from liveblogs
      where status in ('archived', 'completed')
    )::bigint as archived_liveblogs,
    coalesce((select unique_sessions from pings_7), 0)::bigint as unique_viewers_7d,
    coalesce((select unique_sessions from pings_30), 0)::bigint as unique_viewers_30d,
    coalesce((select total_pings from pings_7), 0)::bigint as session_pings_7d,
    coalesce((select total_pings from pings_30), 0)::bigint as session_pings_30d,
    coalesce((select total_starts from starts_7), 0)::bigint as starts_7d,
    coalesce((select total_starts from starts_30), 0)::bigint as starts_30d,
    coalesce((select cnt from total_updates), 0)::bigint as total_updates,
    coalesce((select total_impressions from sponsor_impressions_30), 0)::bigint as sponsor_impressions_30d,
    coalesce((select total_clicks from sponsor_clicks_30), 0)::bigint as sponsor_clicks_30d,
    case
      when coalesce((select total_impressions from sponsor_impressions_30), 0) = 0 then 0
      else round(
        coalesce((select total_clicks from sponsor_clicks_30), 0)::numeric
        / greatest(coalesce((select total_impressions from sponsor_impressions_30), 0)::numeric, 1)
        * 100,
        2
      )
    end as sponsor_ctr_30d;
$$;

create or replace function public.account_viewer_timeseries(p_days integer default 14)
returns table (
  day date,
  unique_viewers bigint,
  sessions bigint,
  starts bigint
)
language sql
security invoker
set search_path = pg_catalog, public
as $$
  with me as (
    select coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid) as uid
  ),
  liveblogs as (
    select id
    from public.liveblogs
    where owner_id = (select uid from me)
  ),
  day_series as (
    select generate_series(current_date - (p_days - 1), current_date, interval '1 day')::date as day
  )
  select
    d.day,
    coalesce((
      select count(distinct v.session_id)
      from public.viewer_pings v
      where v.liveblog_id in (select id from liveblogs)
        and v.created_at >= d.day
        and v.created_at < d.day + interval '1 day'
    ), 0)::bigint as unique_viewers,
    coalesce((
      select count(*)
      from public.viewer_pings v
      where v.liveblog_id in (select id from liveblogs)
        and v.created_at >= d.day
        and v.created_at < d.day + interval '1 day'
    ), 0)::bigint as sessions,
    coalesce((
      select count(*)
      from public.analytics_events e
      where e.liveblog_id in (select id from liveblogs)
        and e.event = 'start'
        and e.created_at >= d.day
        and e.created_at < d.day + interval '1 day'
    ), 0)::bigint as starts
  from day_series d
  order by d.day;
$$;

create or replace function public.account_top_sponsors(p_limit integer default 5, p_days integer default 30)
returns table (
  slot_id uuid,
  sponsor_name text,
  liveblog_id uuid,
  liveblog_title text,
  status text,
  impressions bigint,
  clicks bigint,
  ctr numeric
)
language sql
security invoker
set search_path = pg_catalog, public
as $$
  with me as (
    select coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid) as uid
  ),
  liveblogs as (
    select id, title
    from public.liveblogs
    where owner_id = (select uid from me)
  ),
  slots as (
    select ss.id, ss.name, ss.status, ss.liveblog_id
    from public.sponsor_slots ss
    where ss.liveblog_id in (select id from liveblogs)
  ),
  impressions as (
    select si.slot_id, count(*) as impressions
    from public.sponsor_impressions si
    where si.slot_id in (select id from slots)
      and si.created_at >= now() - make_interval(days => p_days)
    group by si.slot_id
  ),
  clicks as (
    select sc.slot_id, count(*) as clicks
    from public.sponsor_clicks sc
    where sc.slot_id in (select id from slots)
      and sc.created_at >= now() - make_interval(days => p_days)
    group by sc.slot_id
  )
  select
    s.id as slot_id,
    s.name as sponsor_name,
    s.liveblog_id,
    lb.title as liveblog_title,
    coalesce(s.status, 'scheduled') as status,
    coalesce(i.impressions, 0)::bigint as impressions,
    coalesce(c.clicks, 0)::bigint as clicks,
    case
      when coalesce(i.impressions, 0) = 0 then 0
      else round(
        coalesce(c.clicks, 0)::numeric
        / greatest(coalesce(i.impressions, 0)::numeric, 1)
        * 100,
        2
      )
    end as ctr
  from slots s
  join liveblogs lb on lb.id = s.liveblog_id
  left join impressions i on i.slot_id = s.id
  left join clicks c on c.slot_id = s.id
  order by impressions desc, clicks desc, sponsor_name asc
  limit p_limit;
$$;

create or replace function public.account_top_liveblogs(p_limit integer default 5, p_days integer default 30)
returns table (
  liveblog_id uuid,
  liveblog_title text,
  status text,
  unique_viewers bigint,
  starts bigint,
  updates_published bigint,
  last_published_at timestamptz
)
language sql
security invoker
set search_path = pg_catalog, public
as $$
  with me as (
    select coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid) as uid
  ),
  liveblogs as (
    select id, title, status
    from public.liveblogs
    where owner_id = (select uid from me)
  ),
  viewer_stats as (
    select
      v.liveblog_id,
      count(distinct v.session_id) as unique_viewers
    from public.viewer_pings v
    where v.liveblog_id in (select id from liveblogs)
      and v.created_at >= now() - make_interval(days => p_days)
    group by v.liveblog_id
  ),
  start_stats as (
    select
      e.liveblog_id,
      count(*) as starts
    from public.analytics_events e
    where e.liveblog_id in (select id from liveblogs)
      and e.event = 'start'
      and e.created_at >= now() - make_interval(days => p_days)
    group by e.liveblog_id
  ),
  update_stats as (
    select
      u.liveblog_id,
      count(*) as updates_published,
      max(u.published_at) as last_published_at
    from public.updates u
    where u.liveblog_id in (select id from liveblogs)
      and u.status = 'published'
      and u.deleted_at is null
      and u.published_at >= now() - make_interval(days => p_days)
    group by u.liveblog_id
  )
  select
    lb.id as liveblog_id,
    lb.title as liveblog_title,
    coalesce(lb.status, 'active') as status,
    coalesce(vs.unique_viewers, 0)::bigint as unique_viewers,
    coalesce(ss.starts, 0)::bigint as starts,
    coalesce(us.updates_published, 0)::bigint as updates_published,
    us.last_published_at
  from liveblogs lb
  left join viewer_stats vs on vs.liveblog_id = lb.id
  left join start_stats ss on ss.liveblog_id = lb.id
  left join update_stats us on us.liveblog_id = lb.id
  order by unique_viewers desc, starts desc, liveblog_title asc
  limit p_limit;
$$;

create or replace function public.account_referrer_breakdown(p_limit integer default 5, p_days integer default 30)
returns table (
  referrer text,
  sessions bigint,
  unique_viewers bigint
)
language sql
security invoker
set search_path = pg_catalog, public
as $$
  with me as (
    select coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid) as uid
  ),
  liveblogs as (
    select id
    from public.liveblogs
    where owner_id = (select uid from me)
  )
  select
    coalesce(nullif(v.referrer, ''), 'Direct') as referrer,
    count(*)::bigint as sessions,
    count(distinct v.session_id)::bigint as unique_viewers
  from public.viewer_pings v
  where v.liveblog_id in (select id from liveblogs)
    and v.created_at >= now() - make_interval(days => p_days)
  group by coalesce(nullif(v.referrer, ''), 'Direct')
  order by unique_viewers desc, sessions desc, referrer asc
  limit p_limit;
$$;
