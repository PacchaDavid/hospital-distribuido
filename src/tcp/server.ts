import { createServer, type Socket } from "node:net";
import { TCP_PORT } from "../config.js";
import { logger } from "../logger.js";
import { LineBuffer } from "./protocol.js";
import type { TcpMessage } from "./protocol.js";
import { EventEmitter } from "node:events";

export interface IncomingConnection {
  socket: Socket;
  remoteId: number | null;
}

export class TcpServer extends EventEmitter {
  private server = createServer();
  private connections = new Map<number, Socket>();
  private reverseLookup = new Map<string, number>();

  start(): void {
    this.server.listen(TCP_PORT, () => {
      logger.info(`TCP server listening on port ${TCP_PORT}`);
    });

    this.server.on("connection", (socket: Socket) => {
      const remoteAddr = `${socket.remoteAddress}:${socket.remotePort}`;
      logger.debug(`Inbound connection from ${remoteAddr}`);
      const buf = new LineBuffer();

      buf.on("message", (msg: TcpMessage) => {
        if (msg.type === "IDENTIFY") {
          const nodeId = msg.nodeId as number;
          this.connections.set(nodeId, socket);
          this.reverseLookup.set(remoteAddr, nodeId);
          this.emit("identified", { nodeId, socket });
          logger.info(`Node ${nodeId} connected from ${remoteAddr}`);
          this.emit("message", { nodeId, message: msg });
        } else {
          const nodeId = this.reverseLookup.get(remoteAddr);
          if (nodeId !== undefined) {
            this.emit("message", { nodeId, message: msg });
          }
        }
      });

      socket.on("close", () => {
        for (const [id, sock] of this.connections) {
          if (sock === socket) {
            this.connections.delete(id);
            logger.info(`Node ${id} disconnected`);
            this.emit("disconnected", id);
            break;
          }
        }
        for (const [addr, id] of this.reverseLookup) {
          if (addr === remoteAddr) {
            this.reverseLookup.delete(addr);
            break;
          }
        }
      });

      socket.on("error", (err) => {
        logger.error(`TCP server socket error: ${err.message}`);
      });

      socket.on("data", (data: Buffer) => buf.push(data));
    });

    this.server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        logger.error(`TCP port ${TCP_PORT} already in use`);
      } else {
        logger.error(`TCP server error: ${err.message}`);
      }
    });
  }

  stop(): void {
    this.server.close();
  }
}
