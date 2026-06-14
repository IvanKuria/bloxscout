/**
 * POST /api/stripe/webhook
 * Verifies the Stripe signature and reconciles subscription state into the
 * `subscriptions` table via the Supabase service-role key (bypasses RLS).
 *
 * Handled events:
 *   - checkout.session.completed       (first subscription bought)
 *   - customer.subscription.created    (redundant safety net)
 *   - customer.subscription.updated    (plan change, renew, pause, etc.)
 *   - customer.subscription.deleted    (cancellation -> back to free)
 */
import { type NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { tierForPriceId } from "@/lib/stripe/config";
import { getStripe, getWebhookSecret } from "@/lib/stripe/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

// Webhooks must read the raw body; never cache.
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    const rawBody = await request.text();
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      getWebhookSecret(),
    );
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Signature verification failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const stripe = getStripe();
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.subscription) {
          const subId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;
          const sub = await stripe.subscriptions.retrieve(subId);
          await upsertSubscription(sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await upsertSubscription(sub);
        break;
      }
      default:
        // Ignore unhandled event types.
        break;
    }
  } catch (e) {
    // Log and return 500 so Stripe retries.
    console.error("[stripe webhook] handler error", e);
    return NextResponse.json(
      { error: "Webhook handler failed." },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}

/** Map a Stripe subscription onto the `subscriptions` row for its user. */
async function upsertSubscription(sub: Stripe.Subscription): Promise<void> {
  const admin = createServiceRoleClient();

  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  // Resolve the user: prefer subscription metadata, else look up by customer.
  let userId = sub.metadata?.supabase_user_id ?? null;
  if (!userId) {
    const { data } = await admin
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    userId = data?.user_id ?? null;
  }
  if (!userId) {
    console.warn(
      "[stripe webhook] could not resolve user for customer",
      customerId,
    );
    return;
  }

  const item = sub.items.data[0];
  const priceId = item?.price?.id ?? null;
  const mapped = tierForPriceId(priceId);

  // Period end now lives on the subscription item (API 2025+).
  const periodEnd = item?.current_period_end ?? null;

  // A deleted/canceled subscription drops the user back to free.
  const tier =
    sub.status === "canceled" || sub.status === "incomplete_expired"
      ? "free"
      : (mapped?.tier ?? "free");

  await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      price_id: priceId,
      tier,
      status: sub.status,
      current_period_end: periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null,
      cancel_at_period_end: sub.cancel_at_period_end ?? false,
    },
    { onConflict: "user_id" },
  );
}
