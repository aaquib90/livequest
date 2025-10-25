-- Expand account branding reactions and allow custom emotes

set search_path = public, pg_catalog;

-- Add reactions column to account_branding (if missing)
alter table public.account_branding
  add column if not exists reactions jsonb not null default
    '[{"id":"smile","type":"emoji","label":"Smile","emoji":"😊"},{"id":"heart","type":"emoji","label":"Heart","emoji":"❤️"},{"id":"thumbs_up","type":"emoji","label":"Thumbs up","emoji":"👍"}]'::jsonb;

-- Ensure existing rows have the default reactions populated when empty
update public.account_branding
set reactions = '[{"id":"smile","type":"emoji","label":"Smile","emoji":"😊"},{"id":"heart","type":"emoji","label":"Heart","emoji":"❤️"},{"id":"thumbs_up","type":"emoji","label":"Thumbs up","emoji":"👍"}]'::jsonb
where coalesce(jsonb_array_length(reactions), 0) = 0;

-- Update account_branding() helper to expose reactions
drop function if exists public.account_branding(uuid);
create or replace function public.account_branding(p_account_id uuid default null)
returns table (
  account_id uuid,
  palette_preset text,
  accent_color text,
  corner_style text,
  surface_style text,
  watermark text,
  logo_path text,
  background_path text,
  reactions jsonb,
  options jsonb,
  updated_by uuid,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = pg_catalog, public
stable
as $$
  with resolved_account as (
    select coalesce(p_account_id, auth.uid()) as account_id
  ),
  branding as (
    select *
    from public.account_branding ab
    where ab.account_id = (select account_id from resolved_account)
  )
  select
    coalesce(br.account_id, (select account_id from resolved_account)) as account_id,
    coalesce(br.palette_preset, 'violet') as palette_preset,
    br.accent_color,
    coalesce(br.corner_style, 'rounded') as corner_style,
    coalesce(br.surface_style, 'glass') as surface_style,
    br.watermark,
    br.logo_path,
    br.background_path,
    coalesce(br.reactions, '[]'::jsonb) as reactions,
    coalesce(br.options, '{}'::jsonb) as options,
    br.updated_by,
    coalesce(br.created_at, now()) as created_at,
    coalesce(br.updated_at, now()) as updated_at
  from branding br
  right join resolved_account ra on true;
$$;

comment on function public.account_branding(uuid) is
  'Fetch account-wide branding settings for the current or specified account.';

-- Update account_branding_for_liveblog helper to expose reactions
drop function if exists public.account_branding_for_liveblog(uuid);
create or replace function public.account_branding_for_liveblog(p_liveblog_id uuid)
returns table (
  account_id uuid,
  palette_preset text,
  accent_color text,
  corner_style text,
  surface_style text,
  watermark text,
  logo_path text,
  background_path text,
  reactions jsonb,
  options jsonb,
  updated_by uuid,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
stable
as $$
declare
  liveblog_owner uuid;
  liveblog_privacy text;
  requester_role text;
begin
  requester_role := coalesce(current_setting('request.jwt.claim.role', true), '');

  select lb.owner_id, lb.privacy
  into liveblog_owner, liveblog_privacy
  from public.liveblogs lb
  where lb.id = p_liveblog_id;

  if liveblog_owner is null then
    return;
  end if;

  if liveblog_privacy not in ('public', 'unlisted') then
    if requester_role <> 'service_role' and auth.uid() <> liveblog_owner then
      return;
    end if;
  end if;

  return query
  select *
  from public.account_branding(liveblog_owner);
end;
$$;

comment on function public.account_branding_for_liveblog(uuid) is
  'Fetch branding settings for the owner of a liveblog when the viewer has access to the liveblog.';

-- Allow custom reaction identifiers in update_reactions table
alter table public.update_reactions
  alter column reaction type text using reaction::text;

-- Reaction identifiers should be reasonably short
alter table public.update_reactions
  add constraint update_reactions_reaction_length check (char_length(reaction) between 1 and 64);

-- Drop the old enum if it exists (no longer used)
do $$ begin
  drop type if exists reaction_type;
exception when undefined_object then null; end $$;
