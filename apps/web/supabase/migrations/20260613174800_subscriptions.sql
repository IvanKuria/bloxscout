-- =============================================================================
-- subscriptions — Stripe-backed billing state, 1 row per user.
-- The Stripe webhook (service-role) upserts these rows; users may read their
-- own row but never write it (writes only happen server-side via Stripe).
-- A helper function resolves the effective entitlement tier for a user.
-- =============================================================================

-- Subscription tier ----------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'subscription_tier') then
    create type public.subscription_tier as enum ('free', 'pro', 'studio');
  end if;
end$$;

-- Mirror of Stripe subscription.status values we care about -------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'subscription_status') then
    create type public.subscription_status as enum (
      'trialing',
      'active',
      'past_due',
      'canceled',
      'unpaid',
      'incomplete',
      'incomplete_expired',
      'paused'
    );
  end if;
end$$;

create table if not exists public.subscriptions (
  user_id                uuid primary key
                           references auth.users (id) on delete cascade,
  stripe_customer_id     text unique,
  stripe_subscription_id text unique,
  price_id               text,
  tier                   public.subscription_tier   not null default 'free',
  status                 public.subscription_status,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

comment on table public.subscriptions is
  'Stripe-backed subscription state, 1:1 with auth.users. Written only by the '
  'Stripe webhook via the service-role key; users get read-only access to '
  'their own row.';

create index if not exists subscriptions_stripe_customer_id_idx
  on public.subscriptions (stripe_customer_id);

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- Row Level Security ----------------------------------------------------------
-- Read-only for the owner. No insert/update/delete policies => only the
-- service-role key (which bypasses RLS) can write, i.e. the Stripe webhook.
alter table public.subscriptions enable row level security;

drop policy if exists "Users can view their own subscription"
  on public.subscriptions;
create policy "Users can view their own subscription"
  on public.subscriptions for select
  using ((select auth.uid()) = user_id);

-- Entitlement resolution ------------------------------------------------------
-- Returns the tier a user is currently entitled to: their paid tier when the
-- subscription is active/trialing (and not past its period end), else 'free'.
create or replace function public.current_tier(uid uuid)
returns public.subscription_tier
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when s.tier <> 'free'
         and s.status in ('active', 'trialing')
         and (s.current_period_end is null or s.current_period_end > now())
      then s.tier
    else 'free'::public.subscription_tier
  end
  from public.subscriptions s
  where s.user_id = uid;
$$;

comment on function public.current_tier(uuid) is
  'Effective entitlement tier for a user, accounting for subscription status '
  'and period end. Falls back to free.';

-- Convenience view exposing the caller''s own entitlement --------------------
create or replace view public.my_entitlement
with (security_invoker = true)
as
  select
    s.user_id,
    s.tier,
    s.status,
    s.current_period_end,
    s.cancel_at_period_end,
    coalesce(public.current_tier(s.user_id), 'free') as effective_tier
  from public.subscriptions s
  where s.user_id = (select auth.uid());

comment on view public.my_entitlement is
  'RLS-respecting view of the current user''s subscription + effective tier.';
