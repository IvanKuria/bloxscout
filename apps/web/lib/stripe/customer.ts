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

  if (existing?.stripe_customer_id) {
    return existing.stripe_customer_id;
  }

  const stripe = getStripe();
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
