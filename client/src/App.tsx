import { useEffect } from "react";
import { getSocket } from "./socket";
import { useStore } from "./store";
import Dashboard from "./components/Dashboard";
import CoordinatorPanel from "./components/CoordinatorPanel";
import OrganPanel from "./components/OrganPanel";
import EventLog from "./components/EventLog";
import type { ClusterState } from "./types";

const NODE_NAMES: Record<number, string> = {
  1: "Loja",
  2: "Cuenca",
  3: "Esmeraldas",
  4: "Guayaquil",
  5: "Quito",
};

const STATUS_COLORS: Record<string, string> = {
  COORDINATOR: "bg-crimson-500",
  FOLLOWER: "bg-jade-500",
  ELECTION: "bg-gold-500",
  SUSPECTED_DOWN: "bg-crimson-700",
  STARTING: "bg-steel",
  OFFLINE: "bg-steel-dark",
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
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-crimson-500 animate-breath" />
            <span className="font-display text-xl font-semibold tracking-tight text-bone">
              organ-cluster
            </span>
          </div>
          <p className="text-bone-muted text-sm">Conectando al clúster...</p>
        </div>
      </div>
    );
  }

  const statusDots = [1, 2, 3, 4, 5].map((id) => {
    const node = cluster.nodes.find((n) => n.id === id);
    const state = node?.state || "OFFLINE";
    const color = STATUS_COLORS[state] || "bg-steel-dark";
    const isCoord = cluster.coordinatorId === id;
    return { id, state, color, isCoord };
  });

  return (
    <div className="min-h-screen bg-midnight">
      <header className="border-b border-white/5">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="space-y-0.5">
            <h1 className="font-display text-lg font-bold tracking-tight text-bone">
              organ-cluster
            </h1>
            <p className="text-bone-muted text-xs font-display">
              {cluster.name} (ID: {cluster.nodeId}) &middot; v{cluster.resourceVersion}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center -space-x-0.5">
              {statusDots.map((dot) => (
                <div
                  key={dot.id}
                  className="relative group"
                >
                  <span
                    className={`block w-2.5 h-2.5 rounded-full border border-midnight/60 ${dot.color} ${
                      dot.isCoord ? "animate-breath" : ""
                    }`}
                  />
                  <div className="absolute top-full right-0 mt-1.5 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity bg-surface border border-white/10 rounded px-2 py-1 text-[11px] whitespace-nowrap text-bone-muted z-10">
                    {NODE_NAMES[dot.id]} &middot; {dot.state}
                  </div>
                </div>
              ))}
            </div>

            <span className="h-4 w-px bg-white/10" />

            <div className="text-right text-[11px] leading-tight text-bone-muted font-display">
              <p>
                Coordinador:{" "}
                <span className="text-crimson-400 font-semibold">
                  {cluster.coordinatorId
                    ? NODE_NAMES[cluster.coordinatorId] ?? `#${cluster.coordinatorId}`
                    : "—"}
                </span>
              </p>
              <p className="text-[10px]">
                {cluster.syncState.lastOffset !== null
                  ? `Desfase: ${cluster.syncState.lastOffset >= 0 ? "+" : ""}${cluster.syncState.lastOffset}ms`
                  : "Sin sincronizar"}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-6 space-y-8">
        <Dashboard nodes={cluster.nodes} cluster={cluster} />

        {cluster.isCoordinator && <CoordinatorPanel />}

        <OrganPanel />

        <EventLog />
      </main>

      <footer className="border-t border-white/5 py-4">
        <p className="text-center text-[11px] text-bone-muted font-display">
          Bully &middot; Cristian &middot; Exclusión Mutua Centralizada
        </p>
      </footer>
    </div>
  );
}

export default App;
