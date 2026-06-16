/**
 * POST /api/stripe/checkout
 * Body: { tier: "pro" | "studio", interval: "monthly" | "yearly" }
 * Creates a Stripe Checkout Session for the authed user and returns its URL.
 */
import { type NextRequest, NextResponse } from "next/server";
import {
  type BillingInterval,
  isPurchasableTier,
  PAID_TIERS,
  priceIdFor,
  type Tier,
} from "@/lib/stripe/config";
import { getOrCreateCustomer } from "@/lib/stripe/customer";
import { getStripe } from "@/lib/stripe/server";
import {
  captureServer,
  distinctIdFrom,
  flushPostHog,
} from "@/lib/posthog/server";
import { createClient } from "@/lib/supabase/server";

function siteUrl(request: NextRequest): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? request.nextUrl.origin
  );
}

export async function POST(request: NextRequest) {
  // 1. Require an authenticated user.
  let userId: string;
  let email: string | undefined;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }
    userId = user.id;
    email = user.email ?? undefined;
  } catch {
    return NextResponse.json(
      { error: "Auth is not configured." },
      { status: 503 },
    );
  }

  // 2. Validate body.
  const body = (await request.json().catch(() => ({}))) as {
    tier?: string;
    interval?: string;
  };
  const tier = body.tier as Tier;
  const interval = (body.interval ?? "monthly") as BillingInterval;
  if (!PAID_TIERS.includes(tier as Exclude<Tier, "free">)) {
    return NextResponse.json({ error: "Invalid tier." }, { status: 400 });
  }
  // Defense in depth: refuse checkout for tiers that aren't purchasable yet
  // (e.g. Studio is "coming soon"), even if a stale client posts it.
  if (!isPurchasableTier(tier)) {
    return NextResponse.json(
      { error: `${tier} is coming soon and can't be purchased yet.` },
      { status: 400 },
    );
  }
  if (interval !== "monthly" && interval !== "yearly") {
    return NextResponse.json({ error: "Invalid interval." }, { status: 400 });
  }

  // 3. Create the checkout session.
  try {
    const stripe = getStripe();
    const price = priceIdFor(tier as Exclude<Tier, "free">, interval);
    const customerId = await getOrCreateCustomer(userId, email);
    const base = siteUrl(request);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price, quantity: 1 }],
      allow_promotion_codes: true,
      client_reference_id: userId,
      subscription_data: { metadata: { supabase_user_id: userId } },
      success_url: `${base}/app?checkout=success`,
      cancel_url: `${base}/app?checkout=cancelled`,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe did not return a checkout URL." },
        { status: 502 },
      );
    }

    const distinctId = distinctIdFrom(request, userId);
    captureServer(distinctId, "checkout_started", {
      tier,
      interval,
      sessionId: session.id,
    });
    await flushPostHog();

    return NextResponse.json({ url: session.url });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Could not start checkout.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
