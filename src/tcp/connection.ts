import { connect, type Socket } from "node:net";
import { TCP_PORT, RECONNECT_INTERVAL_MS } from "../config.js";
import { logger } from "../logger.js";
import { encodeMessage, LineBuffer } from "./protocol.js";
import type { TcpMessage } from "./protocol.js";
import { EventEmitter } from "node:events";
import { getOtherNodes, type NodeIdentity } from "../identity.js";

const RECONNECTING = new Set<number>();

export class ConnectionManager extends EventEmitter {
  private connections = new Map<number, Socket>();
  private identity: NodeIdentity;

  constructor(identity: NodeIdentity) {
    super();
    this.identity = identity;
  }

  connectToAll(): void {
    const others = getOtherNodes(this.identity.id);
    for (const node of others) {
      this.connectTo(node.id, node.ip);
    }
  }

  private connectTo(nodeId: number, ip: string): void {
    if (this.connections.has(nodeId)) return;
    if (RECONNECTING.has(nodeId)) return;

    const socket = connect(TCP_PORT, ip, () => {
      RECONNECTING.delete(nodeId);
      this.connections.set(nodeId, socket);
      logger.info(`Connected to node ${nodeId} (${ip})`);

      socket.write(encodeMessage({ type: "IDENTIFY", nodeId: this.identity.id }));
    });

    const buf = new LineBuffer();
    buf.on("message", (msg: TcpMessage) => {
      if (msg.type === "IDENTIFY") {
        if (msg.nodeId === nodeId) {
          logger.debug(`IDENTITY confirmed for node ${nodeId}`);
          this.emit("identified", { nodeId, socket });
        }
        this.emit("message", { nodeId, message: msg });
      } else {
        this.emit("message", { nodeId, message: msg });
      }
    });

    socket.on("close", () => {
      this.connections.delete(nodeId);
      logger.warn(`Connection to node ${nodeId} closed`);
      this.emit("disconnected", nodeId);
      RECONNECTING.add(nodeId);
      setTimeout(() => this.connectTo(nodeId, ip), RECONNECT_INTERVAL_MS);
    });

    socket.on("error", (err) => {
      logger.error(`Connection error to node ${nodeId}: ${err.message}`);
    });

    socket.pipe(buf as unknown as NodeJS.WritableStream);
  }

  send(nodeId: number, msg: TcpMessage): void {
    const socket = this.connections.get(nodeId);
    if (socket && !socket.destroyed && socket.writable) {
      socket.write(encodeMessage(msg));
    } else {
      logger.warn(`Cannot send to node ${nodeId}: no connection`);
    }
  }

  broadcast(msg: TcpMessage, excludeId?: number): void {
    for (const [id] of this.connections) {
      if (id !== excludeId) {
        this.send(id, msg);
      }
    }
  }

  isConnected(nodeId: number): boolean {
    return this.connections.has(nodeId);
  }

  getConnectedNodes(): number[] {
    return Array.from(this.connections.keys());
  }

  stop(): void {
    for (const [, socket] of this.connections) {
      socket.destroy();
    }
    this.connections.clear();
  }
}
