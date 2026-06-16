// The web app has no test runner of its own, but this helper is pure and
// dependency-free, so we exercise it from the root vitest via a relative import.
import { candidateRobloxNiche, matchExternalGame } from "../../apps/web/lib/cross-platform.js";
import { describe, expect, it } from "vitest";

describe("candidateRobloxNiche", () => {
  it("maps MECCHA-CHAMELEON-style tags to a hide-and-seek niche", () => {
    const hint = candidateRobloxNiche(["Hide and Seek", "Multiplayer"], ["Casual"]);
    expect(hint?.niche).toBe("hide-and-seek / social");
  });

  it("maps tower defense to a known genre slug", () => {
    const hint = candidateRobloxNiche(["Tower Defense"], []);
    expect(hint).toEqual({ niche: "tower defense", slug: "tower-defense" });
  });

  it("matches case-insensitively against genres too", () => {
    expect(candidateRobloxNiche([], ["Roguelike Deckbuilder"])?.niche).toBe("roguelike");
  });

  it("returns null when nothing matches", () => {
    expect(candidateRobloxNiche(["Atmospheric", "Story Rich"], ["Visual Novel"])).toBeNull();
  });

  it("respects rule order (first match wins)", () => {
    // contains both "horror" and "co-op" → horror rule comes first
    expect(candidateRobloxNiche(["Co-op", "Horror"], [])?.niche).toBe("horror");
  });
});

describe("matchExternalGame", () => {
  const entries = [
    { appId: 4704690, name: "MECCHA CHAMELEON" },
    { appId: 111, name: "Peak" },
  ];

  it("prefers an exact appId match", () => {
    expect(matchExternalGame({ appId: 111 }, entries)?.name).toBe("Peak");
  });

  it("falls back to exact then substring name match (case-insensitive)", () => {
    expect(matchExternalGame({ gameName: "meccha chameleon" }, entries)?.appId).toBe(4704690);
    expect(matchExternalGame({ gameName: "meccha" }, entries)?.appId).toBe(4704690);
  });

  it("returns null for no query and for misses", () => {
    expect(matchExternalGame({}, entries)).toBeNull();
    expect(matchExternalGame({ gameName: "nope" }, entries)).toBeNull();
  });
});
