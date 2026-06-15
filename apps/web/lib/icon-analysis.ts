/**
 * Game icon analysis (Claude vision) for the AI agent — answers "what's good/
 * bad about my icon?" / "what do winning icons in my niche look like?". This is
 * the one tool that calls a vision model: it looks at the actual game icon and
 * extracts art-direction traits + concrete suggestions, grounded in what the
 * model can see rather than taste.
 *
 * COST: this issues ONE Claude vision call per analysis (the only tool that
 * spends model tokens). It is paywalled to paid tiers at the route dispatch
 * point; the helper itself is cache()'d per render so repeats are free.
 *
 * SERVER-ONLY: uses `@bloxscout/core`'s RobloxClient for the icon URL and the
 * shared Anthropic client. Never throws — returns `ok:false` + a `note`.
 */
import "server-only";
import { cache } from "react";
import type Anthropic from "@anthropic-ai/sdk";
import { RobloxClient } from "@bloxscout/core/roblox-client";
import { COPILOT_MODEL, getAnthropic } from "@/lib/agent/anthropic";

const roblox = new RobloxClient();

export interface IconTraits {
  /** Descriptive colour names, e.g. ["bright red", "gold", "black"]. */
  palette: string[];
  /** The main subject, e.g. "character close-up", "logo", "scene". */
  focalSubject: string;
  textPresent: boolean;
  facePresent: boolean;
  contrast: "high" | "medium" | "low";
  /** Free-form style descriptors, e.g. ["3D render", "cartoon", "cluttered"]. */
  styleTags: string[];
}

export interface IconAnalysisResult {
  ok: boolean;
  universeId: number | null;
  name: string | null;
  iconUrl: string | null;
  traits: IconTraits | null;
  /** Concrete, actionable suggestions for the icon. */
  recommendations: string[];
  note?: string;
  /** Set by the route when a free-tier user hits this paid tool. */
  locked?: boolean;
}

export interface IconAnalysisInput {
  universeId?: number;
  gameName?: string;
}

const VISION_SYSTEM =
  "You are a Roblox game-icon art director. You analyze a single game icon and " +
  "return STRICT JSON only — no prose, no markdown fences. Be concrete and " +
  "honest; base everything on what is actually visible.";

const VISION_PROMPT =
  "Analyze this Roblox game icon. Return ONLY a JSON object with exactly these " +
  'keys: {"palette": string[] (2-4 dominant colours), "focalSubject": string, ' +
  '"textPresent": boolean, "facePresent": boolean, "contrast": "high"|"medium"' +
  '|"low", "styleTags": string[] (2-4), "recommendations": string[] (2-4 ' +
  "specific, actionable improvements — e.g. 'add a 1-2 word title', 'raise " +
  "contrast between subject and background')}. No other keys, no commentary.";

/** Pull the first balanced JSON object out of the model's text response. */
function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

function asTraits(parsed: Record<string, unknown>): IconTraits {
  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  const contrast = parsed.contrast;
  return {
    palette: arr(parsed.palette),
    focalSubject:
      typeof parsed.focalSubject === "string" ? parsed.focalSubject : "—",
    textPresent: parsed.textPresent === true,
    facePresent: parsed.facePresent === true,
    contrast:
      contrast === "high" || contrast === "medium" || contrast === "low"
        ? contrast
        : "medium",
    styleTags: arr(parsed.styleTags),
  };
}

interface Target {
  universeId: number;
  name: string | null;
}

async function resolveTarget(input: IconAnalysisInput): Promise<Target | null> {
  if (typeof input.universeId === "number" && input.universeId > 0) {
    let name: string | null = null;
    try {
      const [g] = await roblox.getGames([input.universeId]);
      if (g) name = g.name;
    } catch {
      // name optional
    }
    return { universeId: input.universeId, name };
  }
  const q = (input.gameName ?? "").trim();
  if (!q) return null;
  try {
    const matches = await roblox.searchGames(q, { limit: 5 });
    const m = matches[0];
    if (!m) return null;
    return { universeId: m.universeId, name: m.name };
  } catch {
    return null;
  }
}

/**
 * Analyze a game's icon with Claude vision. Never throws.
 */
export const analyzeIcon = cache(
  async (input: IconAnalysisInput): Promise<IconAnalysisResult> => {
    const base: IconAnalysisResult = {
      ok: false,
      universeId: null,
      name: null,
      iconUrl: null,
      traits: null,
      recommendations: [],
    };

    const client = getAnthropic();
    if (!client) {
      return { ...base, note: "Vision analysis isn't configured right now." };
    }

    const t = await resolveTarget(input);
    if (!t) {
      return {
        ...base,
        note: "Couldn't find that game on Roblox right now. Check the name, or pass a universe id.",
      };
    }

    // Resolve a high-res icon URL (the vision input).
    let iconUrl: string | null = null;
    try {
      const [icon] = await roblox.getGameIcons([t.universeId], "512x512");
      if (icon && icon.state === "Completed" && icon.imageUrl) {
        iconUrl = icon.imageUrl;
      }
    } catch {
      // handled below
    }
    if (!iconUrl) {
      return {
        ...base,
        universeId: t.universeId,
        name: t.name,
        note: "This game's icon isn't available (still processing or restricted), so it can't be analyzed.",
      };
    }

    // ONE vision call. No thinking / sampling params (claude-opus-4-8 rejects
    // temperature/top_p); small max_tokens since the output is compact JSON.
    let text = "";
    try {
      const msg = await client.messages.create({
        model: COPILOT_MODEL,
        max_tokens: 900,
        system: VISION_SYSTEM,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "url", url: iconUrl } },
              { type: "text", text: VISION_PROMPT },
            ],
          },
        ],
      });
      for (const block of msg.content as Anthropic.ContentBlock[]) {
        if (block.type === "text") text += block.text;
      }
    } catch {
      return {
        ...base,
        universeId: t.universeId,
        name: t.name,
        iconUrl,
        note: "The vision model is unavailable right now — try again shortly.",
      };
    }

    const parsed = extractJson(text);
    if (!parsed || typeof parsed !== "object") {
      return {
        ...base,
        universeId: t.universeId,
        name: t.name,
        iconUrl,
        note: "Couldn't read a clean analysis of this icon — try again.",
      };
    }
    const obj = parsed as Record<string, unknown>;
    const recommendations = Array.isArray(obj.recommendations)
      ? obj.recommendations.filter((x): x is string => typeof x === "string")
      : [];

    return {
      ok: true,
      universeId: t.universeId,
      name: t.name,
      iconUrl,
      traits: asTraits(obj),
      recommendations,
    };
  },
);
