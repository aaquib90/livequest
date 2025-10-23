-- Fix ambiguous account_id references in account_features function

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
  from billing.subscriptions bs
  where bs.account_id = target_account;

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
