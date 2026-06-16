"use client";

/**
 * RisingList · inline opportunity widget for `get_rising_niches`. A compact
 * ranked list of rising genres with their momentum score and growth, on a
 * clean light surface; the score bar is the single accent.
 */
import Link from "next/link";
import { GrowthChip } from "@/components/data/console";
import type { RisingResult } from "@/lib/agent/tools";

export function RisingList({ result }: { result: RisingResult }) {
  const max = Math.max(1, ...result.rows.map((r) => r.risingScore));
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className="inline-block size-1.5 rounded-full bg-primary"
            aria-hidden
          />
          <span className="text-sm font-medium text-foreground">
            {result.title}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          Momentum score
        </span>
      </div>

      {result.rows.length === 0 ? (
        <p className="px-4 py-6 text-center text-xs text-muted-foreground">
          {result.note ?? "No rising niches scored yet."}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {result.rows.map((r, i) => (
            <li
              key={r.slug}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
            >
              <span className="tabular w-5 shrink-0 text-xs text-muted-foreground">
                {i + 1}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Link
                  href={`/rising-roblox-niches`}
                  className="truncate text-sm font-medium text-foreground underline-offset-4 hover:underline"
                >
                  {r.genre}
                </Link>
                <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(r.risingScore / max) * 100}%` }}
                    aria-hidden
                  />
                </div>
              </div>
              <div className="flex w-28 shrink-0 flex-col items-end gap-0.5">
                <span className="tabular font-heading text-base font-semibold leading-none text-foreground">
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

      <div className="border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
        Rising = momentum × opportunity × durability
      </div>
    </div>
  );
}
