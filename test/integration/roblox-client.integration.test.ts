import { RobloxClient } from "@bloxscout/core/roblox-client";
import {
  GameIconSchema,
  GameSchema,
  GameSummarySchema,
  GroupSchema,
  UserSchema,
} from "@bloxscout/core/schemas";
import { describe, expect, it } from "vitest";

/**
 * Live integration suite. Skipped unless `INTEGRATION=1` is set so CI's main
 * `pnpm test` run stays hermetic; the nightly `integration.yml` workflow
 * sets the env var.
 *
 * One assertion per method: confirm a real Roblox response still matches our
 * Zod schemas. If a shape drifts, this fails loudly.
 */
const enabled = process.env.INTEGRATION === "1";
const d = enabled ? describe : describe.skip;

d("RobloxClient (integration)", () => {
  const client = new RobloxClient();

  it("searchGames hits real omni-search", async () => {
    const results = await client.searchGames("tycoon", { limit: 5 });
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) GameSummarySchema.parse(r);
  }, 30_000);

  it("getGames hits real /v1/games", async () => {
    // Blox Fruits — long-stable universe id.
    const games = await client.getGames([994732206]);
    expect(games).toHaveLength(1);
    GameSchema.parse(games[0]);
  }, 30_000);

  it("getCreator hits real /v1/users/{id}", async () => {
    const user = await client.getCreator(1);
    UserSchema.parse(user);
    expect(user.name).toBe("Roblox");
  }, 30_000);

  it("getGroup hits real /v1/groups/{id}", async () => {
    const group = await client.getGroup(7);
    GroupSchema.parse(group);
  }, 30_000);

  it("getGameIcons hits real thumbnails endpoint", async () => {
    const icons = await client.getGameIcons([994732206]);
    expect(icons.length).toBeGreaterThan(0);
    for (const i of icons) GameIconSchema.parse(i);
  }, 30_000);

  // v0.1.2 regression (#36): Roblox tightened the per-request universe-id
  // cap on `/v1/games`. Batches of 100 now fail with
  // `{"code":9,"message":"Too many universe IDs"}`. A 75-id batch must
  // succeed by chunking transparently into 50 + 25.
  it("getGames handles a 75-id batch by chunking (#36)", async () => {
    // Seed with one known-good id (Blox Fruits); pad with sequential ids
    // that may or may not resolve — `getGames` simply omits missing ones,
    // so the call must still succeed end-to-end without an API rejection.
    const ids = [994732206, ...Array.from({ length: 74 }, (_, i) => 100_000_000 + i)];
    const games = await client.getGames(ids);
    expect(games.length).toBeGreaterThan(0);
    expect(games.some((g) => g.id === 994732206)).toBe(true);
  }, 60_000);
});
