/**
 * Local SQLite snapshot store.
 *
 * Roblox does not expose historical CCU / visits / favorites data. Bloxscout
 * builds its own time-series by periodically capturing `Game` rows from the
 * public API and persisting them here. The store is the foundation of the
 * rankings module (`./rankings.ts`) and the scheduler (`./scheduler.ts`).
 *
 * The store lives at `~/.bloxscout/data.db` by default. The directory can be
 * overridden via the `BLOXSCOUT_DATA_DIR` environment variable, or by passing
 * `{ dbPath }` to the constructor.
 */

import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import Database from "better-sqlite3";
import type { Game, RobloxUniverseId } from "./types.js";

/**
 * Resolve the default DB path. Honours `BLOXSCOUT_DATA_DIR` first, then falls
 * back to `~/.bloxscout/data.db`.
 */
export function defaultDbPath(): string {
  const overrideDir = process.env.BLOXSCOUT_DATA_DIR;
  const dir = overrideDir && overrideDir.length > 0 ? overrideDir : join(homedir(), ".bloxscout");
  return join(dir, "data.db");
}

export interface SnapshotStoreOptions {
  /** Override the SQLite file location. Parent dir is created on open. */
  dbPath?: string;
}

/** Persisted shape of a single snapshot row. */
export interface GameSnapshot {
  universeId: RobloxUniverseId;
  takenAt: string;
  playing: number;
  visits: number;
  favoritedCount: number;
  totalUpVotes: number;
  totalDownVotes: number;
}

/** Persisted shape of a metadata row. */
export interface GameMetadataRow {
  universeId: RobloxUniverseId;
  name: string | null;
  genre: string | null;
  creatorType: string | null;
  creatorId: number | null;
  firstSeen: string;
  lastSeen: string;
}

export interface GetHistoryOptions {
  /** Inclusive lower bound on `taken_at`. */
  since?: Date;
  /** Max rows returned. Default 100. */
  limit?: number;
}

/**
 * Input accepted by `recordSnapshot`. We accept any object that looks like a
 * `Game` but also tolerate the optional vote-count fields that Roblox returns
 * from `/v1/games/votes` (not yet wired in Phase 1). When absent, they
 * default to 0 on write.
 */
export type SnapshotInput = Game & {
  totalUpVotes?: number;
  totalDownVotes?: number;
};

interface RawSnapshotRow {
  universe_id: number;
  taken_at: string;
  playing: number;
  visits: number;
  favorited_count: number;
  total_up_votes: number;
  total_down_votes: number;
}

interface RawMetadataRow {
  universe_id: number;
  name: string | null;
  genre: string | null;
  creator_type: string | null;
  creator_id: number | null;
  first_seen: string;
  last_seen: string;
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS game_snapshots (
  universe_id   INTEGER NOT NULL,
  taken_at      TEXT    NOT NULL,
  playing       INTEGER NOT NULL,
  visits        INTEGER NOT NULL,
  favorited_count INTEGER NOT NULL,
  total_up_votes  INTEGER NOT NULL,
  total_down_votes INTEGER NOT NULL,
  PRIMARY KEY (universe_id, taken_at)
);

CREATE INDEX IF NOT EXISTS idx_game_snapshots_universe_time
  ON game_snapshots (universe_id, taken_at DESC);

CREATE TABLE IF NOT EXISTS game_metadata (
  universe_id INTEGER PRIMARY KEY,
  name        TEXT,
  genre       TEXT,
  creator_type TEXT,
  creator_id   INTEGER,
  first_seen   TEXT NOT NULL,
  last_seen    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY
);
INSERT OR IGNORE INTO schema_version (version) VALUES (1);
`;

/**
 * SQLite-backed time-series store for Roblox game state.
 *
 * All queries flow through prepared statements; writes use transactions for
 * atomicity and throughput. The store is single-process — concurrent writers
 * (e.g. two `bloxscout snapshot` processes) rely on SQLite's file locking.
 */
export class SnapshotStore {
  private readonly db: Database.Database;
  private readonly insertSnapshot: Database.Statement;
  private readonly upsertMetadata: Database.Statement;
  private readonly selectHistory: Database.Statement;
  private readonly selectLatest: Database.Statement;
  private readonly selectTrackedIds: Database.Statement;
  private readonly selectMetadata: Database.Statement;
  private readonly deleteBefore: Database.Statement;

  constructor(options: SnapshotStoreOptions = {}) {
    const dbPath = options.dbPath ?? defaultDbPath();
    mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    // WAL gives us concurrent readers + a single writer, which is what we want
    // for the CLI / MCP combination.
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.db.exec(SCHEMA_SQL);

    this.insertSnapshot = this.db.prepare(
      `INSERT OR REPLACE INTO game_snapshots
        (universe_id, taken_at, playing, visits, favorited_count, total_up_votes, total_down_votes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    this.upsertMetadata = this.db.prepare(
      `INSERT INTO game_metadata
        (universe_id, name, genre, creator_type, creator_id, first_seen, last_seen)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(universe_id) DO UPDATE SET
         name = excluded.name,
         genre = excluded.genre,
         creator_type = excluded.creator_type,
         creator_id = excluded.creator_id,
         last_seen = excluded.last_seen`,
    );
    this.selectHistory = this.db.prepare(
      `SELECT universe_id, taken_at, playing, visits, favorited_count,
              total_up_votes, total_down_votes
         FROM game_snapshots
        WHERE universe_id = ? AND taken_at >= ?
        ORDER BY taken_at DESC
        LIMIT ?`,
    );
    this.selectLatest = this.db.prepare(
      `SELECT universe_id, taken_at, playing, visits, favorited_count,
              total_up_votes, total_down_votes
         FROM game_snapshots
        WHERE universe_id = ?
        ORDER BY taken_at DESC
        LIMIT 1`,
    );
    this.selectTrackedIds = this.db.prepare(
      "SELECT DISTINCT universe_id FROM game_snapshots ORDER BY universe_id",
    );
    this.selectMetadata = this.db.prepare(
      `SELECT universe_id, name, genre, creator_type, creator_id, first_seen, last_seen
         FROM game_metadata
        WHERE universe_id = ?`,
    );
    this.deleteBefore = this.db.prepare("DELETE FROM game_snapshots WHERE taken_at < ?");
  }

  /**
   * Bulk-record snapshots for `games`. Wrapped in a single transaction so a
   * partial failure cannot half-write the batch. `taken_at` is set to "now"
   * once for the whole batch — callers comparing across games can rely on
   * the shared timestamp.
   */
  recordSnapshot(games: SnapshotInput[]): { recorded: number; takenAt: string } {
    const takenAt = new Date().toISOString();
    if (games.length === 0) return { recorded: 0, takenAt };

    const apply = this.db.transaction((batch: SnapshotInput[]) => {
      for (const g of batch) {
        this.insertSnapshot.run(
          g.id,
          takenAt,
          g.playing,
          g.visits,
          g.favoritedCount,
          g.totalUpVotes ?? 0,
          g.totalDownVotes ?? 0,
        );
        this.upsertMetadata.run(
          g.id,
          g.name ?? null,
          g.genre ?? null,
          g.creator?.type ?? null,
          g.creator?.id ?? null,
          takenAt,
          takenAt,
        );
      }
    });
    apply(games);
    return { recorded: games.length, takenAt };
  }

  /**
   * Return snapshots for `universeId` ordered newest-first. Defaults to the
   * last 100 rows; pass `since` to bound the window.
   */
  getGameHistory(universeId: RobloxUniverseId, opts: GetHistoryOptions = {}): GameSnapshot[] {
    const limit = opts.limit ?? 100;
    const since = opts.since ?? new Date(0);
    const rows = this.selectHistory.all(universeId, since.toISOString(), limit) as RawSnapshotRow[];
    return rows.map(rowToSnapshot);
  }

  /** Most recent snapshot for `universeId`, or `null` if untracked. */
  getLatestSnapshot(universeId: RobloxUniverseId): GameSnapshot | null {
    const row = this.selectLatest.get(universeId) as RawSnapshotRow | undefined;
    return row ? rowToSnapshot(row) : null;
  }

  /** All distinct universe IDs with at least one snapshot. */
  getTrackedUniverseIds(): RobloxUniverseId[] {
    const rows = this.selectTrackedIds.all() as Array<{ universe_id: number }>;
    return rows.map((r) => r.universe_id);
  }

  /** Game metadata row, or `null` if we've never seen this universe. */
  getMetadata(universeId: RobloxUniverseId): GameMetadataRow | null {
    const row = this.selectMetadata.get(universeId) as RawMetadataRow | undefined;
    if (!row) return null;
    return {
      universeId: row.universe_id,
      name: row.name,
      genre: row.genre,
      creatorType: row.creator_type,
      creatorId: row.creator_id,
      firstSeen: row.first_seen,
      lastSeen: row.last_seen,
    };
  }

  /** Delete snapshots strictly older than `before`. Returns rows removed. */
  prune(before: Date): number {
    const result = this.deleteBefore.run(before.toISOString());
    return result.changes;
  }

  /** Close the underlying SQLite handle. Idempotent. */
  close(): void {
    if (this.db.open) {
      this.db.close();
    }
  }
}

function rowToSnapshot(row: RawSnapshotRow): GameSnapshot {
  return {
    universeId: row.universe_id,
    takenAt: row.taken_at,
    playing: row.playing,
    visits: row.visits,
    favoritedCount: row.favorited_count,
    totalUpVotes: row.total_up_votes,
    totalDownVotes: row.total_down_votes,
  };
}
