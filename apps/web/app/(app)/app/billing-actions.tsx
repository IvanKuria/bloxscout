"use client";

import { ArrowUpRight, LoaderCircle, Settings2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { BillingInterval, Tier } from "@/lib/stripe/config";

async function postJson(url: string, body: Record<string, unknown>) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as {
    url?: string;
    error?: string;
  };
  if (!res.ok || !data.url) {
    throw new Error(data.error ?? "Something went wrong. Try again.");
  }
  return data.url;
}

/** Button that starts a Stripe Checkout session for a paid tier. */
export function UpgradeButton({
  tier,
  interval,
  label,
  variant = "default",
}: {
  tier: Exclude<Tier, "free">;
  interval: BillingInterval;
  label: string;
  variant?: "default" | "outline";
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setLoading(true);
    setError(null);
    try {
      const url = await postJson("/api/stripe/checkout", { tier, interval });
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start checkout.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        onClick={go}
        disabled={loading}
        variant={variant}
        size="sm"
        className={
          variant === "default"
            ? "bg-accent text-accent-foreground hover:bg-accent-hover"
            : "border-console-border bg-transparent text-console-foreground hover:bg-white/5 hover:text-console-foreground"
        }
      >
        {loading ? (
          <LoaderCircle className="size-3.5 animate-spin" />
        ) : (
          <>
            {label}
            <ArrowUpRight className="size-3.5" />
          </>
        )}
      </Button>
      {error ? (
        <span className="font-mono text-[11px] text-negative">{error}</span>
      ) : null}
    </div>
  );
}

/** Button that opens the Stripe customer portal. */
export function ManageButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setLoading(true);
    setError(null);
    try {
      const url = await postJson("/api/stripe/portal", {});
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to open portal.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        onClick={go}
        disabled={loading}
        variant="outline"
        size="sm"
        className="border-console-border bg-transparent text-console-foreground hover:bg-white/5 hover:text-console-foreground"
      >
        {loading ? (
          <LoaderCircle className="size-3.5 animate-spin" />
        ) : (
          <>
            <Settings2 className="size-3.5" />
            Manage subscription
          </>
        )}
      </Button>
      {error ? (
        <span className="font-mono text-[11px] text-negative">{error}</span>
      ) : null}
    </div>
  );
}
