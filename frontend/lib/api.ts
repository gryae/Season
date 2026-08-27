import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// ============================================================
// TYPES
// ============================================================
export interface Vessel {
  id: string;
  name: string;
  imoNumber: string;
  vesselType: string;
  flag: string;
  currentRunHours: number;
  status: 'ACTIVE' | 'MAINTENANCE' | 'DOCKED' | 'INACTIVE';
  _count?: { workOrders: number; certificates: number };
}

export interface LiveVessel extends Vessel {
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  lastUpdate: string | null;
}

export interface WorkOrderComment {
  id: string;
  workOrderId: string;
  senderName: string;
  message: string;
  createdAt: string;
}

export interface WorkOrder {
  id: string;
  woNumber: string;
  vesselId: string;
  title: string;
  description?: string;
  type: 'CORRECTIVE' | 'PREVENTIVE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  assignedTo?: string;
  scheduledDate?: string;
  completedAt?: string;
  notes?: string;
  photoUrl?: string;
  createdAt: string;
  vessel?: { id: string; name: string; imoNumber: string };
  maintenanceSchedule?: { id: string; taskName: string };
  sparepartUsages?: Array<{
    id: string;
    quantityUsed: number;
    sparepart: Sparepart;
  }>;
  comments?: WorkOrderComment[];
}

export interface Sparepart {
  id: string;
  partNumber: string;
  name: string;
  description?: string;
  category: string;
  unit: string;
  currentStock: number;
  minimumStockLevel: number;
  unitPrice: number;
  location?: string;
}

export interface PurchaseRequest {
  id: string;
  prNumber: string;
  sparepartId: string;
  quantityNeeded: number;
  status: 'PENDING' | 'APPROVED' | 'ORDERED' | 'FULFILLED' | 'CANCELLED';
  reason?: string;
  requestedAt: string;
  sparepart?: Sparepart;
}

export interface VesselCertificate {
  id: string;
  vesselId: string;
  certificateName: string;
  certificateNumber?: string;
  issuingAuthority?: string;
  issueDate?: string;
  expiryDate: string;
  status: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED';
  vessel?: { id: string; name: string; imoNumber: string };
}

export interface Alert {
  id: string;
  type: 'CERTIFICATE_EXPIRY' | 'LOW_STOCK' | 'MAINTENANCE_DUE' | 'WORK_ORDER_CREATED';
  title: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  isRead: boolean;
  createdAt: string;
}

// ============================================================
// API FUNCTIONS
// ============================================================

// Vessels
export const vesselApi = {
  getAll: () => api.get<Vessel[]>('/vessels').then(r => r.data),
  getOne: (id: string) => api.get<Vessel>(`/vessels/${id}`).then(r => r.data),
  getStats: () => api.get<{ total: number; active: number; maintenance: number; docked: number }>('/vessels/stats').then(r => r.data),
  update: (id: string, data: Partial<Vessel>) => api.patch<Vessel>(`/vessels/${id}`, data).then(r => r.data),
};

// Telemetry
export const telemetryApi = {
  getLive: () => api.get<LiveVessel[]>('/telemetry/live').then(r => r.data),
  getHistory: (vesselId: string, limit = 20) =>
    api.get(`/telemetry/history/${vesselId}?limit=${limit}`).then(r => r.data),
};

// Work Orders
export const workOrderApi = {
  getAll: (status?: string) =>
    api.get<WorkOrder[]>(`/work-orders${status && status !== 'ALL' ? `?status=${status}` : ''}`).then(r => r.data),
  getOne: (id: string) => api.get<WorkOrder>(`/work-orders/${id}`).then(r => r.data),
  getStats: () => api.get<{ total: number; pending: number; inProgress: number; completed: number }>('/work-orders/stats').then(r => r.data),
  create: (data: Partial<WorkOrder>) => api.post<WorkOrder>('/work-orders', data).then(r => r.data),
  createRecurring: (data: {
    vesselId: string;
    title: string;
    description?: string;
    recurrenceType: 'TIME_BASED' | 'RUN_HOURS';
    intervalRunHours?: number;
    timeFrequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
    timeInterval?: number;
  }) => api.post('/work-orders/recurring', data).then(r => r.data),
  updateStatus: (id: string, data: {
    status: string;
    notes?: string;
    assignedTo?: string;
    sparepartsUsed?: Array<{ sparepartId: string; quantity: number }>;
  }) => api.patch(`/work-orders/${id}/status`, data).then(r => r.data),
  getComments: (id: string) => api.get<WorkOrderComment[]>(`/work-orders/${id}/comments`).then(r => r.data),
  addComment: (id: string, data: { senderName: string; message: string }) => api.post<WorkOrderComment>(`/work-orders/${id}/comments`, data).then(r => r.data),
  removeSparepart: (id: string, usageId: string) => api.delete(`/work-orders/${id}/spareparts/${usageId}`).then(r => r.data),
};

// Spareparts
export const sparepartApi = {
  getAll: () => api.get<Sparepart[]>('/spareparts').then(r => r.data),
  getOne: (id: string) => api.get<Sparepart>(`/spareparts/${id}`).then(r => r.data),
  create: (data: Partial<Sparepart>) => api.post<Sparepart>('/spareparts', data).then(r => r.data),
  update: (id: string, data: Partial<Sparepart>) => api.patch<Sparepart>(`/spareparts/${id}`, data).then(r => r.data),
  deduct: (id: string, quantity: number) =>
    api.post(`/spareparts/${id}/deduct`, { quantity }).then(r => r.data),
  getPurchaseRequests: () => api.get<PurchaseRequest[]>('/spareparts/purchase-requests').then(r => r.data),
  createPurchaseRequest: (data: { sparepartId: string; quantityNeeded: number; reason?: string }) =>
    api.post<PurchaseRequest>('/spareparts/purchase-requests', data).then(r => r.data),
  updatePRStatus: (id: string, status: string) =>
    api.patch(`/spareparts/purchase-requests/${id}/status`, { status }).then(r => r.data),
};

// Compliance
export const complianceApi = {
  getCertificates: (vesselId?: string) =>
    api.get<VesselCertificate[]>(`/compliance/certificates${vesselId ? `?vesselId=${vesselId}` : ''}`).then(r => r.data),
  createCertificate: (data: Partial<VesselCertificate>) =>
    api.post<VesselCertificate>('/compliance/certificates', data).then(r => r.data),
  getAlerts: () => api.get<Alert[]>('/compliance/alerts').then(r => r.data),
  markAlertRead: (id: string) => api.patch(`/compliance/alerts/${id}/read`).then(r => r.data),
  getStats: () => api.get<{ total: number; valid: number; expiringSoon: number; expired: number }>('/compliance/stats').then(r => r.data),
};

// Meters (Custom Telemetry)
export interface Meter {
  id: string;
  vesselId: string;
  name: string;
  unit: string;
  lowThreshold?: number | null;
  highThreshold?: number | null;
  reminderFrequency?: string | null;
  createdAt: string;
  vessel?: { id: string; name: string; imoNumber: string };
  readings?: MeterReading[];
}

export interface MeterReading {
  id: string;
  meterId: string;
  value: number;
  timestamp: string;
  loggedBy?: string;
}

export const meterApi = {
  getAll: () => api.get<Meter[]>('/meters').then(r => r.data),
  getOne: (id: string) => api.get<Meter>(`/meters/${id}`).then(r => r.data),
  create: (data: Partial<Meter>) => api.post<Meter>('/meters', data).then(r => r.data),
  getReadings: (id: string) => api.get<MeterReading[]>(`/meters/${id}/readings`).then(r => r.data),
  addReading: (id: string, data: { value: number; loggedBy?: string }) => api.post<MeterReading>(`/meters/${id}/readings`, data).then(r => r.data),
};

// Upload
export const uploadApi = {
  uploadFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<{ url: string }>('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  }
};

export default api;

// Auth
export const authApi = {
  login: (username: string, pass: string) => api.post<{ access_token: string, user: any }>('/auth/login', { username, password: pass }).then(r => r.data),
};

// Request Interceptor for JWT
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('season_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined' && window.location.pathname !== '/login') {
      localStorage.removeItem('season_token');
      localStorage.removeItem('season_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
