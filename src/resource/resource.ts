import { EventEmitter } from "node:events";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { ORGANOS_PATH } from "../config.js";
import { logger } from "../logger.js";
import type { NodeIdentity } from "../identity.js";
import type { TcpMessage } from "../tcp/protocol.js";
import type { ConnectionManager } from "../tcp/connection.js";
import type { ElectionManager } from "../bully/election.js";


export interface Organ {
  id: string;
  tipo_organo: string;
  donante: string;
  hospital_origen: string;
  estado: string;
  ultima_actualizacion: string;
}

export class ResourceManager extends EventEmitter {
  private identity: NodeIdentity;
  private connections: ConnectionManager;
  private election: ElectionManager;
  private organs: Organ[] = [];
  private version = 0;
  private ackCount = 0;
  private expectedAcks = 0;
  private pendingVersion: number | null = null;

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

  getOrgans(): Organ[] {
    return [...this.organs];
  }

  getVersion(): number {
    return this.version;
  }

  loadFromDisk(): void {
    if (existsSync(ORGANOS_PATH)) {
      try {
        const raw = readFileSync(ORGANOS_PATH, "utf-8");
        const data = JSON.parse(raw) as { version: number; organs: Organ[] };
        this.organs = data.organs ?? [];
        this.version = data.version ?? 0;
        logger.info(`Loaded ${this.organs.length} organs, version ${this.version}`);
      } catch (err) {
        logger.error(`Failed to load organs: ${(err as Error).message}`);
        this.initDefaultData();
      }
    } else {
      this.initDefaultData();
    }
  }

  private initDefaultData(): void {
    this.organs = [
      { id: "ORG-001", tipo_organo: "Riñón", donante: "DON-001", hospital_origen: "Hospital Loja", estado: "Disponible", ultima_actualizacion: new Date().toISOString() },
      { id: "ORG-002", tipo_organo: "Corazón", donante: "DON-002", hospital_origen: "Hospital Quito", estado: "Disponible", ultima_actualizacion: new Date().toISOString() },
      { id: "ORG-003", tipo_organo: "Hígado", donante: "DON-003", hospital_origen: "Hospital Guayaquil", estado: "Disponible", ultima_actualizacion: new Date().toISOString() },
      { id: "ORG-004", tipo_organo: "Pulmón", donante: "DON-004", hospital_origen: "Hospital Cuenca", estado: "Disponible", ultima_actualizacion: new Date().toISOString() },
    ];
    this.version = 1;
    this.saveToDisk();
  }

  saveToDisk(): void {
    try {
      const data = JSON.stringify({ version: this.version, organs: this.organs }, null, 2);
      writeFileSync(ORGANOS_PATH, data, "utf-8");
    } catch (err) {
      logger.error(`Failed to save organs: ${(err as Error).message}`);
    }
  }

  addOrgan(organ: Omit<Organ, "id" | "ultima_actualizacion">): Organ {
    const newId = `ORG-${String(this.organs.length + 1).padStart(3, "0")}`;
    const newOrgan: Organ = {
      ...organ,
      id: newId,
      ultima_actualizacion: new Date().toISOString(),
    };
    this.organs.push(newOrgan);
    this.version++;
    this.saveToDisk();
    return newOrgan;
  }

  updateOrgan(id: string, updates: Partial<Organ>): Organ | null {
    const idx = this.organs.findIndex((o) => o.id === id);
    if (idx === -1) return null;
    this.organs[idx] = { ...this.organs[idx], ...updates, ultima_actualizacion: new Date().toISOString() };
    this.version++;
    this.saveToDisk();
    return this.organs[idx];
  }

  broadcastUpdate(): void {
    if (!this.election.isCoordinator()) return;

    const connected = this.connections.getConnectedNodes().length;
    this.expectedAcks = Math.max(1, Math.ceil((connected + 1) / 2));
    this.pendingVersion = this.version;
    this.ackCount = 0;

    this.connections.broadcast({
      type: "RESOURCE_UPDATE",
      version: this.version,
      data: this.organs,
    });
  }

  handleResourceUpdate(msg: TcpMessage): void {
    const remoteVersion = msg.version as number;
    const data = msg.data as Organ[];

    if (remoteVersion > this.version) {
      this.organs = data;
      this.version = remoteVersion;
      this.saveToDisk();
      this.emit("organsChanged", this.organs, this.version);
      this.emit("logEvent", `Recurso replicado correctamente. Versión ${remoteVersion}.`);
    }
  }

  handleResourceAck(msg: TcpMessage): void {
    if (!this.election.isCoordinator()) return;
    const ackVersion = msg.version as number;

    if (ackVersion === this.pendingVersion) {
      this.ackCount++;
      if (this.ackCount >= this.expectedAcks) {
        this.pendingVersion = null;
        this.emit("logEvent", `Recurso replicado correctamente. Versión ${ackVersion}.`);
      }
    }
  }

  handleResourceSync(msg: TcpMessage): void {
    const remoteVersion = msg.version as number;
    const data = msg.data as Organ[];

    if (remoteVersion > this.version) {
      this.organs = data;
      this.version = remoteVersion;
      this.saveToDisk();
      this.emit("organsChanged", this.organs, this.version);
      this.emit("logEvent", `Recurso sincronizado desde nodo remoto. Versión ${remoteVersion}.`);
    }

    if (this.election.isCoordinator()) {
      this.broadcastUpdate();
    }
  }
}
