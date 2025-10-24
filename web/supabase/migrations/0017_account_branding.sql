-- Account branding settings and helper functions

set search_path = public, pg_catalog;

create table if not exists public.account_branding (
  account_id uuid primary key references auth.users(id) on delete cascade,
  palette_preset text not null default 'violet',
  accent_color text,
  corner_style text not null default 'rounded',
  surface_style text not null default 'glass',
  watermark text,
  logo_path text,
  background_path text,
  options jsonb not null default '{}'::jsonb,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.account_branding is 'Account wide theme settings controlling liveblog embeds and dashboard cards.';

alter table public.account_branding enable row level security;

create or replace function public.account_branding_set_metadata()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  if auth.uid() is not null then
    new.updated_by := auth.uid();
  end if;
  return new;
end;
$$;

create trigger account_branding_set_metadata
before insert or update on public.account_branding
for each row
execute function public.account_branding_set_metadata();

create or replace function public.account_branding_is_service_role()
returns boolean
language sql
as $$
  select coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role';
$$;

create policy account_branding_owner_select on public.account_branding
for select
using (
  account_branding_is_service_role()
  or auth.uid() = account_id
);

create policy account_branding_owner_upsert on public.account_branding
for insert
with check (
  account_branding_is_service_role()
  or auth.uid() = account_id
);

create policy account_branding_owner_update on public.account_branding
for update
using (
  account_branding_is_service_role()
  or auth.uid() = account_id
)
with check (
  account_branding_is_service_role()
  or auth.uid() = account_id
);

create policy account_branding_owner_delete on public.account_branding
for delete
using (
  account_branding_is_service_role()
  or auth.uid() = account_id
);

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
    coalesce(br.options, '{}'::jsonb) as options,
    br.updated_by,
    coalesce(br.created_at, now()) as created_at,
    coalesce(br.updated_at, now()) as updated_at
  from branding br
  right join resolved_account ra on true;
$$;

comment on function public.account_branding(uuid) is
  'Fetch account-wide branding settings for the current or specified account.';

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

insert into storage.buckets (id, name, public)
values ('brand-assets', 'brand-assets', true)
on conflict (id) do nothing;

create or replace function public.brand_assets_path_accounts_match(name text)
returns boolean
language sql
as $$
  select
    case
      when name is null then false
      else
        auth.uid() is not null
        and auth.uid()::text = split_part(name, '/', 1)
    end;
$$;

create policy "Brand assets public read" on storage.objects
for select
using (bucket_id = 'brand-assets');

create policy "Brand assets owner insert" on storage.objects
for insert
with check (
  bucket_id = 'brand-assets'
  and (
    public.account_branding_is_service_role()
    or public.brand_assets_path_accounts_match(name)
  )
);

create policy "Brand assets owner update" on storage.objects
for update
using (
  bucket_id = 'brand-assets'
  and (
    public.account_branding_is_service_role()
    or public.brand_assets_path_accounts_match(name)
  )
)
with check (
  bucket_id = 'brand-assets'
  and (
    public.account_branding_is_service_role()
    or public.brand_assets_path_accounts_match(name)
  )
);

create policy "Brand assets owner delete" on storage.objects
for delete
using (
  bucket_id = 'brand-assets'
  and (
    public.account_branding_is_service_role()
    or public.brand_assets_path_accounts_match(name)
  )
);
