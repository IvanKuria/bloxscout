/**
 * Pure presentation helpers shared across the data pages. No IO. Safe to use
 * from both Server and (the few) Client Components.
 *
 * Citeability rule (from the AEO spec): a number is never shown bare. These
 * helpers always pair a value with a unit, and `null`/unknown values render as
 * an explicit em-dash sentinel so "not available yet" is visible, not implied.
 */

/** Sentinel for a value the young dataset doesn't have yet. */
export const NA = "—"; // em dash

/** Full grouped integer, e.g. 142831 -> "142,831". `null` -> NA. */
export function int(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return NA;
  return Math.round(n).toLocaleString("en-US");
}

/** Compact integer for tight spots, e.g. 142831 -> "142.8K". */
export function compact(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return NA;
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

/**
 * Growth ratios in the hosted views are fractions (0.067 = +6.7%, capped at
 * 1000 = +100,000%). Render as a signed percent. `null` -> NA.
 */
export function growthPct(ratio: number | null | undefined): string {
  if (ratio === null || ratio === undefined || !Number.isFinite(ratio)) return NA;
  const pct = ratio * 100;
  const sign = pct > 0 ? "+" : "";
  const digits = Math.abs(pct) >= 100 ? 0 : Math.abs(pct) >= 10 ? 1 : 2;
  return `${sign}${pct.toFixed(digits)}%`;
}

/** Direction of a growth ratio for coloring: 1 up, -1 down, 0 flat/unknown. */
export function growthSign(ratio: number | null | undefined): -1 | 0 | 1 {
  if (ratio === null || ratio === undefined || !Number.isFinite(ratio) || ratio === 0) {
    return 0;
  }
  return ratio > 0 ? 1 : -1;
}

/** USD with cents, e.g. 1234.5 -> "$1,234.50". `null` -> NA. */
export function usd(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return NA;
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

/** Fixed-decimal number (for z-scores etc.). `null` -> NA. */
export function dec(n: number | null | undefined, digits = 2): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return NA;
  return n.toFixed(digits);
}

/**
 * Human UTC stamp for badges/answers, e.g. "13 Jun 2026, 23:50 UTC".
 * Deterministic (no locale drift) so server + client agree.
 */
export function utcStamp(d: Date): string {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const day = d.getUTCDate();
  const mon = months[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${day} ${mon} ${year}, ${hh}:${mm} UTC`;
}

/** "Month Year" for titles, e.g. "June 2026". */
export function monthYear(d: Date): string {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/**
 * URL-safe slug from a game name. Strips emoji/symbols (Roblox names are full
 * of them), collapses whitespace, lowercases. Falls back to "game" so we never
 * emit an empty slug segment.
 */
export function slugify(name: string | null | undefined): string {
  if (!name) return "game";
  const s = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // non-alphanumerics -> hyphen (drops emoji)
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  return s.length > 0 ? s : "game";
}

/** Canonical genre slug, e.g. "Roleplay & Avatar Sim" -> "roleplay-avatar-sim". */
export function genreSlug(genre: string | null | undefined): string {
  return slugify(genre);
}

/** Display name with a fallback for unnamed games. */
export function displayName(name: string | null | undefined): string {
  const n = (name ?? "").trim();
  return n.length > 0 ? n : "this game";
}
