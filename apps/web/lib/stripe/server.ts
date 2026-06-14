/**
 * Lazily-initialized Stripe Node SDK client.
 *
 * `getStripe()` is called inside route handlers, never at module top-level, so
 * `next build` does not require STRIPE_SECRET_KEY to be present.
 */
import Stripe from "stripe";

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "Missing required environment variable \"STRIPE_SECRET_KEY\". " +
        "Billing is not configured — see apps/web/.env.example.",
    );
  }

  cached = new Stripe(key, {
    // Pin via the SDK's bundled default; omit explicit apiVersion to avoid
    // type drift across SDK upgrades.
    appInfo: { name: "bloxscout" },
    typescript: true,
  });
  return cached;
}

export function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error(
      "Missing required environment variable \"STRIPE_WEBHOOK_SECRET\". " +
        "Set the webhook signing secret — see apps/web/.env.example.",
    );
  }
  return secret;
}
