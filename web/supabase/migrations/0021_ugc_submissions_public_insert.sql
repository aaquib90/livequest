-- Allow anonymous guest submissions for Caption This widgets while keeping moderation flow intact

alter table public.ugc_submissions enable row level security;

drop policy if exists ugc_public_insert on public.ugc_submissions;
create policy ugc_public_insert on public.ugc_submissions
  for insert
  with check (
    auth.role() = 'anon'
    and coalesce(status, 'pending') = 'pending'
    and coalesce(votes, 0) = 0
    and device_hash is not null
    and exists (
      select 1 from public.engagement_widgets w
      where w.id = ugc_submissions.widget_id
        and w.status = 'active'
        and w.type = 'caption-this'
    )
  );

grant insert on public.ugc_submissions to anon;

-- Allow anon readers to resolve active caption widgets (required by insert policy)
alter table public.engagement_widgets enable row level security;

drop policy if exists engagement_widgets_caption_public on public.engagement_widgets;
create policy engagement_widgets_caption_public on public.engagement_widgets
  for select
  using (
    auth.role() = 'anon'
    and status = 'active'
    and type in ('caption-this', 'hot-take')
  );

grant select on public.engagement_widgets to anon;

-- Allow guest voting on hot-take widgets (both read history and cast/update votes)
alter table public.widget_events enable row level security;

drop policy if exists widget_events_public_select on public.widget_events;
create policy widget_events_public_select on public.widget_events
  for select
  using (
    auth.role() = 'anon'
    and event = 'vote'
    and exists (
      select 1 from public.engagement_widgets w
      where w.id = widget_events.widget_id
        and w.status = 'active'
        and w.type = 'hot-take'
    )
  );

drop policy if exists widget_events_public_insert on public.widget_events;
create policy widget_events_public_insert on public.widget_events
  for insert
  with check (
    auth.role() = 'anon'
    and event = 'vote'
    and value between 0 and 100
    and device_hash is not null
    and exists (
      select 1 from public.engagement_widgets w
      where w.id = widget_events.widget_id
        and w.status = 'active'
        and w.type = 'hot-take'
    )
  );

drop policy if exists widget_events_public_update on public.widget_events;
create policy widget_events_public_update on public.widget_events
  for update
  using (
    auth.role() = 'anon'
    and event = 'vote'
    and device_hash is not null
    and exists (
      select 1 from public.engagement_widgets w
      where w.id = widget_events.widget_id
        and w.status = 'active'
        and w.type = 'hot-take'
    )
  )
  with check (
    auth.role() = 'anon'
    and event = 'vote'
    and value between 0 and 100
    and device_hash is not null
    and exists (
      select 1 from public.engagement_widgets w
      where w.id = widget_events.widget_id
        and w.status = 'active'
        and w.type = 'hot-take'
    )
  );

grant select, insert, update on public.widget_events to anon;
