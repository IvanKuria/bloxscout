/**
 * Fuzzy game-name matching for the agent's name-resolving tools.
 *
 * Roblox's omni-search NEVER returns empty — a typo'd or nonsense name still
 * comes back with unrelated "best-effort" results. Taking `matches[0]` blindly
 * means a query like "zzqxnonexistent" silently resolves to some random game
 * and the tool returns confidently-wrong numbers for the wrong title.
 *
 * `pickGameMatch` guards against that: it scores each candidate's name against
 * the query (token overlap, tolerant of Roblox's heavy emoji/bracket
 * decoration) and returns null when nothing is a plausible match — so the
 * caller surfaces an honest "couldn't find that game" instead.
 */
import "server-only";

/** Lowercase, strip decoration (emoji, brackets, punctuation) to alphanumerics. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

// Common filler words that shouldn't count toward a match.
const STOPWORDS = new Set(["a", "an", "the", "of", "and", "x"]);

function significantTokens(s: string): string[] {
  return normalize(s)
    .split(" ")
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}

// Fraction of the query's significant tokens that must land in the candidate
// name. 0.6 means a 1- or 2-token query needs a full match (precise), while a
// 3+-token query tolerates one missing decorated token.
const MATCH_THRESHOLD = 0.6;

/**
 * Pick the best name-match for `query` among `candidates`, or null when none is
 * a plausible match. Generic over any candidate carrying a `name`.
 */
export function pickGameMatch<T extends { name: string }>(
  query: string,
  candidates: readonly T[],
): T | null {
  const q = normalize(query);
  if (q.length < 2 || candidates.length === 0) return null;
  const qTokens = significantTokens(query);

  let best: { c: T; score: number } | null = null;
  for (const c of candidates) {
    const name = normalize(c.name);
    let score: number;
    if (qTokens.length === 0) {
      // Query has no significant tokens — require substring containment.
      score = name.includes(q) || q.includes(name) ? 1 : 0;
    } else {
      const nameTokens = new Set(significantTokens(c.name));
      const hits = qTokens.filter(
        (t) => nameTokens.has(t) || name.includes(t),
      ).length;
      score = hits / qTokens.length;
    }
    if (score > 0 && (!best || score > best.score)) best = { c, score };
  }

  return best && best.score >= MATCH_THRESHOLD ? best.c : null;
}
