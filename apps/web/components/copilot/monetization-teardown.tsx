"use client";

/**
 * MonetizationTeardown · inline widget for `teardown_monetization`. Shows a
 * game's gamepass pricing ladder (sorted high→low) plus the headline style and
 * price spread. Robux prices use the tabular numerals + an R$ marker.
 */
import type { ReactNode } from "react";
import { GameAvatar } from "@/components/copilot/game-avatar";
import type {
  MonetizationResult,
  MonetizationStyle,
} from "@/lib/agent/tools";
import { int } from "@/lib/format";

function styleLabel(style: MonetizationStyle): string {
  if (style === "gamepass-heavy") return "Gamepass-heavy";
  if (style === "gamepass-light") return "Gamepass-light";
  return "No gamepasses for sale";
}

function Robux({ price }: { price: number | null }) {
  if (price === null) return <span className="text-muted-foreground">off-sale</span>;
  return (
    <span className="tabular">
      {int(price)}
      <span className="ml-0.5 text-[10px] text-muted-foreground">R$</span>
    </span>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

export function MonetizationTeardown({ result }: { result: MonetizationResult }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className="inline-block size-1.5 rounded-full bg-primary"
            aria-hidden
          />
          <span className="text-sm font-medium text-foreground">
            {result.name ?? "Game"} · monetization
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          Gamepasses
        </span>
      </div>

      {result.ok ? (
        <>
          <div className="flex items-center gap-3 px-4 py-4">
            <GameAvatar name={result.name} src={result.thumbnailUrl} className="size-10" />
            <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
              <Stat label="Style" value={styleLabel(result.style)} />
              <Stat label="For sale" value={int(result.forSaleCount)} />
              <Stat
                label="Range"
                value={
                  result.priceMin === null ? (
                    "·"
                  ) : (
                    <span className="tabular">
                      {int(result.priceMin)}–{int(result.priceMax ?? result.priceMin)}{" "}
                      <span className="text-[10px] text-muted-foreground">R$</span>
                    </span>
                  )
                }
              />
              <Stat label="Median" value={<Robux price={result.priceMedian} />} />
            </div>
          </div>

          {result.passes.length > 0 ? (
            <>
              <div className="border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
                Top passes by price
              </div>
              <ul className="flex flex-col divide-y divide-border">
                {result.passes.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 px-4 py-2.5"
                  >
                    <span className="min-w-0 truncate text-sm text-foreground">
                      {p.name || "Untitled pass"}
                    </span>
                    <span className="shrink-0 text-sm font-medium text-foreground">
                      <Robux price={p.price} />
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </>
      ) : (
        <p className="px-4 py-6 text-center text-xs text-muted-foreground">
          {result.note ?? "No monetization data available."}
        </p>
      )}

      {result.note && result.ok ? (
        <p className="border-t border-border bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
          {result.note}
        </p>
      ) : null}
    </div>
  );
}
