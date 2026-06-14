/**
 * Server-side data-access helpers for the authed account area.
 * All run with the request-bound SSR client, so RLS applies.
 */
import type { Tier } from "@/lib/stripe/config";
import { createClient } from "./server";

export interface AccountEntitlement {
  tier: Tier;
  status: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  hasStripeCustomer: boolean;
}

/** Resolve the signed-in user's current entitlement, or `free` defaults. */
export async function getEntitlement(
  userId: string,
): Promise<AccountEntitlement> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("subscriptions")
    .select(
      "tier, status, current_period_end, cancel_at_period_end, stripe_customer_id",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) {
    return {
      tier: "free",
      status: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      hasStripeCustomer: false,
    };
  }

  // Mirror the SQL `current_tier()` logic: only treat paid tiers as effective
  // while active/trialing and within the current period.
  const active =
    (data.status === "active" || data.status === "trialing") &&
    (!data.current_period_end ||
      new Date(data.current_period_end).getTime() > Date.now());
  const effectiveTier: Tier =
    data.tier !== "free" && active ? (data.tier as Tier) : "free";

  return {
    tier: effectiveTier,
    status: data.status ?? null,
    currentPeriodEnd: data.current_period_end ?? null,
    cancelAtPeriodEnd: data.cancel_at_period_end ?? false,
    hasStripeCustomer: Boolean(data.stripe_customer_id),
  };
}
