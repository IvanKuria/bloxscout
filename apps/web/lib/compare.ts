/**
 * Matchup resolution for the head-to-head comparison pages
 * (`/compare/<slugA>-vs-<slugB>`).
 *
 * The URL is keyword-rich (it contains both game slugs, matching queries like
 * "brookhaven rp vs adopt me") but slugs aren't reversible to universe IDs, so
 * we resolve them against the live trending view. Everything degrades the same
 * way the rest of the data layer does: an unresolvable matchup returns `null`
 * and the route 404s, never crashes.
 */
import "server-only";
import { cache } from "react";
import { getTrending } from "@/lib/data";
import { slugify } from "@/lib/format";

const VS = "-vs-";

export interface MatchupGame {
  universeId: number;
  name: string | null;
  playing: number;
}

/**
 * slug -> best game for that slug (highest CCU wins ties), from the trending
 * view. Request-memoized so generateStaticParams / generateMetadata / the page
 * share one build of the index.
 */
const slugIndex = cache(
  async (): Promise<Map<string, MatchupGame>> => {
    const trending = await getTrending();
    const index = new Map<string, MatchupGame>();
    for (const e of trending?.entries ?? []) {
      const slug = slugify(e.name);
      const existing = index.get(slug);
      if (!existing || e.playing > existing.playing) {
        index.set(slug, {
          universeId: e.universeId,
          name: e.name,
          playing: e.playing,
        });
      }
    }
    return index;
  },
);

/**
 * Stable canonical matchup slug for a pair. Ordered by ascending universeId so
 * the canonical URL never flips as live CCU changes (CCU-order would churn the
 * canonical and split SEO signal).
 */
export function canonicalMatchup(
  a: { universeId: number; name: string | null },
  b: { universeId: number; name: string | null },
): string {
  const [lo, hi] = a.universeId <= b.universeId ? [a, b] : [b, a];
  return `${slugify(lo.name)}${VS}${slugify(hi.name)}`;
}

/**
 * Resolve a `<slugA>-vs-<slugB>` matchup string to its two games. Tries every
 * `-vs-` split point (a slug could itself contain "vs"), returning the first
 * split where both sides resolve. `null` if the matchup can't be resolved or
 * names the same game twice.
 */
export const resolveMatchup = cache(
  async (
    matchup: string,
  ): Promise<{ a: MatchupGame; b: MatchupGame } | null> => {
    const index = await slugIndex();
    let from = matchup.indexOf(VS);
    while (from !== -1) {
      const left = matchup.slice(0, from);
      const right = matchup.slice(from + VS.length);
      const a = index.get(left);
      const b = index.get(right);
      if (a && b && a.universeId !== b.universeId) {
        return { a, b };
      }
      from = matchup.indexOf(VS, from + 1);
    }
    return null;
  },
);

/**
 * Build a bounded set of canonical matchups for prerendering: within each
 * genre, pair the top `perGenre` games by CCU. Same-genre matchups are the ones
 * users actually compare ("which tycoon is bigger"), and capping per genre keeps
 * the build from exploding combinatorially. Deduped, ordered, capped.
 */
export const topMatchups = cache(
  async (perGenre = 6, cap = 250): Promise<string[]> => {
    const trending = await getTrending();
    if (!trending) return [];

    const byGenre = new Map<string, MatchupGame[]>();
    for (const e of trending.entries) {
      const genre = e.genre ?? "_";
      const list = byGenre.get(genre) ?? [];
      list.push({ universeId: e.universeId, name: e.name, playing: e.playing });
      byGenre.set(genre, list);
    }

    const seen = new Set<string>();
    for (const list of byGenre.values()) {
      const top = list.sort((a, b) => b.playing - a.playing).slice(0, perGenre);
      for (let i = 0; i < top.length; i++) {
        for (let j = i + 1; j < top.length; j++) {
          seen.add(canonicalMatchup(top[i], top[j]));
          if (seen.size >= cap) return [...seen];
        }
      }
    }
    return [...seen];
  },
);
