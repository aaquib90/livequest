-- RLS policies for engagement widgets and related tables for owner access

-- engagement_widgets: owner can CRUD their widgets
alter table public.engagement_widgets enable row level security;

drop policy if exists engagement_widgets_owner_select on public.engagement_widgets;
create policy engagement_widgets_owner_select on public.engagement_widgets
  for select using (owner_id = auth.uid());

drop policy if exists engagement_widgets_owner_insert on public.engagement_widgets;
create policy engagement_widgets_owner_insert on public.engagement_widgets
  for insert with check (owner_id = auth.uid());

drop policy if exists engagement_widgets_owner_update on public.engagement_widgets;
create policy engagement_widgets_owner_update on public.engagement_widgets
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists engagement_widgets_owner_delete on public.engagement_widgets;
create policy engagement_widgets_owner_delete on public.engagement_widgets
  for delete using (owner_id = auth.uid());

-- ugc_submissions: owner can moderate (select/update) submissions for their widgets
alter table public.ugc_submissions enable row level security;

drop policy if exists ugc_owner_select on public.ugc_submissions;
create policy ugc_owner_select on public.ugc_submissions
  for select using (exists (
    select 1 from public.engagement_widgets w
    where w.id = ugc_submissions.widget_id and w.owner_id = auth.uid()
  ));

drop policy if exists ugc_owner_update on public.ugc_submissions;
create policy ugc_owner_update on public.ugc_submissions
  for update using (exists (
    select 1 from public.engagement_widgets w
    where w.id = ugc_submissions.widget_id and w.owner_id = auth.uid()
  )) with check (exists (
    select 1 from public.engagement_widgets w
    where w.id = ugc_submissions.widget_id and w.owner_id = auth.uid()
  ));

-- widget_events: owner can read events (analytics); no direct writes from dashboard
alter table public.widget_events enable row level security;

drop policy if exists widget_events_owner_select on public.widget_events;
create policy widget_events_owner_select on public.widget_events
  for select using (exists (
    select 1 from public.engagement_widgets w
    where w.id = widget_events.widget_id and w.owner_id = auth.uid()
  ));


