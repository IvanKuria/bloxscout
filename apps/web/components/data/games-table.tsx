/**
 * Ranked games table used by the index and genre hubs. Semantic <table> with
 * caption/thead/tbody (AEO requirement), descriptive anchors to each game page.
 */
import Link from "next/link";
import type { ViewEntry } from "@bloxscout/core/hosted-format";
import { GrowthChip } from "@/components/data/console";
import { displayName, int, slugify } from "@/lib/format";

export function GamesTable({
  entries,
  caption,
  showGenre = true,
}: {
  entries: ViewEntry[];
  caption: string;
  showGenre?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border bg-secondary text-left">
            <th scope="col" className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">
              #
            </th>
            <th scope="col" className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Game
            </th>
            {showGenre ? (
              <th scope="col" className="hidden px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground sm:table-cell">
                Genre
              </th>
            ) : null}
            <th scope="col" className="px-4 py-3 text-right font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Players now
            </th>
            <th scope="col" className="hidden px-4 py-3 text-right font-mono text-xs uppercase tracking-wider text-muted-foreground sm:table-cell">
              7d growth
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {entries.map((g, i) => (
            <tr key={g.universeId} className="bg-card transition-colors hover:bg-secondary">
              <td className="tabular px-4 py-3 font-mono text-xs text-muted-foreground">
                {i + 1}
              </td>
              <th scope="row" className="px-4 py-3 text-left font-normal">
                <Link
                  href={`/game/${g.universeId}/${slugify(g.name)}`}
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  {displayName(g.name)}
                </Link>
              </th>
              {showGenre ? (
                <td className="hidden px-4 py-3 font-mono text-xs text-muted-foreground sm:table-cell">
                  {g.genre ?? "—"}
                </td>
              ) : null}
              <td className="tabular px-4 py-3 text-right font-mono text-foreground">
                {int(g.playing)}
              </td>
              <td className="hidden px-4 py-3 text-right sm:table-cell">
                <GrowthChip ratio={g.growth7dPct} className="justify-end" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
