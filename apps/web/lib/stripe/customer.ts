/**
 * Resolve (and lazily create) the Stripe customer for an authenticated user.
 * The mapping is persisted on the `subscriptions` row via the service-role
 * client so the webhook can reconcile events back to the user.
 */
import type Stripe from "stripe";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getStripe } from "./server";

export async function getOrCreateCustomer(
  userId: string,
  email: string | undefined,
): Promise<string> {
  const admin = createServiceRoleClient();

  const { data: existing } = await admin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();

  const stripe = getStripe();

  if (existing?.stripe_customer_id) {
    // Verify the stored customer still exists in the CURRENT Stripe mode. A
    // stale id — e.g. a test-mode customer carried over after switching to a
    // live key, or a customer deleted in the dashboard — would otherwise break
    // both checkout and the billing portal. If it's gone, fall through and
    // create a fresh one (self-heal).
    try {
      const c = await stripe.customers.retrieve(existing.stripe_customer_id);
      if (!c.deleted) return existing.stripe_customer_id;
    } catch (e) {
      if ((e as { code?: string })?.code !== "resource_missing") throw e;
    }
  }

  const customer: Stripe.Customer = await stripe.customers.create({
    email,
    metadata: { supabase_user_id: userId },
  });

  // Seed/patch the subscriptions row with the customer id (tier stays free
  // until a subscription event lands from the webhook).
  await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: customer.id,
    },
    { onConflict: "user_id" },
  );

  return customer.id;
}
