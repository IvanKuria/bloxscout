/**
 * Shared rendering + data assembly for the `/trending` and `/trending/[period]`
 * pages. Both routes delegate here so the answer-first AEO template, JSON-LD,
 * and freshness handling stay in one place.
 *
 * "Fastest-growing" is backed by the live `breakouts` view (z-score anomalies)
 * for the headline pick, and the `trending` view sorted by the period's growth
 * metric for the ranked table. Both views are LIVE today.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/sections/site-header";
import { SiteFooter } from "@/components/sections/site-footer";
import { JsonLd } from "@/components/seo/json-ld";
import { FreshnessBadge, GrowthChip } from "@/components/data/console";
import { getBreakouts, getFreshness, getTrending } from "@/lib/data";
import type { ViewEntry } from "@/lib/data";
import { displayName, growthPct, int, slugify, utcStamp } from "@/lib/format";
import { site } from "@/lib/site";

export const PERIODS = ["day", "week", "month"] as const;
export type Period = (typeof PERIODS)[number];

export function isPeriod(value: string): value is Period {
  return (PERIODS as readonly string[]).includes(value);
}

interface PeriodConfig {
  /** Lower-case noun used in copy: "this day" reads oddly, so map to phrases. */
  phrase: string;
  /** Title-case label for headings. */
  label: string;
  /** Which growth field on a ViewEntry the period ranks by. */
  growthKey: "growth24hPct" | "growth7dPct";
  /** Window described in prose. */
  window: string;
}

const CONFIG: Record<Period, PeriodConfig> = {
  day: {
    phrase: "today",
    label: "Today",
    growthKey: "growth24hPct",
    window: "the last 24 hours",
  },
  week: {
    phrase: "this week",
    label: "This Week",
    growthKey: "growth7dPct",
    window: "the last 7 days",
  },
  month: {
    phrase: "this month",
    label: "This Month",
    growthKey: "growth7dPct",
    window: "the trailing weeks",
  },
};

function h1For(period: Period): string {
  return `Fastest-growing Roblox games ${CONFIG[period].phrase}`;
}

/** Rank by the period's growth metric, dropping games without that signal. */
function rankByGrowth(entries: ViewEntry[], key: PeriodConfig["growthKey"]): ViewEntry[] {
  return entries
    .filter((e) => e[key] !== null && Number.isFinite(e[key] as number))
    .sort((a, b) => (b[key] as number) - (a[key] as number));
}

export function generateTrendingMetadata(
  period: Period,
  date: Date,
): Metadata {
  const h1 = h1For(period);
  const canonical =
    period === "week"
      ? `${site.url}/trending`
      : `${site.url}/trending/${period}`;
  const title = `${h1} (${utcStamp(date).split(",")[0]})`;
  const description = `The fastest-growing Roblox games by ${CONFIG[period].window} concurrent-player growth, as of ${utcStamp(date)}. Live z-score breakouts and CCU, refreshed every 30 minutes by bloxscout.`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: canonical,
      title,
      description,
      siteName: site.name,
      modifiedTime: date.toISOString(),
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export async function TrendingPage({ period }: { period: Period }) {
  if (!isPeriod(period)) notFound();
  const cfg = CONFIG[period];
  const { date, iso } = await getFreshness();
  const stamp = utcStamp(date);

  const [trending, breakouts] = await Promise.all([
    getTrending(),
    getBreakouts(),
  ]);

  // Ranked table: trending entries ordered by the period's growth metric.
  const ranked = trending ? rankByGrowth(trending.entries, cfg.growthKey) : [];
  const top = ranked.slice(0, 50);

  // Headline breakout: prefer the z-score breakouts view, else the top grower.
  const breakoutTop =
    (breakouts?.entries ?? []).slice().sort((a, b) => {
      const za = a.zScore24h ?? -Infinity;
      const zb = b.zScore24h ?? -Infinity;
      return zb - za;
    })[0] ?? top[0] ?? null;

  const h1 = h1For(period);

  const answer = breakoutTop
    ? `As of ${stamp}, the fastest-growing Roblox game ${cfg.phrase} is ${displayName(breakoutTop.name)}, up ${growthPct(breakoutTop[cfg.growthKey])} in concurrent players over ${cfg.window}${breakoutTop.zScore24h !== null ? ` (anomaly z-score ${breakoutTop.zScore24h.toFixed(1)}σ)` : ""}. bloxscout ranks breakouts from its own live snapshot history and refreshes this list every 30 minutes.`
    : `bloxscout's ranking of the fastest-growing Roblox games ${cfg.phrase} is being computed from live snapshots. Growth rankings populate as snapshot history accumulates; this list refreshes every 30 minutes.`;

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${h1} by concurrent-player growth`,
    dateModified: iso,
    numberOfItems: top.length,
    itemListElement: top.map((g, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `${displayName(g.name)} — ${growthPct(g[cfg.growthKey])} growth, ${int(g.playing)} players`,
      url: `${site.url}/game/${g.universeId}/${slugify(g.name)}`,
    })),
  };

  return (
    <>
      <JsonLd data={itemList} />
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border bg-console text-console-foreground">
          <div className="mx-auto max-w-5xl px-6 pt-12 pb-10">
            <nav
              aria-label="Breadcrumb"
              className="mb-5 font-mono text-xs text-console-muted"
            >
              <ol className="flex flex-wrap items-center gap-1.5">
                <li>
                  <Link href="/" className="hover:text-console-foreground">
                    bloxscout
                  </Link>
                </li>
                <li aria-hidden>/</li>
                <li>
                  <Link
                    href="/trending"
                    className="hover:text-console-foreground"
                  >
                    trending
                  </Link>
                </li>
                <li aria-hidden>/</li>
                <li className="text-console-foreground">{cfg.label}</li>
              </ol>
            </nav>
            <FreshnessBadge iso={iso} date={date} className="mb-5" />
            <h1 className="max-w-3xl font-heading text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-[44px]">
              {h1}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-console-foreground/85 sm:text-lg">
              {answer}
            </p>

            {/* Period switcher (internal links). */}
            <div className="mt-7 flex flex-wrap gap-2 font-mono text-xs">
              {PERIODS.map((p) => {
                const href = p === "week" ? "/trending" : `/trending/${p}`;
                const active = p === period;
                return (
                  <Link
                    key={p}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={
                      active
                        ? "rounded-full border border-accent bg-accent/10 px-3 py-1 uppercase tracking-[0.14em] text-accent"
                        : "rounded-full border border-console-border px-3 py-1 uppercase tracking-[0.14em] text-console-muted transition-colors hover:text-console-foreground"
                    }
                  >
                    {CONFIG[p].label}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-5xl px-6 py-12">
          {top.length > 0 ? (
            <>
              <h2 className="mb-1 font-heading text-2xl font-semibold tracking-tight">
                Top {top.length} fastest-growing games {cfg.phrase}
              </h2>
              <p className="mb-5 text-sm text-muted-foreground">
                Ranked by concurrent-player growth over {cfg.window}, measured by
                bloxscout at {stamp}.
              </p>
              <TrendingTable entries={top} growthKey={cfg.growthKey} stamp={stamp} window={cfg.window} />
            </>
          ) : (
            <div className="rounded-xl border border-border bg-secondary/40 p-6">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Growth rankings are being computed from bloxscout&rsquo;s live
                snapshot history. They populate as enough snapshots accumulate to
                measure {cfg.window} of change — check back shortly. Data
                refreshes every 30 minutes.
              </p>
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link
              href="/games"
              className="font-medium underline underline-offset-4 hover:text-accent"
            >
              All top Roblox games &rarr;
            </Link>
            <Link
              href="/about/methodology"
              className="font-medium underline underline-offset-4 hover:text-accent"
            >
              How breakouts are scored &rarr;
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

/** Growth-ranked table with a per-period growth column. */
function TrendingTable({
  entries,
  growthKey,
  stamp,
  window,
}: {
  entries: ViewEntry[];
  growthKey: PeriodConfig["growthKey"];
  stamp: string;
  window: string;
}) {
  return (
    <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">
          Fastest-growing Roblox games by concurrent-player growth over {window},
          measured by bloxscout at {stamp}.
        </caption>
        <thead>
          <tr className="border-b border-border bg-secondary text-left">
            <th
              scope="col"
              className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground"
            >
              #
            </th>
            <th
              scope="col"
              className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground"
            >
              Game
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-right font-mono text-xs uppercase tracking-wider text-muted-foreground"
            >
              Growth
            </th>
            <th
              scope="col"
              className="hidden px-4 py-3 text-right font-mono text-xs uppercase tracking-wider text-muted-foreground sm:table-cell"
            >
              Players now
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {entries.map((g, i) => (
            <tr
              key={g.universeId}
              className="bg-card transition-colors hover:bg-secondary"
            >
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
              <td className="px-4 py-3 text-right">
                <GrowthChip ratio={g[growthKey]} className="justify-end" />
              </td>
              <td className="tabular hidden px-4 py-3 text-right font-mono text-foreground sm:table-cell">
                {int(g.playing)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
