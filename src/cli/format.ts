import chalk from "chalk";
import Table from "cli-table3";

/**
 * Output shape controllers shared by every command. Wired from the root
 * program's global flags so individual commands stay declarative — they
 * describe their data and let `print` render it.
 */
export interface FormatOptions {
  /** Emit raw JSON to stdout instead of a pretty table / block. */
  json: boolean;
  /** When `json` is true, pretty-print with 2-space indent instead of minified. */
  pretty: boolean;
}

export interface TableSpec<T> {
  /** Title shown above the table in pretty mode. Hidden in JSON mode. */
  title?: string;
  /** Column headers, in display order. */
  head: string[];
  /** Map each row to a cell array matching `head`. */
  rows: T[];
  /**
   * Cell mapper, returns one string per `head` column. Receives the row index
   * as the second argument so commands can emit a leading `#` column without
   * pre-decorating their row data.
   */
  toRow: (row: T, index: number) => Array<string | number>;
  /** Per-column horizontal alignment; defaults to `left` for all columns. */
  alignments?: Array<"left" | "right" | "center">;
}

export interface KeyValueSpec {
  title?: string;
  pairs: Array<[string, string | number | boolean | null | undefined]>;
}

/**
 * Single rendering entry point used by every command. Chooses pretty vs JSON
 * based on `opts.json`. In JSON mode the structured `data` payload is
 * serialized as-is (so commands stay in control of the wire shape); in
 * pretty mode the supplied `spec` is rendered with `cli-table3` + `chalk`.
 */
export function print<T>(
  data: unknown,
  spec: { kind: "table"; spec: TableSpec<T> } | { kind: "kv"; spec: KeyValueSpec },
  opts: FormatOptions,
): void {
  if (opts.json) {
    process.stdout.write(`${opts.pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data)}\n`);
    return;
  }
  if (spec.kind === "table") {
    renderTable(spec.spec);
  } else {
    renderKeyValue(spec.spec);
  }
}

/**
 * Render a pre-formatted block of text (e.g. a Markdown document) in pretty
 * mode, or fall back to the structured JSON payload in `--json` mode. Used by
 * commands like `report` whose pretty output is already-rendered prose rather
 * than a table.
 */
export function printText(data: unknown, text: string, opts: FormatOptions): void {
  if (opts.json) {
    process.stdout.write(`${opts.pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data)}\n`);
    return;
  }
  // Ensure a trailing newline so callers don't have to think about it.
  process.stdout.write(text.endsWith("\n") ? text : `${text}\n`);
}

/** Pretty-printed JSON error doc / human-readable stderr line. */
export function printError(
  payload: { code: string; message: string; data?: Record<string, unknown> },
  opts: FormatOptions,
): void {
  if (opts.json) {
    const body = { error: payload };
    process.stdout.write(`${opts.pretty ? JSON.stringify(body, null, 2) : JSON.stringify(body)}\n`);
    return;
  }
  process.stderr.write(`${chalk.red("bloxscout error")} [${payload.code}]: ${payload.message}\n`);
}

function renderTable<T>(spec: TableSpec<T>): void {
  if (spec.title !== undefined) {
    process.stdout.write(`${chalk.bold(spec.title)}\n`);
  }
  const head = spec.head.map((h) => chalk.cyan.bold(h));
  const colAligns = spec.alignments ?? spec.head.map(() => "left" as const);
  const table = new Table({ head, colAligns, style: { head: [], border: [] } });
  for (const [idx, row] of spec.rows.entries()) {
    const cells = spec.toRow(row, idx).map((c) => formatCell(c));
    table.push(cells);
  }
  process.stdout.write(`${table.toString()}\n`);
}

function renderKeyValue(spec: KeyValueSpec): void {
  if (spec.title !== undefined) {
    process.stdout.write(`${chalk.bold(spec.title)}\n`);
  }
  const labelWidth = Math.max(...spec.pairs.map(([k]) => k.length));
  for (const [key, value] of spec.pairs) {
    const padded = key.padEnd(labelWidth);
    const rendered = value === null || value === undefined ? chalk.dim("—") : String(value);
    process.stdout.write(`  ${chalk.cyan(padded)}  ${rendered}\n`);
  }
}

function formatCell(value: string | number): string {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value.toLocaleString("en-US") : String(value);
  }
  return value;
}

/**
 * Parse the global `--json` / `--pretty` / `--no-color` flags off the root
 * program. Centralized so subcommands don't have to traverse `parent.opts()`
 * themselves.
 */
export function getFormatOptions(opts: Record<string, unknown>): FormatOptions {
  return {
    json: Boolean(opts.json),
    pretty: Boolean(opts.pretty),
  };
}
