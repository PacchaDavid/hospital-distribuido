import { EventEmitter } from "node:events";
import { type MutexState } from "../config.js";
import { logger } from "../logger.js";
import type { NodeIdentity } from "../identity.js";
import { getNodeById } from "../identity.js";
import type { TcpMessage } from "../tcp/protocol.js";
import type { ConnectionManager } from "../tcp/connection.js";
import type { ElectionManager } from "../bully/election.js";


export interface MutexQueueItem {
  nodeId: number;
  timestamp: number;
}

export class MutexManager extends EventEmitter {
  private identity: NodeIdentity;
  private connections: ConnectionManager;
  private election: ElectionManager;
  private state: MutexState = "LIBRE";
  private queue: MutexQueueItem[] = [];
  private currentUser: number | null = null;
  private hasAccess = false;

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

  getState(): MutexState {
    return this.state;
  }

  getQueue(): MutexQueueItem[] {
    return [...this.queue];
  }

  getCurrentUser(): number | null {
    return this.currentUser;
  }

  hasAccessToResource(): boolean {
    return this.hasAccess;
  }

  requestAccess(): void {
    if (this.hasAccess) return;

    const coordinatorId = this.election.getCoordinatorId();
    if (!coordinatorId) {
      logger.warn("No coordinator available for mutex request");
      return;
    }

    this.connections.send(coordinatorId, { type: "MUTEX_REQUEST", nodeId: this.identity.id });
    this.emit("logEvent", `${this.identity.name} solicitó acceso al recurso.`);
  }

  releaseAccess(): void {
    if (!this.hasAccess) return;
    this.hasAccess = false;

    const coordinatorId = this.election.getCoordinatorId();
    if (coordinatorId) {
      this.connections.send(coordinatorId, { type: "MUTEX_RELEASE" });
    }
    this.emit("logEvent", `${this.identity.name} liberó el recurso.`);
    this.emit("accessReleased");
  }

  handleMutexRequest(msg: TcpMessage, senderId: number): void {
    if (!this.election.isCoordinator()) return;

    const item: MutexQueueItem = { nodeId: senderId, timestamp: Date.now() };

    if (this.state === "LIBRE") {
      this.state = "OCUPADO";
      this.currentUser = senderId;
      this.connections.send(senderId, { type: "MUTEX_GRANTED" });
      this.emit("logEvent", `Recurso asignado a ${getNodeById(senderId)?.name ?? senderId}.`);
    } else {
      this.queue.push(item);
      this.emit("logEvent", `${getNodeById(senderId)?.name ?? senderId} encolado.`);
    }

    this.emit("mutexChanged", { state: this.state, queue: this.queue, currentUser: this.currentUser });
  }

  handleMutexGranted(): void {
    this.hasAccess = true;
    this.emit("accessGranted");
    this.emit("logEvent", `${this.identity.name} obtuvo acceso al recurso.`);
  }

  handleMutexRelease(msg: TcpMessage, senderId: number): void {
    if (!this.election.isCoordinator()) return;

    if (this.currentUser === senderId) {
      this.currentUser = null;
      this.emit("logEvent", `${getNodeById(senderId)?.name ?? senderId} liberó el recurso.`);

      if (this.queue.length > 0) {
        const next = this.queue.shift()!;
        this.state = "OCUPADO";
        this.currentUser = next.nodeId;
        this.connections.send(next.nodeId, { type: "MUTEX_GRANTED" });
        this.emit("logEvent", `Recurso asignado a ${getNodeById(next.nodeId)?.name ?? next.nodeId}.`);
      } else {
        this.state = "LIBRE";
      }

      this.emit("mutexChanged", { state: this.state, queue: this.queue, currentUser: this.currentUser });
    }
  }

  resetForNewCoordinator(): void {
    this.queue = [];
    this.currentUser = null;
    this.state = "LIBRE";
    this.emit("mutexChanged", { state: this.state, queue: this.queue, currentUser: null });
  }
}
