-- Engagement widgets core schema
-- Tables: engagement_widgets, widget_events, ugc_submissions

-- Enable pgcrypto for gen_random_uuid if not already
create extension if not exists pgcrypto;

-- engagement_widgets: generic config for standalone or embedded widgets
create table if not exists public.engagement_widgets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (char_length(type) between 1 and 64),
  name text,
  liveblog_id uuid references public.liveblogs(id) on delete set null,
  config jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active','paused','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists engagement_widgets_owner_idx on public.engagement_widgets(owner_id);
create index if not exists engagement_widgets_type_idx on public.engagement_widgets(type);
create index if not exists engagement_widgets_liveblog_idx on public.engagement_widgets(liveblog_id);

-- updated_at trigger
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end$$;

drop trigger if exists set_updated_at on public.engagement_widgets;
create trigger set_updated_at before update on public.engagement_widgets for each row execute function public.tg_set_updated_at();

alter table public.engagement_widgets enable row level security;
-- Service role only by default; app accesses via internal gateway
drop policy if exists engagement_widgets_service_role_all on public.engagement_widgets;
create policy engagement_widgets_service_role_all on public.engagement_widgets
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- widget_events: normalized events stream for widgets
create table if not exists public.widget_events (
  id uuid primary key default gen_random_uuid(),
  widget_id uuid not null references public.engagement_widgets(id) on delete cascade,
  event text not null check (char_length(event) between 1 and 64),
  device_hash text not null,
  value integer,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists widget_events_widget_idx on public.widget_events(widget_id);
create index if not exists widget_events_event_idx on public.widget_events(event);
create index if not exists widget_events_created_idx on public.widget_events(created_at);

-- One vote per device per widget for hot-take
create unique index if not exists widget_events_vote_unique on public.widget_events(widget_id, device_hash)
  where event = 'vote';

drop trigger if exists set_updated_at on public.widget_events;
create trigger set_updated_at before update on public.widget_events for each row execute function public.tg_set_updated_at();

alter table public.widget_events enable row level security;
drop policy if exists widget_events_service_role_all on public.widget_events;
create policy widget_events_service_role_all on public.widget_events
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ugc_submissions: for Caption This and other UGC widgets
create table if not exists public.ugc_submissions (
  id uuid primary key default gen_random_uuid(),
  widget_id uuid not null references public.engagement_widgets(id) on delete cascade,
  device_hash text,
  content text not null,
  votes integer not null default 0,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ugc_submissions_widget_idx on public.ugc_submissions(widget_id);
create index if not exists ugc_submissions_status_idx on public.ugc_submissions(status);
create index if not exists ugc_submissions_votes_idx on public.ugc_submissions(votes desc);

drop trigger if exists set_updated_at on public.ugc_submissions;
create trigger set_updated_at before update on public.ugc_submissions for each row execute function public.tg_set_updated_at();

alter table public.ugc_submissions enable row level security;
drop policy if exists ugc_submissions_service_role_all on public.ugc_submissions;
create policy ugc_submissions_service_role_all on public.ugc_submissions
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

comment on table public.engagement_widgets is 'Config table for embeddable engagement widgets.';
comment on table public.widget_events is 'Event stream for widget interactions (e.g., votes, clicks).';
comment on table public.ugc_submissions is 'User-generated content submissions and moderation state for widgets.';


