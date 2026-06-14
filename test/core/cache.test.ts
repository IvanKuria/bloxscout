import { BloxscoutCache } from "@bloxscout/core/cache";
import { describe, expect, it, vi } from "vitest";

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

describe("BloxscoutCache", () => {
  it("caches successful loads and skips the loader on hit", async () => {
    const cache = new BloxscoutCache();
    const loader = vi.fn(async () => "fresh");

    const first = await cache.get("k", loader, 60);
    const second = await cache.get("k", loader, 60);

    expect(first).toBe("fresh");
    expect(second).toBe("fresh");
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("re-fetches after the TTL elapses", async () => {
    const cache = new BloxscoutCache();
    let n = 0;
    const loader = vi.fn(async () => `v${++n}`);

    // Use a very small (sub-second) TTL so we don't slow the suite. `BloxscoutCache`
    // multiplies by 1000 internally, so 0.05s ≈ 50ms.
    await cache.get("k", loader, 0.05);
    await wait(80);
    const after = await cache.get("k", loader, 0.05);

    expect(after).toBe("v2");
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("isolates keys", async () => {
    const cache = new BloxscoutCache();
    const a = await cache.get("a", async () => "A", 60);
    const b = await cache.get("b", async () => "B", 60);
    expect(a).toBe("A");
    expect(b).toBe("B");
    expect(cache.size).toBe(2);
  });

  it("dedupes concurrent loads for the same key", async () => {
    const cache = new BloxscoutCache();
    let calls = 0;
    const loader = vi.fn(async () => {
      calls++;
      await wait(20);
      return "shared";
    });

    const p1 = cache.get("k", loader, 60);
    const p2 = cache.get("k", loader, 60);
    const [v1, v2] = await Promise.all([p1, p2]);

    expect(v1).toBe("shared");
    expect(v2).toBe("shared");
    expect(calls).toBe(1);
  });

  it("does not cache failed loads (so the next call retries)", async () => {
    const cache = new BloxscoutCache();
    const loader = vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce("ok");

    await expect(cache.get("k", loader, 60)).rejects.toThrow("boom");
    const result = await cache.get("k", loader, 60);
    expect(result).toBe("ok");
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("delete and clear remove entries", async () => {
    const cache = new BloxscoutCache();
    await cache.get("k", async () => "v", 60);
    expect(cache.has("k")).toBe(true);
    cache.delete("k");
    expect(cache.has("k")).toBe(false);

    await cache.get("a", async () => 1, 60);
    await cache.get("b", async () => 2, 60);
    cache.clear();
    expect(cache.size).toBe(0);
  });
});
