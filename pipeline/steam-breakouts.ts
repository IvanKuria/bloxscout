/**
 * Cross-platform "replicate-this" radar stage.
 *
 * Pulls candidate external games (Steam featured/trending), enriches each into
 * an observation, computes virality velocity against the prior run's state, and
 * produces three artifacts:
 *   - the transient ranked breakouts VIEW (top games to clone right now),
 *   - the next STATE file (prior totals, so the next run can compute velocity),
 *   - the accumulating CATALOG (durable, powers /roblox-version-of/[slug]).
 *
 * Velocity needs two observations; on first sight we fall back to a launch-to-
 * date approximation and flag `observationBasis: "first-seen"`.
 */
import type { ExternalGameObservation, ExternalSource } from "@bloxscout/core/external-sources";
import type {
  SteamBreakoutEntry,
  SteamBreakoutsView,
  SteamCatalogEntry,
  SteamCatalogFile,
  SteamStateFile,
} from "@bloxscout/core/hosted-format";
import { computeVirality } from "@bloxscout/core/steam-virality";

const SCHEMA_VERSION = 1;
const DAY_MS = 86_400_000;
/** Max entries in the transient ranked view. */
const DEFAULT_VIEW_LIMIT = 50;
/** Drop state for apps not re-observed within this window (keeps state bounded). */
const STATE_PRUNE_DAYS = 45;

const DISCLAIMER =
  "Trend signals from Steam (review velocity, players, recency). Owner counts are " +
  "estimate bands; first-seen velocity is launch-to-date and sharpens after a second run. " +
  "Move fast — the window to ship a Roblox version is days, not months.";

export interface ComputeSteamBreakoutsInput {
  source: ExternalSource;
  priorState: SteamStateFile | null;
  priorCatalog: SteamCatalogFile | null;
  /** Epoch ms for this run (injected for determinism/testability). */
  now: number;
  /** Max candidates to enrich this run (rate-limit guard). */
  enrichLimit?: number;
  /** Max entries kept in the ranked view. */
  viewLimit?: number;
}

export interface ComputeSteamBreakoutsResult {
  view: SteamBreakoutsView;
  nextState: SteamStateFile;
  catalog: SteamCatalogFile;
}

export async function computeSteamBreakouts(
  input: ComputeSteamBreakoutsInput,
): Promise<ComputeSteamBreakoutsResult> {
  const { source, priorState, priorCatalog, now } = input;
  const viewLimit = input.viewLimit ?? DEFAULT_VIEW_LIMIT;
  const nowIso = new Date(now).toISOString();

  const candidates = await source.listCandidates();
  const limited =
    input.enrichLimit !== undefined ? candidates.slice(0, input.enrichLimit) : candidates;

  const observations: ExternalGameObservation[] = [];
  for (const c of limited) {
    const obs = await source.enrich(c.externalId);
    if (obs) observations.push(obs);
  }

  const nextApps: SteamStateFile["apps"] = { ...(priorState?.apps ?? {}) };
  const entries: SteamBreakoutEntry[] = [];

  for (const obs of observations) {
    const key = String(obs.externalId);
    const prior = priorState?.apps[key];
    const ageDays = computeAgeDays(obs.releaseDate, now);

    const { reviewVelocityPerDay, observationBasis } = reviewVelocity(obs, prior, ageDays, now);
    const playerVelocityPct = playerVelocity(obs, prior);

    const { viralityScore, components } = computeVirality({
      reviewVelocityPerDay,
      playerVelocityPct,
      ageDays,
      positivePct: obs.positivePct,
      reviewTotal: obs.reviewTotal,
    });

    entries.push({
      source: "steam",
      appId: obs.externalId,
      name: obs.name,
      storeUrl: obs.storeUrl,
      headerImageUrl: obs.headerImageUrl,
      shortDescription: obs.shortDescription,
      releaseDate: obs.releaseDate,
      ageDays,
      genres: obs.genres,
      tags: obs.tags,
      priceUsd: obs.priceUsd,
      reviewTotal: obs.reviewTotal,
      reviewVelocityPerDay,
      reviewScoreDesc: obs.reviewScoreDesc,
      positivePct: obs.positivePct,
      currentPlayers: obs.currentPlayers,
      playerVelocityPct,
      ownersLow: obs.ownersLow,
      ownersHigh: obs.ownersHigh,
      viralityScore,
      components,
      observationBasis,
    });

    nextApps[key] = {
      name: obs.name,
      firstSeenAt: prior?.firstSeenAt ?? nowIso,
      lastReviewTotal: obs.reviewTotal ?? prior?.lastReviewTotal ?? null,
      lastReviewAt: obs.reviewTotal !== null ? nowIso : (prior?.lastReviewAt ?? null),
      lastPlayers: obs.currentPlayers ?? prior?.lastPlayers ?? null,
      lastPlayersAt: obs.currentPlayers !== null ? nowIso : (prior?.lastPlayersAt ?? null),
      releaseDate: obs.releaseDate,
      genres: obs.genres,
      tags: obs.tags,
    };
  }

  entries.sort((a, b) => b.viralityScore - a.viralityScore);

  const view: SteamBreakoutsView = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: nowIso,
    source: "steam",
    disclaimer: DISCLAIMER,
    entries: entries.slice(0, viewLimit),
  };

  return {
    view,
    nextState: {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: nowIso,
      apps: pruneStaleApps(nextApps, now),
    },
    catalog: mergeCatalog(priorCatalog, entries, nowIso),
  };
}

/** Δreviews/Δdays vs the prior observation; launch-to-date fallback on first sight. */
function reviewVelocity(
  obs: ExternalGameObservation,
  prior: SteamStateFile["apps"][string] | undefined,
  ageDays: number | null,
  now: number,
): { reviewVelocityPerDay: number | null; observationBasis: "two-snapshot" | "first-seen" } {
  if (prior?.lastReviewTotal != null && prior.lastReviewAt && obs.reviewTotal != null) {
    const dtDays = (now - Date.parse(prior.lastReviewAt)) / DAY_MS;
    if (dtDays > 0) {
      return {
        reviewVelocityPerDay: (obs.reviewTotal - prior.lastReviewTotal) / dtDays,
        observationBasis: "two-snapshot",
      };
    }
  }
  // First sight (or unusable prior): approximate from launch-to-date.
  const launchVel =
    obs.reviewTotal != null && ageDays != null && ageDays > 0 ? obs.reviewTotal / ageDays : null;
  return { reviewVelocityPerDay: launchVel, observationBasis: "first-seen" };
}

function playerVelocity(
  obs: ExternalGameObservation,
  prior: SteamStateFile["apps"][string] | undefined,
): number | null {
  if (prior?.lastPlayers != null && prior.lastPlayers > 0 && obs.currentPlayers != null) {
    return (obs.currentPlayers - prior.lastPlayers) / prior.lastPlayers;
  }
  return null;
}

/** Days since release, floored at 0; null when the date is missing/unparseable. */
export function computeAgeDays(releaseDate: string | null, now: number): number | null {
  if (!releaseDate) return null;
  const ms = Date.parse(releaseDate);
  if (Number.isNaN(ms)) return null;
  return Math.max(0, Math.floor((now - ms) / DAY_MS));
}

function pruneStaleApps(apps: SteamStateFile["apps"], now: number): SteamStateFile["apps"] {
  const cutoff = now - STATE_PRUNE_DAYS * DAY_MS;
  const kept: SteamStateFile["apps"] = {};
  for (const [key, app] of Object.entries(apps)) {
    const stamp = Date.parse(app.lastReviewAt ?? app.lastPlayersAt ?? app.firstSeenAt);
    if (Number.isNaN(stamp) || stamp >= cutoff) kept[key] = app;
  }
  return kept;
}

/** Accumulate the durable catalog: upsert each surfaced game, keep best score, assign a stable slug. */
function mergeCatalog(
  prior: SteamCatalogFile | null,
  entries: SteamBreakoutEntry[],
  nowIso: string,
): SteamCatalogFile {
  const byApp = new Map<number, SteamCatalogEntry>();
  const usedSlugs = new Set<string>();
  for (const e of prior?.entries ?? []) {
    byApp.set(e.appId, { ...e });
    usedSlugs.add(e.slug);
  }

  for (const e of entries) {
    const existing = byApp.get(e.appId);
    if (existing) {
      existing.name = e.name;
      existing.headerImageUrl = e.headerImageUrl;
      existing.shortDescription = e.shortDescription;
      existing.releaseDate = e.releaseDate;
      existing.genres = e.genres;
      existing.tags = e.tags;
      existing.lastSeenAt = nowIso;
      existing.bestViralityScore = Math.max(existing.bestViralityScore, e.viralityScore);
    } else {
      const slug = uniqueSlug(e.name, e.appId, usedSlugs);
      usedSlugs.add(slug);
      byApp.set(e.appId, {
        slug,
        source: "steam",
        appId: e.appId,
        name: e.name,
        storeUrl: e.storeUrl,
        headerImageUrl: e.headerImageUrl,
        shortDescription: e.shortDescription,
        releaseDate: e.releaseDate,
        genres: e.genres,
        tags: e.tags,
        firstSeenAt: nowIso,
        lastSeenAt: nowIso,
        bestViralityScore: e.viralityScore,
      });
    }
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: nowIso,
    entries: [...byApp.values()].sort((a, b) => b.bestViralityScore - a.bestViralityScore),
  };
}

/** kebab-case slug, disambiguated with the appId if the base collides. */
export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "game"
  );
}

function uniqueSlug(name: string, appId: number, used: Set<string>): string {
  const base = slugify(name);
  return used.has(base) ? `${base}-${appId}` : base;
}
