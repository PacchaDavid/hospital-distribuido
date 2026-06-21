import type { NodeInfo, ClusterState } from "../types";

const stateStyles: Record<string, { bg: string; border: string; label: string }> = {
  COORDINATOR: { bg: "bg-green-900/40", border: "border-green-500", label: "Coordinador" },
  FOLLOWER: { bg: "bg-blue-900/40", border: "border-blue-500", label: "Seguidor" },
  ELECTION: { bg: "bg-yellow-900/40", border: "border-yellow-500", label: "Elección" },
  SUSPECTED_DOWN: { bg: "bg-red-900/40", border: "border-red-500", label: "Caído" },
  STARTING: { bg: "bg-gray-800", border: "border-gray-500", label: "Iniciando" },
  OFFLINE: { bg: "bg-red-950", border: "border-red-800", label: "Offline" },
};

const NODE_NAMES: Record<number, string> = {
  1: "Hospital Loja",
  2: "Hospital Cuenca",
  3: "Hospital Esmeraldas",
  4: "Hospital Guayaquil",
  5: "Hospital Quito",
};

const NODE_IPS: Record<number, string> = {
  1: "192.168.1.10",
  2: "192.168.1.11",
  3: "192.168.1.12",
  4: "192.168.1.13",
  5: "192.168.1.14",
};

function Dashboard({ nodes, cluster }: { nodes: NodeInfo[]; cluster: ClusterState }) {
  const allNodes = [1, 2, 3, 4, 5].map((id) => {
    const live = nodes.find((n) => n.id === id);
    return {
      id,
      name: NODE_NAMES[id] || `Node ${id}`,
      ip: NODE_IPS[id] || "",
      state: live?.state || "OFFLINE",
      isCoordinator: cluster.coordinatorId === id,
      isMe: cluster.nodeId === id,
    };
  });

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold mb-3">Hospitales</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {allNodes.map((node) => {
          const style = stateStyles[node.state] || stateStyles.OFFLINE;
          return (
            <div
              key={node.id}
              className={`rounded-lg border-2 p-4 ${style.bg} ${style.border} ${
                node.isMe ? "ring-2 ring-white/50" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold">{node.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${style.bg} ${style.border} border`}>
                  {style.label}
                </span>
              </div>
              <div className="text-xs text-gray-400 space-y-1">
                <p>ID: {node.id}</p>
                <p>IP: {node.ip}</p>
                {node.isCoordinator && (
                  <p className="text-green-400 font-semibold">★ Coordinador</p>
                )}
                {node.isMe && <p className="text-cyan-400">← Tú</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Dashboard;
