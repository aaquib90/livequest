-- Enable required extensions
create extension if not exists "pgcrypto";

-- Enums
do $$ begin
  create type liveblog_status as enum ('active','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type privacy as enum ('public','unlisted','private');
exception when duplicate_object then null; end $$;

do $$ begin
  create type update_status as enum ('draft','scheduled','published');
exception when duplicate_object then null; end $$;

-- Tables
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text,
  created_at timestamptz not null default now()
);

create table if not exists public.liveblogs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  status liveblog_status not null default 'active',
  privacy privacy not null default 'public',
  settings jsonb not null default '{}'::jsonb,
  timezone text,
  created_at timestamptz not null default now()
);
create index if not exists liveblogs_owner_id_idx on public.liveblogs(owner_id);

create table if not exists public.updates (
  id uuid primary key default gen_random_uuid(),
  liveblog_id uuid not null references public.liveblogs(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  content jsonb not null,
  text tsvector,
  status update_status not null default 'published',
  scheduled_at timestamptz,
  published_at timestamptz default now(),
  edited_at timestamptz,
  pinned boolean not null default false,
  tags text[] not null default array[]::text[],
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists updates_liveblog_published_idx on public.updates(liveblog_id, published_at desc);
create index if not exists updates_tags_gin_idx on public.updates using gin(tags);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  liveblog_id uuid references public.liveblogs(id) on delete cascade,
  uploader_id uuid references auth.users(id) on delete set null,
  path text not null,
  type text,
  width int,
  height int,
  created_at timestamptz not null default now()
);
create index if not exists media_liveblog_idx on public.media_assets(liveblog_id);

-- RLS
alter table public.profiles enable row level security;
alter table public.liveblogs enable row level security;
alter table public.updates enable row level security;
alter table public.media_assets enable row level security;

-- Profiles policies
create policy if not exists profiles_self_select on public.profiles for select using (auth.uid() = id);
create policy if not exists profiles_self_upsert on public.profiles for insert with check (auth.uid() = id);
create policy if not exists profiles_self_update on public.profiles for update using (auth.uid() = id);

-- Liveblogs policies
create policy if not exists liveblogs_public_read on public.liveblogs for select
  using (
    privacy in ('public','unlisted') or owner_id = auth.uid()
  );

create policy if not exists liveblogs_owner_write on public.liveblogs for insert
  with check (owner_id = auth.uid());

create policy if not exists liveblogs_owner_update on public.liveblogs for update
  using (owner_id = auth.uid());

create policy if not exists liveblogs_owner_delete on public.liveblogs for delete
  using (owner_id = auth.uid());

-- Updates policies
create policy if not exists updates_read_published on public.updates for select
  using (
    (
      status = 'published' and exists (
        select 1 from public.liveblogs lb
        where lb.id = updates.liveblog_id
          and (lb.privacy in ('public','unlisted') or lb.owner_id = auth.uid())
      )
    ) or author_id = auth.uid()
  );

create policy if not exists updates_owner_insert on public.updates for insert
  with check (
    exists (
      select 1 from public.liveblogs lb
      where lb.id = updates.liveblog_id and lb.owner_id = auth.uid()
    )
  );

create policy if not exists updates_author_update on public.updates for update
  using (author_id = auth.uid());

create policy if not exists updates_author_delete on public.updates for delete
  using (author_id = auth.uid());

-- Media policies
create policy if not exists media_read on public.media_assets for select
  using (
    exists (
      select 1 from public.liveblogs lb
      where lb.id = media_assets.liveblog_id
        and (lb.privacy in ('public','unlisted') or lb.owner_id = auth.uid())
    )
  );

create policy if not exists media_owner_insert on public.media_assets for insert
  with check (
    exists (
      select 1 from public.liveblogs lb
      where lb.id = media_assets.liveblog_id and lb.owner_id = auth.uid()
    )
  );

create policy if not exists media_owner_update on public.media_assets for update
  using (
    exists (
      select 1 from public.liveblogs lb
      where lb.id = media_assets.liveblog_id and lb.owner_id = auth.uid()
    )
  );

create policy if not exists media_owner_delete on public.media_assets for delete
  using (
    exists (
      select 1 from public.liveblogs lb
      where lb.id = media_assets.liveblog_id and lb.owner_id = auth.uid()
    )
  );

-- Realtime publication for updates
alter publication supabase_realtime add table public.updates;


