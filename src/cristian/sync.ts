import { EventEmitter } from "node:events";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { CRISTIAN_SYNC_INTERVAL_MS, MIN_TIME_ADJUSTMENT_MS } from "../config.js";
import { logger } from "../logger.js";
import type { NodeIdentity } from "../identity.js";
import type { TcpMessage } from "../tcp/protocol.js";
import type { ConnectionManager } from "../tcp/connection.js";
import type { ElectionManager } from "../bully/election.js";

const execAsync = promisify(exec);

export interface SyncState {
  enabled: boolean;
  lastSync: number | null;
  lastOffset: number | null;
}

export class CristianSync extends EventEmitter {
  private identity: NodeIdentity;
  private connections: ConnectionManager;
  private election: ElectionManager;
  private syncState: SyncState = { enabled: false, lastSync: null, lastOffset: null };
  private periodicTimer: ReturnType<typeof setInterval> | null = null;
  private pendingSyncT0: number | null = null;

  constructor(
    identity: NodeIdentity,
    connections: ConnectionManager,
    election: ElectionManager,
  ) {
    super();
    this.identity = identity;
    this.connections = connections;
    this.election = election;
  }

  getSyncState(): SyncState {
    return { ...this.syncState };
  }

  setEnabled(enabled: boolean): void {
    this.syncState.enabled = enabled;
    this.emit("syncStateChanged", this.syncState);

    if (enabled && !this.periodicTimer) {
      this.periodicTimer = setInterval(() => this.syncNow(), CRISTIAN_SYNC_INTERVAL_MS);
    } else if (!enabled && this.periodicTimer) {
      clearInterval(this.periodicTimer);
      this.periodicTimer = null;
    }
  }

  isEnabled(): boolean {
    return this.syncState.enabled;
  }

  async syncNow(): Promise<void> {
    const coordinatorId = this.election.getCoordinatorId();
    if (!coordinatorId) {
      logger.warn("Cannot sync: no coordinator");
      this.emit("logEvent", "Sincronización: no hay coordinador disponible.");
      return;
    }
    if (coordinatorId === this.identity.id) {
      logger.warn("Cannot sync: I am the coordinator (time server)");
      this.emit("logEvent", "El coordinador es el servidor de tiempo. Los seguidores se sincronizan automáticamente.");
      return;
    }
    if (!this.connections.isConnected(coordinatorId)) {
      logger.warn("Cannot sync: coordinator not connected");
      this.emit("logEvent", "Sincronización: coordinador no conectado.");
      return;
    }

    const T0 = Date.now();
    this.pendingSyncT0 = T0;
    this.connections.send(coordinatorId, { type: "TIME_REQUEST", _T0: T0 });
    this.emit("logEvent", `Solicitando sincronización al coordinador...`);
  }

  handleTimeRequest(senderId: number, msg: TcpMessage): void {
    const T1 = Date.now();
    this.connections.send(senderId, {
      type: "TIME_RESPONSE",
      serverTime: T1,
      _T0: msg._T0,
    });
  }

  async handleTimeResponse(msg: TcpMessage): Promise<void> {
    const serverTime = msg.serverTime as number;
    const T1 = Date.now();
    const clientT0 = this.pendingSyncT0;
    if (!clientT0) {
      logger.warn("Received TIME_RESPONSE without pending request");
      return;
    }
    const RTT = T1 - clientT0;
    this.pendingSyncT0 = null;
    const adjustedTime = Math.floor(serverTime + RTT / 2);
    const offset = adjustedTime - T1;

    this.syncState.lastSync = Date.now();
    this.syncState.lastOffset = offset;
    this.emit("syncStateChanged", this.syncState);

    if (Math.abs(offset) >= MIN_TIME_ADJUSTMENT_MS) {
      try {
        await execAsync("sudo timedatectl set-ntp false");
      } catch (err) {
        logger.error(`Failed to disable NTP: ${(err as Error).message}`);
        this.emit("logEvent", `Error deshabilitando NTP: ${(err as Error).message}`);
      }
      try {
        const date = new Date(adjustedTime);
        const pad = (n: number) => String(n).padStart(2, "0");
        const dateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
        await execAsync(`sudo timedatectl set-time "${dateStr}"`);
        logger.info(`Time adjusted by ${offset}ms`);
        this.emit("logEvent", `Sincronización completada. Desfase: ${offset}ms.`);
      } catch (err) {
        logger.error(`Failed to set time: ${(err as Error).message}`);
        this.emit("logEvent", `Error sincronizando reloj: ${(err as Error).message}`);
      }
    } else {
      logger.info(`Offset ${offset}ms below threshold, no adjustment needed`);
      this.emit("logEvent", `Sincronización completada. Desfase mínimo: ${offset}ms.`);
    }
  }

  handleCoordinatorChange(coordinatorId: number): void {
    if (this.syncState.enabled && this.periodicTimer) {
      clearInterval(this.periodicTimer);
      this.periodicTimer = setInterval(() => this.syncNow(), CRISTIAN_SYNC_INTERVAL_MS);
    }
  }

  loadState(state: SyncState): void {
    this.syncState = state;
    if (this.syncState.enabled) {
      this.setEnabled(true);
    }
  }

  toJSON(): SyncState {
    return this.syncState;
  }

  destroy(): void {
    if (this.periodicTimer) clearInterval(this.periodicTimer);
  }

}
