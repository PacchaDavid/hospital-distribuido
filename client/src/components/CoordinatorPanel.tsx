import { useState } from "react";
import { getSocket } from "../socket";
import { useStore } from "../store";

const NODE_NAMES: Record<number, string> = {
  1: "Hospital Loja",
  2: "Hospital Cuenca",
  3: "Hospital Esmeraldas",
  4: "Hospital Guayaquil",
  5: "Hospital Quito",
};

function CoordinatorPanel() {
  const cluster = useStore((s) => s.cluster);
  const [syncing, setSyncing] = useState(false);

  if (!cluster) return null;

  const handleSyncNow = () => {
    setSyncing(true);
    getSocket().emit("requestSync");
    setTimeout(() => setSyncing(false), 2000);
  };

  const handleToggleSync = (enabled: boolean) => {
    getSocket().emit("toggleSync", enabled);
  };

  const isAccessing = cluster.mutexAccess;
  const queueNames = cluster.mutex.queue.map((item) => ({
    nodeId: item.nodeId,
    name: NODE_NAMES[item.nodeId] || `ID ${item.nodeId}`,
  }));

  const currentUserName = cluster.mutex.currentUser
    ? NODE_NAMES[cluster.mutex.currentUser] || `ID ${cluster.mutex.currentUser}`
    : null;

  return (
    <div className="mb-6 p-4 rounded-lg bg-green-900/20 border border-green-700/50">
      <h2 className="text-lg font-semibold mb-3 text-green-300">Panel de Coordinación</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-semibold mb-2 text-green-200">Sincronización Cristian</h3>
          <div className="space-y-2">
            <button
              onClick={handleSyncNow}
              disabled={syncing}
              className="px-4 py-2 bg-green-700 hover:bg-green-600 disabled:bg-green-900 rounded text-sm"
            >
              {syncing ? "Sincronizando..." : "Sincronizar Ahora"}
            </button>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={cluster.syncState.enabled}
                onChange={(e) => handleToggleSync(e.target.checked)}
                className="accent-green-500"
              />
              Sincronización Periódica
            </label>
            {cluster.syncState.lastSync && (
              <div className="text-xs text-gray-400 space-y-1 mt-2">
                <p>Última sincronización: {new Date(cluster.syncState.lastSync).toLocaleTimeString()}</p>
                {cluster.syncState.lastOffset !== null && (
                  <p>Desfase: {cluster.syncState.lastOffset}ms</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2 text-green-200">Exclusión Mutua</h3>
          <div className="text-sm space-y-1">
            <p>
              Estado:{" "}
              <span className={cluster.mutex.state === "OCUPADO" ? "text-yellow-400" : "text-green-400"}>
                {cluster.mutex.state === "OCUPADO" ? "Ocupado" : "Libre"}
              </span>
            </p>
            {currentUserName && (
              <p className="text-yellow-300">Ocupado por: {currentUserName}</p>
            )}
            {queueNames.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-gray-400 mb-1">Cola FIFO:</p>
                <ol className="list-decimal list-inside text-xs space-y-0.5">
                  {queueNames.map((item, i) => (
                    <li key={i}>{item.name}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CoordinatorPanel;
