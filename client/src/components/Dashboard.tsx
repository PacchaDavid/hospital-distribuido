import type { NodeInfo, ClusterState } from "../types";

const NODE_NAMES: Record<number, string> = {
  1: "Loja",
  2: "Cuenca",
  3: "Esmeraldas",
  4: "Guayaquil",
  5: "Quito",
};

const NODE_IPS: Record<number, string> = {
  1: "192.168.1.10",
  2: "192.168.1.11",
  3: "192.168.1.12",
  4: "192.168.1.13",
  5: "192.168.1.14",
};

interface CardStyle {
  border: string;
  bg: string;
  dot: string;
  label: string;
  labelColor: string;
}

const CARD_STYLES: Record<string, CardStyle> = {
  COORDINATOR: {
    border: "border-crimson-500",
    bg: "bg-crimson-950/40",
    dot: "bg-crimson-500",
    label: "Coordinador",
    labelColor: "text-crimson-400",
  },
  FOLLOWER: {
    border: "border-jade-500/40",
    bg: "bg-jade-900/20",
    dot: "bg-jade-500",
    label: "Seguidor",
    labelColor: "text-jade-400",
  },
  ELECTION: {
    border: "border-gold-500/40",
    bg: "bg-gold-900/20",
    dot: "bg-gold-500",
    label: "Elección",
    labelColor: "text-gold-400",
  },
  SUSPECTED_DOWN: {
    border: "border-crimson-700/40",
    bg: "bg-crimson-950/20",
    dot: "bg-crimson-700",
    label: "Caído",
    labelColor: "text-crimson-600",
  },
  STARTING: {
    border: "border-steel-dark",
    bg: "bg-surface",
    dot: "bg-steel",
    label: "Iniciando",
    labelColor: "text-bone-muted",
  },
  OFFLINE: {
    border: "border-transparent",
    bg: "bg-surface/50",
    dot: "bg-steel-dark",
    label: "Offline",
    labelColor: "text-steel-dark",
  },
};

const GEO_ORDER = [3, 5, 4, 2, 1];
const ROWS = [
  { nodes: [3, 5], justify: "justify-center" as const },
  { nodes: [4, 2], justify: "justify-center" as const },
  { nodes: [1], justify: "justify-center" as const },
];

function Dashboard({ nodes, cluster }: { nodes: NodeInfo[]; cluster: ClusterState }) {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  function renderCard(id: number, index: number) {
    const live = nodeMap.get(id);
    const state = live?.state || "OFFLINE";
    const style = CARD_STYLES[state] || CARD_STYLES.OFFLINE;
    const isCoord = cluster.coordinatorId === id;
    const isMe = cluster.nodeId === id;

    return (
      <div
        key={id}
        className={`relative rounded-sm border px-4 py-3.5 min-w-[200px] max-w-[260px] flex-1
          ${style.bg} ${style.border}
          ${state === "OFFLINE" ? "opacity-40" : ""}
          ${isCoord ? "animate-pulse-glow" : ""}
          ${isMe ? "ring-1 ring-bone/20" : ""}
          animate-fade-in-up`}
        style={{ animationDelay: `${index * 120}ms` }}
      >
        <div className="flex items-start justify-between mb-1.5">
          <h3 className="font-display font-semibold text-sm text-bone leading-tight">
            {live?.name || NODE_NAMES[id] || `Nodo ${id}`}
          </h3>
          <span className="font-mono text-[10px] text-bone-muted ml-2 mt-0.5 leading-none">
            #{id}
          </span>
        </div>

        <div className="flex items-center gap-1.5 mb-2">
          <span
            className={`block w-1.5 h-1.5 rounded-full ${style.dot} ${
              isCoord ? "animate-breath" : ""
            }`}
          />
          <span className={`font-display text-[11px] font-medium ${style.labelColor}`}>
            {style.label}
          </span>
        </div>

        <p className="font-mono text-[10px] text-bone-muted/60 leading-none">
          {live?.ip || NODE_IPS[id] || ""}
        </p>

        {isMe && (
          <p className="font-display text-[10px] font-medium text-gold-500 mt-1.5">
            ← Tú
          </p>
        )}
      </div>
    );
  }

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="font-display text-sm font-semibold text-bone">Hospitales</h2>
        <span className="font-mono text-[10px] text-bone-muted">{cluster.nodes.length} en línea</span>
      </div>

      <div className="hidden md:flex flex-col items-center gap-3">
        {ROWS.map((row, ri) => (
          <div
            key={ri}
            className={`flex ${row.justify} gap-3 w-full max-w-[580px]`}
          >
            {row.nodes.map((id) => {
              const globalIndex = GEO_ORDER.indexOf(id);
              return renderCard(id, globalIndex);
            })}
          </div>
        ))}
      </div>

      <div className="flex md:hidden flex-col gap-2">
        {GEO_ORDER.map((id, i) => renderCard(id, i))}
      </div>
    </section>
  );
}

export default Dashboard;
