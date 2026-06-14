"use client";

/**
 * RankingWidget — inline interactive ranking table for `get_trending_games`
 * and `get_breakout_games`. Reuses the recon `GrowthChip` and an interactive
 * TanStack-sortable table styled to the console theme. Numbers are tabular;
 * the single accent is the live-CCU bar. Renders the honest empty-state when
 * the young dataset has no rows.
 */
import * as React from "react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import Link from "next/link";
import { GrowthChip } from "@/components/data/console";
import type { RankingResult, RankRow } from "@/lib/agent/tools";
import { compact, dec, displayName, int, slugify } from "@/lib/format";
import { cn } from "@/lib/utils";

function WidgetShell({
  result,
  children,
}: {
  result: RankingResult;
  children?: React.ReactNode;
}) {
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
          {result.kind === "breakouts" ? "Acceleration" : "Live CCU"}
        </span>
      </div>
      {children}
    </div>
  );
}

export function RankingWidget({ result }: { result: RankingResult }) {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const maxPlaying = React.useMemo(
    () => Math.max(1, ...result.rows.map((r) => r.playing)),
    [result.rows],
  );

  const columns = React.useMemo<ColumnDef<RankRow>[]>(
    () => [
      {
        id: "rank",
        header: "#",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="tabular font-mono text-xs text-console-muted">
            {row.index + 1}
          </span>
        ),
      },
      {
        accessorKey: "name",
        header: "Game",
        enableSorting: false,
        cell: ({ row }) => (
          <Link
            href={`/game/${row.original.universeId}/${slugify(row.original.name)}`}
            className="font-medium text-console-foreground underline-offset-4 hover:underline"
          >
            {displayName(row.original.name)}
          </Link>
        ),
      },
      {
        accessorKey: "playing",
        header: "Players now",
        cell: ({ row }) => {
          const v = row.original.playing;
          return (
            <div className="flex flex-col items-end gap-1">
              <span className="tabular font-mono text-console-foreground">
                {int(v)}
              </span>
              <span
                className="h-0.5 rounded-full bg-accent/70"
                style={{ width: `${Math.max(6, (v / maxPlaying) * 64)}px` }}
                aria-hidden
              />
            </div>
          );
        },
      },
      {
        accessorKey: "growth7dPct",
        header: "7d",
        cell: ({ row }) => (
          <GrowthChip ratio={row.original.growth7dPct} className="justify-end" />
        ),
      },
      {
        accessorKey: "zScore24h",
        header: "Anomaly",
        cell: ({ row }) => (
          <span
            className={cn(
              "tabular font-mono text-xs",
              (row.original.zScore24h ?? 0) >= 2
                ? "text-positive"
                : "text-console-muted",
            )}
          >
            {dec(row.original.zScore24h, 1)}σ
          </span>
        ),
      },
    ],
    [maxPlaying],
  );

  const table = useReactTable({
    data: result.rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (result.rows.length === 0) {
    return (
      <WidgetShell result={result}>
        <p className="px-4 py-6 text-center font-mono text-xs text-console-muted">
          {result.note ??
            "No rows yet — rankings are still computing as snapshots accumulate."}
        </p>
      </WidgetShell>
    );
  }

  return (
    <WidgetShell result={result}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-console-border/70">
                {hg.headers.map((header) => {
                  const sortable = header.column.getCanSort();
                  const dir = header.column.getIsSorted();
                  const alignRight = header.column.id !== "name";
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      className={cn(
                        "px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-console-muted",
                        alignRight ? "text-right" : "text-left",
                      )}
                    >
                      {sortable ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className={cn(
                            "inline-flex items-center gap-1 transition-colors hover:text-console-foreground",
                            alignRight && "flex-row-reverse",
                          )}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {dir === "asc" ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : dir === "desc" ? (
                            <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ChevronsUpDown className="h-3 w-3 opacity-40" />
                          )}
                        </button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-console-border/40">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="transition-colors hover:bg-white/[0.03]">
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={cn(
                      "px-4 py-2.5 align-middle",
                      cell.column.id === "name" ? "text-left" : "text-right",
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-console-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-console-muted">
        <span>{result.rows.length} games</span>
        <span>{compact(maxPlaying)} peak CCU · click a header to sort</span>
      </div>
    </WidgetShell>
  );
}
