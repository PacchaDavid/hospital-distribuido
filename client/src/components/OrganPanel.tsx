import { useState } from "react";
import { getSocket } from "../socket";
import { useStore } from "../store";

const ESTADOS = ["Disponible", "Asignado", "Transplantado"] as const;

const ESTADO_COLORS: Record<string, string> = {
  Disponible: "text-jade-400",
  Asignado: "text-gold-400",
  Transplantado: "text-steel",
};

function OrganPanel() {
  const cluster = useStore((s) => s.cluster);
  const [showAddForm, setShowAddForm] = useState(false);
  const [tipo, setTipo] = useState("");
  const [donante, setDonante] = useState("");
  const [hospital, setHospital] = useState("");
  const [estado, setEstado] = useState("Disponible");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEstado, setEditEstado] = useState("");

  if (!cluster) return null;

  const handleRequestAccess = () => {
    getSocket().emit("requestMutex");
  };

  const handleReleaseAccess = () => {
    getSocket().emit("releaseMutex");
  };

  const handleAddOrgan = () => {
    getSocket().emit("addOrgan", {
      tipo_organo: tipo,
      donante,
      hospital_origen: hospital,
      estado,
    });
    setShowAddForm(false);
    setTipo("");
    setDonante("");
    setHospital("");
    setEstado("Disponible");
  };

  const handleUpdateEstado = (id: string) => {
    getSocket().emit("updateOrgan", { id, estado: editEstado });
    setEditingId(null);
  };

  const mutexAccent = cluster.mutexAccess ? "border-gold-500/30 bg-gold-900/10" : "border-white/5 bg-surface/30";

  return (
    <section className={`rounded-sm border px-5 py-4 ${mutexAccent}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-sm font-semibold text-bone">
          Órganos
          <span className="font-mono text-[10px] text-bone-muted font-normal ml-2">
            ({cluster.organs.length})
          </span>
        </h2>

        <div className="flex items-center gap-3">
          {cluster.mutexAccess && (
            <span className="flex items-center gap-1.5 text-gold-400 font-display text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-gold-500 animate-breath" />
              USANDO RECURSO
            </span>
          )}
          {!cluster.mutexAccess && cluster.mutex.currentUser !== null && (
            <span className="font-display text-[11px] text-bone-muted">Esperando...</span>
          )}
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {!cluster.mutexAccess ? (
          <button
            onClick={handleRequestAccess}
            className="px-3 py-1.5 rounded-sm bg-crimson-500/20 border border-crimson-500/40
              font-display text-xs font-medium text-crimson-400
              hover:bg-crimson-500/30 transition-colors"
          >
            Solicitar acceso
          </button>
        ) : (
          <>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-3 py-1.5 rounded-sm bg-jade-500/20 border border-jade-500/40
                font-display text-xs font-medium text-jade-400
                hover:bg-jade-500/30 transition-colors"
            >
              Agregar órgano
            </button>
            <button
              onClick={handleReleaseAccess}
              className="px-3 py-1.5 rounded-sm border border-white/10
                font-display text-xs font-medium text-bone-muted
                hover:bg-surface-hover transition-colors"
            >
              Liberar recurso
            </button>
          </>
        )}
      </div>

      {showAddForm && (
        <div className="mb-4 p-3 rounded-sm border border-white/10 bg-surface/50 space-y-3">
          <h3 className="font-display text-xs font-semibold text-bone">Nuevo órgano</h3>
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="Tipo de órgano"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="px-2.5 py-1.5 rounded-sm bg-midnight border border-white/10 font-display text-xs text-bone placeholder:text-bone-muted/40 outline-none focus:border-crimson-500/60 transition-colors"
            />
            <input
              placeholder="Donante"
              value={donante}
              onChange={(e) => setDonante(e.target.value)}
              className="px-2.5 py-1.5 rounded-sm bg-midnight border border-white/10 font-display text-xs text-bone placeholder:text-bone-muted/40 outline-none focus:border-crimson-500/60 transition-colors"
            />
            <input
              placeholder="Hospital origen"
              value={hospital}
              onChange={(e) => setHospital(e.target.value)}
              className="px-2.5 py-1.5 rounded-sm bg-midnight border border-white/10 font-display text-xs text-bone placeholder:text-bone-muted/40 outline-none focus:border-crimson-500/60 transition-colors"
            />
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="px-2.5 py-1.5 rounded-sm bg-midnight border border-white/10 font-display text-xs text-bone outline-none focus:border-crimson-500/60 transition-colors"
            >
              {ESTADOS.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddOrgan}
              className="px-3 py-1 rounded-sm bg-jade-500/20 border border-jade-500/40
                font-display text-xs font-medium text-jade-400
                hover:bg-jade-500/30 transition-colors"
            >
              Guardar
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1 rounded-sm border border-white/10
                font-display text-xs font-medium text-bone-muted
                hover:bg-surface-hover transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/5 font-display text-[10px] font-semibold text-bone-muted uppercase tracking-wider">
              <th className="py-2 pr-3 font-mono font-normal">ID</th>
              <th className="py-2 pr-3">Tipo</th>
              <th className="py-2 pr-3">Donante</th>
              <th className="py-2 pr-3">Hospital</th>
              <th className="py-2 pr-3">Estado</th>
              <th className="py-2 pr-3">Actualización</th>
              {cluster.mutexAccess && <th className="py-2">Acción</th>}
            </tr>
          </thead>
          <tbody>
            {cluster.organs.map((organ) => (
              <tr
                key={organ.id}
                className="border-b border-white/[3%] transition-colors hover:bg-surface/50"
              >
                <td className="py-2 pr-3 font-mono text-[11px] text-bone-muted">
                  {organ.id}
                </td>
                <td className="py-2 pr-3 font-display text-xs text-bone">
                  {organ.tipo_organo}
                </td>
                <td className="py-2 pr-3 font-display text-xs text-bone">
                  {organ.donante}
                </td>
                <td className="py-2 pr-3 font-display text-[11px] text-bone-muted">
                  {organ.hospital_origen}
                </td>
                <td className="py-2 pr-3">
                  {editingId === organ.id ? (
                    <select
                      value={editEstado}
                      onChange={(e) => setEditEstado(e.target.value)}
                      className="px-1.5 py-0.5 rounded-sm bg-midnight border border-white/10 font-display text-[11px] text-bone outline-none focus:border-crimson-500/60"
                    >
                      {ESTADOS.map((e) => (
                        <option key={e} value={e}>{e}</option>
                      ))}
                    </select>
                  ) : (
                    <span className={`font-display text-[11px] font-medium ${ESTADO_COLORS[organ.estado] || "text-bone-muted"}`}>
                      {organ.estado}
                    </span>
                  )}
                </td>
                <td className="py-2 pr-3 font-mono text-[10px] text-bone-muted/60 whitespace-nowrap">
                  {new Date(organ.ultima_actualizacion).toLocaleString()}
                </td>
                {cluster.mutexAccess && (
                  <td className="py-2">
                    {editingId === organ.id ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleUpdateEstado(organ.id)}
                          className="px-2 py-0.5 rounded-sm bg-jade-500/20 border border-jade-500/40
                            font-display text-[10px] font-medium text-jade-400
                            hover:bg-jade-500/30 transition-colors"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-2 py-0.5 rounded-sm border border-white/10
                            font-display text-[10px] font-medium text-bone-muted
                            hover:bg-surface-hover transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingId(organ.id); setEditEstado(organ.estado); }}
                        className="px-2 py-0.5 rounded-sm border border-white/10
                          font-display text-[10px] font-medium text-bone-muted
                          hover:bg-surface-hover transition-colors"
                      >
                        Modificar
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {cluster.organs.length === 0 && (
          <p className="py-6 text-center font-display text-xs text-bone-muted">
            No hay órganos registrados.
          </p>
        )}
      </div>
    </section>
  );
}

export default OrganPanel;
