"use client";

/**
 * The tool→widget map — the generative-UI contract.
 *
 * `WIDGET_BY_TOOL` maps a copilot tool name (`lib/agent/tools.ts`) to a
 * recon-themed React component. When a `tool-result` arrives over the stream,
 * the thread looks the `toolName` up here and renders the matching widget with
 * the tool's JSON `result` as props. Tools without a widget (or a null result)
 * simply render nothing.
 *
 * To extend the catalog: add a tool in `lib/agent/tools.ts`, then add one entry
 * here keyed on the same tool name.
 */
import * as React from "react";
import { CompetitorMap } from "@/components/copilot/competitor-map";
import { IconAnalysis } from "@/components/copilot/icon-analysis";
import { MonetizationTeardown } from "@/components/copilot/monetization-teardown";
import { NicheCard } from "@/components/copilot/niche-card";
import { NicheScan } from "@/components/copilot/niche-scan";
import { QualityGauge } from "@/components/copilot/quality-gauge";
import { RankingWidget } from "@/components/copilot/ranking-widget";
import { RetentionFunnel } from "@/components/copilot/retention-funnel";
import { RevenueCard } from "@/components/copilot/revenue-card";
import { RisingList } from "@/components/copilot/rising-list";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  CompetitorMapResult,
  GameQualityResult,
  IconAnalysisResult,
  MonetizationResult,
  NicheAnalysisResult,
  RankingResult,
  RetentionResult,
  RevenueResult,
  RisingResult,
  SaturationResult,
} from "@/lib/agent/tools";

/** A widget renderer: receives the tool's raw JSON `result`. */
type WidgetRenderer = (result: unknown) => React.ReactNode;

/**
 * The contract map. Each renderer narrows `result` to its tool's result shape
 * (the route streams exactly the JSON the tool returned). The widgets all
 * handle their own empty / not-available-yet states internally.
 */
export const WIDGET_BY_TOOL: Record<string, WidgetRenderer> = {
  get_trending_games: (result) => (
    <RankingWidget result={result as RankingResult} />
  ),
  get_breakout_games: (result) => (
    <RankingWidget result={result as RankingResult} />
  ),
  get_genre_saturation: (result) => (
    <NicheCard result={result as SaturationResult} />
  ),
  get_rising_niches: (result) => <RisingList result={result as RisingResult} />,
  analyze_niche: (result) => (
    <NicheScan result={result as NicheAnalysisResult} />
  ),
  estimate_revenue: (result) => (
    <RevenueCard result={result as RevenueResult} />
  ),
  get_game_quality: (result) => (
    <QualityGauge result={result as GameQualityResult} />
  ),
  teardown_monetization: (result) => (
    <MonetizationTeardown result={result as MonetizationResult} />
  ),
  map_competitors: (result) => (
    <CompetitorMap result={result as CompetitorMapResult} />
  ),
  estimate_retention: (result) => (
    <RetentionFunnel result={result as RetentionResult} />
  ),
  analyze_icon: (result) => (
    <IconAnalysis result={result as IconAnalysisResult} />
  ),
};

/** Human label for the running-tool indicator, keyed by tool name. */
const RUNNING_LABEL: Record<string, string> = {
  get_trending_games: "Reading trending games",
  get_breakout_games: "Reading breakout games",
  get_genre_saturation: "Scoring genre saturation",
  get_rising_niches: "Scanning rising niches",
  analyze_niche: "Scanning the niche live",
  estimate_revenue: "Estimating revenue",
  get_game_quality: "Checking the like-ratio",
  teardown_monetization: "Tearing down monetization",
  map_competitors: "Mapping competitors",
  estimate_retention: "Reading the badge funnel",
  analyze_icon: "Looking at the icon",
};

/**
 * Render a completed tool result as its inline widget. Returns null for an
 * unknown tool or a null result (the agent narrates those in prose instead).
 */
export function renderWidget(
  toolName: string,
  result: unknown,
): React.ReactNode {
  if (result == null) return null;
  const renderer = WIDGET_BY_TOOL[toolName];
  return renderer ? renderer(result) : null;
}

/** A subtle "running <tool>…" shell shown while a tool executes server-side. */
export function WidgetRunning({ toolName }: { toolName: string }) {
  const label = RUNNING_LABEL[toolName] ?? "Working";
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="inline-block size-1.5 animate-pulse rounded-full bg-accent" />
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {label}…
        </span>
      </div>
      <div className="flex flex-col gap-2 p-4">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-3/5" />
      </div>
    </div>
  );
}
