import { networkInterfaces } from "node:os";
import { NODE_TABLE, NODE_ID_OVERRIDE, type NodeInfo } from "./config.js";

export interface NodeIdentity {
  id: number;
  ip: string;
  name: string;
}

function findLocalIp(): string | null {
  for (const iface of Object.values(networkInterfaces())) {
    if (!iface) continue;
    for (const addr of iface) {
      if (addr.family === "IPv4" && !addr.internal) {
        for (const entry of NODE_TABLE) {
          if (addr.address === entry.ip) {
            return addr.address;
          }
        }
      }
    }
  }
  return null;
}

export function resolveIdentity(): NodeIdentity {
  if (NODE_ID_OVERRIDE !== null) {
    const entry = NODE_TABLE.find((n) => n.id === NODE_ID_OVERRIDE);
    if (entry) {
      return { id: entry.id, ip: entry.ip, name: entry.name };
    }
  }

  const localIp = findLocalIp();
  if (!localIp) {
    throw new Error("ERROR_CONFIG: No se encontró IP válida en la tabla de nodos");
  }

  const entry = NODE_TABLE.find((n) => n.ip === localIp);
  if (!entry) {
    throw new Error(`ERROR_CONFIG: IP ${localIp} no está en la tabla de nodos`);
  }

  return { id: entry.id, ip: entry.ip, name: entry.name };
}

export function getNodeById(id: number): NodeInfo | undefined {
  return NODE_TABLE.find((n) => n.id === id);
}

export function getOtherNodes(selfId: number): NodeInfo[] {
  return NODE_TABLE.filter((n) => n.id !== selfId);
}

export function getHigherNodes(selfId: number): NodeInfo[] {
  return NODE_TABLE.filter((n) => n.id > selfId);
}
