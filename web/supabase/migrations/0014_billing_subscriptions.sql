-- Billing plans, subscriptions, and feature gating

create schema if not exists billing;

grant usage on schema billing to postgres;
grant usage on schema billing to anon, authenticated, service_role;

create table if not exists billing.subscriptions (
  account_id uuid primary key references public.profiles(id) on delete cascade,
  plan text not null default 'free',
  status text not null default 'inactive',
  stripe_customer_id text,
  stripe_subscription_id text,
  price_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean,
  metadata jsonb not null default '{}'::jsonb,
  last_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table billing.subscriptions is
  'Stripe-backed subscription state per account. account_id aligns with auth.users.id.';

create index if not exists billing_subscriptions_customer_idx
  on billing.subscriptions(stripe_customer_id)
  where stripe_customer_id is not null;

create index if not exists billing_subscriptions_subscription_idx
  on billing.subscriptions(stripe_subscription_id)
  where stripe_subscription_id is not null;

create index if not exists billing_subscriptions_price_idx
  on billing.subscriptions(price_id)
  where price_id is not null;

create or replace function billing.set_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_timestamp on billing.subscriptions;
create trigger set_timestamp
before update on billing.subscriptions
for each row
execute function billing.set_timestamp();

alter table billing.subscriptions enable row level security;

drop policy if exists subscriptions_self_select on billing.subscriptions;
create policy subscriptions_self_select on billing.subscriptions
  for select using (account_id = auth.uid());

create or replace function public.account_features(p_account_id uuid default null)
returns table (
  account_id uuid,
  plan text,
  status text,
  is_paid boolean,
  monthly_liveblog_limit integer,
  can_manage_sponsors boolean,
  can_manage_editors boolean,
  can_use_premium_themes boolean,
  can_use_webhooks boolean,
  cancel_at_period_end boolean,
  current_period_end timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  price_id text
)
language plpgsql
security definer
set search_path = pg_catalog, public, billing
as $$
declare
  target_account uuid;
  sub_record billing.subscriptions%rowtype;
  effective_plan text;
  effective_status text;
  paid boolean;
  requester_role text;
begin
  requester_role := coalesce(current_setting('request.jwt.claim.role', true), 'service_role');
  target_account := coalesce(p_account_id, auth.uid());

  if requester_role <> 'service_role' then
    if auth.uid() is null then
      raise exception
        using message = 'account_features_auth_required',
              errcode = '42501';
    end if;
    target_account := auth.uid();
  end if;

  if target_account is null then
    raise exception
      using message = 'account_features_auth_required',
            errcode = '42501';
  end if;

  select *
  into sub_record
  from billing.subscriptions
  where account_id = target_account;

  effective_plan := coalesce(sub_record.plan, 'free');
  effective_status := coalesce(sub_record.status, 'inactive');
  paid := effective_plan <> 'free'
    and effective_status in ('active', 'trialing', 'past_due');

  return query
  select
    target_account as account_id,
    effective_plan as plan,
    effective_status as status,
    paid as is_paid,
    case when paid then null else 10 end as monthly_liveblog_limit,
    paid as can_manage_sponsors,
    paid as can_manage_editors,
    paid as can_use_premium_themes,
    paid as can_use_webhooks,
    coalesce(sub_record.cancel_at_period_end, false) as cancel_at_period_end,
    sub_record.current_period_end,
    sub_record.stripe_customer_id,
    sub_record.stripe_subscription_id,
    sub_record.price_id;
end;
$$;

comment on function public.account_features(uuid) is
  'Resolves feature entitlements and subscription metadata for the current or specified account.';

revoke all on function public.account_features(uuid) from public;
grant execute on function public.account_features(uuid) to anon, authenticated, service_role;

create or replace function public.enforce_liveblog_monthly_limit()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, billing
as $$
declare
  features record;
  limit_value integer;
  created_this_month integer;
  period_anchor timestamptz;
begin
  if new.owner_id is null then
    return new;
  end if;

  select *
  into features
  from public.account_features(new.owner_id)
  limit 1;

  limit_value := features.monthly_liveblog_limit;
  if limit_value is null then
    return new;
  end if;

  period_anchor := date_trunc('month', coalesce(new.created_at, now()));

  select count(*)
  into created_this_month
  from public.liveblogs
  where owner_id = new.owner_id
    and date_trunc('month', created_at) = period_anchor;

  if created_this_month >= limit_value then
    raise exception
      using message = 'liveblog_monthly_limit_reached',
            detail = json_build_object(
              'limit', limit_value,
              'period_start', period_anchor,
              'feature', 'monthly_liveblog_limit'
            )::text,
            errcode = 'P0001';
  end if;

  return new;
end;
$$;

comment on function public.enforce_liveblog_monthly_limit() is
  'Prevents inserts when a free account exceeds the monthly liveblog creation limit.';

drop trigger if exists enforce_liveblog_monthly_limit on public.liveblogs;
create trigger enforce_liveblog_monthly_limit
before insert on public.liveblogs
for each row
execute function public.enforce_liveblog_monthly_limit();
