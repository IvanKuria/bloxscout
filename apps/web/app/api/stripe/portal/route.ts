/**
 * POST /api/stripe/portal
 * Opens the Stripe Customer Portal for the authed user's existing customer.
 */
import { type NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

function siteUrl(request: NextRequest): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? request.nextUrl.origin
  );
}

export async function POST(request: NextRequest) {
  let userId: string;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }
    userId = user.id;
  } catch {
    return NextResponse.json(
      { error: "Auth is not configured." },
      { status: 503 },
    );
  }

  try {
    const admin = createServiceRoleClient();
    const { data } = await admin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!data?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No billing account yet — start a subscription first." },
        { status: 400 },
      );
    }

    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: `${siteUrl(request)}/app`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not open portal.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
