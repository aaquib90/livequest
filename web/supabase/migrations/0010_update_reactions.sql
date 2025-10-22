-- Guest reactions per update (😊 ❤️ 👍)

do $$ begin
  create type reaction_type as enum ('smile','heart','thumbs_up');
exception when duplicate_object then null; end $$;

create table if not exists public.update_reactions (
  id uuid primary key default gen_random_uuid(),
  liveblog_id uuid not null references public.liveblogs(id) on delete cascade,
  update_id uuid not null references public.updates(id) on delete cascade,
  reaction reaction_type not null,
  device_hash text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  unique (update_id, reaction, device_hash)
);

create index if not exists update_reactions_update_idx on public.update_reactions(update_id);
create index if not exists update_reactions_update_reaction_idx on public.update_reactions(update_id, reaction);
create index if not exists update_reactions_liveblog_idx on public.update_reactions(liveblog_id);

-- Do NOT enable RLS; writes go through service role
-- alter table public.update_reactions enable row level security;

-- Realtime publication
alter publication supabase_realtime add table public.update_reactions;



