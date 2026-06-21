import { EventEmitter } from "node:events";
import { HEARTBEAT_INTERVAL_MS, HEARTBEAT_TIMEOUT_MS, ELECTION_TIMEOUT_MS, type NodeState } from "../config.js";
import { logger } from "../logger.js";
import type { NodeIdentity } from "../identity.js";
import { getHigherNodes } from "../identity.js";
import type { TcpMessage } from "../tcp/protocol.js";
import type { ConnectionManager } from "../tcp/connection.js";


export interface NodeInfo {
  id: number;
  name: string;
  ip: string;
  state: NodeState;
  lastHeartbeat: number;
  resourceVersion: number;
}

export class ElectionManager extends EventEmitter {
  private identity: NodeIdentity;
  private connections: ConnectionManager;
  private state: NodeState = "STARTING";
  private coordinatorId: number | null = null;
  private electionTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private lastHeartbeatAck = 0;
  private okReceived = false;
  private nodes: Map<number, NodeInfo> = new Map();

  constructor(identity: NodeIdentity, connections: ConnectionManager) {
    super();
    this.identity = identity;
    this.connections = connections;
  }

  getState(): NodeState {
    return this.state;
  }

  getCoordinatorId(): number | null {
    return this.coordinatorId;
  }

  isCoordinator(): boolean {
    return this.state === "COORDINATOR";
  }

  getNodesInfo(): NodeInfo[] {
    return Array.from(this.nodes.values());
  }

  getNodeInfo(nodeId: number): NodeInfo | undefined {
    return this.nodes.get(nodeId);
  }

  setNodeResourceVersion(nodeId: number, version: number): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.resourceVersion = version;
    }
  }

  private setState(newState: NodeState): void {
    const oldState = this.state;
    this.state = newState;
    this.updateNodeInfo(this.identity.id, newState);
    logger.info(`State: ${oldState} -> ${newState}`);
    this.emit("stateChanged", { nodeId: this.identity.id, oldState, newState });
  }

  private updateNodeInfo(nodeId: number, state: NodeState): void {
    const existing = this.nodes.get(nodeId);
    if (existing) {
      existing.state = state;
    }
  }

  init(): void {
    for (const nodeId of [1, 2, 3, 4, 5]) {
      this.nodes.set(nodeId, {
        id: nodeId,
        name: "",
        ip: "",
        state: "OFFLINE",
        lastHeartbeat: 0,
        resourceVersion: 0,
      });
    }

    const myInfo = this.nodes.get(this.identity.id)!;
    myInfo.name = this.identity.name;
    myInfo.ip = this.identity.ip;
    myInfo.state = "STARTING";

    this.startHeartbeatMonitor();
    setTimeout(() => this.startElection(), 1500);
  }

  private startElection(): void {
    if (this.state === "ELECTION") return;
    if (this.electionTimer) {
      clearTimeout(this.electionTimer);
      this.electionTimer = null;
    }
    this.setState("ELECTION");
    this.emit("logEvent", `Nueva elección iniciada por ${this.identity.name}.`);

    const higher = getHigherNodes(this.identity.id);
    this.okReceived = false;

    if (higher.length === 0) {
      this.electionTimer = setTimeout(() => this.declareCoordinator(), 500);
      return;
    }

    for (const node of higher) {
      this.connections.send(node.id, { type: "ELECTION", senderId: this.identity.id });
    }

    this.electionTimer = setTimeout(() => {
      if (!this.okReceived) {
        this.declareCoordinator();
      }
    }, ELECTION_TIMEOUT_MS);
  }

  private declareCoordinator(): void {
    this.coordinatorId = this.identity.id;
    this.setState("COORDINATOR");
    this.connections.broadcast({ type: "COORDINATOR", coordinatorId: this.identity.id });
    this.emit("logEvent", `${this.identity.name} elegido coordinador.`);
    this.emit("coordinatorChanged", this.identity.id);
  }

  handleElection(msg: TcpMessage, senderId: number): void {
    if (senderId < this.identity.id) {
      this.connections.send(senderId, { type: "OK", senderId: this.identity.id });
      if (this.state !== "ELECTION" && this.state !== "COORDINATOR") {
        this.startElection();
      }
    }
  }

  handleOk(_msg: TcpMessage): void {
    this.okReceived = true;
    if (this.electionTimer) {
      clearTimeout(this.electionTimer);
      this.electionTimer = null;
    }
  }

  handleCoordinator(msg: TcpMessage): void {
    const coordId = msg.coordinatorId as number;
    this.coordinatorId = coordId;
    if (this.identity.id === coordId) {
      this.setState("COORDINATOR");
      this.emit("coordinatorChanged", coordId);
      return;
    }

    if (coordId > this.identity.id) {
      this.setState("FOLLOWER");
      this.emit("logEvent", `${this.identity.name} reconoce coordinador ID ${coordId}.`);
      this.emit("coordinatorChanged", coordId);
    } else if (coordId < this.identity.id) {
      this.startElection();
    }
  }

  private startHeartbeatMonitor(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.state === "COORDINATOR") {
        const now = Date.now();
        for (const [nodeId, info] of this.nodes) {
          if (nodeId === this.identity.id) continue;
          if (info.state === "OFFLINE") continue;
          if (now - info.lastHeartbeat > HEARTBEAT_TIMEOUT_MS) {
            if (info.state !== "SUSPECTED_DOWN") {
              info.state = "SUSPECTED_DOWN";
              this.emit("logEvent", `Coordinador detecta caída de nodo ${info.name}.`);
              this.emit("nodeDown", nodeId);
            }
          }
        }
      } else if (this.state === "FOLLOWER" && this.coordinatorId) {
        this.connections.send(this.coordinatorId, { type: "HEARTBEAT", nodeId: this.identity.id });
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  handleHeartbeat(msg: TcpMessage, senderId: number): void {
    const node = this.nodes.get(senderId);
    if (node) {
      node.lastHeartbeat = Date.now();
      if (node.state === "SUSPECTED_DOWN" || node.state === "OFFLINE") {
        node.state = "FOLLOWER";
        this.emit("logEvent", `Nodo ${node.name} recuperado.`);
        this.emit("nodeUp", senderId);
      }
      node.state = "FOLLOWER";
    }

    if (this.state === "COORDINATOR") {
      this.connections.send(senderId, { type: "HEARTBEAT_ACK" });
    }
  }

  handleHeartbeatAck(): void {
    this.lastHeartbeatAck = Date.now();
  }

  checkCoordinatorAlive(): boolean {
    if (!this.coordinatorId) return false;
    if (this.state !== "FOLLOWER") return true;
    return Date.now() - this.lastHeartbeatAck < HEARTBEAT_TIMEOUT_MS;
  }

  checkCoordinatorTimeout(): void {
    if (this.state === "FOLLOWER" && this.coordinatorId) {
      if (Date.now() - this.lastHeartbeatAck > HEARTBEAT_TIMEOUT_MS) {
        this.setState("SUSPECTED_DOWN");
        this.emit("logEvent", `Coordinador no disponible. ${this.identity.name} sospecha caída.`);
        setTimeout(() => {
          if (this.state === "SUSPECTED_DOWN") {
            this.startElection();
          }
        }, 1000);
      }
    }
  }

  handleNodeAppeared(nodeId: number): void {
    if (this.state === "ELECTION") return;
    if (this.state === "COORDINATOR" && nodeId > this.identity.id) {
      this.emit("logEvent", `Nodo ID ${nodeId} de mayor ID apareció. ${this.identity.name} cede liderazgo.`);
      this.setState("FOLLOWER");
      this.coordinatorId = nodeId;
      this.emit("coordinatorChanged", nodeId);
      return;
    }
    if (this.state !== "FOLLOWER" && nodeId > (this.coordinatorId ?? 0)) {
      this.emit("logEvent", `Nodo ID ${nodeId} de mayor ID reapareció. ${this.identity.name} inicia elección.`);
      this.startElection();
    }
  }

  destroy(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.electionTimer) clearTimeout(this.electionTimer);
  }
}
