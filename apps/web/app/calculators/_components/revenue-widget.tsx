"use client";

import { useMemo, useState } from "react";
import { estimateGameRevenue } from "@bloxscout/core/calculators";

/**
 * Interactive Roblox game-revenue estimator. Wraps the shared
 * `@bloxscout/core` heuristic so the client figure matches the pre-rendered
 * server examples. Clearly labeled an estimate — actual revenue varies 5-10x.
 */
export function RevenueWidget() {
  const [raw, setRaw] = useState("1000");

  const playing = Number(raw.replace(/[^0-9.]/g, ""));

  const result = useMemo(() => {
    if (!Number.isFinite(playing) || playing < 0) return null;
    try {
      return estimateGameRevenue({ playing, visits: 0 });
    } catch {
      return null;
    }
  }, [playing]);

  const usd = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD" });

  return (
    <div className="recon-grid rounded-xl border border-console-border bg-console p-6 text-console-foreground">
      <label
        htmlFor="rev-ccu"
        className="block font-mono text-[11px] uppercase tracking-[0.18em] text-console-muted"
      >
        Concurrent players (CCU)
      </label>
      <div className="mt-2 flex items-center gap-3">
        <input
          id="rev-ccu"
          inputMode="numeric"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          aria-describedby="rev-result"
          className="tabular w-full rounded-md border border-console-border bg-console/60 px-4 py-3 font-mono text-2xl text-console-foreground outline-none focus:border-accent"
          placeholder="1000"
        />
        <span className="font-mono text-sm text-console-muted">players</span>
      </div>

      <div className="mt-5 border-t border-console-border pt-5">
        <span className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
          Bloxscout estimate · monthly
        </span>
        <output
          id="rev-result"
          className="tabular mt-1 block font-heading text-4xl font-semibold leading-none text-console-foreground sm:text-5xl"
        >
          {result ? usd(result.estimatedMonthlyUsd) : "—"}
        </output>
        {result ? (
          <dl className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2 font-mono text-xs text-console-muted">
            <div>
              <dt className="uppercase tracking-[0.16em]">Daily Robux</dt>
              <dd className="tabular text-console-foreground">
                {result.estimatedDailyRobux.toLocaleString("en-US")} R$
              </dd>
            </div>
            <div>
              <dt className="uppercase tracking-[0.16em]">Monthly Robux</dt>
              <dd className="tabular text-console-foreground">
                {result.estimatedMonthlyRobux.toLocaleString("en-US")} R$
              </dd>
            </div>
          </dl>
        ) : null}
      </div>

      <p className="mt-5 border-t border-console-border pt-4 font-mono text-[11px] leading-relaxed text-console-muted">
        Estimate only. Assumes ~2% of concurrent players pay ~100 Robux per
        active day. Actual revenue varies by 5&ndash;10&times; with monetization
        design.
      </p>
    </div>
  );
}
