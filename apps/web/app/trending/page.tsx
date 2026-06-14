import type { Metadata } from "next";
import { getFreshness } from "@/lib/data";
import {
  generateTrendingMetadata,
  TrendingPage,
} from "./_lib/trending";

// ISR: match the 30-minute pipeline cadence.
export const revalidate = 1800;

// `/trending` is the canonical "this week" view.
export async function generateMetadata(): Promise<Metadata> {
  const { date } = await getFreshness();
  return generateTrendingMetadata("week", date);
}

export default function TrendingIndex() {
  return TrendingPage({ period: "week" });
}
