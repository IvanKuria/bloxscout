"use client";

/**
 * PricingTiers — monthly↔annual toggle driving the displayed price and per-tier
 * savings line. Restyled monochrome in the twenty.com idiom: mono uppercase
 * toggle, light Host Grotesk prices, hairline cards, a quietly-distinguished
 * featured tier (charcoal border + a small mono badge, no colour). CTAs route to
 * /signup. Reduced-motion safe (price swap is a short CSS transition).
 */
import * as React from "react";
import { Check } from "lucide-react";
import { CtaLink } from "./cta-link";

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

export function PricingTiers() {
  const [interval, setInterval] = React.useState<Interval>("monthly");

  return (
    <div>
      {/* Toggle */}
      <div className="mb-14 flex flex-col items-center gap-3">
        <div className="inline-flex items-center rounded-[4px] border border-foreground/15 p-0.5 font-mono text-[11px] tracking-[0.1em] uppercase">
          {(["monthly", "yearly"] as const).map((opt) => {
            const active = interval === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setInterval(opt)}
                aria-pressed={active}
                className={`rounded-[2px] px-4 py-2 transition-colors ${
                  active
                    ? "bg-foreground text-background"
                    : "text-foreground/55 hover:text-foreground"
                }`}
              >
                {opt === "monthly" ? "Monthly" : "Annual"}
              </button>
            );
          })}
        </div>
        <p
          className={`font-mono text-[10px] tracking-[0.16em] uppercase transition-opacity ${
            interval === "yearly"
              ? "text-foreground/55 opacity-100"
              : "opacity-0"
          }`}
          aria-hidden={interval !== "yearly"}
        >
          Two months free on annual
        </p>
      </div>

      <div className="grid gap-px overflow-hidden rounded-lg border border-foreground/12 bg-foreground/12 lg:grid-cols-3">
        {TIERS.map((tier) => {
          const savings =
            tier.monthly > 0 && interval === "yearly"
              ? tier.monthly * 12 - tier.yearly
              : 0;
          return (
            <div
              key={tier.name}
              className={`relative flex flex-col bg-background p-8 ${
                tier.featured
                  ? "bg-muted-surface ring-1 ring-accent/35 ring-inset"
                  : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-light tracking-[-0.02em] text-foreground">
                  {tier.name}
                </h3>
                {tier.featured && (
                  <span className="rounded-[3px] border border-accent/30 bg-accent/[0.08] px-2 py-1 font-mono text-[9px] tracking-[0.16em] text-accent uppercase">
                    Most picked
                  </span>
                )}
              </div>
              <p className="mt-2 text-[13.5px] leading-relaxed text-foreground/55">
                {tier.tagline}
              </p>

              <div className="mt-7 flex items-baseline gap-1.5">
                <span className="text-[2.75rem] leading-none font-light tracking-[-0.04em] text-foreground tabular-nums">
                  {formatPrice(tier, interval)}
                </span>
                {tier.monthly > 0 && (
                  <span className="font-mono text-[12px] text-foreground/45">
                    {interval === "monthly" ? "/ mo" : "/ yr"}
                  </span>
                )}
              </div>
              <p className="mt-2 h-4 font-mono text-[11px] tracking-[0.04em] text-foreground/45">
                {savings > 0 ? `Save $${savings} a year` : ""}
              </p>

              <CtaLink
                href={tier.href}
                variant={tier.featured ? "default" : "outline"}
                className="mt-7 w-full"
              >
                {tier.cta}
              </CtaLink>

              <ul className="mt-8 space-y-3 border-t border-foreground/10 pt-7">
                {tier.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2.5 text-[13.5px] leading-snug text-foreground/75"
                  >
                    <Check
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent"
                      strokeWidth={2.2}
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
