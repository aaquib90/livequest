-- Sponsorship slots and tracking
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
  status text not null default 'scheduled', -- scheduled | active | paused | archived
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

-- optional: if RLS enabled globally, add policies to protect slot management
-- alter table public.sponsor_slots enable row level security;
-- alter table public.sponsor_impressions enable row level security;
-- alter table public.sponsor_clicks enable row level security;
