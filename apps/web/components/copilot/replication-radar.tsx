"use client";

/**
 * ReplicationRadar · inline widget for `get_replication_radar`. A ranked list of
 * external (Steam) games going viral right now that are strong candidates to
 * clone/adapt on Roblox, with a virality-score bar and the candidate niche.
 */
import Link from "next/link";
import type { RadarResult } from "@/lib/agent/tools";

function nicheHref(slug: string | null): string {
  return slug ? `/genre/${slug}` : "/rising-roblox-niches";
}

function subline(row: RadarResult["rows"][number]): string {
  const bits: string[] = [];
  if (row.reviewVelocityPerDay != null) {
    bits.push(`~${Math.round(row.reviewVelocityPerDay).toLocaleString()} reviews/day`);
  }
  if (row.currentPlayers != null) {
    bits.push(`${row.currentPlayers.toLocaleString()} playing`);
  }
  if (row.ageDays != null) bits.push(`${row.ageDays}d old`);
  if (row.observationBasis === "first-seen") bits.push("first sight");
  return bits.join(" · ");
}

export function ReplicationRadar({ result }: { result: RadarResult }) {
  const max = Math.max(1, ...result.rows.map((r) => r.viralityScore));
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="inline-block size-1.5 rounded-full bg-primary" aria-hidden />
          <span className="text-sm font-medium text-foreground">{result.title}</span>
        </div>
        <span className="text-xs text-muted-foreground">Virality score</span>
      </div>

      {result.rows.length === 0 ? (
        <p className="px-4 py-6 text-center text-xs text-muted-foreground">
          {result.note ?? "No breakouts on the radar yet."}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {result.rows.map((r, i) => (
            <li
              key={r.appId}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
            >
              <span className="tabular w-5 shrink-0 text-xs text-muted-foreground">{i + 1}</span>
              {r.headerImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- external Steam CDN thumbnail, not a Next-optimized asset
                <img
                  src={r.headerImageUrl}
                  alt=""
                  className="hidden h-10 w-[88px] shrink-0 rounded object-cover sm:block"
                  aria-hidden
                />
              ) : null}
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <a
                  href={r.storeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-sm font-medium text-foreground underline-offset-4 hover:underline"
                >
                  {r.name}
                </a>
                <span className="truncate text-xs text-muted-foreground">{subline(r)}</span>
                {r.candidateRobloxNiche ? (
                  <Link
                    href={nicheHref(r.candidateNicheSlug)}
                    className="w-fit rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground underline-offset-4 hover:underline"
                  >
                    Roblox niche: {r.candidateRobloxNiche}
                  </Link>
                ) : null}
              </div>
              <div className="flex w-16 shrink-0 flex-col items-end gap-1">
                <span className="tabular font-heading text-base font-semibold leading-none text-foreground">
                  {Math.round(r.viralityScore)}
                </span>
                <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(r.viralityScore / max) * 100}%` }}
                    aria-hidden
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
        {result.disclaimer ?? "Steam trend signals — move fast; the Roblox window is days."}
      </div>
    </div>
  );
}
