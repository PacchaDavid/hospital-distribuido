import { useState } from "react";
import { getSocket } from "../socket";
import { useStore } from "../store";

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

  return (
    <div className={`mb-6 p-4 rounded-lg border-2 ${
      cluster.mutexAccess
        ? "border-yellow-500 bg-yellow-900/10"
        : "border-gray-700 bg-gray-800/50"
    }`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Órganos</h2>
        <div className="flex items-center gap-3">
          {cluster.mutexAccess && (
            <span className="text-yellow-400 text-sm font-bold flex items-center gap-1">
              <span className="inline-block w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
              USANDO RECURSO
            </span>
          )}
          {!cluster.mutexAccess && cluster.mutex.currentUser !== null && (
            <span className="text-gray-400 text-sm">ESPERANDO</span>
          )}
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {!cluster.mutexAccess ? (
          <button
            onClick={handleRequestAccess}
            className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 rounded text-sm"
          >
            Solicitar acceso
          </button>
        ) : (
          <>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-3 py-1.5 bg-green-700 hover:bg-green-600 rounded text-sm"
            >
              Agregar órgano
            </button>
            <button
              onClick={handleReleaseAccess}
              className="px-3 py-1.5 bg-red-700 hover:bg-red-600 rounded text-sm"
            >
              Liberar recurso
            </button>
          </>
        )}
      </div>

      {showAddForm && (
        <div className="mb-4 p-3 bg-gray-800 rounded border border-gray-600 space-y-2">
          <h3 className="text-sm font-semibold">Nuevo órgano</h3>
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="Tipo de órgano"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="px-2 py-1 bg-gray-700 rounded text-sm border border-gray-600"
            />
            <input
              placeholder="Donante"
              value={donante}
              onChange={(e) => setDonante(e.target.value)}
              className="px-2 py-1 bg-gray-700 rounded text-sm border border-gray-600"
            />
            <input
              placeholder="Hospital origen"
              value={hospital}
              onChange={(e) => setHospital(e.target.value)}
              className="px-2 py-1 bg-gray-700 rounded text-sm border border-gray-600"
            />
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="px-2 py-1 bg-gray-700 rounded text-sm border border-gray-600"
            >
              <option>Disponible</option>
              <option>Asignado</option>
              <option>Transplantado</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAddOrgan} className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-sm">
              Guardar
            </button>
            <button onClick={() => setShowAddForm(false)} className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm">
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400">
              <th className="text-left py-2 px-2">ID</th>
              <th className="text-left py-2 px-2">Tipo</th>
              <th className="text-left py-2 px-2">Donante</th>
              <th className="text-left py-2 px-2">Hospital</th>
              <th className="text-left py-2 px-2">Estado</th>
              <th className="text-left py-2 px-2">Última Actualización</th>
              {cluster.mutexAccess && <th className="text-left py-2 px-2">Acción</th>}
            </tr>
          </thead>
          <tbody>
            {cluster.organs.map((organ) => (
              <tr key={organ.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                <td className="py-2 px-2">{organ.id}</td>
                <td className="py-2 px-2">{organ.tipo_organo}</td>
                <td className="py-2 px-2">{organ.donante}</td>
                <td className="py-2 px-2">{organ.hospital_origen}</td>
                <td className="py-2 px-2">
                  {editingId === organ.id ? (
                    <select
                      value={editEstado}
                      onChange={(e) => setEditEstado(e.target.value)}
                      className="px-1 py-0.5 bg-gray-700 rounded text-xs border border-gray-600"
                    >
                      <option>Disponible</option>
                      <option>Asignado</option>
                      <option>Transplantado</option>
                    </select>
                  ) : (
                    <span className={
                      organ.estado === "Disponible" ? "text-green-400" :
                      organ.estado === "Asignado" ? "text-yellow-400" : "text-blue-400"
                    }>
                      {organ.estado}
                    </span>
                  )}
                </td>
                <td className="py-2 px-2 text-gray-400 text-xs">
                  {new Date(organ.ultima_actualizacion).toLocaleString()}
                </td>
                {cluster.mutexAccess && (
                  <td className="py-2 px-2">
                    {editingId === organ.id ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleUpdateEstado(organ.id)}
                          className="px-2 py-0.5 bg-green-700 hover:bg-green-600 rounded text-xs"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-2 py-0.5 bg-gray-600 hover:bg-gray-500 rounded text-xs"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingId(organ.id); setEditEstado(organ.estado); }}
                        className="px-2 py-0.5 bg-blue-700 hover:bg-blue-600 rounded text-xs"
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
      </div>
    </div>
  );
}

export default OrganPanel;
