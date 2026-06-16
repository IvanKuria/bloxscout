/**
 * Pluggable external-game sources for the cross-platform "replicate-this" radar.
 *
 * The radar pipeline stage is written against the `ExternalSource` interface so
 * new sources (itch.io, mobile charts) can be added later without touching the
 * scoring/merge logic. `SteamSource` is the first (and currently only)
 * implementation, wrapping `SteamClient`.
 */
import { SteamClient } from "./steam-client.js";

/** A fully-enriched observation of one external game at a point in time. */
export interface ExternalGameObservation {
  source: "steam";
  /** Source-native id (Steam appId). */
  externalId: number;
  name: string;
  storeUrl: string;
  headerImageUrl: string | null;
  shortDescription: string | null;
  releaseDate: string | null;
  genres: string[];
  tags: string[];
  /** Studio(s) — used to filter AAA out of the radar. */
  developers: string[];
  /** Publisher(s) — primary AAA signal alongside price. */
  publishers: string[];
  priceUsd: number | null;
  reviewTotal: number | null;
  positivePct: number | null;
  reviewScoreDesc: string | null;
  currentPlayers: number | null;
  ownersLow: number | null;
  ownersHigh: number | null;
}

export interface ExternalCandidate {
  externalId: number;
  name: string;
}

export interface ExternalSource {
  readonly id: "steam";
  /** Candidate external games "going viral now" (the featured/trending set). */
  listCandidates(): Promise<ExternalCandidate[]>;
  /** Enrich one candidate into a full observation; null when it has no public page. */
  enrich(externalId: number): Promise<ExternalGameObservation | null>;
}

export interface SteamSourceOptions {
  client?: SteamClient;
}

/** Steam-backed `ExternalSource`. Sub-signal failures degrade to null, never throw. */
export class SteamSource implements ExternalSource {
  readonly id = "steam" as const;
  private readonly client: SteamClient;

  constructor(options: SteamSourceOptions = {}) {
    this.client = options.client ?? new SteamClient();
  }

  async listCandidates(): Promise<ExternalCandidate[]> {
    const apps = await this.client.getFeaturedApps();
    return apps.map((a) => ({ externalId: a.appId, name: a.name }));
  }

  async enrich(externalId: number): Promise<ExternalGameObservation | null> {
    const details = await this.client.getAppDetails(externalId);
    // No public store page (delisted, region-locked, or a bundle) → skip.
    if (!details || details.type !== "game") return null;

    const [reviews, spy, players] = await Promise.all([
      bestEffort(() => this.client.getReviewSummary(externalId)),
      bestEffort(() => this.client.getSteamSpy(externalId)),
      bestEffort(() => this.client.getCurrentPlayers(externalId)),
    ]);

    return {
      source: "steam",
      externalId,
      name: details.name,
      storeUrl: `https://store.steampowered.com/app/${externalId}`,
      headerImageUrl: details.headerImageUrl,
      shortDescription: details.shortDescription,
      releaseDate: details.comingSoon ? null : details.releaseDate,
      genres: details.genres,
      tags: spy?.tags ?? [],
      developers: details.developers,
      publishers: details.publishers,
      priceUsd: details.priceUsd,
      reviewTotal: reviews?.totalReviews ?? null,
      positivePct: reviews?.positivePct ?? null,
      reviewScoreDesc: reviews?.reviewScoreDesc ?? null,
      currentPlayers: players ?? null,
      ownersLow: spy?.ownersLow ?? null,
      ownersHigh: spy?.ownersHigh ?? null,
    };
  }
}

/** Run a best-effort sub-call, swallowing failures to null so one bad signal isn't fatal. */
async function bestEffort<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}
