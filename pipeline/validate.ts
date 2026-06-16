/**
 * Pre-publish sanity gate. If anything here fails, the run exits non-zero
 * and the workflow aborts WITHOUT committing — a bad run must never replace
 * good published data.
 */

import {
  type GamePassFile,
  GamePassFileSchema,
  GenreRevenueViewSchema,
  GenresViewSchema,
  RankedViewSchema,
  type RawRunFile,
  RawRunFileSchema,
  RisingNichesViewSchema,
  SaturationViewSchema,
  type SteamBreakoutsView,
  SteamBreakoutsViewSchema,
  type SteamCatalogFile,
  SteamCatalogFileSchema,
  type SteamStateFile,
  SteamStateFileSchema,
} from "@bloxscout/core/hosted-format";
import type { ComputedViews } from "./views.js";

/** Below this fetch success rate the run is considered systemically broken. */
const MIN_FETCH_SUCCESS_RATE = 0.5;
/** A run that fetched fewer games than this is broken regardless of rate. */
const MIN_ABSOLUTE_GAMES = 50;

export interface ValidateRunInput {
  run: RawRunFile;
  /** How many universe ids ingest asked for. */
  requestedCount: number;
  views: ComputedViews;
}

/** Returns a list of fatal problems; empty means publishable. */
export function validateRunOutputs(input: ValidateRunInput): string[] {
  const errors: string[] = [];
  const { run, requestedCount, views } = input;

  const rawParse = RawRunFileSchema.safeParse(run);
  if (!rawParse.success) {
    errors.push(`raw run file fails schema: ${rawParse.error.message.slice(0, 300)}`);
  }

  const rate = requestedCount > 0 ? run.games.length / requestedCount : 0;
  if (run.games.length < MIN_ABSOLUTE_GAMES || rate < MIN_FETCH_SUCCESS_RATE) {
    errors.push(
      `fetched ${run.games.length}/${requestedCount} games (${Math.round(rate * 100)}%) — below publish threshold`,
    );
  }

  for (const [name, view] of [
    ["trending", views.trending],
    ["up-and-coming", views.upAndComing],
    ["breakouts", views.breakouts],
  ] as const) {
    const parsed = RankedViewSchema.safeParse(view);
    if (!parsed.success) {
      errors.push(`${name} view fails schema: ${parsed.error.message.slice(0, 300)}`);
    }
  }
  const genresParsed = GenresViewSchema.safeParse(views.genres);
  if (!genresParsed.success) {
    errors.push(`genres view fails schema: ${genresParsed.error.message.slice(0, 300)}`);
  }

  const saturationParsed = SaturationViewSchema.safeParse(views.saturation);
  if (!saturationParsed.success) {
    errors.push(`saturation view fails schema: ${saturationParsed.error.message.slice(0, 300)}`);
  }
  const risingParsed = RisingNichesViewSchema.safeParse(views.risingNiches);
  if (!risingParsed.success) {
    errors.push(`rising-niches view fails schema: ${risingParsed.error.message.slice(0, 300)}`);
  }
  const genreRevenueParsed = GenreRevenueViewSchema.safeParse(views.genreRevenue);
  if (!genreRevenueParsed.success) {
    errors.push(
      `genre-revenue view fails schema: ${genreRevenueParsed.error.message.slice(0, 300)}`,
    );
  }

  return errors;
}

/**
 * Schema-validate a gamepass sample file before it is published. Sampling is
 * optional/flag-gated, so this is only called when a file was actually
 * produced (an absent file is not an error). A malformed file aborts the run
 * the same way a malformed view does.
 */
export function validateGamePassFile(file: GamePassFile): string[] {
  const parsed = GamePassFileSchema.safeParse(file);
  if (!parsed.success) {
    return [`gamepass file fails schema: ${parsed.error.message.slice(0, 300)}`];
  }
  return [];
}

/**
 * Schema-validate the Steam radar artifacts before publishing. The stage is
 * flag-gated, so this is only called when the files were produced. A malformed
 * artifact aborts the run like any other bad view.
 */
export function validateSteamBreakouts(input: {
  view: SteamBreakoutsView;
  state: SteamStateFile;
  catalog: SteamCatalogFile;
}): string[] {
  const errors: string[] = [];
  const checks = [
    ["steam-breakouts view", SteamBreakoutsViewSchema, input.view],
    ["steam state", SteamStateFileSchema, input.state],
    ["steam catalog", SteamCatalogFileSchema, input.catalog],
  ] as const;
  for (const [name, schema, value] of checks) {
    const parsed = schema.safeParse(value);
    if (!parsed.success) {
      errors.push(`${name} fails schema: ${parsed.error.message.slice(0, 300)}`);
    }
  }
  return errors;
}
