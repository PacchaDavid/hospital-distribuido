export type NodeState = "STARTING" | "FOLLOWER" | "COORDINATOR" | "ELECTION" | "SUSPECTED_DOWN" | "OFFLINE";
export type MutexState = "LIBRE" | "OCUPADO";

export interface NodeInfo {
  id: number;
  name: string;
  ip: string;
  state: NodeState;
  lastHeartbeat: number;
  resourceVersion: number;
}

export interface Organ {
  id: string;
  tipo_organo: string;
  donante: string;
  hospital_origen: string;
  estado: string;
  ultima_actualizacion: string;
}

export interface SyncState {
  enabled: boolean;
  lastSync: number | null;
  lastOffset: number | null;
}

export interface ClusterState {
  nodeId: number;
  name: string;
  ip: string;
  state: NodeState;
  coordinatorId: number | null;
  isCoordinator: boolean;
  nodes: NodeInfo[];
  syncState: SyncState;
  mutex: {
    state: MutexState;
    queue: { nodeId: number; timestamp: number }[];
    currentUser: number | null;
  };
  organs: Organ[];
  resourceVersion: number;
  mutexAccess: boolean;
}

export interface LogEvent {
  message: string;
  timestamp: number;
}
