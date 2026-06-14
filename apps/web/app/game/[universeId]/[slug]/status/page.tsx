/**
 * Per-game activity / status page — `/game/[universeId]/[slug]/status`.
 *
 * Captures the high-volume "is <game> dead" / "is <game> still popular" query
 * with its own URL/H1/canonical. Reads bloxscout's live snapshot (CCU, 24h/7d
 * growth, z-score, history) into an honest activity verdict + trend line.
 *
 * The dataset is young (tracking began 2026-06-13), so 7-day trend is often
 * null — the verdict degrades to "still active, trend computing" rather than
 * over-claiming a game is dead on thin data.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SiteHeader } from "@/components/sections/site-header";
import { SiteFooter } from "@/components/sections/site-footer";
import { JsonLd } from "@/components/seo/json-ld";
import { ConsolePanel, FreshnessBadge } from "@/components/data/console";
import { Sparkline } from "@/components/data/sparkline";
import { AskBloxscout } from "@/components/cta/ask-bloxscout";
import { buildLandingGraph, type LandingFaq } from "@/app/_money/landing";
import {
  getFreshness,
  getGameSnapshot,
  getTrending,
  type GameSnapshot,
} from "@/lib/data";
import {
  dec,
  displayName,
  genreSlug as toGenreSlug,
  growthPct,
  int,
  slugify,
  utcStamp,
} from "@/lib/format";
import { site } from "@/lib/site";

export const revalidate = 1800;
export const dynamicParams = true;

const STATIC_PARAMS_CAP = 250;

export async function generateStaticParams(): Promise<
  Array<{ universeId: string; slug: string }>
> {
  const trending = await getTrending();
  if (!trending) return [];
  return [...trending.entries]
    .sort((a, b) => b.playing - a.playing)
    .slice(0, STATIC_PARAMS_CAP)
    .map((e) => ({ universeId: String(e.universeId), slug: slugify(e.name) }));
}

interface PageProps {
  params: Promise<{ universeId: string; slug: string }>;
}

interface Status {
  /** Short verdict label, e.g. "Growing", "Declining". */
  label: string;
  /** True when the verdict is healthy (growing/steady/active). */
  healthy: boolean;
  /** Highest peak we can see (recent history peak, else 24h peak). */
  recentPeak: number | null;
  /** Current CCU as a fraction of recent peak (1 = at peak). */
  vsPeak: number | null;
  /** The trend fraction actually used (7d if present, else 24h). */
  trend: number | null;
  /** Whether the trend came from the more reliable 7d window. */
  trendIs7d: boolean;
}

function computeStatus(s: GameSnapshot): Status {
  const peaks = s.history.map((p) => p.peak).filter((n) => Number.isFinite(n));
  const recentPeak =
    peaks.length > 0
      ? Math.max(...peaks)
      : (s.peak24h ?? s.avg24h ?? (s.playing > 0 ? s.playing : null));
  const vsPeak =
    recentPeak && recentPeak > 0 ? s.playing / recentPeak : null;

  const trend = s.growth7dPct ?? s.growth24hPct ?? null;
  const trendIs7d = s.growth7dPct !== null;

  let label: string;
  let healthy: boolean;
  if (trend === null) {
    label = "Active";
    healthy = true;
  } else if (s.playing < 50 && trend < 0) {
    label = "Barely active";
    healthy = false;
  } else if (trend >= 0.1) {
    label = "Growing";
    healthy = true;
  } else if (trend >= -0.05) {
    label = "Holding steady";
    healthy = true;
  } else if (trend >= -0.25) {
    label = "Cooling off";
    healthy = false;
  } else {
    label = "Declining";
    healthy = false;
  }

  return { label, healthy, recentPeak, vsPeak, trend, trendIs7d };
}

function buildAnswer(s: GameSnapshot, name: string, st: Status, stamp: string): string {
  const lead = st.healthy
    ? `No — ${name} is still active`
    : `${name} is losing momentum, but it isn't gone`;
  const players = ` with ${int(s.playing)} concurrent players as of ${stamp}.`;
  const verdict = ` bloxscout's read: ${st.label.toLowerCase()}.`;
  const window = st.trendIs7d ? "7 days" : "24 hours";
  const trend =
    st.trend !== null
      ? ` Player count is ${growthPct(st.trend)} over the past ${window}.`
      : " A longer trend is still computing as snapshot history accumulates.";
  return `${lead}${players}${verdict}${trend} Refreshed every 30 minutes.`;
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
  const canonical = `${site.url}/game/${snapshot.universeId}/${slug}/status`;
  const { date } = await getFreshness();
  const st = computeStatus(snapshot);
  const title = `Is ${name} dead? — live player count & activity`;
  const description = `Is ${name} dead or still popular on Roblox? It has ${int(snapshot.playing)} concurrent players as of ${utcStamp(date)} — bloxscout's read: ${st.label.toLowerCase()}. Live activity, 24h/7d trend and peak.`;
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

export default async function GameStatusPage({ params }: PageProps) {
  const { universeId, slug } = await params;
  const id = Number(universeId);
  if (!Number.isFinite(id) || id <= 0) notFound();

  const snapshot = await getGameSnapshot(id);
  if (!snapshot) notFound();

  const name = displayName(snapshot.name);
  const canonicalSlug = slugify(snapshot.name);
  if (slug !== canonicalSlug) {
    redirect(`/game/${snapshot.universeId}/${canonicalSlug}/status`);
  }

  const { date, iso } = await getFreshness();
  const stamp = utcStamp(date);
  const path = `/game/${snapshot.universeId}/${canonicalSlug}/status`;
  const gamePath = `/game/${snapshot.universeId}/${canonicalSlug}`;
  const genreSlug = snapshot.genre ? toGenreSlug(snapshot.genre) : null;

  const st = computeStatus(snapshot);
  const answer = buildAnswer(snapshot, name, st, stamp);
  const h1 = `Is ${name} dead, or still active?`;
  const vsPeakPct = st.vsPeak !== null ? Math.round(st.vsPeak * 100) : null;

  const rows: Array<{ label: string; value: string }> = [
    { label: "Concurrent players now", value: `${int(snapshot.playing)} players` },
    { label: "24-hour average", value: `${int(snapshot.avg24h)} players` },
    { label: "24-hour peak", value: `${int(snapshot.peak24h)} players` },
    {
      label: "Recent peak",
      value: st.recentPeak !== null ? `${int(st.recentPeak)} players` : "—",
    },
    {
      label: "Now vs recent peak",
      value: vsPeakPct !== null ? `${vsPeakPct}%` : "—",
    },
    { label: "24-hour growth", value: growthPct(snapshot.growth24hPct) },
    { label: "7-day growth", value: growthPct(snapshot.growth7dPct) },
    {
      label: "Anomaly z-score (24h)",
      value: snapshot.zScore24h !== null ? `${dec(snapshot.zScore24h)} σ` : "—",
    },
    {
      label: "Trending rank",
      value: snapshot.rank !== null ? `#${snapshot.rank}` : "—",
    },
  ];

  const faqs: LandingFaq[] = [
    {
      question: `Is ${name} dead?`,
      answer: st.healthy
        ? `No. ${name} has ${int(snapshot.playing)} concurrent players on Roblox as of ${stamp} — bloxscout reads it as ${st.label.toLowerCase()}, not dead.`
        : `${name} is ${st.label.toLowerCase()}: ${int(snapshot.playing)} concurrent players as of ${stamp}${st.trend !== null ? `, ${growthPct(st.trend)} over the past ${st.trendIs7d ? "7 days" : "24 hours"}` : ""}. Still playable, but trending down by bloxscout's read.`,
    },
    {
      question: `Is ${name} still popular?`,
      answer: `${name} currently has ${int(snapshot.playing)} concurrent players${snapshot.rank !== null ? ` and ranks #${snapshot.rank} on bloxscout's trending board` : ""}, as of ${stamp}. Popularity is relative — compare it against other games on its genre page.`,
    },
    {
      question: `Is ${name} gaining or losing players?`,
      answer:
        st.trend !== null
          ? `Over the past ${st.trendIs7d ? "7 days" : "24 hours"}, ${name}'s concurrent players moved ${growthPct(st.trend)}. bloxscout refreshes this every 30 minutes.`
          : `bloxscout began tracking on 13 June 2026, so ${name}'s longer-term trend is still accumulating. The 24-hour figure is the most reliable signal for now.`,
    },
    {
      question: `What is ${name}'s peak player count?`,
      answer:
        st.recentPeak !== null
          ? `The highest concurrent player count bloxscout has recorded for ${name} is about ${int(st.recentPeak)}. Peak history deepens as snapshots accumulate.`
          : `bloxscout hasn't accumulated enough history to report a reliable peak for ${name} yet.`,
    },
  ];

  const graph = buildLandingGraph({ path, h1, answer, iso, faqs });

  return (
    <>
      <JsonLd data={graph} />
      <SiteHeader />
      <main className="flex-1">
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
                <li aria-hidden>/</li>
                <li>
                  <Link href={gamePath} className="hover:text-console-foreground">
                    {name}
                  </Link>
                </li>
                <li aria-hidden>/</li>
                <li className="text-console-foreground">status</li>
              </ol>
            </nav>

            <FreshnessBadge iso={iso} date={date} className="mb-5" />

            <h1 className="max-w-3xl font-heading text-3xl font-semibold leading-[1.1] tracking-tight text-console-foreground sm:text-4xl lg:text-[44px]">
              {h1}
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-relaxed text-console-foreground/85 sm:text-lg">
              {answer}
            </p>

            <div className="mt-8 grid gap-6 sm:grid-cols-[auto_1fr] sm:items-end">
              <div
                className={`rounded-xl border p-4 ${st.healthy ? "border-accent/50 bg-accent/10" : "border-console-muted/40 bg-console-foreground/5"}`}
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-console-muted">
                  bloxscout verdict
                </p>
                <p
                  className={`mt-1 font-heading text-2xl font-semibold ${st.healthy ? "text-accent" : "text-console-foreground"}`}
                >
                  {st.label}
                </p>
              </div>
              <dl className="grid grid-cols-2 gap-x-8 gap-y-3 sm:max-w-md sm:justify-self-end">
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-console-muted">
                    Playing now
                  </dt>
                  <dd className="tabular font-mono text-lg text-console-foreground">
                    {int(snapshot.playing)}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-console-muted">
                    Now vs peak
                  </dt>
                  <dd className="tabular font-mono text-lg text-console-foreground">
                    {vsPeakPct !== null ? `${vsPeakPct}%` : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-console-muted">
                    {st.trendIs7d ? "7-day" : "24-hour"} trend
                  </dt>
                  <dd className="tabular font-mono text-lg text-console-foreground">
                    {growthPct(st.trend)}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-console-muted">
                    Trending rank
                  </dt>
                  <dd className="tabular font-mono text-lg text-console-foreground">
                    {snapshot.rank !== null ? `#${snapshot.rank}` : "—"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
          {/* ---- Trend chart ---- */}
          <section aria-labelledby="trend-heading" className="mb-16">
            <h2
              id="trend-heading"
              className="mb-1 font-heading text-2xl font-semibold tracking-tight"
            >
              {name} player count trend
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
            </ConsolePanel>
          </section>

          {/* ---- Activity signals ---- */}
          <section aria-labelledby="signals-heading" className="mb-16">
            <h2
              id="signals-heading"
              className="mb-1 font-heading text-2xl font-semibold tracking-tight"
            >
              {name} activity signals
            </h2>
            <p className="mb-5 text-sm text-muted-foreground">
              The live figures behind the verdict, measured at {stamp}.
            </p>
            <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
              <table className="w-full border-collapse text-sm">
                <caption className="sr-only">
                  Live activity signals for {name}, measured by bloxscout at{" "}
                  {stamp}.
                </caption>
                <tbody className="divide-y divide-border">
                  {rows.map((r) => (
                    <tr key={r.label} className="bg-card">
                      <th scope="row" className="px-4 py-2.5 text-left font-normal text-foreground">
                        {r.label}
                      </th>
                      <td className="tabular px-4 py-2.5 text-right font-mono text-foreground">
                        {r.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              &ldquo;{st.label}&rdquo; is a bloxscout read from live data, not an
              official Roblox status. Fields showing &ldquo;—&rdquo; are still
              accumulating history.{" "}
              <Link href="/about/methodology" className="underline underline-offset-4 hover:text-foreground">
                Methodology
              </Link>
              .
            </p>
          </section>

          <AskBloxscout
            heading={`Ask bloxscout about ${name}`}
            blurb={`Get the why behind the verdict — ask whether ${name} is recovering, when it peaked, and how its activity compares to rivals, from live data.`}
            prompts={[
              `Is ${name} recovering or still declining?`,
              `When did ${name} peak, and how far off is it now?`,
              snapshot.genre
                ? `How does ${name}'s activity compare to other ${snapshot.genre} games?`
                : `What games are taking ${name}'s players?`,
            ]}
          />

          <div className="mb-12 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link
              href={gamePath}
              className="font-medium underline underline-offset-4 hover:text-accent"
            >
              {name} full stats &rarr;
            </Link>
            <Link
              href={`${gamePath}/revenue`}
              className="font-medium underline underline-offset-4 hover:text-accent"
            >
              {name} revenue estimate &rarr;
            </Link>
            {genreSlug ? (
              <Link
                href={`/genre/${genreSlug}`}
                className="font-medium underline underline-offset-4 hover:text-accent"
              >
                Top {snapshot.genre} games &rarr;
              </Link>
            ) : null}
            <Link
              href="/trending"
              className="font-medium underline underline-offset-4 hover:text-accent"
            >
              Trending games &rarr;
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
