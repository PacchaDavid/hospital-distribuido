import initSqlJs from "sql.js";
import type { Database as SqlJsDatabase } from "sql.js";
import { DB_PATH, DATA_DIR } from "../config.js";
import { logger } from "../logger.js";
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";


export interface ClusterState {
  coordinatorId: number | null;
  clusterState: string;
  syncEnabled: boolean;
  resourceVersion: number;
}

export class Store {
  private db: SqlJsDatabase | null = null;

  async init(): Promise<void> {
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
    }

    const SQL = await initSqlJs();

    if (existsSync(DB_PATH)) {
      const buffer = readFileSync(DB_PATH);
      this.db = new SQL.Database(buffer);
    } else {
      this.db = new SQL.Database();
    }

    this.db.run(`
      CREATE TABLE IF NOT EXISTS cluster_state (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);
    this.saveFile();
    logger.info("SQLite store initialized");
  }

  private saveFile(): void {
    if (!this.db) return;
    const data = this.db.export();
    writeFileSync(DB_PATH, Buffer.from(data));
  }

  private get(key: string): string | null {
    if (!this.db) return null;
    const stmt = this.db.prepare("SELECT value FROM cluster_state WHERE key = ?");
    stmt.bind([key]);
    if (stmt.step()) {
      const row = stmt.getAsObject() as { value: string };
      stmt.free();
      return row.value;
    }
    stmt.free();
    return null;
  }

  private set(key: string, value: string): void {
    if (!this.db) return;
    this.db.run("INSERT OR REPLACE INTO cluster_state (key, value) VALUES (?, ?)", [key, value]);
    this.saveFile();
  }

  loadClusterState(): ClusterState {
    return {
      coordinatorId: this.get("coordinatorId") ? parseInt(this.get("coordinatorId")!, 10) : null,
      clusterState: this.get("clusterState") ?? "STARTING",
      syncEnabled: this.get("syncEnabled") === "true",
      resourceVersion: this.get("resourceVersion") ? parseInt(this.get("resourceVersion")!, 10) : 0,
    };
  }

  saveClusterState(state: Partial<ClusterState>): void {
    if (state.coordinatorId !== undefined) this.set("coordinatorId", String(state.coordinatorId));
    if (state.clusterState !== undefined) this.set("clusterState", state.clusterState);
    if (state.syncEnabled !== undefined) this.set("syncEnabled", String(state.syncEnabled));
    if (state.resourceVersion !== undefined) this.set("resourceVersion", String(state.resourceVersion));
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
