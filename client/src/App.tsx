import { useEffect } from "react";
import { getSocket } from "./socket";
import { useStore } from "./store";
import Dashboard from "./components/Dashboard";
import CoordinatorPanel from "./components/CoordinatorPanel";
import OrganPanel from "./components/OrganPanel";
import EventLog from "./components/EventLog";
import type { ClusterState } from "./types";

const nodeStateColors: Record<string, string> = {
  COORDINATOR: "bg-green-600",
  FOLLOWER: "bg-blue-600",
  SUSPECTED_DOWN: "bg-red-600",
  ELECTION: "bg-yellow-500",
  STARTING: "bg-gray-500",
  OFFLINE: "bg-red-800",
};

function App() {
  const cluster = useStore((s) => s.cluster);
  const setCluster = useStore((s) => s.setCluster);
  const addEvent = useStore((s) => s.addEvent);
  const updateOrgans = useStore((s) => s.updateOrgans);
  const updateSyncState = useStore((s) => s.updateSyncState);
  const setMutex = useStore((s) => s.setMutex);
  const setAccessGranted = useStore((s) => s.setAccessGranted);
  const setAccessReleased = useStore((s) => s.setAccessReleased);

  useEffect(() => {
    const socket = getSocket();

    socket.on("init", (data: ClusterState) => {
      setCluster(data);
    });

    socket.on("stateUpdate", (data: ClusterState) => {
      setCluster(data);
    });

    socket.on("event", (data: { message: string; timestamp: number }) => {
      addEvent(data);
    });

    socket.on("organsChanged", (data: { organs: ClusterState["organs"]; version: number }) => {
      updateOrgans(data.organs, data.version);
    });

    socket.on("syncStateChanged", (data: { enabled: boolean; lastSync: number | null; lastOffset: number | null }) => {
      updateSyncState(data);
    });

    socket.on("mutexChanged", (data: { state: string; queue: { nodeId: number; timestamp: number }[]; currentUser: number | null }) => {
      setMutex(data);
    });

    socket.on("accessGranted", () => {
      setAccessGranted();
    });

    socket.on("accessReleased", () => {
      setAccessReleased();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  if (!cluster) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-xl text-gray-400">Conectando al clúster...</p>
      </div>
    );
  }

  const stateColor = nodeStateColors[cluster.state] || "bg-gray-500";

  return (
    <div className="min-h-screen p-4 max-w-7xl mx-auto">
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Sistema Distribuido de Donación de Órganos</h1>
            <p className="text-gray-400 mt-1">
              {cluster.name} (ID: {cluster.nodeId}) -{" "}
              <span className={`inline-block w-3 h-3 rounded-full ${stateColor} mr-1`}></span>
              {cluster.state}
            </p>
          </div>
          <div className="text-right text-sm text-gray-400">
            <p>Coordinador: {cluster.coordinatorId ? cluster.nodes.find((n) => n.id === cluster.coordinatorId)?.name ?? `ID ${cluster.coordinatorId}` : "N/A"}</p>
            <p>Versión recurso: {cluster.resourceVersion}</p>
          </div>
        </div>
      </header>

      <Dashboard nodes={cluster.nodes} cluster={cluster} />

      {cluster.isCoordinator && <CoordinatorPanel />}

      <OrganPanel />
      <EventLog />

      <footer className="mt-8 text-center text-xs text-gray-600">
        Organ Cluster v1.0 - Bully &middot; Cristian &middot; Exclusión Mutua Centralizada
      </footer>
    </div>
  );
}

export default App;
