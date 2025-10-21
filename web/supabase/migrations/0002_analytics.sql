-- Analytics tables: append-only pings and events

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

alter table public.viewer_pings enable row level security;
alter table public.analytics_events enable row level security;

-- Allow anonymous insert pings/events for public/unlisted liveblogs
create policy if not exists pings_public_insert on public.viewer_pings for insert
  with check (
    exists (
      select 1 from public.liveblogs lb
      where lb.id = viewer_pings.liveblog_id
        and lb.status = 'active'
        and lb.privacy in ('public','unlisted')
    )
  );

create policy if not exists events_public_insert on public.analytics_events for insert
  with check (
    exists (
      select 1 from public.liveblogs lb
      where lb.id = analytics_events.liveblog_id
        and lb.status = 'active'
        and lb.privacy in ('public','unlisted')
    )
  );

-- Owner can read analytics
create policy if not exists pings_owner_select on public.viewer_pings for select
  using (
    exists (
      select 1 from public.liveblogs lb
      where lb.id = viewer_pings.liveblog_id and lb.owner_id = auth.uid()
    )
  );

create policy if not exists events_owner_select on public.analytics_events for select
  using (
    exists (
      select 1 from public.liveblogs lb
      where lb.id = analytics_events.liveblog_id and lb.owner_id = auth.uid()
    )
  );


