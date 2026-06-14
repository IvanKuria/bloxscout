/**
 * Tier + pricing configuration (hypotheses — tweak freely).
 *
 * Price IDs are referenced via env vars so the same code runs against test and
 * live Stripe modes without edits. Reading happens lazily inside accessors so
 * a missing var never breaks the build.
 */

export type Tier = "free" | "pro" | "studio";
export type BillingInterval = "monthly" | "yearly";

export interface PlanCopy {
  tier: Tier;
  name: string;
  /** Display price strings, purely cosmetic. */
  priceMonthly: string;
  priceYearly: string;
  tagline: string;
  features: string[];
}

/** Marketing/UI copy for each tier. Amounts are display-only. */
export const PLANS: Record<Tier, PlanCopy> = {
  free: {
    tier: "free",
    name: "Free",
    priceMonthly: "$0",
    priceYearly: "$0",
    tagline: "Recon basics for getting started.",
    features: [
      "Public trending + breakout feeds",
      "Limited daily MCP calls",
      "Community support",
    ],
  },
  pro: {
    tier: "pro",
    name: "Pro",
    priceMonthly: "$19",
    priceYearly: "$190",
    tagline: "Full data firehose for serious solo devs.",
    features: [
      "Unlimited MCP calls",
      "Historical snapshots + genre momentum",
      "CSV / API export",
      "Email support",
    ],
  },
  studio: {
    tier: "studio",
    name: "Studio",
    priceMonthly: "$99",
    priceYearly: "$990",
    tagline: "Team seats + priority intelligence for studios.",
    features: [
      "Everything in Pro",
      "Up to 10 seats",
      "Priority data refresh",
      "Private competitor watchlists",
      "Priority support",
    ],
  },
};

/** Env var name holding the Stripe price ID for a given tier + interval. */
const PRICE_ENV: Record<
  Exclude<Tier, "free">,
  Record<BillingInterval, string>
> = {
  pro: {
    monthly: "NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY",
    yearly: "NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY",
  },
  studio: {
    monthly: "NEXT_PUBLIC_STRIPE_PRICE_STUDIO_MONTHLY",
    yearly: "NEXT_PUBLIC_STRIPE_PRICE_STUDIO_YEARLY",
  },
};

/** Resolve a Stripe price ID for a paid tier + interval (lazy env read). */
export function priceIdFor(
  tier: Exclude<Tier, "free">,
  interval: BillingInterval,
): string {
  const envName = PRICE_ENV[tier][interval];
  const id = process.env[envName];
  if (!id) {
    throw new Error(
      `Missing Stripe price ID env var "${envName}". ` +
        `Create the price in Stripe and set it — see apps/web/.env.example.`,
    );
  }
  return id;
}

/** Reverse lookup: which (tier, interval) does a Stripe price ID map to? */
export function tierForPriceId(
  priceId: string | null | undefined,
): { tier: Exclude<Tier, "free">; interval: BillingInterval } | null {
  if (!priceId) return null;
  for (const tier of ["pro", "studio"] as const) {
    for (const interval of ["monthly", "yearly"] as const) {
      if (process.env[PRICE_ENV[tier][interval]] === priceId) {
        return { tier, interval };
      }
    }
  }
  return null;
}

export const PAID_TIERS: Exclude<Tier, "free">[] = ["pro", "studio"];
