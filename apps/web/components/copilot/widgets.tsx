"use client";

/**
 * The tool→widget `render` map — the generative-UI contract.
 *
 * Each `makeAssistantToolUI({ toolName, render })` registers a recon-themed
 * widget for one copilot tool. When the agent calls a tool, assistant-ui
 * renders the matching component inline in the thread; `props.result` is
 * exactly the JSON the tool returned (`lib/agent/tools.ts`). While the tool is
 * still running (`status.type === "running"`), we show a skeleton.
 *
 * To extend the catalog: add a tool in `lib/agent/tools.ts`, then add one
 * `makeAssistantToolUI` entry here keyed on the same `toolName`. Mount the new
 * component in `CopilotToolWidgets` below.
 */
import { makeAssistantToolUI } from "@assistant-ui/react";
import { NicheCard } from "@/components/copilot/niche-card";
import { RankingWidget } from "@/components/copilot/ranking-widget";
import { RisingList } from "@/components/copilot/rising-list";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  RankingResult,
  RisingResult,
  SaturationResult,
} from "@/lib/agent/tools";

/** Loading shell shown while a tool is executing server-side. */
function WidgetSkeleton({ label }: { label: string }) {
  return (
    <div className="recon-grid relative overflow-hidden rounded-xl border border-console-border bg-console">
      <div className="flex items-center gap-2 border-b border-console-border px-4 py-3">
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-console-muted">
          {label}
        </span>
      </div>
      <div className="flex flex-col gap-2 p-4">
        <Skeleton className="h-4 w-2/3 text-console-foreground" />
        <Skeleton className="h-4 w-1/2 text-console-foreground" />
        <Skeleton className="h-4 w-3/5 text-console-foreground" />
      </div>
    </div>
  );
}

const TrendingUI = makeAssistantToolUI<unknown, RankingResult>({
  toolName: "get_trending_games",
  render: ({ result }) =>
    result == null ? (
      <WidgetSkeleton label="Trending games" />
    ) : (
      <RankingWidget result={result} />
    ),
});

const BreakoutsUI = makeAssistantToolUI<unknown, RankingResult>({
  toolName: "get_breakout_games",
  render: ({ result }) =>
    result == null ? (
      <WidgetSkeleton label="Breakout games" />
    ) : (
      <RankingWidget result={result} />
    ),
});

const SaturationUI = makeAssistantToolUI<unknown, SaturationResult>({
  toolName: "get_genre_saturation",
  render: ({ result }) =>
    result == null ? (
      <WidgetSkeleton label="Genre saturation" />
    ) : (
      <NicheCard result={result} />
    ),
});

const RisingUI = makeAssistantToolUI<unknown, RisingResult>({
  toolName: "get_rising_niches",
  render: ({ result }) =>
    result == null ? (
      <WidgetSkeleton label="Rising niches" />
    ) : (
      <RisingList result={result} />
    ),
});

/**
 * Mount-once registrar. Rendering these components registers their tool
 * renderers with the surrounding assistant runtime. Place inside the Thread.
 */
export function CopilotToolWidgets() {
  return (
    <>
      <TrendingUI />
      <BreakoutsUI />
      <SaturationUI />
      <RisingUI />
    </>
  );
}
