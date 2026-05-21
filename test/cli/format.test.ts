import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { print, printError } from "../../src/cli/format.js";

describe("cli/format.print", () => {
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

  const sample = [
    { id: 1, name: "alpha", playing: 10 },
    { id: 2, name: "beta", playing: 999 },
  ];

  it("emits a minified single-line JSON document in JSON mode", () => {
    print(
      { rows: sample },
      {
        kind: "table",
        spec: {
          head: ["id", "name", "playing"],
          rows: sample,
          toRow: (r) => [r.id, r.name, r.playing],
        },
      },
      { json: true, pretty: false },
    );
    const out = stdoutSpy.mock.calls.map((c) => c[0]).join("");
    expect(out).toBe(`${JSON.stringify({ rows: sample })}\n`);
    // No table characters leaked in.
    expect(out).not.toMatch(/[│┌┘├]/);
  });

  it("emits indented JSON in JSON + pretty mode", () => {
    print(
      { rows: sample },
      { kind: "table", spec: { head: [], rows: [], toRow: () => [] } },
      {
        json: true,
        pretty: true,
      },
    );
    const out = stdoutSpy.mock.calls.map((c) => c[0]).join("");
    expect(out).toContain("\n");
    expect(out).toContain('  "rows"');
  });

  it("renders a table in pretty mode with the supplied headers", () => {
    print(
      { rows: sample },
      {
        kind: "table",
        spec: {
          title: "demo",
          head: ["id", "name", "playing"],
          rows: sample,
          toRow: (r) => [r.id, r.name, r.playing],
        },
      },
      { json: false, pretty: false },
    );
    const out = stdoutSpy.mock.calls.map((c) => c[0]).join("");
    expect(out).toContain("demo");
    expect(out).toContain("id");
    expect(out).toContain("alpha");
    expect(out).toContain("beta");
    // Numbers are locale-formatted in pretty mode.
    expect(out).toContain("999");
  });

  it("renders a key:value block in pretty mode", () => {
    print(
      { user: { id: 1, name: "ada" } },
      {
        kind: "kv",
        spec: {
          title: "User",
          pairs: [
            ["id", 1],
            ["name", "ada"],
            ["bio", null],
          ],
        },
      },
      { json: false, pretty: false },
    );
    const out = stdoutSpy.mock.calls.map((c) => c[0]).join("");
    expect(out).toContain("User");
    expect(out).toContain("id");
    expect(out).toContain("ada");
  });
});

describe("cli/format.printError", () => {
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

  it("writes a JSON error doc to stdout in JSON mode", () => {
    printError({ code: "VALIDATION_ERROR", message: "bad" }, { json: true, pretty: false });
    const out = stdoutSpy.mock.calls.map((c) => c[0]).join("");
    expect(JSON.parse(out)).toEqual({ error: { code: "VALIDATION_ERROR", message: "bad" } });
    expect(stderrSpy).not.toHaveBeenCalled();
  });

  it("writes a human-readable line to stderr in pretty mode", () => {
    printError({ code: "ROBLOX_NOT_FOUND", message: "missing" }, { json: false, pretty: false });
    const err = stderrSpy.mock.calls.map((c) => c[0]).join("");
    expect(err).toContain("ROBLOX_NOT_FOUND");
    expect(err).toContain("missing");
    expect(stdoutSpy).not.toHaveBeenCalled();
  });
});
