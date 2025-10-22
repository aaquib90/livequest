-- Push subscriptions for guest notifications per liveblog
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  liveblog_id uuid not null,
  endpoint text not null,
  keys jsonb not null,
  expiration_time timestamptz null,
  user_agent text null,
  created_at timestamptz not null default now(),
  last_notified_at timestamptz null
);

create unique index if not exists push_subscriptions_liveblog_endpoint_idx
  on public.push_subscriptions (liveblog_id, endpoint);

create index if not exists push_subscriptions_liveblog_idx
  on public.push_subscriptions (liveblog_id);

-- optional: if RLS is enabled globally in project, keep this table open for now
-- alter table public.push_subscriptions enable row level security;
-- create policy "allow all inserts" on public.push_subscriptions for insert to public using (true) with check (true);
-- create policy "allow all deletes" on public.push_subscriptions for delete to public using (true);
-- create policy "allow all selects" on public.push_subscriptions for select to public using (true);


