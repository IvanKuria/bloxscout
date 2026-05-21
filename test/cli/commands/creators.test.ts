import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { gameFixture, makeRunner, summaryFixture } from "./_helpers.js";

describe("cli creators", () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
  });

  const stdoutText = (): string => stdoutSpy.mock.calls.map((c) => c[0]).join("");

  it("aggregates creators across the genre's top games (JSON mode)", async () => {
    const searchGames = vi
      .fn()
      .mockResolvedValue([summaryFixture(1, 100), summaryFixture(2, 200), summaryFixture(3, 300)]);
    // Same creator id across all three games so the aggregation has something
    // to combine.
    const getGames = vi.fn().mockResolvedValue([
      gameFixture(1, {
        playing: 100,
        creator: {
          id: 7,
          name: "MegaDev",
          type: "Group",
          isRNVAccount: false,
          hasVerifiedBadge: false,
        },
      }),
      gameFixture(2, {
        playing: 200,
        creator: {
          id: 7,
          name: "MegaDev",
          type: "Group",
          isRNVAccount: false,
          hasVerifiedBadge: false,
        },
      }),
      gameFixture(3, {
        playing: 300,
        creator: {
          id: 7,
          name: "MegaDev",
          type: "Group",
          isRNVAccount: false,
          hasVerifiedBadge: false,
        },
      }),
    ]);
    const run = makeRunner({ searchGames, getGames });
    const exit = await run(["--json", "creators", "--genre", "simulator"]);
    expect(exit).not.toHaveBeenCalled();
    const out = JSON.parse(stdoutText()) as {
      creators: Array<{
        creatorId: number;
        creatorName: string;
        totalPlayingAcrossSeedGames: number;
        gameCount: number;
      }>;
    };
    expect(out.creators[0]?.creatorId).toBe(7);
    expect(out.creators[0]?.totalPlayingAcrossSeedGames).toBe(600);
    expect(out.creators[0]?.gameCount).toBe(3);
  });

  it("requires --genre", async () => {
    const run = makeRunner({});
    const exit = await run(["creators"]);
    expect(exit).toHaveBeenCalled();
  });
});
