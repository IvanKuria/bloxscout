"use client";

/**
 * RankingWidget — inline interactive ranking table for `get_trending_games`
 * and `get_breakout_games`. A TanStack-sortable table on a clean light surface:
 * each game shows its icon + name, live players (with a subtle accent bar),
 * 7-day growth, and the 24h anomaly z-score. Numbers are tabular. Renders an
 * honest empty-state when the young dataset has no rows.
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
import { GameAvatar } from "@/components/copilot/game-avatar";
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
    <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className="recon-pulse inline-block size-1.5 rounded-full bg-accent"
            aria-hidden
          />
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-foreground">
            {result.title}
          </span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
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
          <span className="tabular font-mono text-xs text-muted-foreground">
            {row.index + 1}
          </span>
        ),
      },
      {
        accessorKey: "name",
        header: "Game",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <GameAvatar
              name={row.original.name}
              src={row.original.thumbnailUrl}
              className="size-9"
            />
            <Link
              href={`/game/${row.original.universeId}/${slugify(row.original.name)}`}
              className="min-w-0 truncate font-medium text-foreground underline-offset-4 hover:underline"
            >
              {displayName(row.original.name)}
            </Link>
          </div>
        ),
      },
      {
        accessorKey: "playing",
        header: "Players now",
        cell: ({ row }) => {
          const v = row.original.playing;
          return (
            <div className="flex flex-col items-end gap-1">
              <span className="tabular text-foreground">{int(v)}</span>
              <span
                className="h-0.5 rounded-full bg-accent/60"
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
                : "text-muted-foreground",
            )}
          >
            {dec(row.original.zScore24h, 1)}σ
          </span>
        ),
      },
    ],
    [maxPlaying],
  );

  // TanStack's useReactTable isn't yet annotated for the React Compiler's
  // hook-deps lint; the table instance is stable and reads no reactive value
  // it doesn't already list. Scope the disable to this one call.
  // eslint-disable-next-line react-hooks/incompatible-library
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
        <p className="px-4 py-6 text-center text-xs text-muted-foreground">
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
              <tr key={hg.id} className="border-b border-border">
                {hg.headers.map((header) => {
                  const sortable = header.column.getCanSort();
                  const dir = header.column.getIsSorted();
                  const alignRight = header.column.id !== "name";
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      className={cn(
                        "px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground",
                        alignRight ? "text-right" : "text-left",
                      )}
                    >
                      {sortable ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className={cn(
                            "inline-flex items-center gap-1 transition-colors hover:text-foreground",
                            alignRight && "flex-row-reverse",
                          )}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {dir === "asc" ? (
                            <ArrowUp className="size-3" />
                          ) : dir === "desc" ? (
                            <ArrowDown className="size-3" />
                          ) : (
                            <ChevronsUpDown className="size-3 opacity-40" />
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
          <tbody className="divide-y divide-border">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="transition-colors hover:bg-muted-surface/50"
              >
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
      <div className="flex items-center justify-between border-t border-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        <span>{result.rows.length} games</span>
        <span>{compact(maxPlaying)} peak CCU · click a header to sort</span>
      </div>
    </WidgetShell>
  );
}
