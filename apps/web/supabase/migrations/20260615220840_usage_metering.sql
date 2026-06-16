-- =============================================================================
-- usage_metering — per-user daily agent-run quota for the free tier.
--
-- Free users get a small number of copilot "runs" per UTC day (one run = one
-- POST /api/chat that triggers the agent loop). Paid users are never metered.
-- Enforcement happens through one atomic SECURITY DEFINER function so the count
-- can be incremented past RLS while still keying off the caller's auth.uid().
--
-- Also hardens the existing current_tier() function, which was callable with an
-- arbitrary uid and let any signed-in user probe another user's tier.
-- =============================================================================

-- Daily usage counters --------------------------------------------------------
create table if not exists public.usage_counters (
  user_id uuid    not null references auth.users (id) on delete cascade,
  day     date    not null default (now() at time zone 'utc')::date,
  runs    integer not null default 0,
  primary key (user_id, day)
);

comment on table public.usage_counters is
  'Per-user, per-UTC-day count of copilot agent runs. Read-only to the owner; '
  'written only by public.consume_agent_run() (security definer).';

-- Row Level Security ----------------------------------------------------------
-- Owner may READ their own usage (to show "N of 3 used"). No insert/update/
-- delete policies => direct writes are impossible; only the SECURITY DEFINER
-- function below (which runs as its owner) can mutate the counts.
alter table public.usage_counters enable row level security;

drop policy if exists "Users can view their own usage" on public.usage_counters;
create policy "Users can view their own usage"
  on public.usage_counters for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Atomic check-then-increment -------------------------------------------------
-- Returns whether the caller may run, plus their post-call usage for today.
-- - Resolves the user from auth.uid() (never a caller-supplied id => no IDOR).
-- - If already at/over the limit, rejects WITHOUT counting the rejected call.
-- - Otherwise increments today's row atomically and returns allowed = true.
-- The limit is passed in by the server (single source of truth lives in TS:
-- lib/limits.ts) so only free-tier requests ever call this.
create or replace function public.consume_agent_run(p_limit integer)
returns table (allowed boolean, used integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := (select auth.uid());
  v_used integer;
begin
  if v_uid is null then
    return query select false, 0;
    return;
  end if;

  select c.runs
    into v_used
    from public.usage_counters c
    where c.user_id = v_uid
      and c.day = (now() at time zone 'utc')::date;
  v_used := coalesce(v_used, 0);

  if v_used >= p_limit then
    return query select false, v_used;
    return;
  end if;

  insert into public.usage_counters (user_id, day, runs)
    values (v_uid, (now() at time zone 'utc')::date, 1)
    on conflict (user_id, day)
      do update set runs = public.usage_counters.runs + 1
    returning public.usage_counters.runs into v_used;

  return query select true, v_used;
end;
$$;

comment on function public.consume_agent_run(integer) is
  'Atomically consume one daily agent run for the calling user, enforcing '
  'p_limit. Returns (allowed, used). Free-tier enforcement only.';

-- This is a SECURITY DEFINER function in a public (exposed) schema, so lock it
-- down: callable only by signed-in users, never by anon.
revoke execute on function public.consume_agent_run(integer) from public;
revoke execute on function public.consume_agent_run(integer) from anon;
grant execute on function public.consume_agent_run(integer) to authenticated;

-- RLS-respecting view of the caller's usage today (for "N of 3 left" UI). ------
create or replace view public.my_usage
with (security_invoker = true)
as
  select
    c.user_id,
    c.day,
    c.runs
  from public.usage_counters c
  where c.user_id = (select auth.uid())
    and c.day = (now() at time zone 'utc')::date;

comment on view public.my_usage is
  'RLS-respecting view of the current user''s agent-run count for today.';

-- Harden current_tier() -------------------------------------------------------
-- Previously my_entitlement called public.current_tier(uid), a SECURITY DEFINER
-- function callable with an arbitrary uid => any signed-in user could probe
-- another user's tier. Inline the logic into the view (it already filters by
-- auth.uid()) so the function is no longer needed by callers, then revoke its
-- EXECUTE from the API roles. Column list is unchanged so the replace is clean.
create or replace view public.my_entitlement
with (security_invoker = true)
as
  select
    s.user_id,
    s.tier,
    s.status,
    s.current_period_end,
    s.cancel_at_period_end,
    case
      when s.tier <> 'free'
           and s.status in ('active', 'trialing')
           and (s.current_period_end is null or s.current_period_end > now())
        then s.tier
      else 'free'::public.subscription_tier
    end as effective_tier
  from public.subscriptions s
  where s.user_id = (select auth.uid());

revoke execute on function public.current_tier(uuid) from public;
revoke execute on function public.current_tier(uuid) from anon;
revoke execute on function public.current_tier(uuid) from authenticated;
