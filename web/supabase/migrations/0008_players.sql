-- Players table derived from FPL markdown list
-- Stores normalized fields for efficient lookup and joins to matches by team name

create table if not exists public.players (
  id bigserial primary key,
  name text not null,
  team_name_raw text not null,

  -- Derived/normalized fields
  name_normalized text generated always as (
    lower(regexp_replace(unaccent(name), '[^a-z0-9]+', ' ', 'g'))
  ) stored,
  team_normalized text generated always as (
    lower(regexp_replace(unaccent(team_name_raw), '[^a-z0-9]+', ' ', 'g'))
  ) stored,

  -- Canonical mapping if we maintain one in-app
  team_slug text,
  competition_id text default 'premier-league' not null
);

create index if not exists players_name_norm_idx on public.players(name_normalized);
create index if not exists players_team_norm_idx on public.players(team_normalized);
create index if not exists players_team_slug_idx on public.players(team_slug);
create index if not exists players_comp_idx on public.players(competition_id);

alter table public.players enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where polname = 'authenticated read players' and polrelid = 'public.players'::regclass
  ) then
    create policy "authenticated read players" on public.players for select to authenticated using (true);
  end if;
end $$;


