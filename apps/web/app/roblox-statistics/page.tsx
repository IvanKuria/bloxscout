/**
 * Platform statistics hub — `/roblox-statistics`.
 *
 * An authority/citation page: live aggregates over the games bloxscout tracks,
 * refreshed every 30 minutes. Honest scoping is the whole point — bloxscout
 * tracks ~1,600 of the most active games, NOT all of Roblox, so every figure is
 * labelled "across the games bloxscout tracks" and we never invent platform-
 * wide CCU/DAU we can't measure.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/sections/site-header";
import { SiteFooter } from "@/components/sections/site-footer";
import { JsonLd } from "@/components/seo/json-ld";
import { FreshnessBadge } from "@/components/data/console";
import { AskBloxscout } from "@/components/cta/ask-bloxscout";
import {
  buildLandingGraph,
  ComputingState,
  type LandingFaq,
} from "@/app/_money/landing";
import {
  getBreakouts,
  getFreshness,
  getGenreRevenue,
  getGenres,
  getMeta,
  getTrending,
} from "@/lib/data";
import {
  compact,
  displayName,
  genreSlug as toGenreSlug,
  growthPct,
  int,
  slugify,
  usd,
  utcStamp,
} from "@/lib/format";
import { site } from "@/lib/site";

export const revalidate = 1800;

const PATH = "/roblox-statistics";
const H1 = "Live Roblox game statistics";

export async function generateMetadata(): Promise<Metadata> {
  const { date } = await getFreshness();
  const [meta, trending] = await Promise.all([getMeta(), getTrending()]);
  const tracked = meta?.gamesTracked ?? trending?.entries.length ?? null;
  const combined =
    trending?.entries.reduce((sum, e) => sum + (e.playing || 0), 0) ?? null;
  const lead =
    combined !== null && tracked !== null
      ? `bloxscout tracks ${int(tracked)} of the most active Roblox games with ${compact(combined)} concurrent players combined`
      : "Live Roblox game statistics from bloxscout";
  return {
    title: "Roblox game statistics — live player counts, genres & revenue",
    description: `${lead}, refreshed every 30 minutes as of ${utcStamp(date)}. Biggest games right now, players by genre, fastest growers and estimated creator revenue.`,
    alternates: { canonical: `${site.url}${PATH}` },
    openGraph: {
      type: "article",
      url: `${site.url}${PATH}`,
      title: "Roblox game statistics — live",
      siteName: site.name,
      modifiedTime: date.toISOString(),
    },
  };
}

export default async function RobloxStatisticsPage() {
  const { date, iso } = await getFreshness();
  const stamp = utcStamp(date);
  const [meta, trending, genres, breakouts, genreRevenue] = await Promise.all([
    getMeta(),
    getTrending(),
    getGenres(),
    getBreakouts(),
    getGenreRevenue(),
  ]);

  const entries = trending?.entries ?? [];
  const tracked = meta?.gamesTracked ?? (entries.length || null);
  const combinedPlayers =
    entries.length > 0
      ? entries.reduce((sum, e) => sum + (e.playing || 0), 0)
      : null;
  const genreList = [...(genres?.genres ?? [])].sort(
    (a, b) => b.totalPlaying - a.totalPlaying,
  );
  const genresTracked = genreList.length || null;
  const revenueEntries = [...(genreRevenue?.entries ?? [])].sort(
    (a, b) => b.estTotalMonthlyUsd - a.estTotalMonthlyUsd,
  );
  const combinedRevenue =
    revenueEntries.length > 0
      ? revenueEntries.reduce((s, e) => s + e.estTotalMonthlyUsd, 0)
      : null;

  const topGames = [...entries].sort((a, b) => b.playing - a.playing).slice(0, 10);
  const biggest = topGames[0] ?? null;
  const topGenre = genreList[0] ?? null;

  const fastest = (
    breakouts?.entries?.length
      ? breakouts.entries
      : [...entries].sort(
          (a, b) => (b.growth24hPct ?? -1) - (a.growth24hPct ?? -1),
        )
  ).slice(0, 5);

  const genreTotal = genreList.reduce((s, g) => s + g.totalPlaying, 0);

  const answer =
    combinedPlayers !== null && tracked !== null
      ? `As of ${stamp}, bloxscout is tracking ${int(tracked)} of the most active Roblox games, with ${compact(combinedPlayers)} concurrent players across them${biggest ? `. The biggest right now is ${displayName(biggest.name)} with ${int(biggest.playing)} players` : ""}${topGenre ? `, and the largest genre is ${topGenre.genre}` : ""}. These are live figures for bloxscout's tracked set, refreshed every 30 minutes — not all of Roblox.`
      : `bloxscout publishes live statistics for the most active Roblox games — biggest titles, players by genre, fastest growers and estimated creator revenue — refreshed every 30 minutes. The live aggregates populate on this page as the dataset refreshes.`;

  const faqs: LandingFaq[] = [
    {
      question: "How many players are in the Roblox games bloxscout tracks?",
      answer:
        combinedPlayers !== null && tracked !== null
          ? `About ${compact(combinedPlayers)} concurrent players across the ${int(tracked)} most active games bloxscout tracks, as of ${stamp}. This is not Roblox's platform-wide figure — it covers bloxscout's tracked set, which skews to the most popular games.`
          : "bloxscout sums live concurrent players across the most active games it tracks. The figure publishes here once the trending view refreshes.",
    },
    {
      question: "What is the most popular Roblox game right now?",
      answer: biggest
        ? `By live concurrent players, ${displayName(biggest.name)} is the most-played game bloxscout tracks right now, with ${int(biggest.playing)} players as of ${stamp}.`
        : "The most-played game by live concurrent players is shown at the top of the leaderboard on this page once data refreshes.",
    },
    {
      question: "What is the biggest Roblox genre?",
      answer:
        topGenre && genreTotal > 0
          ? `${topGenre.genre} is the largest genre among tracked games, with ${compact(topGenre.totalPlaying)} concurrent players (${Math.round((topGenre.totalPlaying / genreTotal) * 100)}% of the tracked total), as of ${stamp}.`
          : "The largest genre by combined concurrent players is shown in the genre breakdown on this page.",
    },
    {
      question: "How much do Roblox games make in total?",
      answer:
        combinedRevenue !== null
          ? `bloxscout estimates the games it tracks gross roughly ${usd(combinedRevenue)} per month combined, as of ${stamp}. This is a low-confidence estimate from platform-average monetization — real totals vary widely and exclude games bloxscout doesn't track.`
          : "bloxscout estimates per-genre and combined monthly revenue from live player counts. The estimate is a low-confidence figure and publishes here as the revenue view refreshes.",
    },
    {
      question: "How many Roblox games does bloxscout track?",
      answer:
        tracked !== null
          ? `bloxscout tracks ${int(tracked)} games as of ${stamp}, discovered from Roblox's explore and search surfaces and snapshotted every 30 minutes. It's a growing sample of the most active games, not the full Roblox catalogue.`
          : "bloxscout tracks a growing sample of the most active Roblox games, snapshotted every 30 minutes.",
    },
  ];

  const graph = buildLandingGraph({ path: PATH, h1: H1, answer, iso, faqs });

  const stats: Array<{ label: string; value: string; note: string }> = [
    {
      label: "Games tracked",
      value: tracked !== null ? int(tracked) : "—",
      note: "most active games, growing",
    },
    {
      label: "Concurrent players",
      value: combinedPlayers !== null ? compact(combinedPlayers) : "—",
      note: "across tracked games",
    },
    {
      label: "Genres tracked",
      value: genresTracked !== null ? int(genresTracked) : "—",
      note: "with live aggregates",
    },
    {
      label: "Est. monthly revenue",
      value: combinedRevenue !== null ? usd(combinedRevenue) : "—",
      note: "bloxscout estimate, tracked set",
    },
  ];

  return (
    <>
      <JsonLd data={graph} />
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
                <li className="text-console-foreground">statistics</li>
              </ol>
            </nav>
            <FreshnessBadge iso={iso} date={date} className="mb-5" />
            <h1 className="max-w-3xl font-heading text-3xl font-semibold leading-[1.12] tracking-tight sm:text-4xl lg:text-[44px]">
              {H1}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-console-foreground/85 sm:text-lg">
              {answer}
            </p>

            <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-console-muted/30 bg-console-foreground/5 p-4"
                >
                  <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-console-muted">
                    {s.label}
                  </dt>
                  <dd className="tabular mt-1 font-heading text-2xl font-semibold text-console-foreground">
                    {s.value}
                  </dd>
                  <dd className="mt-0.5 font-mono text-[10px] text-console-muted">
                    {s.note}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <div className="mx-auto max-w-5xl px-6 py-12">
          <p className="mb-12 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            bloxscout tracks the most active Roblox games — discovered from
            Roblox&rsquo;s public explore and search surfaces and snapshotted
            every 30 minutes since 13 June 2026. The figures below are live for
            that tracked set; they are not Roblox&rsquo;s platform-wide totals,
            and revenue is a low-confidence{" "}
            <strong className="text-foreground">Bloxscout estimate</strong>. See{" "}
            <Link href="/about/methodology" className="underline underline-offset-4 hover:text-foreground">
              the methodology
            </Link>{" "}
            for cadence and error bars.
          </p>

          {/* ---- Biggest games ---- */}
          <section aria-labelledby="biggest-heading" className="mb-16">
            <h2
              id="biggest-heading"
              className="mb-1 font-heading text-2xl font-semibold tracking-tight"
            >
              Biggest Roblox games right now
            </h2>
            <p className="mb-5 text-sm text-muted-foreground">
              Top 10 tracked games by live concurrent players, as of {stamp}.
            </p>
            {topGames.length > 0 ? (
              <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
                <table className="w-full border-collapse text-sm">
                  <caption className="sr-only">
                    Top Roblox games by live concurrent players, measured by
                    bloxscout at {stamp}.
                  </caption>
                  <thead>
                    <tr className="border-b border-border bg-secondary text-left">
                      <th scope="col" className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">#</th>
                      <th scope="col" className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Game</th>
                      <th scope="col" className="px-4 py-3 text-right font-mono text-xs uppercase tracking-wider text-muted-foreground">Players</th>
                      <th scope="col" className="hidden px-4 py-3 text-right font-mono text-xs uppercase tracking-wider text-muted-foreground sm:table-cell">7d</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {topGames.map((e, i) => (
                      <tr key={e.universeId} className="bg-card transition-colors hover:bg-secondary">
                        <td className="tabular px-4 py-3 font-mono text-xs text-muted-foreground">{i + 1}</td>
                        <th scope="row" className="px-4 py-3 text-left font-normal">
                          <Link href={`/game/${e.universeId}/${slugify(e.name)}`} className="font-medium text-foreground underline-offset-4 hover:underline">
                            {displayName(e.name)}
                          </Link>
                        </th>
                        <td className="tabular px-4 py-3 text-right font-mono text-foreground">{int(e.playing)}</td>
                        <td className="tabular hidden px-4 py-3 text-right font-mono text-muted-foreground sm:table-cell">{growthPct(e.growth7dPct)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <ComputingState what="The live leaderboard" />
            )}
            <p className="mt-3 text-sm">
              <Link href="/games" className="font-medium underline underline-offset-4 hover:text-accent">
                See the full top-games leaderboard &rarr;
              </Link>
            </p>
          </section>

          {/* ---- Players by genre ---- */}
          <section aria-labelledby="genre-heading" className="mb-16">
            <h2
              id="genre-heading"
              className="mb-1 font-heading text-2xl font-semibold tracking-tight"
            >
              Roblox players by genre
            </h2>
            <p className="mb-5 text-sm text-muted-foreground">
              Combined live concurrent players per genre, share of the tracked
              total, as of {stamp}.
            </p>
            {genreList.length > 0 && genreTotal > 0 ? (
              <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
                <table className="w-full border-collapse text-sm">
                  <caption className="sr-only">
                    Roblox genres by combined live concurrent players, measured
                    by bloxscout at {stamp}.
                  </caption>
                  <thead>
                    <tr className="border-b border-border bg-secondary text-left">
                      <th scope="col" className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Genre</th>
                      <th scope="col" className="px-4 py-3 text-right font-mono text-xs uppercase tracking-wider text-muted-foreground">Players</th>
                      <th scope="col" className="px-4 py-3 text-right font-mono text-xs uppercase tracking-wider text-muted-foreground">Share</th>
                      <th scope="col" className="hidden px-4 py-3 text-right font-mono text-xs uppercase tracking-wider text-muted-foreground sm:table-cell">Games</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {genreList.map((g) => (
                      <tr key={g.genre} className="bg-card transition-colors hover:bg-secondary">
                        <th scope="row" className="px-4 py-3 text-left font-normal">
                          <Link href={`/genre/${toGenreSlug(g.genre)}`} className="font-medium text-foreground underline-offset-4 hover:underline">
                            {g.genre}
                          </Link>
                        </th>
                        <td className="tabular px-4 py-3 text-right font-mono text-foreground">{compact(g.totalPlaying)}</td>
                        <td className="tabular px-4 py-3 text-right font-mono text-muted-foreground">{Math.round((g.totalPlaying / genreTotal) * 100)}%</td>
                        <td className="tabular hidden px-4 py-3 text-right font-mono text-muted-foreground sm:table-cell">{int(g.gameCount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <ComputingState what="The genre breakdown" />
            )}
          </section>

          {/* ---- Fastest growing ---- */}
          {fastest.length > 0 ? (
            <section aria-labelledby="fastest-heading" className="mb-16">
              <h2
                id="fastest-heading"
                className="mb-1 font-heading text-2xl font-semibold tracking-tight"
              >
                Fastest-growing Roblox games right now
              </h2>
              <p className="mb-5 text-sm text-muted-foreground">
                Biggest 24-hour concurrent-player movers among tracked games.
              </p>
              <ul className="divide-y divide-border rounded-xl ring-1 ring-foreground/10">
                {fastest.map((e, i) => (
                  <li key={e.universeId}>
                    <Link
                      href={`/game/${e.universeId}/${slugify(e.name)}`}
                      className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-secondary"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="tabular w-6 font-mono text-xs text-muted-foreground">{i + 1}</span>
                        <span className="truncate text-sm font-medium text-foreground">{displayName(e.name)}</span>
                      </span>
                      <span className="tabular shrink-0 font-mono text-sm text-accent">{growthPct(e.growth24hPct)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm">
                <Link href="/trending" className="font-medium underline underline-offset-4 hover:text-accent">
                  See all trending games &rarr;
                </Link>
              </p>
            </section>
          ) : null}

          {/* ---- Revenue by genre ---- */}
          {revenueEntries.length > 0 ? (
            <section aria-labelledby="rev-heading" className="mb-16">
              <h2
                id="rev-heading"
                className="mb-1 font-heading text-2xl font-semibold tracking-tight"
              >
                Estimated Roblox creator revenue by genre
              </h2>
              <p className="mb-1 text-sm text-muted-foreground">
                Estimated total monthly revenue per genre across tracked games,
                as of {stamp}.
              </p>
              <p className="mb-5 inline-flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
                Bloxscout estimate
              </p>
              <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
                <table className="w-full border-collapse text-sm">
                  <tbody className="divide-y divide-border">
                    {revenueEntries.slice(0, 8).map((e) => (
                      <tr key={e.genre} className="bg-card">
                        <th scope="row" className="px-4 py-2.5 text-left font-normal">
                          <Link href={`/genre/${toGenreSlug(e.genre)}`} className="font-medium text-foreground underline-offset-4 hover:underline">
                            {e.genre}
                          </Link>
                        </th>
                        <td className="tabular px-4 py-2.5 text-right font-mono text-foreground">{usd(e.estTotalMonthlyUsd)}/mo</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-sm">
                <Link href="/most-profitable-roblox-game-genres" className="font-medium underline underline-offset-4 hover:text-accent">
                  Full genre revenue ranking &rarr;
                </Link>
              </p>
            </section>
          ) : null}

          <AskBloxscout
            heading="Ask bloxscout about Roblox right now"
            blurb="Slice the live data your way — ask which genres are heating up, what's breaking out today, or how the tracked landscape is shifting."
            prompts={[
              "What Roblox genres are growing fastest this week?",
              "Which games broke out in the last 24 hours?",
              "How is the Roblox player base split across genres right now?",
            ]}
          />

          <div className="mb-12 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link href="/games" className="font-medium underline underline-offset-4 hover:text-accent">
              Top games &rarr;
            </Link>
            <Link href="/trending" className="font-medium underline underline-offset-4 hover:text-accent">
              Trending &rarr;
            </Link>
            <Link href="/most-profitable-roblox-game-genres" className="font-medium underline underline-offset-4 hover:text-accent">
              Most profitable genres &rarr;
            </Link>
            <Link href="/about/methodology" className="font-medium underline underline-offset-4 hover:text-accent">
              Methodology &rarr;
            </Link>
          </div>

          <section aria-labelledby="faq-heading" className="mb-4">
            <h2
              id="faq-heading"
              className="mb-5 font-heading text-2xl font-semibold tracking-tight"
            >
              Frequently asked questions
            </h2>
            <dl className="divide-y divide-border rounded-xl ring-1 ring-foreground/10">
              {faqs.map((f) => (
                <div key={f.question} className="px-5 py-4">
                  <dt className="font-heading text-base font-medium text-foreground">
                    {f.question}
                  </dt>
                  <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {f.answer}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
