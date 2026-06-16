"use client";

/**
 * PricingTiers — monthly↔annual toggle driving the displayed price and per-tier
 * savings line, in the OpenAI/ChatGPT idiom: a soft pill segmented toggle, clean
 * Geist prices, rounded neutral cards, and a quietly-distinguished featured tier
 * (a subtle neutral ring + a small neutral badge); only the featured CTA stays
 * green. Colour comes from semantic tokens so it reads correctly in light and
 * dark. CTAs route to /signup. Reduced-motion
 * safe (price swap is a short CSS transition).
 */
import * as React from "react";
import { Check } from "lucide-react";
import posthog from "posthog-js";
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
  comingSoon?: boolean;
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
      "3 agent questions a day",
      "Niche, trending & breakout scans",
      "Revenue, competitor & monetization analysis",
      "Live Roblox data, refreshed ~30 min",
    ],
  },
  {
    name: "Pro",
    tagline: "Unlimited intel for serious solo devs.",
    monthly: 19,
    yearly: 190,
    cta: "Start Pro",
    href: "/signup",
    featured: true,
    features: [
      "Unlimited agent questions",
      "Everything in Free, no daily cap",
      "Icon & thumbnail vision analysis",
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
        <div className="inline-flex items-center rounded-full border border-border bg-muted p-1 text-[13px]">
          {(["monthly", "yearly"] as const).map((opt) => {
            const active = interval === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  posthog.capture("pricing_interval_toggled", {
                    interval: opt,
                  });
                  setInterval(opt);
                }}
                aria-pressed={active}
                className={`rounded-full px-4 py-1.5 font-medium transition-colors ${
                  active
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt === "monthly" ? "Monthly" : "Annual"}
              </button>
            );
          })}
        </div>
        <p
          className={`text-[12px] font-medium text-muted-foreground transition-opacity ${
            interval === "yearly" ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden={interval !== "yearly"}
        >
          Two months free on annual
        </p>
      </div>

      <div className="mx-auto grid max-w-3xl gap-4 lg:grid-cols-2">
        {TIERS.map((tier) => {
          const savings =
            tier.monthly > 0 && interval === "yearly"
              ? tier.monthly * 12 - tier.yearly
              : 0;
          return (
            <div
              key={tier.name}
              className={`relative flex flex-col rounded-2xl border bg-card p-8 ${
                tier.featured
                  ? "border-border ring-1 ring-border"
                  : "border-border"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold tracking-tight text-foreground">
                  {tier.name}
                </h3>
                {tier.featured && (
                  <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                    Most picked
                  </span>
                )}
              </div>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                {tier.tagline}
              </p>

              <div className="mt-7 flex items-baseline gap-1.5">
                <span className="text-[2.75rem] leading-none font-semibold tracking-tight text-foreground tabular-nums">
                  {formatPrice(tier, interval)}
                </span>
                {tier.monthly > 0 && (
                  <span className="text-[13px] text-muted-foreground">
                    {interval === "monthly" ? "/ mo" : "/ yr"}
                  </span>
                )}
              </div>
              <p className="mt-2 h-4 text-[12px] font-medium text-muted-foreground">
                {savings > 0 ? `Save $${savings} a year` : ""}
              </p>

              <CtaLink
                href={tier.href}
                variant={tier.featured ? "default" : "outline"}
                className="mt-7 w-full"
              >
                {tier.cta}
              </CtaLink>

              <ul className="mt-8 space-y-3 border-t border-border pt-7">
                {tier.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2.5 text-[13.5px] leading-snug text-foreground/80"
                  >
                    <Check
                      className="mt-0.5 size-3.5 shrink-0 text-foreground"
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
