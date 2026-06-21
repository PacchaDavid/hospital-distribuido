import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import { HTTP_PORT, CLIENT_DIST_PATH } from "../config.js";
import { logger } from "../logger.js";
import { existsSync } from "node:fs";
import type { ElectionManager } from "../bully/election.js";
import type { CristianSync } from "../cristian/sync.js";
import type { MutexManager } from "../mutex/mutex.js";
import type { ResourceManager } from "../resource/resource.js";
import type { NodeIdentity } from "../identity.js";


export interface Controllers {
  identity: NodeIdentity;
  election: ElectionManager;
  cristian: CristianSync;
  mutex: MutexManager;
  resource: ResourceManager;
}

export function createApi(controllers: Controllers) {
  const app = Fastify({ logger: false });

  app.register(cors, { origin: true });

  app.get("/api/status", async () => {
    return {
      nodeId: controllers.identity.id,
      name: controllers.identity.name,
      ip: controllers.identity.ip,
      state: controllers.election.getState(),
      coordinatorId: controllers.election.getCoordinatorId(),
      isCoordinator: controllers.election.isCoordinator(),
      nodes: controllers.election.getNodesInfo(),
      syncState: controllers.cristian.getSyncState(),
      mutex: {
        state: controllers.mutex.getState(),
        queue: controllers.mutex.getQueue(),
        currentUser: controllers.mutex.getCurrentUser(),
      },
      organs: controllers.resource.getOrgans(),
      resourceVersion: controllers.resource.getVersion(),
      mutexAccess: controllers.mutex.hasAccessToResource(),
    };
  });

  app.post<{ Body: { enabled: boolean } }>("/api/sync/toggle", async (req) => {
    if (!controllers.election.isCoordinator()) {
      return { error: "Solo el coordinador puede controlar la sincronización" };
    }
    controllers.cristian.setEnabled(req.body.enabled);
    return { enabled: req.body.enabled };
  });

  app.post("/api/sync/now", async () => {
    await controllers.cristian.syncNow();
    return { syncing: true };
  });

  app.post<{ Body: { id: string } }>("/api/mutex/request", async () => {
    controllers.mutex.requestAccess();
    return { requested: true };
  });

  app.post("/api/mutex/release", async () => {
    controllers.mutex.releaseAccess();
    return { released: true };
  });

  app.post<{ Body: { tipo_organo: string; donante: string; hospital_origen: string; estado: string } }>(
    "/api/organs/add",
    async (req) => {
      if (!controllers.mutex.hasAccessToResource()) {
        return { error: "No tienes acceso al recurso. Solicita acceso primero." };
      }
      const organ = controllers.resource.addOrgan(req.body);
      if (controllers.election.isCoordinator()) {
        controllers.resource.broadcastUpdate();
      }
      return { organ };
    },
  );

  app.post<{ Body: { id: string; tipo_organo?: string; donante?: string; hospital_origen?: string; estado?: string } }>(
    "/api/organs/update",
    async (req) => {
      if (!controllers.mutex.hasAccessToResource()) {
        return { error: "No tienes acceso al recurso. Solicita acceso primero." };
      }
      const organ = controllers.resource.updateOrgan(req.body.id, req.body);
      if (!organ) return { error: "Órgano no encontrado" };
      if (controllers.election.isCoordinator()) {
        controllers.resource.broadcastUpdate();
      }
      return { organ };
    },
  );

  const distPath = CLIENT_DIST_PATH;
  if (existsSync(distPath)) {
    app.register(fastifyStatic, { root: distPath, prefix: "/" });
    app.setNotFoundHandler((_req, reply) => {
      reply.sendFile("index.html");
    });
  }

  return app;
}

export async function startApi(controllers: Controllers): Promise<void> {
  const app = createApi(controllers);
  try {
    await app.listen({ port: HTTP_PORT, host: "0.0.0.0" });
    logger.info(`HTTP API listening on port ${HTTP_PORT}`);
  } catch (err) {
    logger.error(`Failed to start HTTP server: ${(err as Error).message}`);
  }
}
