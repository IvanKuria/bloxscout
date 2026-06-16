"use client";

/**
 * ReplicationBrief · inline widget for `analyze_replication_target`. Shows the
 * grounded Steam facts for ONE external game plus the adaptation-brief section
 * scaffold; the agent narrates the actual brief prose in the message text.
 */
import Link from "next/link";
import posthog from "posthog-js";
import type { ReplicationBriefResult } from "@/lib/agent/tools";

const SECTION_LABEL: Record<string, string> = {
  core_loop: "Core loop",
  keep_for_roblox: "Keep for Roblox",
  cut_for_roblox: "Cut for Roblox",
  monetization_fit: "Monetization fit",
  art_style: "Art / style",
  suggested_niche: "Suggested niche",
};

function fmtOwners(low: number | null, high: number | null): string | null {
  if (low == null && high == null) return null;
  const f = (n: number) => n.toLocaleString();
  if (low != null && high != null) return `${f(low)}–${f(high)}`;
  return f((low ?? high) as number);
}

function Fact({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="tabular text-sm text-foreground">{value}</span>
    </div>
  );
}

export function ReplicationBrief({ result }: { result: ReplicationBriefResult }) {
  if (!result.ok) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground shadow-xs">
        {result.note ?? "That game isn't on the radar yet."}
      </div>
    );
  }
  const owners = fmtOwners(result.ownersLow, result.ownersHigh);
  const nicheHref = result.candidateNicheSlug
    ? `/genre/${result.candidateNicheSlug}`
    : "/rising-roblox-niches";

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          {result.headerImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- external Steam CDN header image, not a Next-optimized asset
            <img
              src={result.headerImageUrl}
              alt=""
              className="hidden h-10 w-[88px] shrink-0 rounded object-cover sm:block"
              aria-hidden
            />
          ) : null}
          <div className="flex min-w-0 flex-col">
            {result.storeUrl ? (
              <a
                href={result.storeUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() =>
                  posthog.capture("replication_target_opened", {
                    appId: result.appId,
                    name: result.name,
                    surface: "brief_widget",
                  })
                }
                className="truncate text-sm font-medium text-foreground underline-offset-4 hover:underline"
              >
                {result.name}
              </a>
            ) : (
              <span className="truncate text-sm font-medium text-foreground">{result.name}</span>
            )}
            <span className="text-xs text-muted-foreground">Roblox adaptation target</span>
          </div>
        </div>
        {result.viralityScore != null ? (
          <span className="tabular font-heading text-lg font-semibold leading-none text-foreground">
            {Math.round(result.viralityScore)}
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 px-4 py-3 sm:grid-cols-3">
        <Fact
          label="Reviews"
          value={
            result.reviewTotal != null
              ? `${result.reviewTotal.toLocaleString()}${result.reviewScoreDesc ? ` · ${result.reviewScoreDesc}` : ""}`
              : null
          }
        />
        <Fact
          label="Review velocity"
          value={
            result.reviewVelocityPerDay != null
              ? `~${Math.round(result.reviewVelocityPerDay).toLocaleString()}/day`
              : null
          }
        />
        <Fact
          label="Playing now"
          value={result.currentPlayers != null ? result.currentPlayers.toLocaleString() : null}
        />
        <Fact label="Owners (est.)" value={owners} />
        <Fact
          label="Price"
          value={result.priceUsd != null ? (result.priceUsd === 0 ? "Free" : `$${result.priceUsd.toFixed(2)}`) : null}
        />
        <Fact label="Age" value={result.ageDays != null ? `${result.ageDays} days` : null} />
      </div>

      {result.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 px-4 pb-3">
          {result.tags.slice(0, 6).map((t) => (
            <span
              key={t}
              className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground"
            >
              {t}
            </span>
          ))}
        </div>
      ) : null}

      <div className="border-t border-border px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Adaptation brief
          </span>
          {result.candidateRobloxNiche ? (
            <Link
              href={nicheHref}
              className="text-[11px] text-muted-foreground underline-offset-4 hover:underline"
            >
              niche: {result.candidateRobloxNiche}
            </Link>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {result.briefSections.map((s) => (
            <span
              key={s}
              className="rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-foreground"
            >
              {SECTION_LABEL[s] ?? s}
            </span>
          ))}
        </div>
      </div>

      {result.note ? (
        <div className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
          {result.note}
        </div>
      ) : null}
    </div>
  );
}
