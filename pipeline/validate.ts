/**
 * Pre-publish sanity gate. If anything here fails, the run exits non-zero
 * and the workflow aborts WITHOUT committing — a bad run must never replace
 * good published data.
 */

import {
  GenresViewSchema,
  RankedViewSchema,
  type RawRunFile,
  RawRunFileSchema,
} from "../src/shared/hosted-format.js";
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

  if (requestedCount > 0) {
    const rate = run.games.length / requestedCount;
    if (run.games.length < MIN_ABSOLUTE_GAMES || rate < MIN_FETCH_SUCCESS_RATE) {
      errors.push(
        `fetched ${run.games.length}/${requestedCount} games (${Math.round(rate * 100)}%) — below publish threshold`,
      );
    }
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

  return errors;
}
