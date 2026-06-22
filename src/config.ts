export const NODE_TABLE = [
  { id: 1, ip: "192.168.1.10", name: "Hospital Loja" },
  { id: 2, ip: "192.168.1.11", name: "Hospital Cuenca" },
  { id: 3, ip: "192.168.1.12", name: "Hospital Esmeraldas" },
  { id: 4, ip: "192.168.1.13", name: "Hospital Guayaquil" },
  { id: 5, ip: "192.168.1.14", name: "Hospital Quito" },
] as const;

export const TCP_PORT = 9000;
export const HTTP_PORT = 8080;
export const WS_PORT = 8081;

export const HEARTBEAT_INTERVAL_MS = 1000;
export const HEARTBEAT_TIMEOUT_MS = 3000;
export const ELECTION_TIMEOUT_MS = 2000;
export const RECONNECT_INTERVAL_MS = 2000;

export const DATA_DIR = new URL("../data", import.meta.url).pathname;
export const DB_PATH = `${DATA_DIR}/cluster.db`;
export const ORGANOS_PATH = new URL("../organos.json", import.meta.url).pathname;
export const CLIENT_DIST_PATH = new URL("../client/dist", import.meta.url).pathname;

export const CRISTIAN_SYNC_INTERVAL_MS = 60000;
export const MIN_TIME_ADJUSTMENT_MS = 10;

export const NODE_ID_OVERRIDE = process.env.NODE_ID ? parseInt(process.env.NODE_ID, 10) : null;

export type NodeInfo = (typeof NODE_TABLE)[number];
export type NodeState = "STARTING" | "FOLLOWER" | "COORDINATOR" | "ELECTION" | "SUSPECTED_DOWN" | "OFFLINE";
export type MutexState = "LIBRE" | "OCUPADO";
