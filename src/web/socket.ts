import { Server } from "socket.io";
import { logger } from "../logger.js";
import type { ElectionManager } from "../bully/election.js";
import type { CristianSync } from "../cristian/sync.js";
import type { MutexManager } from "../mutex/mutex.js";
import type { ResourceManager } from "../resource/resource.js";
import type { NodeIdentity } from "../identity.js";
import type { ConnectionManager } from "../tcp/connection.js";

export class SocketManager {
  private io: Server;
  private controllers: {
    identity: NodeIdentity;
    election: ElectionManager;
    cristian: CristianSync;
    mutex: MutexManager;
    resource: ResourceManager;
    connections: ConnectionManager;
  };

  constructor(
    httpServer: any,
    controllers: {
      identity: NodeIdentity;
      election: ElectionManager;
      cristian: CristianSync;
      mutex: MutexManager;
      resource: ResourceManager;
      connections: ConnectionManager;
    }
  ) {
    this.controllers = controllers;
    this.io = new Server(httpServer, { cors: { origin: "*" } });

    this.io.on("connection", (socket) => {
      logger.debug(`Web client connected: ${socket.id}`);
      socket.emit("init", this.getStatePayload());

      socket.on("requestSync", () => {
        if (controllers.election.isCoordinator()) {
          controllers.connections.broadcast({ type: "SYNC_NOW" });
          logger.info("Coordinator broadcast SYNC_NOW to all followers");
        } else {
          controllers.cristian.syncNow();
        }
      });

      socket.on("toggleSync", (enabled: boolean) => {
        if (controllers.election.isCoordinator()) {
          controllers.cristian.setEnabled(enabled);
        }
      });

      socket.on("requestMutex", () => {
        controllers.mutex.requestAccess();
      });

      socket.on("releaseMutex", () => {
        controllers.mutex.releaseAccess();
      });

      socket.on("addOrgan", (data: { tipo_organo: string; donante: string; hospital_origen: string; estado: string }) => {
        if (controllers.mutex.hasAccessToResource()) {
          const organ = controllers.resource.addOrgan(data);
          if (controllers.election.isCoordinator()) {
            controllers.resource.broadcastUpdate();
          }
          this.broadcastState();
        }
      });

      socket.on("updateOrgan", (data: { id: string; [key: string]: unknown }) => {
        if (controllers.mutex.hasAccessToResource()) {
          const organ = controllers.resource.updateOrgan(data.id, data);
          if (organ && controllers.election.isCoordinator()) {
            controllers.resource.broadcastUpdate();
          }
          this.broadcastState();
        }
      });
    });

    logger.info("Socket.IO initialized and attached to HTTP server");
  }

  private getStatePayload() {
    return {
      nodeId: this.controllers.identity.id,
      name: this.controllers.identity.name,
      ip: this.controllers.identity.ip,
      state: this.controllers.election.getState(),
      coordinatorId: this.controllers.election.getCoordinatorId(),
      isCoordinator: this.controllers.election.isCoordinator(),
      nodes: this.controllers.election.getNodesInfo(),
      syncState: this.controllers.cristian.getSyncState(),
      mutex: {
        state: this.controllers.mutex.getState(),
        queue: this.controllers.mutex.getQueue(),
        currentUser: this.controllers.mutex.getCurrentUser(),
      },
      organs: this.controllers.resource.getOrgans(),
      resourceVersion: this.controllers.resource.getVersion(),
      mutexAccess: this.controllers.mutex.hasAccessToResource(),
    };
  }

  broadcastState(): void {
    this.io.emit("stateUpdate", this.getStatePayload());
  }

  broadcastEvent(message: string): void {
    this.io.emit("event", { message, timestamp: Date.now() });
  }

  emitCoordinatorChange(coordinatorId: number): void {
    this.io.emit("coordinatorChange", { coordinatorId });
    this.broadcastState();
  }

  emitNodeDown(nodeId: number): void {
    this.io.emit("nodeDown", { nodeId });
    this.broadcastState();
  }

  emitNodeUp(nodeId: number): void {
    this.io.emit("nodeUp", { nodeId });
    this.broadcastState();
  }

  emitMutexChanged(data: { state: string; queue: unknown[]; currentUser: number | null }): void {
    this.io.emit("mutexChanged", data);
    this.broadcastState();
  }

  emitAccessGranted(): void {
    this.io.emit("accessGranted");
    this.broadcastState();
  }

  emitAccessReleased(): void {
    this.io.emit("accessReleased");
    this.broadcastState();
  }

  emitOrgansChanged(organs: unknown[], version: number): void {
    this.io.emit("organsChanged", { organs, version });
    this.broadcastState();
  }

  emitSyncStateChanged(state: { enabled: boolean; lastSync: number | null; lastOffset: number | null }): void {
    this.io.emit("syncStateChanged", state);
    this.broadcastState();
  }
}
