"use client";

/**
 * IconAnalysis · inline widget for `analyze_icon` (the vision tool). Shows the
 * game icon, the extracted art-direction traits as chips, and concrete
 * recommendations. Renders an upsell state when a free-tier user hits this paid
 * tool (`result.locked`), and an honest empty state otherwise.
 */
import type { ReactNode } from "react";
import { GameAvatar } from "@/components/copilot/game-avatar";
import type { IconAnalysisResult, IconTraits } from "@/lib/agent/tools";

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-md border border-border bg-muted-surface/60 px-2 py-0.5 text-xs text-foreground">
      {children}
    </span>
  );
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">{value}</div>
    </div>
  );
}

function Traits({ traits }: { traits: IconTraits }) {
  return (
    <div className="flex flex-col gap-3">
      <Field
        label="Palette"
        value={
          traits.palette.length
            ? traits.palette.map((c) => <Chip key={c}>{c}</Chip>)
            : <span className="text-xs text-muted-foreground">·</span>
        }
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Focal subject" value={<Chip>{traits.focalSubject}</Chip>} />
        <Field label="Contrast" value={<Chip>{traits.contrast}</Chip>} />
        <Field label="Text" value={<Chip>{traits.textPresent ? "yes" : "no"}</Chip>} />
        <Field label="Face" value={<Chip>{traits.facePresent ? "yes" : "no"}</Chip>} />
      </div>
      {traits.styleTags.length ? (
        <Field
          label="Style"
          value={traits.styleTags.map((s) => <Chip key={s}>{s}</Chip>)}
        />
      ) : null}
    </div>
  );
}

export function IconAnalysis({ result }: { result: IconAnalysisResult }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className="inline-block size-1.5 rounded-full bg-accent"
            aria-hidden
          />
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-foreground">
            {result.name ?? "Game"} · icon analysis
          </span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          Vision
        </span>
      </div>

      {result.locked ? (
        <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
          <span className="rounded-md bg-accent/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-accent">
            Pro feature
          </span>
          <p className="max-w-sm text-sm text-muted-foreground">
            {result.note ??
              "Icon analysis uses vision and is available on the Pro plan."}
          </p>
          <a
            href="/pricing"
            className="text-sm font-medium text-accent underline-offset-4 hover:underline"
          >
            See plans →
          </a>
        </div>
      ) : result.ok && result.traits ? (
        <div className="flex flex-col gap-4 px-4 py-4">
          <div className="flex items-start gap-3">
            <GameAvatar name={result.name} src={result.iconUrl} className="size-16" />
            <div className="min-w-0 flex-1">
              <Traits traits={result.traits} />
            </div>
          </div>
          {result.recommendations.length ? (
            <div className="flex flex-col gap-1.5 border-t border-border pt-3">
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                Recommendations
              </span>
              <ul className="flex flex-col gap-1.5">
                {result.recommendations.map((r) => (
                  <li key={r} className="flex gap-2 text-sm text-foreground">
                    <span className="text-accent" aria-hidden>
                      →
                    </span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="px-4 py-6 text-center text-xs text-muted-foreground">
          {result.note ?? "No icon analysis available."}
        </p>
      )}
    </div>
  );
}
