import { create } from "zustand";
import type { ClusterState, LogEvent } from "./types";

interface AppStore {
  cluster: ClusterState | null;
  events: LogEvent[];
  setCluster: (state: ClusterState) => void;
  addEvent: (event: LogEvent) => void;
  updateOrgans: (organs: ClusterState["organs"], version: number) => void;
  updateSyncState: (state: { enabled: boolean; lastSync: number | null; lastOffset: number | null }) => void;
  setMutex: (data: { state: string; queue: { nodeId: number; timestamp: number }[]; currentUser: number | null }) => void;
  setAccessGranted: () => void;
  setAccessReleased: () => void;
}

export const useStore = create<AppStore>((set) => ({
  cluster: null,
  events: [],
  setCluster: (cluster) => set({ cluster }),
  addEvent: (event) =>
    set((state) => ({ events: [...state.events.slice(-99), event] })),
  updateOrgans: (organs, version) =>
    set((state) =>
      state.cluster
        ? { cluster: { ...state.cluster, organs, resourceVersion: version } }
        : state,
    ),
  updateSyncState: (syncState) =>
    set((state) =>
      state.cluster
        ? { cluster: { ...state.cluster, syncState } }
        : state,
    ),
  setMutex: (mutexData) =>
    set((state) =>
      state.cluster
        ? {
            cluster: {
              ...state.cluster,
              mutex: mutexData as ClusterState["mutex"],
              mutexAccess:
                mutexData.currentUser === state.cluster.nodeId
                  ? true
                  : state.cluster.mutexAccess,
            },
          }
        : state,
    ),
  setAccessGranted: () =>
    set((state) =>
      state.cluster
        ? { cluster: { ...state.cluster, mutexAccess: true } }
        : state,
    ),
  setAccessReleased: () =>
    set((state) =>
      state.cluster
        ? { cluster: { ...state.cluster, mutexAccess: false } }
        : state,
    ),
}));
