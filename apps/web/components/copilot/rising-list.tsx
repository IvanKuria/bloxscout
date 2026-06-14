"use client";

/**
 * RisingList — inline opportunity widget for `get_rising_niches`. Compact
 * ranked list of rising genres with their momentum score and growth. Lighter
 * than the NicheCard; the score bar is the single accent.
 */
import Link from "next/link";
import { GrowthChip } from "@/components/data/console";
import type { RisingResult } from "@/lib/agent/tools";
import { cn } from "@/lib/utils";

export function RisingList({ result }: { result: RisingResult }) {
  const max = Math.max(1, ...result.rows.map((r) => r.risingScore));
  return (
    <div className="recon-grid relative overflow-hidden rounded-xl border border-console-border bg-console">
      <div className="flex items-center justify-between gap-3 border-b border-console-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className="recon-pulse inline-block h-1.5 w-1.5 rounded-full bg-accent"
            aria-hidden
          />
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-console-foreground">
            {result.title}
          </span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-console-muted">
          Momentum score
        </span>
      </div>

      {result.rows.length === 0 ? (
        <p className="px-4 py-6 text-center font-mono text-xs text-console-muted">
          {result.note ?? "No rising niches scored yet."}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-console-border/40">
          {result.rows.map((r, i) => (
            <li
              key={r.slug}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03]"
            >
              <span className="tabular w-5 shrink-0 font-mono text-xs text-console-muted">
                {i + 1}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Link
                  href={`/rising-roblox-niches`}
                  className="truncate text-sm font-medium text-console-foreground underline-offset-4 hover:underline"
                >
                  {r.genre}
                </Link>
                <div className="h-1 w-full overflow-hidden rounded-full bg-console-border">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${(r.risingScore / max) * 100}%` }}
                    aria-hidden
                  />
                </div>
              </div>
              <div className="flex w-28 shrink-0 flex-col items-end gap-0.5">
                <span className="tabular font-heading text-base font-semibold leading-none text-console-foreground">
                  {Math.round(r.risingScore)}
                </span>
                <GrowthChip
                  ratio={r.growth7dPct ?? r.growth24hPct}
                  className="justify-end text-xs"
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <div
        className={cn(
          "border-t border-console-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-console-muted",
        )}
      >
        Rising = momentum × opportunity × durability
      </div>
    </div>
  );
}
