/**
 * Game thumbnails for the AI agent's data widgets.
 *
 * SERVER-ONLY: wraps `@bloxscout/core`'s RobloxClient.getGameIcons. The agent's
 * niche/ranking widgets show a small game icon per row; this batches every
 * universe id in a single Roblox request (the icons endpoint accepts a
 * comma-joined list) and is `cache()`d per render so two widgets in the same
 * turn share one fetch.
 *
 * Request budget: ONE Roblox icons request per `getThumbnails(...)` call,
 * regardless of how many ids are passed. Only `state === "Completed"` icons
 * resolve to a URL; anything pending/blocked/errored maps to `null` so the UI
 * falls back to a graceful placeholder.
 */
import "server-only";
import { cache } from "react";
import { RobloxClient } from "@bloxscout/core/roblox-client";

const roblox = new RobloxClient();

/**
 * Resolve game icon URLs for a set of universe ids. Returns a Map keyed by
 * universe id; a value of `null` means "no usable icon" (pending/blocked/error
 * or simply absent). Never throws — a failed request yields an all-null map so
 * the widget still renders.
 */
export const getThumbnails = cache(
  async (universeIds: number[]): Promise<Map<number, string | null>> => {
    const ids = [...new Set(universeIds.filter((n) => Number.isFinite(n)))];
    const out = new Map<number, string | null>(ids.map((id) => [id, null]));
    if (ids.length === 0) return out;
    try {
      const icons = await roblox.getGameIcons(ids, "150x150");
      for (const icon of icons) {
        if (icon.state === "Completed" && icon.imageUrl) {
          out.set(icon.targetId, icon.imageUrl);
        }
      }
    } catch {
      // Leave the all-null map — widgets degrade to a placeholder.
    }
    return out;
  },
);
