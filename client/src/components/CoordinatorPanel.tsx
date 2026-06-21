import { useState } from "react";
import { getSocket } from "../socket";
import { useStore } from "../store";

const NODE_NAMES: Record<number, string> = {
  1: "Loja",
  2: "Cuenca",
  3: "Esmeraldas",
  4: "Guayaquil",
  5: "Quito",
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

  const queue = cluster.mutex.queue.map((item) => ({
    nodeId: item.nodeId,
    name: NODE_NAMES[item.nodeId] || `ID ${item.nodeId}`,
  }));

  const currentUser = cluster.mutex.currentUser
    ? NODE_NAMES[cluster.mutex.currentUser] || `ID ${cluster.mutex.currentUser}`
    : null;

  return (
    <section className="rounded-sm border border-gold-500/30 bg-gold-900/10 px-5 py-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-1.5 h-1.5 rounded-full bg-gold-500 animate-breath" />
        <h2 className="font-display text-sm font-semibold text-gold-400">
          Panel de Coordinación
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h3 className="font-display text-xs font-semibold text-bone-muted uppercase tracking-wider">
            Sincronización Cristian
          </h3>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSyncNow}
              disabled={syncing}
              className="px-3.5 py-1.5 rounded-sm bg-gold-500/15 border border-gold-500/40
                font-display text-xs font-medium text-gold-400
                hover:bg-gold-500/25 hover:border-gold-500/60
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-colors"
            >
              {syncing ? "Sincronizando..." : "Sincronizar ahora"}
            </button>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={cluster.syncState.enabled}
                onChange={(e) => handleToggleSync(e.target.checked)}
                className="accent-gold-500 w-3 h-3"
              />
              <span className="font-display text-[11px] text-bone-muted">
                Automática
              </span>
            </label>
          </div>

          {cluster.syncState.lastSync && (
            <div className="space-y-0.5 font-mono text-[10px] text-bone-muted/60">
              <p>
                Última sincronización:{" "}
                {new Date(cluster.syncState.lastSync).toLocaleTimeString()}
              </p>
              {cluster.syncState.lastOffset !== null && (
                <p>
                  Desfase:{" "}
                  <span className={cluster.syncState.lastOffset <= 50 ? "text-jade-400" : "text-gold-400"}>
                    {cluster.syncState.lastOffset >= 0 ? "+" : ""}
                    {cluster.syncState.lastOffset}ms
                  </span>
                </p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="font-display text-xs font-semibold text-bone-muted uppercase tracking-wider">
            Exclusión Mutua
          </h3>

          <div className="flex items-center gap-2">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                cluster.mutex.state === "OCUPADO" ? "bg-gold-500 animate-breath" : "bg-jade-500"
              }`}
            />
            <span className="font-display text-xs font-medium text-bone">
              {cluster.mutex.state === "OCUPADO" ? "Ocupado" : "Libre"}
            </span>
          </div>

          {currentUser && (
            <p className="font-display text-[11px] text-gold-400">
              Ocupado por: {currentUser}
            </p>
          )}

          {queue.length > 0 && (
            <div>
              <p className="font-display text-[10px] text-bone-muted uppercase tracking-wider mb-1">
                Cola FIFO
              </p>
              <ol className="space-y-0.5">
                {queue.map((item, i) => (
                  <li
                    key={i}
                    className="font-mono text-[11px] text-bone-muted"
                  >
                    {String(i + 1).padStart(2, "0")}. {item.name}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default CoordinatorPanel;
