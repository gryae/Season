import { create } from 'zustand';
import { workOrderApi, WorkOrder } from '@/lib/api';

interface WorkOrderStore {
  workOrders: WorkOrder[];
  selectedStatus: string;
  stats: { total: number; pending: number; inProgress: number; completed: number } | null;
  isLoading: boolean;
  error: string | null;

  fetchWorkOrders: (status?: string) => Promise<void>;
  fetchStats: () => Promise<void>;
  setStatusFilter: (status: string) => void;
  updateWorkOrderStatus: (id: string, data: {
    status: string;
    notes?: string;
    assignedTo?: string;
    sparepartsUsed?: Array<{ sparepartId: string; quantity: number }>;
  }) => Promise<any>;
  createWorkOrder: (data: Partial<WorkOrder>) => Promise<WorkOrder>;
}

export const useWorkOrderStore = create<WorkOrderStore>((set, get) => ({
  workOrders: [],
  selectedStatus: 'ALL',
  stats: null,
  isLoading: false,
  error: null,

  fetchWorkOrders: async (status) => {
    set({ isLoading: true, error: null });
    try {
      const filter = status || get().selectedStatus;
      const data = await workOrderApi.getAll(filter !== 'ALL' ? filter : undefined);
      set({ workOrders: data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchStats: async () => {
    try {
      const data = await workOrderApi.getStats();
      set({ stats: data });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  setStatusFilter: (status) => {
    set({ selectedStatus: status });
    get().fetchWorkOrders(status);
  },

  updateWorkOrderStatus: async (id, data) => {
    const result = await workOrderApi.updateStatus(id, data);
    // Refresh list after update
    await get().fetchWorkOrders();
    await get().fetchStats();
    return result;
  },

  createWorkOrder: async (data) => {
    const wo = await workOrderApi.create(data);
    await get().fetchWorkOrders();
    return wo;
  },
}));
