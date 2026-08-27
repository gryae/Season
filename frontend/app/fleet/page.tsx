'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useTelemetryStore } from '@/store/telemetry.store';
import type { LiveVessel, WorkOrder } from '@/lib/api';
import {
  Map as MapIcon,
  Anchor,
  Activity,
  Clock,
  Gauge,
  Navigation2,
  RefreshCw,
  Plus,
  ChevronDown,
  List,
  X,
  MapPin,
  FileText,
  CheckCircle2,
  Loader2,
  ClipboardList,
  ChevronRight,
  Edit,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { workOrderApi } from '@/lib/api';
import { useRouter } from 'next/navigation';

// ── Status badges ──────────────────────────────────────────────
function VesselStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: 'badge-active',
    MAINTENANCE: 'badge-expiring',
    DOCKED: 'badge-docked',
    INACTIVE: 'badge-cancelled',
  };
  return <span className={`badge ${map[status] || 'badge-medium'}`}>{status}</span>;
}

function WOStatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; icon: any }> = {
    PENDING: { cls: 'badge-pending', icon: Clock },
    IN_PROGRESS: { cls: 'badge-progress', icon: Loader2 },
    COMPLETED: { cls: 'badge-completed', icon: CheckCircle2 },
    CANCELLED: { cls: 'badge-cancelled', icon: X },
  };
  const { cls, icon: Icon } = map[status] || { cls: 'badge-medium', icon: Clock };
  return (
    <span className={`badge ${cls}`}>
      <Icon size={10} />
      {status.replace('_', ' ')}
    </span>
  );
}

function WOPriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    LOW: 'badge-low', MEDIUM: 'badge-medium', HIGH: 'badge-high', CRITICAL: 'badge-critical',
  };
  return <span className={`badge ${map[priority] || 'badge-medium'}`}>{priority}</span>;
}

// ── Vessel Detail Modal ───────────────────────────────────────
function VesselDetailModal({ vessel, onClose, onEdit }: { vessel: LiveVessel; onClose: () => void; onEdit: () => void }) {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [isLoadingWO, setIsLoadingWO] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
  const router = useRouter();

  useEffect(() => {
    setIsLoadingWO(true);
    workOrderApi
      .getAll()
      .then((all) => setWorkOrders(all.filter((wo) => wo.vesselId === vessel.id)))
      .catch(console.error)
      .finally(() => setIsLoadingWO(false));
  }, [vessel.id]);

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-2xl flex flex-col rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(12, 6, 28, 0.98)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          boxShadow: '0 0 60px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(24px)',
          maxHeight: '90vh',
        }}
      >
        <div className="flex items-start justify-between px-6 py-5 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #7c3aed, #0ea5e9)' }}>
              <Anchor size={24} color="white" />
            </div>
            <div>
              <h2 className="font-bold text-season-text text-xl leading-tight">{vessel.name}</h2>
              <p className="text-sm mt-1" style={{ color: '#6b7280' }}>{vessel.imoNumber} · {vessel.vesselType}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <VesselStatusBadge status={vessel.status} />
            <button onClick={onEdit} className="btn-secondary text-xs px-2 py-1 h-8 rounded-lg" style={{ background: 'rgba(139,92,246,0.12)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.25)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Edit size={12} /> Edit
            </button>
            <button onClick={onClose} style={{ color: '#6b7280', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex px-6 gap-6 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {(['details', 'history'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="py-3 text-sm font-medium relative"
              style={{ color: activeTab === tab ? '#c4b5fd' : '#6b7280', background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              {tab === 'details' ? 'Details' : 'Work Order History'}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: 'linear-gradient(90deg, #7c3aed, #0ea5e9)' }} />
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {activeTab === 'details' && (
            <>
              <div className="rounded-xl p-5" style={{ background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.2)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <MapPin size={16} style={{ color: '#38bdf8' }} />
                  <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#38bdf8' }}>GPS Position</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Latitude', value: vessel.latitude ? `${vessel.latitude.toFixed(5)}°` : '—' },
                    { label: 'Longitude', value: vessel.longitude ? `${vessel.longitude.toFixed(5)}°` : '—' },
                    { label: 'Heading', value: `${vessel.heading?.toFixed(1) ?? '—'}°` },
                    { label: 'Speed', value: `${vessel.speed?.toFixed(1) ?? '—'} kts` },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-xs mb-1" style={{ color: '#4b5563' }}>{label}</p>
                      <p className="font-mono text-sm font-bold text-season-text">{value}</p>
                    </div>
                  ))}
                </div>
                {vessel.lastUpdate && (
                  <p className="text-xs mt-4 flex items-center gap-1.5" style={{ color: '#4b5563' }}>
                    <Clock size={12} /> Last update: {formatDistanceToNow(new Date(vessel.lastUpdate), { addSuffix: true })}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl p-5 text-center flex flex-col justify-center items-center" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
                  <Gauge size={20} className="mb-2" style={{ color: '#a78bfa' }} />
                  <p className="text-2xl font-bold text-season-text">{vessel.currentRunHours.toFixed(1)}</p>
                  <p className="text-sm mt-1" style={{ color: '#6b7280' }}>Run Hours</p>
                </div>
                <div className="rounded-xl p-5 text-center flex flex-col justify-center items-center" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <Activity size={20} className="mb-2" style={{ color: '#34d399' }} />
                  <p className="text-2xl font-bold text-season-text">{workOrders.length}</p>
                  <p className="text-sm mt-1" style={{ color: '#6b7280' }}>Work Orders</p>
                </div>
              </div>

              <div className="rounded-xl p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#4b5563' }}>Vessel Info</p>
                {[
                  { label: 'Flag', value: vessel.flag || '—' },
                  { label: 'Type', value: vessel.vesselType || '—' },
                  { label: 'IMO Number', value: vessel.imoNumber },
                  { label: 'Status', value: vessel.status },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center">
                    <span className="text-sm" style={{ color: '#6b7280' }}>{label}</span>
                    <span className="text-sm font-medium text-season-text">{value}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 'history' && (
            <div>
              {isLoadingWO ? (
                [1, 2, 3].map((i) => <div key={i} className="skeleton h-20 rounded-xl mb-4" />)
              ) : workOrders.length === 0 ? (
                <div className="text-center py-16">
                  <ClipboardList size={48} className="mx-auto mb-4 opacity-20" style={{ color: '#a78bfa' }} />
                  <p className="text-sm" style={{ color: '#6b7280' }}>No work orders for this vessel</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {workOrders.map((wo) => (
                    <div key={wo.id} className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.2)' }}>
                            <FileText size={14} style={{ color: '#a78bfa' }} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-base font-semibold text-season-text truncate">{wo.title}</p>
                            <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>#{wo.woNumber}</p>
                          </div>
                        </div>
                        <WOStatusBadge status={wo.status} />
                      </div>
                      <div className="flex items-center gap-3 pl-11">
                        <WOPriorityBadge priority={wo.priority} />
                        <span className="text-sm" style={{ color: '#4b5563' }}>
                          {wo.completedAt
                            ? `Completed ${format(new Date(wo.completedAt), 'dd/MM/yyyy')}`
                            : wo.scheduledDate
                            ? `Scheduled ${format(new Date(wo.scheduledDate), 'dd/MM/yyyy')}`
                            : `Created ${format(new Date(wo.createdAt), 'dd/MM/yyyy')}`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-5 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={() => router.push(`/work-orders?vesselId=${vessel.id}&vesselName=${encodeURIComponent(vessel.name)}`)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-transform hover:scale-[1.01]"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #0ea5e9)', color: 'white', border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(124,58,237,0.35)' }}
          >
            <ClipboardList size={18} />
            Use in New Work Order
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Vessel Form Modal ───────────────────────────────────────
function VesselFormModal({ initialData, onClose, onSave }: { initialData?: LiveVessel; onClose: () => void; onSave: (data: any) => Promise<void> }) {
  const [name, setName] = useState(initialData?.name || '');
  const [imoNumber, setImoNumber] = useState(initialData?.imoNumber || '');
  const [vesselType, setVesselType] = useState(initialData?.vesselType || 'Bulk Carrier');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name || !imoNumber) return;
    setIsSaving(true);
    try { await onSave({ name, imoNumber, type: vesselType, status: initialData?.status || 'DOCKED' }); onClose(); }
    catch (e) { console.error(e); } finally { setIsSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-season-surface border border-purple-500/30 shadow-[0_0_60px_rgba(139,92,246,0.3)] rounded-2xl p-6">
        <h2 className="font-bold text-season-text text-lg mb-4">{initialData ? 'Edit Vessel' : 'Add New Vessel'}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-2 uppercase text-season-muted">Vessel Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="season-input" placeholder="e.g. MV Explorer" />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-2 uppercase text-season-muted">IMO Number</label>
            <input value={imoNumber} onChange={(e) => setImoNumber(e.target.value)} className="season-input" placeholder="e.g. IMO 1234567" />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-2 uppercase text-season-muted">Vessel Type</label>
            <div className="relative">
              <select value={vesselType} onChange={(e) => setVesselType(e.target.value)} className="season-select w-full" style={{ appearance: 'none' }}>
                <option>Bulk Carrier</option><option>Oil Tanker</option><option>Container Ship</option>
                <option>Ro-Ro Ship</option><option>LNG Carrier</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#6b7280' }} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button onClick={handleSave} className="btn-primary flex-1 justify-center" disabled={!name || !imoNumber || isSaving}>Save Vessel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Table Row ─────────────────────────────────────────────────
function VesselTableRow({ vessel, onClick, onUpdateStatus }: {
  vessel: LiveVessel;
  onClick: () => void;
  onUpdateStatus: (id: string, status: string) => void;
}) {
  return (
    <tr className="cursor-pointer" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }} onClick={onClick}>
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.2)' }}>
            <Anchor size={14} style={{ color: '#a78bfa' }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-season-text">{vessel.name}</p>
            <p className="text-xs" style={{ color: '#6b7280' }}>{vessel.imoNumber}</p>
          </div>
        </div>
      </td>
      <td className="py-3 px-4 text-sm" style={{ color: '#94a3b8' }}>{vessel.vesselType}</td>
      <td className="py-3 px-4"><VesselStatusBadge status={vessel.status} /></td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-1.5 text-sm" style={{ color: '#94a3b8' }}>
          <MapPin size={12} style={{ color: '#38bdf8' }} />
          {vessel.latitude ? `${vessel.latitude.toFixed(3)}°, ${vessel.longitude.toFixed(3)}°` : '—'}
        </div>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-1.5 text-sm" style={{ color: '#94a3b8' }}>
          <Navigation2 size={12} style={{ color: '#60a5fa' }} /> {vessel.speed?.toFixed(1)} kts
        </div>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-1.5 text-sm" style={{ color: '#94a3b8' }}>
          <Gauge size={12} style={{ color: '#a78bfa' }} /> {vessel.currentRunHours.toFixed(0)} h
        </div>
      </td>
      <td className="py-3 px-4 text-xs" style={{ color: '#4b5563' }}>
        {vessel.lastUpdate ? formatDistanceToNow(new Date(vessel.lastUpdate), { addSuffix: true }) : '—'}
      </td>
      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
        <div className="relative w-32">
          <select value={vessel.status} onChange={(e) => onUpdateStatus(vessel.id, e.target.value)} className="season-select py-1 px-2 text-xs pr-6 w-full" style={{ appearance: 'none', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(139,92,246,0.3)' }}>
            <option value="ACTIVE">ACTIVE</option><option value="DOCKED">DOCKED</option>
            <option value="MAINTENANCE">MAINTENANCE</option><option value="INACTIVE">INACTIVE</option>
          </select>
          <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#a78bfa' }} />
        </div>
      </td>
      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClick} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg" style={{ background: 'rgba(139,92,246,0.12)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.25)', cursor: 'pointer' }}>
          Details <ChevronRight size={12} />
        </button>
      </td>
    </tr>
  );
}

// ── Main Page ─────────────────────────────────────────────────
type ViewMode = 'map' | 'table';

export default function FleetPage() {
  const { liveVessels, selectedVesselId, isLoading, lastUpdated, fetchLive, selectVessel } = useTelemetryStore();
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editVessel, setEditVessel] = useState<LiveVessel | null>(null);
  const [drawerVessel, setDrawerVessel] = useState<LiveVessel | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const mapRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const isInitialized = useRef(false);

  const filteredVessels = liveVessels.filter(
    (v) =>
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.imoNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.vesselType.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleCreateVessel = async (data: any) => {
    const apiMod = await import('@/lib/api');
    await apiMod.default.post('/vessels', data);
    fetchLive();
  };

  const handleEditVessel = async (data: any) => {
    if (!editVessel) return;
    const apiMod = await import('@/lib/api');
    await apiMod.vesselApi.update(editVessel.id, data);
    fetchLive();
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    const apiMod = await import('@/lib/api');
    await apiMod.default.patch(`/vessels/${id}/status`, { status });
    fetchLive();
  };

  const openDrawer = (vessel: LiveVessel) => { setDrawerVessel(vessel); selectVessel(vessel.id); };

  // Leaflet init
  useEffect(() => {
    if (viewMode !== 'map' || isInitialized.current) return;
    isInitialized.current = true;
    const init = async () => {
      const L = (await import('leaflet')).default;
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
      if (!mapRef.current || mapInstanceRef.current) return;
      const map = L.map(mapRef.current, { center: [3.0, 108.0], zoom: 5, zoomControl: true });
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OSM &copy; CARTO', subdomains: 'abcd', maxZoom: 20,
      }).addTo(map);
      mapInstanceRef.current = map;
    };
    init();
  }, [viewMode]);

  // Marker factory
  const createVesselIcon = useCallback(async (vessel: LiveVessel, isSelected: boolean) => {
    const L = (await import('leaflet')).default;
    const color = isSelected ? '#a78bfa' : vessel.status === 'ACTIVE' ? '#34d399' : vessel.status === 'DOCKED' ? '#60a5fa' : '#fbbf24';
    const pulse = isSelected ? `<circle cx="20" cy="20" r="18" fill="none" stroke="${color}" stroke-width="2" opacity="0.8"><animate attributeName="r" values="18;24;18" dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.8;0;0.8" dur="2s" repeatCount="indefinite"/></circle>` : '';
    const svg = `<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="18" fill="${color}20" stroke="${color}" stroke-width="1.5" opacity="0.6"/><circle cx="20" cy="20" r="10" fill="${color}40" stroke="${color}" stroke-width="2"/><g transform="translate(20,20) rotate(${vessel.heading || 0})"><polygon points="0,-8 4,5 0,3 -4,5" fill="${color}" stroke="white" stroke-width="0.5"/></g>${pulse}</svg>`;
    return L.divIcon({ html: svg, className: '', iconSize: [40, 40], iconAnchor: [20, 20], popupAnchor: [0, -20] });
  }, []);

  // Update markers
  useEffect(() => {
    if (!mapInstanceRef.current || liveVessels.length === 0) return;
    const updateMarkers = async () => {
      const L = (await import('leaflet')).default;
      const map = mapInstanceRef.current;
      for (const vessel of liveVessels) {
        if (!vessel.latitude || !vessel.longitude) continue;
        const isSelected = vessel.id === selectedVesselId;
        const icon = await createVesselIcon(vessel, isSelected);
        const popup = `<div style="font-family:Inter,sans-serif;min-width:220px;padding:4px;"><div style="font-weight:700;font-size:15px;color:#e2e8f0;margin-bottom:4px;">${vessel.name}</div><div style="font-size:11px;color:#6b7280;margin-bottom:10px;">${vessel.imoNumber} &middot; ${vessel.vesselType}</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;"><div style="background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.2);border-radius:8px;padding:8px;text-align:center;"><div style="font-size:18px;font-weight:800;color:#c4b5fd;">${vessel.currentRunHours.toFixed(1)}</div><div style="font-size:10px;color:#6b7280;">Run Hours</div></div><div style="background:rgba(14,165,233,0.1);border:1px solid rgba(14,165,233,0.2);border-radius:8px;padding:8px;text-align:center;"><div style="font-size:18px;font-weight:800;color:#38bdf8;">${vessel.speed.toFixed(1)}</div><div style="font-size:10px;color:#6b7280;">Speed (kts)</div></div></div><div style="margin-top:8px;font-size:11px;color:#6b7280;">GPS: ${vessel.latitude.toFixed(4)}, ${vessel.longitude.toFixed(4)}</div></div>`;
        const existing = markersRef.current[vessel.id];
        if (existing) { existing.setLatLng([vessel.latitude, vessel.longitude]); existing.setIcon(icon); existing.setPopupContent(popup); }
        else {
          const marker = L.marker([vessel.latitude, vessel.longitude], { icon }).addTo(map).bindPopup(popup, { maxWidth: 280, minWidth: 240 });
          marker.on('click', () => { selectVessel(vessel.id); setDrawerVessel(vessel); });
          markersRef.current[vessel.id] = marker;
        }
      }
      if (selectedVesselId) {
        const v = liveVessels.find((x) => x.id === selectedVesselId);
        if (v?.latitude && v?.longitude) { map.flyTo([v.latitude, v.longitude], 8, { duration: 1.5 }); markersRef.current[selectedVesselId]?.openPopup(); }
      }
    };
    updateMarkers();
  }, [liveVessels, selectedVesselId, createVesselIcon]);

  // Polling
  useEffect(() => { fetchLive(); const id = setInterval(fetchLive, 30000); return () => clearInterval(id); }, [fetchLive]);

  const stats = {
    total: liveVessels.length,
    active: liveVessels.filter((v) => v.status === 'ACTIVE').length,
    docked: liveVessels.filter((v) => v.status === 'DOCKED').length,
    maintenance: liveVessels.filter((v) => v.status === 'MAINTENANCE').length,
  };

  return (
    <div className="space-y-5 h-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-season-text flex items-center gap-2">
            <Anchor size={22} style={{ color: '#a78bfa' }} /> Vessels
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6b7280' }}>Fleet registry — {stats.total} vessels tracked</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {lastUpdated && (
            <div className="text-xs flex items-center gap-1.5" style={{ color: '#4b5563' }}>
              <Clock size={11} /> {formatDistanceToNow(lastUpdated, { addSuffix: true })}
            </div>
          )}
          {/* View mode toggle */}
          <div className="flex items-center rounded-xl p-1 gap-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {([
              { mode: 'map' as ViewMode, icon: MapIcon, label: 'Map View' },
              { mode: 'table' as ViewMode, icon: List, label: 'Table View' },
            ] as const).map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                title={label}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{
                  background: viewMode === mode ? 'rgba(139,92,246,0.25)' : 'transparent',
                  color: viewMode === mode ? '#c4b5fd' : '#6b7280',
                  border: viewMode === mode ? '1px solid rgba(139,92,246,0.4)' : '1px solid transparent',
                  cursor: 'pointer',
                }}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
          <button onClick={() => setIsCreateOpen(true)} className="btn-primary py-2 px-3 text-sm"><Plus size={14} /> Add Vessel</button>
          <button onClick={fetchLive} className="btn-secondary text-sm py-2 px-3" disabled={isLoading}>
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, color: '#a78bfa', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.2)' },
          { label: 'Active', value: stats.active, color: '#34d399', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
          { label: 'Docked', value: stats.docked, color: '#60a5fa', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.2)' },
          { label: 'Maintenance', value: stats.maintenance, color: '#fbbf24', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
        ].map(({ label, value, color, bg, border }) => (
          <div key={label} className="rounded-xl px-4 py-3 text-center" style={{ background: bg, border: `1px solid ${border}` }}>
            <p className="text-xl font-bold" style={{ color }}>{value}</p>
            <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* ── MAP VIEW ── */}
      {viewMode === 'map' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4" style={{ height: 'calc(100vh - 280px)' }}>
          {/* Map */}
          <div className="lg:col-span-3 rounded-2xl overflow-hidden relative season-border-glow" style={{ minHeight: '480px' }}>
            <div ref={mapRef} style={{ width: '100%', height: '100%', minHeight: '480px' }} />
            <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium z-[1000]" style={{ background: 'rgba(10,5,20,0.9)', border: '1px solid rgba(139,92,246,0.3)', backdropFilter: 'blur(12px)' }}>
              <Activity size={12} style={{ color: '#34d399' }} className="animate-pulse" />
              <span style={{ color: '#e2e8f0' }}>LIVE · {liveVessels.length} vessels</span>
            </div>
          </div>

          {/* Sidebar vessel list */}
          <div className="flex flex-col gap-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <Anchor size={14} style={{ color: '#a78bfa' }} />
                <span className="text-sm font-semibold text-season-text">Fleet Registry</span>
              </div>
              <p className="text-xs" style={{ color: '#6b7280' }}>Click to view details</p>
            </div>

            {isLoading && liveVessels.length === 0
              ? [1, 2, 3].map((i) => <div key={i} className="skeleton h-24 rounded-xl" />)
              : liveVessels.map((vessel) => (
                  <div
                    key={vessel.id}
                    onClick={() => openDrawer(vessel)}
                    className="p-4 rounded-xl cursor-pointer transition-all duration-200"
                    style={{
                      background: vessel.id === selectedVesselId ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${vessel.id === selectedVesselId ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.06)'}`,
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: vessel.id === selectedVesselId ? 'linear-gradient(135deg,#7c3aed,#0ea5e9)' : 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}>
                        <Anchor size={16} color="white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-sm text-season-text truncate">{vessel.name}</span>
                          <VesselStatusBadge status={vessel.status} />
                        </div>
                        <div className="text-xs mt-1" style={{ color: '#6b7280' }}>{vessel.imoNumber} · {vessel.vesselType}</div>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <div className="flex items-center gap-1.5 text-xs" style={{ color: '#94a3b8' }}><Gauge size={11} style={{ color: '#a78bfa' }} />{vessel.currentRunHours.toFixed(1)} hrs</div>
                          <div className="flex items-center gap-1.5 text-xs" style={{ color: '#94a3b8' }}><Navigation2 size={11} style={{ color: '#60a5fa' }} />{vessel.speed.toFixed(1)} kts</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

            {liveVessels.length === 0 && !isLoading && (
              <div className="glass-card p-6 text-center">
                <Anchor size={32} className="mx-auto mb-3 opacity-30" style={{ color: '#a78bfa' }} />
                <p className="text-sm" style={{ color: '#6b7280' }}>No vessel data</p>
                <p className="text-xs mt-1" style={{ color: '#4b5563' }}>Ensure backend is running</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TABLE VIEW ── */}
      {viewMode === 'table' && (
        <div className="glass-card overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2">
              <List size={15} style={{ color: '#a78bfa' }} />
              <span className="text-sm font-semibold text-season-text">Vessels — {filteredVessels.length} results</span>
            </div>
            <div className="relative">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search vessels..."
                className="season-input py-2 px-4 text-sm"
                style={{ width: '220px', paddingLeft: '36px' }}
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="season-table">
              <thead>
                <tr>
                  {['Vessel', 'Type', 'Status', 'GPS Position', 'Speed', 'Run Hours', 'Last Update', 'Change Status', ''].map((h) => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {isLoading && filteredVessels.length === 0
                  ? [1, 2, 3, 4].map((i) => (
                      <tr key={i}>{Array.from({ length: 9 }).map((_, j) => <td key={j}><div className="skeleton h-4 w-20 rounded" /></td>)}</tr>
                    ))
                  : filteredVessels.map((vessel) => (
                      <VesselTableRow key={vessel.id} vessel={vessel} onClick={() => openDrawer(vessel)} onUpdateStatus={handleUpdateStatus} />
                    ))}
              </tbody>
            </table>
            {filteredVessels.length === 0 && !isLoading && (
              <div className="text-center py-16">
                <Anchor size={40} className="mx-auto mb-3 opacity-20" style={{ color: '#a78bfa' }} />
                <p className="text-sm" style={{ color: '#6b7280' }}>{searchQuery ? 'No vessels match your search' : 'No vessel data'}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {isCreateOpen && <VesselFormModal onClose={() => setIsCreateOpen(false)} onSave={handleCreateVessel} />}
      {editVessel && <VesselFormModal initialData={editVessel} onClose={() => setEditVessel(null)} onSave={handleEditVessel} />}
      {drawerVessel && (
        <VesselDetailModal
          vessel={drawerVessel}
          onClose={() => { setDrawerVessel(null); selectVessel(null); }}
          onEdit={() => { setDrawerVessel(null); setEditVessel(drawerVessel); }}
        />
      )}
    </div>
  );
}
