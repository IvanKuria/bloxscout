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
import {
  captureServer,
  captureServerException,
  flushPostHog,
} from "@/lib/posthog/server";
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
    captureServerException("stripe-webhook", e, { route: "stripe_webhook" });
    await flushPostHog();
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
          const resolved = await upsertSubscription(sub);
          if (resolved) {
            captureServer(resolved.userId, "subscription_activated", {
              tier: resolved.tier,
              interval: resolved.interval,
            });
          }
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const resolved = await upsertSubscription(sub);
        if (resolved) {
          captureServer(resolved.userId, "subscription_updated", {
            tier: resolved.tier,
            status: resolved.status,
          });
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const resolved = await upsertSubscription(sub);
        if (resolved) {
          captureServer(resolved.userId, "subscription_cancelled", {
            tier: resolved.tier,
          });
        }
        break;
      }
      default:
        // Ignore unhandled event types.
        break;
    }
  } catch (e) {
    // Log and return 500 so Stripe retries.
    console.error("[stripe webhook] handler error", e);
    await flushPostHog();
    return NextResponse.json(
      { error: "Webhook handler failed." },
      { status: 500 },
    );
  }

  await flushPostHog();
  return NextResponse.json({ received: true });
}

/** What `upsertSubscription` resolved, so the caller can emit analytics. */
interface ResolvedSubscription {
  userId: string;
  tier: string;
  status: Stripe.Subscription.Status;
  interval: string | null;
}

/**
 * Map a Stripe subscription onto the `subscriptions` row for its user.
 * Returns the resolved user/tier/interval/status (or null when the user can't
 * be resolved) so the webhook handler can emit analytics for the change.
 */
async function upsertSubscription(
  sub: Stripe.Subscription,
): Promise<ResolvedSubscription | null> {
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
    return null;
  }

  const item = sub.items.data[0];
  const priceId = item?.price?.id ?? null;
  const mapped = tierForPriceId(priceId);
  const interval = item?.price?.recurring?.interval ?? null;

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

  return { userId, tier, status: sub.status, interval };
}
