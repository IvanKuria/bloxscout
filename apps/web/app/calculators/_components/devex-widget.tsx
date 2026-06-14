"use client";

import { useMemo, useState } from "react";
import {
  calculateDevex,
  DEFAULT_DEVEX_RATE_USD_PER_ROBUX,
  DEVEX_PAYOUT_MINIMUM_ROBUX,
  LEGACY_DEVEX_RATE_USD_PER_ROBUX,
} from "@bloxscout/core/calculators";

/**
 * Interactive Robux -> USD DevEx converter. Pure computation via the shared
 * `@bloxscout/core` calculator — the same function the MCP server uses — so the
 * client number always matches the pre-rendered server examples below it.
 */
export function DevexWidget() {
  const [raw, setRaw] = useState("100000");
  const [legacy, setLegacy] = useState(false);

  const robux = Number(raw.replace(/[^0-9.]/g, ""));
  const rate = legacy
    ? LEGACY_DEVEX_RATE_USD_PER_ROBUX
    : DEFAULT_DEVEX_RATE_USD_PER_ROBUX;

  const result = useMemo(() => {
    if (!Number.isFinite(robux) || robux < 0) return null;
    try {
      return calculateDevex(robux, { rateUsdPerRobux: rate });
    } catch {
      return null;
    }
  }, [robux, rate]);

  return (
    <div className="recon-grid rounded-xl border border-console-border bg-console p-6 text-console-foreground">
      <label
        htmlFor="devex-robux"
        className="block font-mono text-[11px] uppercase tracking-[0.18em] text-console-muted"
      >
        Earned Robux
      </label>
      <div className="mt-2 flex items-center gap-3">
        <input
          id="devex-robux"
          inputMode="numeric"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          aria-describedby="devex-result"
          className="tabular w-full rounded-md border border-console-border bg-console/60 px-4 py-3 font-mono text-2xl text-console-foreground outline-none focus:border-accent"
          placeholder="100000"
        />
        <span className="font-mono text-sm text-console-muted">R$</span>
      </div>

      <div className="mt-5 border-t border-console-border pt-5">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-console-muted">
          USD at {rate} per Robux
        </span>
        <output
          id="devex-result"
          className="tabular mt-1 block font-heading text-4xl font-semibold leading-none text-console-foreground sm:text-5xl"
        >
          {result
            ? result.usd.toLocaleString("en-US", {
                style: "currency",
                currency: "USD",
              })
            : "—"}
        </output>
        {result?.payoutMinimumNotMet ? (
          <p className="mt-3 font-mono text-xs text-negative">
            Below the {DEVEX_PAYOUT_MINIMUM_ROBUX.toLocaleString("en-US")} Robux
            DevEx payout minimum — you can&rsquo;t cash this out yet.
          </p>
        ) : null}
      </div>

      <label className="mt-5 flex cursor-pointer items-center gap-2 font-mono text-xs text-console-muted">
        <input
          type="checkbox"
          checked={legacy}
          onChange={(e) => setLegacy(e.target.checked)}
          className="accent-[var(--accent)]"
        />
        Use legacy pre-2025-09-05 rate ({LEGACY_DEVEX_RATE_USD_PER_ROBUX} USD/Robux)
      </label>
    </div>
  );
}
