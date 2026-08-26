'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useTelemetryStore } from '@/store/telemetry.store';
import type { LiveVessel } from '@/lib/api';
import { Map, Anchor, Activity, Clock, Gauge, Navigation2, RefreshCw, Plus, ChevronDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// Status badge helper
function VesselStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: 'badge-active',
    MAINTENANCE: 'badge-expiring',
    DOCKED: 'badge-docked',
    INACTIVE: 'badge-cancelled',
  };
  return <span className={`badge ${map[status] || 'badge-medium'}`}>{status}</span>;
}

// Vessel card in sidebar
function VesselCard({ vessel, isSelected, onClick, onUpdateStatus }: {
  vessel: LiveVessel;
  isSelected: boolean;
  onClick: () => void;
  onUpdateStatus: (id: string, status: string) => void;
}) {
  return (
    <div
      className="w-full text-left p-4 rounded-xl transition-all duration-200"
      style={{
        background: isSelected ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${isSelected ? 'rgba(139, 92, 246, 0.4)' : 'rgba(255,255,255,0.06)'}`,
      }}
    >
      <div className="flex items-start gap-3 cursor-pointer" onClick={onClick}>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: isSelected
              ? 'linear-gradient(135deg, #7c3aed, #0ea5e9)'
              : 'rgba(139, 92, 246, 0.15)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
          }}
        >
          <Anchor size={16} color="white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-sm text-white truncate">{vessel.name}</span>
            <VesselStatusBadge status={vessel.status} />
          </div>
          <div className="text-xs mt-1" style={{ color: '#6b7280' }}>{vessel.imoNumber} · {vessel.vesselType}</div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="flex items-center gap-1.5 text-xs" style={{ color: '#94a3b8' }}>
              <Gauge size={11} style={{ color: '#a78bfa' }} />
              {vessel.currentRunHours.toFixed(1)} hrs
            </div>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: '#94a3b8' }}>
              <Navigation2 size={11} style={{ color: '#60a5fa' }} />
              {vessel.speed.toFixed(1)} kts
            </div>
          </div>
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-1 text-xs" style={{ color: '#4b5563' }}>
              <Clock size={10} />
              {vessel.lastUpdate ? formatDistanceToNow(new Date(vessel.lastUpdate), { addSuffix: true }) : 'No data'}
            </div>
            
            {/* Status Dropdown */}
            <div className="relative" onClick={e => e.stopPropagation()}>
              <select
                value={vessel.status}
                onChange={e => onUpdateStatus(vessel.id, e.target.value)}
                className="season-select py-1 px-2 text-xs pr-6"
                style={{ appearance: 'none', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(139,92,246,0.3)' }}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="DOCKED">DOCKED</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
              <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#a78bfa' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Create Vessel Modal
function CreateVesselModal({ onClose, onSave }: { onClose: () => void; onSave: (data: any) => Promise<void> }) {
  const [name, setName] = useState('');
  const [imoNumber, setImoNumber] = useState('');
  const [vesselType, setVesselType] = useState('Bulk Carrier');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name || !imoNumber) return;
    setIsSaving(true);
    try {
      await onSave({ name, imoNumber, type: vesselType, status: 'DOCKED' });
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#120a2e] border border-purple-500/30 shadow-[0_0_60px_rgba(139,92,246,0.3)] rounded-2xl p-6">
        <h2 className="font-bold text-white text-lg mb-4">Add New Vessel</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-2 uppercase text-slate-400">Vessel Name</label>
            <input value={name} onChange={e => setName(e.target.value)} className="season-input" placeholder="e.g. MV Explorer" />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-2 uppercase text-slate-400">IMO Number</label>
            <input value={imoNumber} onChange={e => setImoNumber(e.target.value)} className="season-input" placeholder="e.g. IMO 1234567" />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-2 uppercase text-slate-400">Vessel Type</label>
            <div className="relative">
              <select value={vesselType} onChange={e => setVesselType(e.target.value)} className="season-select w-full" style={{ appearance: 'none' }}>
                <option>Bulk Carrier</option>
                <option>Oil Tanker</option>
                <option>Container Ship</option>
                <option>Ro-Ro Ship</option>
                <option>LNG Carrier</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#6b7280' }} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button onClick={handleSave} className="btn-primary flex-1 justify-center" disabled={!name || !imoNumber || isSaving}>
              Save Vessel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FleetPage() {
  const { liveVessels, selectedVesselId, isLoading, lastUpdated, fetchLive, selectVessel } = useTelemetryStore();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const mapRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const isInitialized = useRef(false);

  const handleCreateVessel = async (data: any) => {
    const api = await import('@/lib/api');
    await api.default.post('/vessels', data);
    fetchLive();
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    const api = await import('@/lib/api');
    await api.default.patch(`/vessels/${id}/status`, { status });
    fetchLive();
  };

  // Initialize Leaflet map
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const init = async () => {
      const L = (await import('leaflet')).default;

      // Fix default icon paths
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (!mapRef.current || mapInstanceRef.current) return;

      // Dark-themed tile layer
      const map = L.map(mapRef.current, {
        center: [3.0, 108.0],
        zoom: 5,
        zoomControl: true,
      });

      // Use CartoDB Dark Matter tile for dark ocean map
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
      }).addTo(map);

      mapInstanceRef.current = map;
    };

    init();
  }, []);

  // Create vessel SVG icon
  const createVesselIcon = useCallback(async (vessel: LiveVessel, isSelected: boolean) => {
    const L = (await import('leaflet')).default;
    const color = isSelected ? '#a78bfa' : vessel.status === 'ACTIVE' ? '#34d399' : vessel.status === 'DOCKED' ? '#60a5fa' : '#fbbf24';

    const svg = `
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="18" fill="${color}20" stroke="${color}" stroke-width="1.5" opacity="0.6"/>
        <circle cx="20" cy="20" r="10" fill="${color}40" stroke="${color}" stroke-width="2"/>
        <g transform="translate(20,20) rotate(${vessel.heading || 0})">
          <polygon points="0,-8 4,5 0,3 -4,5" fill="${color}" stroke="white" stroke-width="0.5"/>
        </g>
        ${isSelected ? `<circle cx="20" cy="20" r="18" fill="none" stroke="${color}" stroke-width="2" opacity="0.8">
          <animate attributeName="r" values="18;24;18" dur="2s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.8;0;0.8" dur="2s" repeatCount="indefinite"/>
        </circle>` : ''}
      </svg>
    `;

    return L.divIcon({
      html: svg,
      className: '',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20],
    });
  }, []);

  // Update markers when vessel data changes
  useEffect(() => {
    if (!mapInstanceRef.current || liveVessels.length === 0) return;

    const updateMarkers = async () => {
      const L = (await import('leaflet')).default;
      const map = mapInstanceRef.current;

      for (const vessel of liveVessels) {
        if (!vessel.latitude || !vessel.longitude) continue;

        const isSelected = vessel.id === selectedVesselId;
        const icon = await createVesselIcon(vessel, isSelected);

        const popupContent = `
          <div style="font-family: Inter, sans-serif; min-width: 220px; padding: 4px;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
              <div style="width: 36px; height: 36px; background: linear-gradient(135deg, #7c3aed, #0ea5e9); border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M2 20 L12 4 L22 20"/><path d="M12 4 L12 20"/><path d="M4 14 L20 14"/></svg>
              </div>
              <div>
                <div style="font-weight: 700; font-size: 15px; color: #e2e8f0;">${vessel.name}</div>
                <div style="font-size: 11px; color: #6b7280;">${vessel.imoNumber} · ${vessel.vesselType}</div>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px;">
              <div style="background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.2); border-radius: 8px; padding: 8px; text-align: center;">
                <div style="font-size: 18px; font-weight: 800; color: #c4b5fd;">${vessel.currentRunHours.toFixed(1)}</div>
                <div style="font-size: 10px; color: #6b7280; margin-top: 2px;">Run Hours</div>
              </div>
              <div style="background: rgba(14, 165, 233, 0.1); border: 1px solid rgba(14, 165, 233, 0.2); border-radius: 8px; padding: 8px; text-align: center;">
                <div style="font-size: 18px; font-weight: 800; color: #38bdf8;">${vessel.speed.toFixed(1)}</div>
                <div style="font-size: 10px; color: #6b7280; margin-top: 2px;">Speed (kts)</div>
              </div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="font-size: 11px; color: #6b7280;">
                📍 ${vessel.latitude.toFixed(4)}, ${vessel.longitude.toFixed(4)}
              </div>
              <span style="font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 12px; 
                background: ${vessel.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(96, 165, 250, 0.15)'}; 
                color: ${vessel.status === 'ACTIVE' ? '#34d399' : '#60a5fa'}; 
                border: 1px solid ${vessel.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(96, 165, 250, 0.3)'};">
                ${vessel.status}
              </span>
            </div>
            <div style="margin-top: 8px; font-size: 10px; color: #4b5563; text-align: center;">
              Hdg: ${vessel.heading.toFixed(0)}° · Flag: ${vessel.flag}
            </div>
          </div>
        `;

        const existing = markersRef.current[vessel.id];
        if (existing) {
          existing.setLatLng([vessel.latitude, vessel.longitude]);
          existing.setIcon(icon);
          existing.setPopupContent(popupContent);
        } else {
          const marker = L.marker([vessel.latitude, vessel.longitude], { icon })
            .addTo(map)
            .bindPopup(popupContent, { maxWidth: 280, minWidth: 240 });

          marker.on('click', () => selectVessel(vessel.id));
          markersRef.current[vessel.id] = marker;
        }
      }

      // Pan to selected vessel
      if (selectedVesselId) {
        const vessel = liveVessels.find(v => v.id === selectedVesselId);
        if (vessel?.latitude && vessel?.longitude) {
          map.flyTo([vessel.latitude, vessel.longitude], 8, { duration: 1.5 });
          markersRef.current[selectedVesselId]?.openPopup();
        }
      }
    };

    updateMarkers();
  }, [liveVessels, selectedVesselId, createVesselIcon]);

  // Fetch data + polling
  useEffect(() => {
    fetchLive();
    const interval = setInterval(fetchLive, 30000); // 30s polling
    return () => clearInterval(interval);
  }, [fetchLive]);

  return (
    <div className="space-y-6 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Map size={22} style={{ color: '#a78bfa' }} />
            Fleet <span style={{ color: '#a78bfa' }}>Tracker</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6b7280' }}>
            Real-time GPS positions of {liveVessels.length} vessels
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <div className="text-xs flex items-center gap-1.5" style={{ color: '#4b5563' }}>
              <Clock size={11} />
              Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
            </div>
          )}
          <button onClick={() => setIsCreateOpen(true)} className="btn-primary py-2 px-3 text-sm">
            <Plus size={14} /> Add Vessel
          </button>
          <button
            onClick={fetchLive}
            className="btn-secondary text-sm py-2 px-3"
            disabled={isLoading}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Main layout: Map + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4" style={{ height: 'calc(100vh - 200px)' }}>
        {/* Map */}
        <div className="lg:col-span-3 rounded-2xl overflow-hidden relative season-border-glow" style={{ minHeight: '500px' }}>
          <div ref={mapRef} style={{ width: '100%', height: '100%', minHeight: '500px' }} />

          {/* Map overlay: live indicator */}
          <div
            className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium z-[1000]"
            style={{ background: 'rgba(10, 5, 20, 0.9)', border: '1px solid rgba(139, 92, 246, 0.3)', backdropFilter: 'blur(12px)' }}
          >
            <Activity size={12} style={{ color: '#34d399' }} className="animate-pulse" />
            <span style={{ color: '#e2e8f0' }}>LIVE · {liveVessels.length} vessels</span>
          </div>
        </div>

        {/* Vessel sidebar */}
        <div className="flex flex-col gap-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <Anchor size={14} style={{ color: '#a78bfa' }} />
              <span className="text-sm font-semibold text-white">Fleet Registry</span>
            </div>
            <p className="text-xs" style={{ color: '#6b7280' }}>Click a vessel to track</p>
          </div>

          {isLoading && liveVessels.length === 0 ? (
            [1, 2, 3].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)
          ) : (
            liveVessels.map(vessel => (
              <VesselCard
                key={vessel.id}
                vessel={vessel}
                isSelected={vessel.id === selectedVesselId}
                onClick={() => selectVessel(vessel.id === selectedVesselId ? null : vessel.id)}
                onUpdateStatus={handleUpdateStatus}
              />
            ))
          )}

          {liveVessels.length === 0 && !isLoading && (
            <div className="glass-card p-6 text-center">
              <Anchor size={32} className="mx-auto mb-3 opacity-30" style={{ color: '#a78bfa' }} />
              <p className="text-sm" style={{ color: '#6b7280' }}>No vessel data</p>
              <p className="text-xs mt-1" style={{ color: '#4b5563' }}>Ensure backend is running</p>
            </div>
          )}
        </div>
      </div>

      {isCreateOpen && (
        <CreateVesselModal
          onClose={() => setIsCreateOpen(false)}
          onSave={handleCreateVessel}
        />
      )}
    </div>
  );
}
