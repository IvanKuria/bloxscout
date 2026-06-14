import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getFreshness } from "@/lib/data";
import {
  generateTrendingMetadata,
  isPeriod,
  PERIODS,
  type Period,
  TrendingPage,
} from "../_lib/trending";

export const revalidate = 1800;
// Only the three known periods are valid routes.
export const dynamicParams = false;

export function generateStaticParams(): Array<{ period: Period }> {
  // `week` lives at the canonical `/trending`, so prerender day + month here.
  return PERIODS.filter((p) => p !== "week").map((period) => ({ period }));
}

interface PageProps {
  params: Promise<{ period: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { period } = await params;
  if (!isPeriod(period)) {
    return { title: "Not found", robots: { index: false, follow: true } };
  }
  const { date } = await getFreshness();
  return generateTrendingMetadata(period, date);
}

export default async function TrendingPeriodPage({ params }: PageProps) {
  const { period } = await params;
  // Canonicalize `/trending/week` -> `/trending`.
  if (period === "week") redirect("/trending");
  if (!isPeriod(period)) redirect("/trending");
  return TrendingPage({ period });
}
