-- Matches table for football fixtures (API-Football)
-- Stores essential fields + raw JSON for future-proofing

create table if not exists public.matches (
  id bigint primary key,
  league_id int not null,
  league_name text not null,
  country text not null,
  season int not null,
  date timestamptz not null,
  status text not null,
  venue text,
  home_team_id int not null,
  home_team_name text not null,
  away_team_id int not null,
  away_team_name text not null,
  home_goals int,
  away_goals int,
  score jsonb,
  raw jsonb
);

create index if not exists matches_league_id_idx on public.matches(league_id);
create index if not exists matches_country_idx on public.matches(country);
create index if not exists matches_date_idx on public.matches(date);
create index if not exists matches_season_league_date_idx on public.matches(season, league_id, date);

alter table public.matches enable row level security;

-- Read for authenticated users; writes only via service role or privileged endpoints
do $$
begin
  if not exists (
    select 1 from pg_policies where polname = 'authenticated read matches' and polrelid = 'public.matches'::regclass
  ) then
    create policy "authenticated read matches" on public.matches for select to authenticated using (true);
  end if;
end $$;


