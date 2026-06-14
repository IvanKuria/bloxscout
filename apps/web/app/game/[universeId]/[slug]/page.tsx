import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { estimateGameRevenue } from "@bloxscout/core/calculators";
import { SiteHeader } from "@/components/sections/site-header";
import { SiteFooter } from "@/components/sections/site-footer";
import { JsonLd } from "@/components/seo/json-ld";
import {
  ConsolePanel,
  FreshnessBadge,
  GrowthChip,
  LiveCcu,
} from "@/components/data/console";
import { Sparkline } from "@/components/data/sparkline";
import {
  getFreshness,
  getGameSnapshot,
  getRelatedGames,
  getTrending,
  type GameSnapshot,
} from "@/lib/data";
import {
  compact,
  dec,
  displayName,
  genreSlug as toGenreSlug,
  growthPct,
  int,
  slugify,
  usd,
  utcStamp,
} from "@/lib/format";
import { buildGameFaqs, buildGameGraph } from "@/lib/game-jsonld";
import { site } from "@/lib/site";

// ISR: re-render at most every 30 minutes, matching the pipeline cadence.
export const revalidate = 1800;
// Allow games beyond the prerendered cap to render on first visit (then cache).
export const dynamicParams = true;

/** v1 cap: prerender the top games by current CCU to keep builds sane. */
const STATIC_PARAMS_CAP = 800;

export async function generateStaticParams(): Promise<
  Array<{ universeId: string; slug: string }>
> {
  const trending = await getTrending();
  if (!trending) {
    console.warn(
      "[game/generateStaticParams] trending view unavailable — prerendering 0 game pages (will render on-demand via ISR)",
    );
    return [];
  }
  const ranked = [...trending.entries].sort((a, b) => b.playing - a.playing);
  const capped = ranked.slice(0, STATIC_PARAMS_CAP);
  console.log(
    `[game/generateStaticParams] prerendering ${capped.length} of ${trending.entries.length} game pages (cap ${STATIC_PARAMS_CAP}, by live CCU)`,
  );
  return capped.map((e) => ({
    universeId: String(e.universeId),
    slug: slugify(e.name),
  }));
}

interface PageProps {
  params: Promise<{ universeId: string; slug: string }>;
}

/** Monthly revenue estimate (USD) or null when there's no CCU to model. */
function monthlyRevenueUsd(snapshot: GameSnapshot): number | null {
  if (!Number.isFinite(snapshot.playing) || snapshot.playing <= 0) return null;
  const est = estimateGameRevenue({
    playing: snapshot.playing,
    visits: snapshot.visits ?? 0,
  });
  return est.estimatedMonthlyUsd;
}

/** Self-contained 40-60 word answer paragraph. */
function buildAnswer(snapshot: GameSnapshot, name: string, stamp: string): string {
  const trend =
    snapshot.growth7dPct !== null
      ? ` Over the past 7 days its player count moved ${growthPct(snapshot.growth7dPct)}.`
      : "";
  const peak =
    snapshot.peak24h !== null
      ? ` Its 24-hour peak was ${int(snapshot.peak24h)} players.`
      : "";
  return `${name} has ${int(snapshot.playing)} concurrent players on Roblox right now, as of ${stamp}.${peak}${trend} bloxscout reads this directly from Roblox's public API and refreshes it every 30 minutes.`;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { universeId } = await params;
  const id = Number(universeId);
  const snapshot = Number.isFinite(id) ? await getGameSnapshot(id) : null;
  if (!snapshot) {
    return { title: "Game not found", robots: { index: false, follow: true } };
  }
  const name = displayName(snapshot.name);
  const slug = slugify(snapshot.name);
  const canonical = `${site.url}/game/${snapshot.universeId}/${slug}`;
  const { date } = await getFreshness();
  const title = `${name} live player count — ${int(snapshot.playing)} playing now`;
  const description = `How many players are playing ${name} on Roblox right now? ${int(snapshot.playing)} concurrent players as of ${utcStamp(date)}, refreshed every 30 minutes. Live CCU, 24h peak, growth, genre and revenue estimate.`;
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

export default async function GamePage({ params }: PageProps) {
  const { universeId, slug } = await params;
  const id = Number(universeId);
  if (!Number.isFinite(id) || id <= 0) notFound();

  const snapshot = await getGameSnapshot(id);
  if (!snapshot) notFound();

  const name = displayName(snapshot.name);
  const canonicalSlug = slugify(snapshot.name);
  // Canonicalize: if the slug in the URL doesn't match the derived one, 308 to it.
  if (slug !== canonicalSlug) {
    redirect(`/game/${snapshot.universeId}/${canonicalSlug}`);
  }

  const { date, iso } = await getFreshness();
  const stamp = utcStamp(date);
  const genreSlug = snapshot.genre ? toGenreSlug(snapshot.genre) : null;
  const answer = buildAnswer(snapshot, name, stamp);
  const revenueUsd = monthlyRevenueUsd(snapshot);
  const related = await getRelatedGames(id, snapshot.genre, 5);
  const faqs = buildGameFaqs(snapshot, name, stamp, revenueUsd);

  const graph = buildGameGraph({
    snapshot,
    name,
    slug: canonicalSlug,
    genreSlug,
    iso,
    date,
    answer,
    faqs,
  });

  const est =
    revenueUsd !== null
      ? estimateGameRevenue({ playing: snapshot.playing, visits: snapshot.visits ?? 0 })
      : null;

  return (
    <>
      <JsonLd data={graph} />
      <SiteHeader />
      <main className="flex-1">
        {/* ---- Answer-first hero on the recon console surface ---- */}
        <section className="border-b border-border bg-console text-console-foreground">
          <div className="mx-auto max-w-5xl px-6 pt-10 pb-12 sm:pt-14">
            <nav
              aria-label="Breadcrumb"
              className="mb-6 font-mono text-xs text-console-muted"
            >
              <ol className="flex flex-wrap items-center gap-1.5">
                <li>
                  <Link href="/" className="hover:text-console-foreground">
                    bloxscout
                  </Link>
                </li>
                <li aria-hidden>/</li>
                <li>
                  <Link href="/games" className="hover:text-console-foreground">
                    games
                  </Link>
                </li>
                {snapshot.genre && genreSlug ? (
                  <>
                    <li aria-hidden>/</li>
                    <li>
                      <Link
                        href={`/genre/${genreSlug}`}
                        className="hover:text-console-foreground"
                      >
                        {snapshot.genre}
                      </Link>
                    </li>
                  </>
                ) : null}
                <li aria-hidden>/</li>
                <li className="text-console-foreground">{name}</li>
              </ol>
            </nav>

            <FreshnessBadge iso={iso} date={date} className="mb-5" />

            <h1 className="max-w-3xl font-heading text-3xl font-semibold leading-[1.1] tracking-tight text-console-foreground sm:text-4xl lg:text-[44px]">
              How many players are playing {name} right now?
            </h1>

            {/* Self-contained 40-60 word answer, before any nav/ads. */}
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-console-foreground/85 sm:text-lg">
              {answer}
            </p>

            <div className="mt-8 grid gap-6 sm:grid-cols-[auto_1fr] sm:items-end">
              <LiveCcu playing={snapshot.playing} />
              <dl className="grid grid-cols-2 gap-x-8 gap-y-3 sm:max-w-md sm:justify-self-end">
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-console-muted">
                    24h peak
                  </dt>
                  <dd className="tabular font-mono text-lg text-console-foreground">
                    {int(snapshot.peak24h)}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-console-muted">
                    7-day growth
                  </dt>
                  <dd className="text-lg">
                    <GrowthChip ratio={snapshot.growth7dPct} />
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-console-muted">
                    Genre
                  </dt>
                  <dd className="font-mono text-sm text-console-foreground">
                    {snapshot.genre ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-console-muted">
                    Trending rank
                  </dt>
                  <dd className="tabular font-mono text-sm text-console-foreground">
                    {snapshot.rank !== null ? `#${snapshot.rank}` : "—"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
          {/* ---- Full stat block (semantic table) ---- */}
          <section aria-labelledby="stats-heading" className="mb-16">
            <h2
              id="stats-heading"
              className="mb-1 font-heading text-2xl font-semibold tracking-tight"
            >
              {name} player statistics
            </h2>
            <p className="mb-5 text-sm text-muted-foreground">
              Every figure below is measured by bloxscout and timestamped to the
              same {utcStamp(date)} snapshot.
            </p>

            <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
              <table className="w-full border-collapse text-sm">
                <caption className="sr-only">
                  Live and 24-hour Roblox statistics for {name} (universe{" "}
                  {snapshot.universeId}), measured by bloxscout at {stamp}.
                </caption>
                <thead>
                  <tr className="border-b border-border bg-secondary text-left">
                    <th
                      scope="col"
                      className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground"
                    >
                      Metric
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-right font-mono text-xs uppercase tracking-wider text-muted-foreground"
                    >
                      Value
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground"
                    >
                      As of
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <StatRow label="Concurrent players (CCU)" value={`${int(snapshot.playing)} players`} stamp={stamp} />
                  <StatRow label="24-hour average" value={`${int(snapshot.avg24h)} players`} stamp={stamp} />
                  <StatRow label="24-hour peak" value={`${int(snapshot.peak24h)} players`} stamp={stamp} />
                  <StatRow label="All-time visits" value={snapshot.visits !== null ? `${int(snapshot.visits)} visits` : "—"} stamp={stamp} />
                  <StatRow label="Favorites" value={snapshot.favorites !== null ? `${int(snapshot.favorites)} favorites` : "—"} stamp={stamp} />
                  <StatRow label="24-hour growth" value={growthPct(snapshot.growth24hPct)} stamp={stamp} />
                  <StatRow label="7-day growth" value={growthPct(snapshot.growth7dPct)} stamp={stamp} />
                  <StatRow label="Genre" value={snapshot.genre ?? "—"} stamp={stamp} />
                  <StatRow
                    label="Anomaly z-score (24h)"
                    value={snapshot.zScore24h !== null ? `${dec(snapshot.zScore24h)} σ` : "—"}
                    stamp={stamp}
                  />
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Fields showing &ldquo;—&rdquo; have not accumulated enough
              snapshot history yet. bloxscout began tracking on 13 June 2026; see{" "}
              <Link
                href="/about/methodology"
                className="underline underline-offset-4 hover:text-foreground"
              >
                the methodology
              </Link>{" "}
              for error bars and cadence.
            </p>
          </section>

          {/* ---- History / trend ---- */}
          <section aria-labelledby="history-heading" className="mb-16">
            <h2
              id="history-heading"
              className="mb-1 font-heading text-2xl font-semibold tracking-tight"
            >
              {name} player count history &amp; trend
            </h2>
            <p className="mb-5 text-sm text-muted-foreground">
              Concurrent players over time, from bloxscout&rsquo;s rolling
              30-minute snapshots.
            </p>
            <ConsolePanel label="CCU · avg" className="p-5">
              <Sparkline
                points={snapshot.history}
                label={`${name} concurrent player history`}
              />
              {snapshot.history.length >= 2 ? (
                <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 font-mono text-xs text-console-muted">
                  <span>
                    {snapshot.history.length} snapshots ·{" "}
                    {compact(Math.min(...snapshot.history.map((p) => p.avg)))} –{" "}
                    {compact(Math.max(...snapshot.history.map((p) => p.peak)))}{" "}
                    players
                  </span>
                </div>
              ) : null}
            </ConsolePanel>
          </section>

          {/* ---- Revenue estimate ---- */}
          <section aria-labelledby="revenue-heading" className="mb-16">
            <h2
              id="revenue-heading"
              className="mb-1 font-heading text-2xl font-semibold tracking-tight"
            >
              How much money does {name} make on Roblox?
            </h2>
            {est && revenueUsd !== null ? (
              <>
                <p className="mb-5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Based on {int(snapshot.playing)} concurrent players and
                  platform-average monetization, bloxscout estimates{" "}
                  <strong className="text-foreground">{name}</strong> grosses
                  roughly{" "}
                  <strong className="text-foreground">{usd(revenueUsd)}</strong>{" "}
                  per month.
                </p>
                <div className="rounded-xl border border-accent/30 bg-accent/5 p-5">
                  <p className="mb-3 inline-flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-accent">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
                    Bloxscout estimate
                  </p>
                  <dl className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
                    <div>
                      <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                        Est. monthly revenue
                      </dt>
                      <dd className="tabular font-mono text-lg text-foreground">
                        {usd(revenueUsd)}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                        Est. monthly Robux
                      </dt>
                      <dd className="tabular font-mono text-lg text-foreground">
                        {int(est.estimatedMonthlyRobux)} R$
                      </dd>
                    </div>
                    <div>
                      <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                        Confidence
                      </dt>
                      <dd className="font-mono text-lg capitalize text-foreground">
                        {est.confidence}
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-4 max-w-2xl text-xs leading-relaxed text-muted-foreground">
                    {est.disclaimer} Assumptions:{" "}
                    {est.assumptions.slice(0, 3).join("; ")}. See{" "}
                    <Link
                      href="/about/methodology"
                      className="underline underline-offset-4 hover:text-foreground"
                    >
                      methodology
                    </Link>
                    .
                  </p>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                A revenue estimate is not available for {name} without a current
                player count.
              </p>
            )}
          </section>

          {/* ---- Related games (internal links) ---- */}
          {related.length > 0 ? (
            <section aria-labelledby="related-heading" className="mb-16">
              <h2
                id="related-heading"
                className="mb-5 font-heading text-2xl font-semibold tracking-tight"
              >
                Top {snapshot.genre} games by player count
              </h2>
              <ul className="divide-y divide-border rounded-xl ring-1 ring-foreground/10">
                {related.map((g, i) => (
                  <li key={g.universeId}>
                    <Link
                      href={`/game/${g.universeId}/${slugify(g.name)}`}
                      className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-secondary"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="tabular w-6 font-mono text-xs text-muted-foreground">
                          {i + 1}
                        </span>
                        <span className="truncate text-sm font-medium text-foreground">
                          {displayName(g.name)}
                        </span>
                      </span>
                      <span className="tabular shrink-0 font-mono text-sm text-muted-foreground">
                        {int(g.playing)} playing
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              {genreSlug ? (
                <p className="mt-3 text-sm">
                  <Link
                    href={`/genre/${genreSlug}`}
                    className="font-medium underline underline-offset-4 hover:text-accent"
                  >
                    See all {snapshot.genre} games &rarr;
                  </Link>
                </p>
              ) : null}
            </section>
          ) : null}

          {/* ---- FAQ ---- */}
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

function StatRow({
  label,
  value,
  stamp,
}: {
  label: string;
  value: string;
  stamp: string;
}) {
  return (
    <tr className="bg-card">
      <th scope="row" className="px-4 py-2.5 text-left font-normal text-foreground">
        {label}
      </th>
      <td className="tabular px-4 py-2.5 text-right font-mono text-foreground">
        {value}
      </td>
      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
        {stamp}
      </td>
    </tr>
  );
}
