"use client";

/**
 * PricingTiers — the interactive heart of /pricing. A monthly↔annual toggle
 * drives the displayed price and the per-tier savings line. Copy is defined here
 * (cleaned, install/MCP-free) rather than read straight from the Stripe config so
 * the marketing surface controls its own language. CTAs all route to /signup
 * (paid checkout happens post-auth).
 *
 * Reduced-motion safe: the price swap is a short opacity/translate transition the
 * browser drops under `prefers-reduced-motion`; nothing here is rAF-driven.
 */
import * as React from "react";
import Link from "next/link";
import { Check } from "lucide-react";

type Interval = "monthly" | "yearly";

type Tier = {
  name: string;
  tagline: string;
  monthly: number;
  yearly: number;
  cta: string;
  href: string;
  featured?: boolean;
  features: string[];
};

const TIERS: Tier[] = [
  {
    name: "Free",
    tagline: "Get a feel for the agent.",
    monthly: 0,
    yearly: 0,
    cta: "Start free",
    href: "/signup",
    features: [
      "Ask the agent a few questions a day",
      "Public trending + breakout feeds",
      "Live data, refreshed every ~30 min",
      "Community support",
    ],
  },
  {
    name: "Pro",
    tagline: "The full firehose for serious solo devs.",
    monthly: 19,
    yearly: 190,
    cta: "Start Pro",
    href: "/signup",
    featured: true,
    features: [
      "Unlimited questions to the agent",
      "Saturation + rising-niche scans",
      "Historical snapshots & genre momentum",
      "CSV export of any answer",
      "Email support",
    ],
  },
  {
    name: "Studio",
    tagline: "Team seats and priority intel for studios.",
    monthly: 99,
    yearly: 990,
    cta: "Start Studio",
    href: "/signup",
    features: [
      "Everything in Pro",
      "Up to 10 seats",
      "Priority data refresh",
      "Private competitor watchlists",
      "Priority support",
    ],
  },
];

function formatPrice(tier: Tier, interval: Interval): string {
  const amount = interval === "monthly" ? tier.monthly : tier.yearly;
  if (amount === 0) return "$0";
  return `$${amount}`;
}

function unitLabel(interval: Interval): string {
  return interval === "monthly" ? "/ mo" : "/ yr";
}

export function PricingTiers() {
  const [interval, setInterval] = React.useState<Interval>("monthly");

  return (
    <div>
      {/* Toggle */}
      <div className="mb-12 flex flex-col items-center gap-3">
        <div className="inline-flex items-center rounded-full border border-border bg-secondary p-1 font-mono text-[12px]">
          {(["monthly", "yearly"] as const).map((opt) => {
            const activeOpt = interval === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setInterval(opt)}
                aria-pressed={activeOpt}
                className={`relative rounded-full px-4 py-1.5 tracking-tight transition-colors ${
                  activeOpt
                    ? "bg-background text-foreground shadow-[0_1px_0_0_rgba(10,10,10,0.04),0_6px_16px_-10px_rgba(10,10,10,0.4)]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt === "monthly" ? "Monthly" : "Annual"}
              </button>
            );
          })}
        </div>
        <p
          className={`font-mono text-[11px] tracking-[0.16em] uppercase transition-opacity ${
            interval === "yearly"
              ? "text-positive opacity-100"
              : "text-muted-foreground/0 opacity-0"
          }`}
          aria-hidden={interval !== "yearly"}
        >
          Two months free on annual
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
        {TIERS.map((tier) => {
          const savings =
            tier.monthly > 0 && interval === "yearly"
              ? tier.monthly * 12 - tier.yearly
              : 0;
          return (
            <div
              key={tier.name}
              className={`group relative flex flex-col overflow-hidden rounded-2xl border p-7 transition-all ${
                tier.featured
                  ? "border-accent/30 bg-card shadow-[0_1px_0_0_rgba(10,10,10,0.04),0_30px_70px_-40px_rgba(226,35,26,0.45)] ring-1 ring-accent/15 lg:-mt-2 lg:mb-2"
                  : "border-border bg-card ring-1 ring-foreground/[0.04] hover:-translate-y-0.5 hover:ring-foreground/15"
              }`}
            >
              {tier.featured && (
                <>
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-accent to-transparent"
                  />
                  <span className="absolute top-5 right-5 rounded-full bg-accent/10 px-2.5 py-1 font-mono text-[9px] tracking-[0.16em] text-accent uppercase">
                    Most picked
                  </span>
                </>
              )}

              <h3 className="font-heading text-xl font-semibold tracking-tight text-foreground">
                {tier.name}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {tier.tagline}
              </p>

              <div className="mt-6 flex items-baseline gap-1.5">
                <span className="font-heading text-5xl font-semibold tracking-[-0.02em] text-foreground tabular-nums">
                  {formatPrice(tier, interval)}
                </span>
                {tier.monthly > 0 && (
                  <span className="font-mono text-sm text-muted-foreground">
                    {unitLabel(interval)}
                  </span>
                )}
              </div>
              <p className="mt-1.5 h-4 font-mono text-[11px] tracking-tight text-positive">
                {savings > 0 ? `Save $${savings} a year` : ""}
              </p>

              <Link
                href={tier.href}
                className={`mt-6 inline-flex w-full items-center justify-center rounded-xl px-5 py-3 text-sm font-medium transition-colors ${
                  tier.featured
                    ? "bg-accent text-accent-foreground shadow-[0_10px_24px_-12px_rgba(226,35,26,0.7)] hover:bg-accent-hover"
                    : "border border-border bg-background text-foreground hover:bg-secondary"
                }`}
              >
                {tier.cta}
              </Link>

              <ul className="mt-7 space-y-3 border-t border-border/70 pt-6">
                {tier.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2.5 text-sm leading-snug text-foreground/85"
                  >
                    <Check
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        tier.featured ? "text-accent" : "text-positive"
                      }`}
                      strokeWidth={2.4}
                      aria-hidden
                    />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
