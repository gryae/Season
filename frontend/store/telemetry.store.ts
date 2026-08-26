import { create } from 'zustand';
import { telemetryApi, vesselApi, LiveVessel, Vessel } from '@/lib/api';

interface TelemetryStore {
  liveVessels: LiveVessel[];
  vessels: Vessel[];
  vesselStats: { total: number; active: number; maintenance: number; docked: number } | null;
  selectedVesselId: string | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;

  fetchLive: () => Promise<void>;
  fetchVessels: () => Promise<void>;
  fetchStats: () => Promise<void>;
  selectVessel: (id: string | null) => void;
}

export const useTelemetryStore = create<TelemetryStore>((set) => ({
  liveVessels: [],
  vessels: [],
  vesselStats: null,
  selectedVesselId: null,
  isLoading: false,
  error: null,
  lastUpdated: null,

  fetchLive: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await telemetryApi.getLive();
      set({ liveVessels: data, lastUpdated: new Date(), isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchVessels: async () => {
    try {
      const data = await vesselApi.getAll();
      set({ vessels: data });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  fetchStats: async () => {
    try {
      const data = await vesselApi.getStats();
      set({ vesselStats: data });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  selectVessel: (id) => set({ selectedVesselId: id }),
}));
