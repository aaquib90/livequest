-- Expose billing.subscriptions via public schema for Supabase REST access

create or replace view public.billing_subscriptions
with (security_invoker = true) as
select * from billing.subscriptions;

comment on view public.billing_subscriptions is
  'Helper view exposing billing.subscriptions for Supabase clients.';

grant select, insert, update, delete on public.billing_subscriptions to service_role;

grant usage on schema billing to service_role,
  authenticated,
  anon;

grant select, insert, update, delete on billing.subscriptions to service_role;
