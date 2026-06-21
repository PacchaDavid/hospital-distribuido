import { resolveIdentity } from "./identity.js";
import { HEARTBEAT_INTERVAL_MS } from "./config.js";
import { logger } from "./logger.js";
import { TcpServer } from "./tcp/server.js";
import { ConnectionManager } from "./tcp/connection.js";
import { ElectionManager } from "./bully/election.js";
import { CristianSync } from "./cristian/sync.js";
import { MutexManager } from "./mutex/mutex.js";
import { ResourceManager } from "./resource/resource.js";
import { Store } from "./persistence/store.js";
import { startApi, type Controllers } from "./web/api.js";
import { SocketManager } from "./web/socket.js";

async function main() {
  logger.info("=== Organ Cluster Node Starting ===");

  let identity;
  try {
    identity = resolveIdentity();
  } catch (err) {
    logger.error((err as Error).message);
    process.exit(1);
    return;
  }

  logger.info(`Identity: ${identity.name} (ID ${identity.id}, IP ${identity.ip})`);

  const store = new Store();
  await store.init();

  const tcpServer = new TcpServer();
  tcpServer.start();

  const connections = new ConnectionManager(identity);
  connections.connectToAll();

  const election = new ElectionManager(identity, connections);
  const cristian = new CristianSync(identity, connections, election);
  const mutex = new MutexManager(identity, connections, election);
  const resource = new ResourceManager(identity, connections, election);

  let socket: SocketManager;

  const savedState = store.loadClusterState();
  if (savedState.syncEnabled) {
    cristian.loadState({ enabled: true, lastSync: null, lastOffset: null });
  }
  if (savedState.resourceVersion > 0) {
    resource.loadFromDisk();
  }

  election.on("logEvent", (message: string) => {
    logger.info(message);
    socket?.broadcastEvent(message);
  });

  election.on("coordinatorChanged", (coordinatorId: number) => {
    store.saveClusterState({ coordinatorId });
    socket?.emitCoordinatorChange(coordinatorId);
    cristian.handleCoordinatorChange(coordinatorId);
    mutex.resetForNewCoordinator();
    socket?.broadcastState();
  });

  election.on("stateChanged", () => {
    socket?.broadcastState();
  });

  election.on("nodeDown", (nodeId: number) => {
    socket?.emitNodeDown(nodeId);
  });

  election.on("nodeUp", (nodeId: number) => {
    socket?.emitNodeUp(nodeId);
  });

  cristian.on("syncStateChanged", (state: { enabled: boolean; lastSync: number | null; lastOffset: number | null }) => {
    store.saveClusterState({ syncEnabled: state.enabled });
    socket?.emitSyncStateChanged(state);
  });

  cristian.on("logEvent", (message: string) => {
    socket?.broadcastEvent(message);
  });

  mutex.on("mutexChanged", (data: { state: string; queue: unknown[]; currentUser: number | null }) => {
    socket?.emitMutexChanged(data);
  });

  mutex.on("accessGranted", () => {
    socket?.emitAccessGranted();
  });

  mutex.on("accessReleased", () => {
    socket?.emitAccessReleased();
  });

  mutex.on("logEvent", (message: string) => {
    socket?.broadcastEvent(message);
  });

  resource.on("organsChanged", (organs: unknown[], version: number) => {
    socket?.emitOrgansChanged(organs, version);
    store.saveClusterState({ resourceVersion: version });
  });

  resource.on("logEvent", (message: string) => {
    socket?.broadcastEvent(message);
  });

  resource.loadFromDisk();

  const controllers: Controllers = { identity, election, cristian, mutex, resource };

  await startApi(controllers);

  socket = new SocketManager({ identity, election, cristian, mutex, resource });

  tcpServer.on("message", ({ nodeId, message }: { nodeId: number; message: any }) => {
    handleTcpMessage(nodeId, message);
  });

  connections.on("message", ({ nodeId, message }: { nodeId: number; message: any }) => {
    handleTcpMessage(nodeId, message);
  });

  connections.on("identified", ({ nodeId }: { nodeId: number }) => {
    election.handleNodeAppeared(nodeId);
  });

  function handleTcpMessage(senderId: number, msg: any) {
    switch (msg.type) {
      case "HEARTBEAT":
        election.handleHeartbeat(msg, senderId);
        break;
      case "HEARTBEAT_ACK":
        election.handleHeartbeatAck();
        break;
      case "ELECTION":
        election.handleElection(msg, senderId);
        break;
      case "OK":
        election.handleOk(msg);
        break;
      case "COORDINATOR":
        election.handleCoordinator(msg);
        break;
      case "TIME_REQUEST":
        cristian.handleTimeRequest(senderId);
        break;
      case "TIME_RESPONSE":
        cristian.handleTimeResponse(msg);
        break;
      case "MUTEX_REQUEST":
        mutex.handleMutexRequest(msg, senderId);
        break;
      case "MUTEX_GRANTED":
        mutex.handleMutexGranted();
        break;
      case "MUTEX_RELEASE":
        mutex.handleMutexRelease(msg, senderId);
        break;
      case "RESOURCE_UPDATE":
        resource.handleResourceUpdate(msg);
        break;
      case "RESOURCE_ACK":
        resource.handleResourceAck(msg);
        break;
    }
    socket.broadcastState();
  }

  election.init();

  setInterval(() => {
    election.checkCoordinatorTimeout();
  }, HEARTBEAT_INTERVAL_MS);

  process.on("SIGINT", () => {
    logger.info("Shutting down...");
    election.destroy();
    cristian.destroy();
    connections.stop();
    tcpServer.stop();
    store.close();
    process.exit(0);
  });
}

main().catch((err) => {
  logger.error(`Fatal error: ${err.message}`);
  process.exit(1);
});
