/**
 * Free-tier usage limits — the single source of truth for quota numbers.
 *
 * Enforcement is split across two layers that must agree on this value:
 *   - SQL: `public.consume_agent_run(p_limit)` does the atomic check+increment
 *     (migration `*_usage_metering.sql`). The server passes FREE_DAILY_RUNS in.
 *   - App: `/api/chat` calls that RPC for free users before running the agent.
 *
 * Paid tiers are never metered (the route skips the RPC entirely).
 */

/** Copilot agent runs a free user gets per UTC day. One run = one chat turn. */
export const FREE_DAILY_RUNS = 3;
