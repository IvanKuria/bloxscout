/**
 * Server-side data-access layer for the bloxscout public data pages.
 *
 * Wraps `@bloxscout/core`'s `HostedDataClient` (undici + node:zlib — strictly
 * SERVER-SIDE; never import this from a Client Component). Every helper here
 * degrades gracefully: the hosted dataset is young (~1,600 games, thin history
 * until ~2026-06-20), so any field, history series, or whole view may be
 * missing/`null`. Callers must treat a `null` return as "data not available
 * yet", not as an error.
 *
 * `HostedDataClient` already returns `null` on any network/HTTP/parse failure;
 * we layer React `cache()` on top so a single render (page + generateMetadata +
 * JSON-LD) shares one fetch, and so the build dedupes work across pages.
 */
import "server-only";
import { cache } from "react";
import { genreSlug } from "./format";
import { HostedDataClient } from "@bloxscout/core/hosted-data";
import type {
  GenreRevenueView,
  GenresView,
  MetaFile,
  RankedView,
  RisingNichesView,
  SaturationView,
  SteamBreakoutsView,
  SteamCatalogFile,
  ViewEntry,
} from "@bloxscout/core/hosted-format";

export type {
  ViewEntry,
  RankedView,
  GenresView,
  MetaFile,
  SaturationView,
  RisingNichesView,
  GenreRevenueView,
  SteamBreakoutsView,
  SteamCatalogFile,
};

/** Shared client. Default base URL = the live hosted CDN. */
const client = new HostedDataClient();

// ---------------------------------------------------------------------------
// Raw view loaders (request-memoized)
// ---------------------------------------------------------------------------

export const getMeta = cache((): Promise<MetaFile | null> => client.getMeta());

export const getTrending = cache((): Promise<RankedView | null> =>
  client.getTrendingView(),
);

export const getBreakouts = cache((): Promise<RankedView | null> =>
  client.getBreakoutsView(),
);

export const getUpAndComing = cache((): Promise<RankedView | null> =>
  client.getUpAndComingView(),
);

export const getGenres = cache((): Promise<GenresView | null> =>
  client.getGenresView(),
);

// ---------------------------------------------------------------------------
// v0.3 opportunity views (saturation / rising-niches / genre-revenue)
//
// These three views are NOT on the CDN until this branch merges to `main` and
// the pipeline cron runs. `HostedDataClient` returns `null` on the resulting
// 404 — callers MUST treat `null` as "rankings still computing" and render the
// page shell + AEO metadata + an honest empty state, never crash or fake data.
// ---------------------------------------------------------------------------

export const getSaturation = cache((): Promise<SaturationView | null> =>
  client.getSaturationView(),
);

export const getRisingNiches = cache((): Promise<RisingNichesView | null> =>
  client.getRisingNichesView(),
);

export const getGenreRevenue = cache((): Promise<GenreRevenueView | null> =>
  client.getGenreRevenueView(),
);

// ---------------------------------------------------------------------------
// v2 cross-platform "replicate-this" radar (Steam breakouts + durable catalog)
// Not on the CDN until this branch merges + the cron runs with --steam-radar;
// `null` means "radar still computing" — render the shell + honest empty state.
// ---------------------------------------------------------------------------

export const getSteamBreakouts = cache((): Promise<SteamBreakoutsView | null> =>
  client.getSteamBreakoutsView(),
);

export const getSteamCatalog = cache((): Promise<SteamCatalogFile | null> =>
  client.getSteamCatalog(),
);

/**
 * Resolve a single genre's saturation entry by URL slug. Returns the canonical
 * genre label even when the saturation view itself is missing (so the page can
 * still render a titled empty state), by falling back to the genres/trending
 * views to recover the label. `entry` is `null` when the view isn't published
 * yet or the genre has too little data to score.
 */
export const getSaturationBySlug = cache(
  async (
    slug: string,
  ): Promise<{
    genre: string;
    entry: SaturationView["entries"][number] | null;
  } | null> => {
    const [saturation, genres, trending] = await Promise.all([
      getSaturation(),
      getGenres(),
      getTrending(),
    ]);
    const fromSaturation = saturation?.entries.find(
      (e) => genreSlug(e.genre) === slug,
    );
    if (fromSaturation) {
      return { genre: fromSaturation.genre, entry: fromSaturation };
    }
    // View not published yet (or genre unscored): still resolve the label so
    // the page renders a titled, honest empty state instead of a 404.
    const matchLabel =
      genres?.genres.find((g) => genreSlug(g.genre) === slug)?.genre ??
      trending?.entries.find((e) => e.genre && genreSlug(e.genre) === slug)
        ?.genre ??
      null;
    if (!matchLabel) return null;
    return { genre: matchLabel, entry: null };
  },
);

/**
 * Resolve a genre by its URL slug. Returns the aggregate plus every trending
 * entry in that genre (sorted by live CCU). `null` if the slug matches no
 * genre in the current dataset.
 */
export const getGenreBySlug = cache(
  async (
    slug: string,
  ): Promise<{
    genre: string;
    aggregate: GenresView["genres"][number] | null;
    games: ViewEntry[];
  } | null> => {
    const [genres, trending] = await Promise.all([getGenres(), getTrending()]);
    // Find the canonical genre label whose slug matches.
    const matchLabel =
      genres?.genres.find((g) => genreSlug(g.genre) === slug)?.genre ??
      trending?.entries.find((e) => e.genre && genreSlug(e.genre) === slug)
        ?.genre ??
      null;
    if (!matchLabel) return null;
    const games = (trending?.entries ?? [])
      .filter((e) => e.genre === matchLabel)
      .sort((a, b) => b.playing - a.playing);
    const aggregate =
      genres?.genres.find((g) => g.genre === matchLabel) ?? null;
    return { genre: matchLabel, aggregate, games };
  },
);

export const getGameHistory = cache((universeId: number) =>
  client.getGameHistory(universeId),
);

/** Full hosted game registry (per-game age + dev ship cadence). `null` when unavailable. */
export const getRegistry = cache(() => client.getRegistry());

/** One game's registry entry (createdAt, updateCount, lastUpdatedAt). `null` when absent. */
export const getRegistryEntry = cache((universeId: number) =>
  client.getRegistryEntry(universeId),
);

// ---------------------------------------------------------------------------
// Freshness
// ---------------------------------------------------------------------------

/**
 * Best-available "data generated at" timestamp as a Date. Falls back through
 * the trending view, then to `now` so pages always render a coherent badge.
 * `isStale` lets callers soften copy when the dataset hasn't refreshed.
 */
export interface Freshness {
  /** The dataset's "generated at" moment as a Date (alias: `date`). */
  generatedAt: Date;
  /** Alias of `generatedAt` for ergonomic destructuring in pages. */
  date: Date;
  /** ISO string for `<time datetime>` / JSON-LD `dateModified`. */
  iso: string;
  /** True when we had to fall back to `now` (no upstream timestamp). */
  fallback: boolean;
}

function freshnessFrom(d: Date, fallback: boolean): Freshness {
  return { generatedAt: d, date: d, iso: d.toISOString(), fallback };
}

export async function getFreshness(): Promise<Freshness> {
  const meta = await getMeta();
  const fromMeta = meta?.generatedAt ?? null;
  if (fromMeta) {
    const d = new Date(fromMeta);
    if (!Number.isNaN(d.getTime())) return freshnessFrom(d, false);
  }
  const trending = await getTrending();
  if (trending?.generatedAt) {
    const d = new Date(trending.generatedAt);
    if (!Number.isNaN(d.getTime())) return freshnessFrom(d, false);
  }
  return freshnessFrom(new Date(), true);
}

// ---------------------------------------------------------------------------
// Per-game snapshot
// ---------------------------------------------------------------------------

/**
 * Everything the per-game page needs, assembled from the trending view (live
 * CCU, growth, genre, z-score) + the per-game history shard (absolute visits /
 * favorites, which the views don't carry). Any of these may be `null`.
 */
export interface GameSnapshot {
  universeId: number;
  name: string | null;
  genre: string | null;
  playing: number;
  avg24h: number | null;
  peak24h: number | null;
  growth24hPct: number | null;
  growth7dPct: number | null;
  zScore24h: number | null;
  /** Latest absolute all-time visits, from the newest history point. */
  visits: number | null;
  /** Latest favorited count, from the newest history point. */
  favorites: number | null;
  /** Sparkline series: [epochMs, avgPlaying] points (may be empty). */
  history: Array<{ t: number; avg: number; peak: number }>;
  /** This game's rank within the trending view (1-based) or null. */
  rank: number | null;
}

/** Find a game's entry in the trending view by universe id. */
export const getViewEntry = cache(
  async (universeId: number): Promise<{ entry: ViewEntry; rank: number } | null> => {
    const trending = await getTrending();
    if (!trending) return null;
    const idx = trending.entries.findIndex((e) => e.universeId === universeId);
    if (idx === -1) return null;
    return { entry: trending.entries[idx], rank: idx + 1 };
  },
);

export const getGameSnapshot = cache(
  async (universeId: number): Promise<GameSnapshot | null> => {
    const found = await getViewEntry(universeId);
    if (!found) return null;
    const { entry, rank } = found;

    const history = await getGameHistory(universeId);
    const hourly = history?.hourly ?? [];
    // History points: [epochMs, avgPlaying, peakPlaying, visits, favoritedCount]
    const points = hourly
      .map((p) => ({ t: p[0], avg: p[1], peak: p[2], visits: p[3], fav: p[4] }))
      .sort((a, b) => a.t - b.t);
    const latest = points.length > 0 ? points[points.length - 1] : null;

    return {
      universeId: entry.universeId,
      name: entry.name,
      genre: entry.genre,
      playing: entry.playing,
      avg24h: entry.avg24h,
      peak24h: entry.peak24h,
      growth24hPct: entry.growth24hPct,
      growth7dPct: entry.growth7dPct,
      zScore24h: entry.zScore24h,
      visits: latest?.visits ?? null,
      favorites: latest?.fav ?? null,
      history: points.map((p) => ({ t: p.t, avg: p.avg, peak: p.peak })),
      rank,
    };
  },
);

/**
 * Top related games: same genre, by live CCU, excluding the game itself.
 * Returns up to `limit`. Empty array if no genre / no view.
 */
export const getRelatedGames = cache(
  async (universeId: number, genre: string | null, limit = 5): Promise<ViewEntry[]> => {
    if (!genre) return [];
    const trending = await getTrending();
    if (!trending) return [];
    return trending.entries
      .filter((e) => e.universeId !== universeId && e.genre === genre)
      .sort((a, b) => b.playing - a.playing)
      .slice(0, limit);
  },
);
