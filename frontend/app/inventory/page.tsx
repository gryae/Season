'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { sparepartApi } from '@/lib/api';
import type { Sparepart, PurchaseRequest, WorkOrder } from '@/lib/api';
import {
  Package, AlertTriangle, TrendingDown, ShoppingCart,
  ChevronDown, Filter, Plus, X, QrCode, Search,
  Download, Edit, RefreshCw, ClipboardList, CheckCircle2,
  Loader2, Clock, FileText, Anchor, DollarSign, MapPin,
  Hash, Tag, BarChart3,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';

const PR_STATUS_OPTIONS = [
  { value: 'ALL', label: 'All PRs' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'ORDERED', label: 'Ordered' },
  { value: 'FULFILLED', label: 'Fulfilled' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

// ── Helpers ───────────────────────────────────────────────────
function StockBar({ current, minimum }: { current: number; minimum: number }) {
  const pct = Math.min(100, (current / Math.max(minimum * 2, current + 1)) * 100);
  const color = current === 0 ? '#ef4444' : current < minimum ? '#f59e0b' : '#10b981';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)', minWidth: '60px' }}>
        <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-semibold" style={{ color }}>{current}</span>
    </div>
  );
}

function PRStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: 'badge-pending', APPROVED: 'badge-progress',
    ORDERED: 'badge-docked', FULFILLED: 'badge-completed', CANCELLED: 'badge-cancelled',
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
  return <span className={`badge ${cls}`}><Icon size={10} />{status.replace('_', ' ')}</span>;
}

function WOPriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = { LOW: 'badge-low', MEDIUM: 'badge-medium', HIGH: 'badge-high', CRITICAL: 'badge-critical' };
  return <span className={`badge ${map[priority] || 'badge-medium'}`}>{priority}</span>;
}

// ══════════════════════════════════════════════════════════════
// QR CODE CANVAS  (pure canvas, no external renderer needed)
// ══════════════════════════════════════════════════════════════
function QRCodeCanvas({ value, size = 160 }: { value: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    let cancelled = false;
    import('qrcode').then(QRCode => {
      if (cancelled || !canvasRef.current) return;
      QRCode.toCanvas(canvasRef.current, value, {
        width: size,
        margin: 2,
        color: { dark: '#a78bfa', light: '#0a0514' },
      }).then(() => { if (!cancelled) setLoaded(true); }).catch(console.error);
    });
    return () => { cancelled = true; };
  }, [value, size]);

  return (
    <div className="relative">
      <canvas ref={canvasRef} width={size} height={size} className="rounded-xl" />
      {!loaded && <div className="absolute inset-0 skeleton rounded-xl" />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// SPAREPART DETAIL MODAL (Centered instead of Drawer)
// ══════════════════════════════════════════════════════════════
function SparepartDetailModal({
  sparepartId,
  onClose,
  onRestock,
  onEdit,
  onRaisePR,
}: {
  sparepartId: string;
  onClose: () => void;
  onRestock: (sp: Sparepart) => void;
  onEdit: (sp: Sparepart) => void;
  onRaisePR: (sp: Sparepart) => void;
}) {
  const [activeTab, setActiveTab] = useState<'details' | 'history' | 'pr-history'>('details');
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [sparepart, setSparepart] = useState<Sparepart & { purchaseRequests?: PurchaseRequest[] } | null>(null);
  const [isLoadingWO, setIsLoadingWO] = useState(false);
  const router = useRouter();

  // Load full sparepart details including PRs
  useEffect(() => {
    sparepartApi.getOne(sparepartId).then(setSparepart).catch(console.error);
  }, [sparepartId]);

  // Load WO history when switching to history tab
  useEffect(() => {
    if (activeTab !== 'history' || !sparepart) return;
    setIsLoadingWO(true);
    import('@/lib/api').then(m =>
      m.workOrderApi.getAll().then(all => {
        // Filter WOs that used this sparepart
        const related = all.filter(wo =>
          wo.sparepartUsages?.some(u => u.sparepart.id === sparepart.id)
        );
        setWorkOrders(related);
      }).catch(console.error)
    ).finally(() => setIsLoadingWO(false));
  }, [activeTab, sparepart]);

  if (!sparepart) {
    return (
      <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <Loader2 className="animate-spin text-white" size={40} />
      </div>
    );
  }

  const qrValue = `SEASON:PART:${sparepart.partNumber}:${sparepart.id}`;
  const isLow = sparepart.currentStock < sparepart.minimumStockLevel;
  const isOut = sparepart.currentStock === 0;
  const stockColor = isOut ? '#ef4444' : isLow ? '#f59e0b' : '#34d399';

  const handleDownloadQR = async () => {
    const QRCode = await import('qrcode');
    const dataUrl = await QRCode.toDataURL(qrValue, {
      width: 400,
      margin: 2,
      color: { dark: '#7c3aed', light: '#ffffff' },
    });
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `QR-${sparepart.partNumber}.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-3xl flex flex-col rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(12, 6, 28, 0.98)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          boxShadow: '0 0 60px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(24px)',
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div className="px-6 py-5 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-start justify-between mb-1">
            <div className="flex-1 min-w-0 pr-4">
              <h2 className="font-bold text-white text-xl leading-tight">{sparepart.name}</h2>
              <p className="text-sm mt-0.5 font-mono" style={{ color: '#a78bfa' }}>{sparepart.partNumber}</p>
            </div>
            <button onClick={onClose} style={{ color: '#6b7280', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <X size={16} />
            </button>
          </div>
          {/* Stock summary */}
          <p className="text-sm mt-2" style={{ color: stockColor }}>
            <span className="font-bold text-base">{sparepart.currentStock}</span> {sparepart.unit} in stock
            {isOut && <span className="ml-2 text-xs font-semibold">(OUT OF STOCK)</span>}
            {!isOut && isLow && <span className="ml-2 text-xs font-semibold">(LOW STOCK)</span>}
          </p>

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <button
              onClick={() => onRestock(sparepart)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)', cursor: 'pointer' }}
            >
              <Plus size={13} /> Restock
            </button>
            <button
              onClick={() => onRaisePR(sparepart)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)', cursor: 'pointer' }}
            >
              <ShoppingCart size={13} /> Raise PR
            </button>
            <button
              onClick={() => onEdit(sparepart)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: 'rgba(139,92,246,0.12)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.3)', cursor: 'pointer' }}
            >
              <Edit size={13} /> Edit
            </button>
            <button
              onClick={handleDownloadQR}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ml-auto"
              style={{ background: 'rgba(14,165,233,0.12)', color: '#38bdf8', border: '1px solid rgba(14,165,233,0.3)', cursor: 'pointer' }}
            >
              <Download size={13} /> QR Code
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-shrink-0 px-6 gap-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {(['details', 'history', 'pr-history'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className="py-3 text-sm font-medium capitalize relative" style={{ color: activeTab === tab ? '#c4b5fd' : '#6b7280', background: 'transparent', border: 'none', cursor: 'pointer' }}>
              {tab === 'details' ? 'Details' : tab === 'history' ? 'WO History' : 'PR History'}
              {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: 'linear-gradient(90deg,#7c3aed,#0ea5e9)' }} />}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {activeTab === 'details' && (
            <>
              {/* Key stats grid */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: BarChart3, label: 'Min. Stock', value: `${sparepart.minimumStockLevel} ${sparepart.unit}`, color: '#fbbf24' },
                  { icon: DollarSign, label: 'Unit Cost', value: `$${sparepart.unitPrice.toFixed(2)}`, color: '#34d399' },
                  { icon: Tag, label: 'Category', value: sparepart.category, color: '#a78bfa' },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div key={label} className="rounded-xl p-4 text-center flex flex-col items-center justify-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <Icon size={20} className="mb-2" style={{ color }} />
                    <p className="text-xs mb-1" style={{ color: '#4b5563' }}>{label}</p>
                    <p className="text-base font-bold text-white truncate w-full">{value}</p>
                  </div>
                ))}
              </div>

              {/* Available quantity */}
              <div className="rounded-xl p-5" style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)' }}>
                <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#6b7280' }}>Available Quantity</p>
                <div className="flex items-center gap-4">
                  <StockBar current={sparepart.currentStock} minimum={sparepart.minimumStockLevel} />
                  <span className="text-base font-bold" style={{ color: stockColor }}>{sparepart.currentStock} {sparepart.unit}</span>
                </div>
              </div>

              {/* Location */}
              {sparepart.location && (
                <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin size={13} style={{ color: '#38bdf8' }} />
                    <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6b7280' }}>Location</p>
                  </div>
                  <p className="text-sm font-medium text-white">{sparepart.location}</p>
                </div>
              )}

              {/* Description */}
              {sparepart.description && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#4b5563' }}>Description</p>
                  <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>{sparepart.description}</p>
                </div>
              )}

              {/* QR Code */}
              <div className="rounded-xl p-5" style={{ background: 'rgba(14,165,233,0.05)', border: '1px solid rgba(14,165,233,0.2)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <QrCode size={14} style={{ color: '#38bdf8' }} />
                  <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#38bdf8' }}>QR Code</p>
                </div>
                <div className="flex items-start gap-6">
                  <QRCodeCanvas value={qrValue} size={140} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs mb-1" style={{ color: '#4b5563' }}>Encoded data</p>
                    <p className="text-xs font-mono break-all" style={{ color: '#6b7280' }}>{qrValue}</p>
                    <button
                      onClick={handleDownloadQR}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold mt-4"
                      style={{ background: 'rgba(14,165,233,0.15)', color: '#38bdf8', border: '1px solid rgba(14,165,233,0.3)', cursor: 'pointer' }}
                    >
                      <Download size={12} /> Download PNG
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'history' && (
            <div>
              {isLoadingWO ? (
                [1, 2, 3].map(i => <div key={i} className="skeleton h-20 rounded-xl mb-3" />)
              ) : workOrders.length === 0 ? (
                <div className="text-center py-12">
                  <ClipboardList size={40} className="mx-auto mb-3 opacity-20" style={{ color: '#a78bfa' }} />
                  <p className="text-sm" style={{ color: '#6b7280' }}>No work orders used this part</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {workOrders.map(wo => {
                    const usage = wo.sparepartUsages?.find(u => u.sparepart.id === sparepart.id);
                    return (
                      <div key={wo.id} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.2)' }}>
                              <FileText size={14} style={{ color: '#a78bfa' }} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-white truncate">{wo.title}</p>
                              <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>#{wo.woNumber}</p>
                            </div>
                          </div>
                          <WOStatusBadge status={wo.status} />
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mt-2 pl-10">
                          <WOPriorityBadge priority={wo.priority} />
                          {usage && (
                            <span className="text-xs px-2 py-0.5 rounded-md" style={{ background: 'rgba(139,92,246,0.12)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.2)' }}>
                              Used: {usage.quantityUsed} {sparepart.unit}
                            </span>
                          )}
                          {wo.assignedTo && (
                            <span className="text-xs flex items-center gap-1 ml-auto" style={{ color: '#6b7280' }}>
                              <Anchor size={10} style={{ color: '#a78bfa' }} />{wo.vessel?.name || '—'}
                            </span>
                          )}
                          <span className="text-xs ml-2" style={{ color: '#4b5563' }}>
                            {wo.completedAt ? `Completed ${format(new Date(wo.completedAt), 'dd/MM/yyyy')}` : `Created ${format(new Date(wo.createdAt), 'dd/MM/yyyy')}`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'pr-history' && (
            <div>
              {!sparepart.purchaseRequests || sparepart.purchaseRequests.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart size={40} className="mx-auto mb-3 opacity-20" style={{ color: '#a78bfa' }} />
                  <p className="text-sm" style={{ color: '#6b7280' }}>No purchase requests for this part</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sparepart.purchaseRequests.map((pr: any) => (
                    <div key={pr.id} className="rounded-xl p-4 flex items-center justify-between gap-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-mono text-sm text-white">{pr.prNumber}</p>
                          <PRStatusBadge status={pr.status} />
                        </div>
                        <p className="text-xs text-slate-400 mb-1">{pr.reason}</p>
                        <p className="text-xs text-slate-500">Requested {formatDistanceToNow(new Date(pr.requestedAt), { addSuffix: true })}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-amber-400">{pr.quantityNeeded} <span className="text-sm font-normal">{sparepart.unit}</span></p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer — Use in Work Order */}
        <div className="px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={() => router.push(`/work-orders?sparepartId=${sparepart.id}&sparepartName=${encodeURIComponent(sparepart.name)}`)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-transform hover:scale-[1.01]"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#0ea5e9)', color: 'white', border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(124,58,237,0.35)' }}
          >
            <ClipboardList size={16} /> Use in New Work Order
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// RAISE PR MODAL
// ══════════════════════════════════════════════════════════════
function RaisePRModal({ sparepart, onClose, onSave }: { sparepart: Sparepart; onClose: () => void; onSave: (data: { quantityNeeded: number; reason: string }) => Promise<void> }) {
  const [qty, setQty] = useState(sparepart.minimumStockLevel > 0 ? sparepart.minimumStockLevel : 1);
  const [reason, setReason] = useState(`Manual restock request for ${sparepart.name}`);
  const [isSaving, setIsSaving] = useState(false);

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[#120a2e] border border-purple-500/30 shadow-[0_0_60px_rgba(139,92,246,0.3)] rounded-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-white text-base">Raise Purchase Request</h2>
          <button onClick={onClose} style={{ color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-2 uppercase text-slate-400">Sparepart</label>
            <p className="text-sm font-bold text-white">{sparepart.name}</p>
            <p className="text-xs text-slate-400">{sparepart.partNumber}</p>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-2 uppercase text-slate-400">Quantity Needed ({sparepart.unit})</label>
            <input type="number" min={1} value={qty} onChange={e => setQty(parseInt(e.target.value) || 1)} className="season-input" />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-2 uppercase text-slate-400">Reason / Notes</label>
            <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} className="season-input resize-none" />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button
            onClick={async () => { setIsSaving(true); await onSave({ quantityNeeded: qty, reason }); setIsSaving(false); onClose(); }}
            className="btn-primary flex-1 justify-center"
            disabled={isSaving || qty < 1}
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <ShoppingCart size={14} />} Raise PR
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// RESTOCK MODAL
// ══════════════════════════════════════════════════════════════
function RestockModal({ sparepart, onClose, onSave }: { sparepart: Sparepart; onClose: () => void; onSave: (qty: number) => Promise<void> }) {
  const [qty, setQty] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[#120a2e] border border-purple-500/30 shadow-[0_0_60px_rgba(139,92,246,0.3)] rounded-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-white text-base">Restock: {sparepart.name}</h2>
          <button onClick={onClose} style={{ color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
        </div>
        <p className="text-sm mb-4" style={{ color: '#6b7280' }}>
          Current stock: <span className="font-bold text-white">{sparepart.currentStock} {sparepart.unit}</span>
        </p>
        <label className="block text-xs font-semibold mb-2 uppercase text-slate-400">Add Quantity</label>
        <input type="number" min={1} value={qty} onChange={e => setQty(parseInt(e.target.value) || 1)} className="season-input mb-4" />
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button
            onClick={async () => { setIsSaving(true); await onSave(qty); setIsSaving(false); onClose(); }}
            className="btn-primary flex-1 justify-center"
            disabled={isSaving}
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add Stock
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// CREATE / EDIT SPAREPART MODAL
// ══════════════════════════════════════════════════════════════
function SparepartFormModal({
  sparepart,
  onClose,
  onSave,
}: {
  sparepart?: Sparepart;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}) {
  const [partNumber, setPartNumber] = useState(sparepart?.partNumber || '');
  const [name, setName] = useState(sparepart?.name || '');
  const [category, setCategory] = useState(sparepart?.category || '');
  const [description, setDescription] = useState(sparepart?.description || '');
  const [currentStock, setCurrentStock] = useState(sparepart?.currentStock ?? 0);
  const [minimumStockLevel, setMinimumStockLevel] = useState(sparepart?.minimumStockLevel ?? 0);
  const [unit, setUnit] = useState(sparepart?.unit || 'pcs');
  const [unitPrice, setUnitPrice] = useState(sparepart?.unitPrice ?? 0);
  const [location, setLocation] = useState(sparepart?.location || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!partNumber || !name || !category) return;
    setIsSaving(true);
    try {
      await onSave({ partNumber, name, category, description, currentStock, minimumStockLevel, unit, unitPrice, location });
      onClose();
    } catch (e) { console.error(e); } finally { setIsSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#120a2e] border border-purple-500/30 shadow-[0_0_60px_rgba(139,92,246,0.3)] rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h2 className="font-bold text-white text-lg">{sparepart ? 'Edit Sparepart' : 'Add Sparepart'}</h2>
          <button onClick={onClose} style={{ color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-2 uppercase text-slate-400">Part Number</label>
              <input value={partNumber} onChange={e => setPartNumber(e.target.value)} className="season-input" placeholder="e.g. SP-100" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-2 uppercase text-slate-400">Name</label>
              <input value={name} onChange={e => setName(e.target.value)} className="season-input" placeholder="e.g. Engine Valve" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-2 uppercase text-slate-400">Category</label>
              <input value={category} onChange={e => setCategory(e.target.value)} className="season-input" placeholder="e.g. Engine" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-2 uppercase text-slate-400">Unit</label>
              <input value={unit} onChange={e => setUnit(e.target.value)} className="season-input" placeholder="e.g. pcs" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-2 uppercase text-slate-400">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="season-input resize-none" placeholder="Part description..." />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-2 uppercase text-slate-400">Current Stock</label>
              <input type="number" min={0} value={currentStock} onChange={e => setCurrentStock(parseInt(e.target.value) || 0)} className="season-input" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-2 uppercase text-slate-400">Min Stock</label>
              <input type="number" min={0} value={minimumStockLevel} onChange={e => setMinimumStockLevel(parseInt(e.target.value) || 0)} className="season-input" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-2 uppercase text-slate-400">Unit Price</label>
              <input type="number" min={0} step={0.01} value={unitPrice} onChange={e => setUnitPrice(parseFloat(e.target.value) || 0)} className="season-input" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-2 uppercase text-slate-400">Location / Shelf</label>
            <input value={location} onChange={e => setLocation(e.target.value)} className="season-input" placeholder="e.g. Shelf A-1" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button onClick={handleSave} className="btn-primary flex-1 justify-center" disabled={!partNumber || !name || !category || isSaving}>
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Package size={14} />} Save Part
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════
export default function InventoryPage() {
  const [spareparts, setSpareparts] = useState<Sparepart[]>([]);
  const [prs, setPRs] = useState<PurchaseRequest[]>([]);
  const [prFilter, setPrFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'inventory' | 'purchase-requests'>('inventory');
  const [searchQuery, setSearchQuery] = useState('');

  // Drawer / modals
  const [selectedSPId, setSelectedSPId] = useState<string | null>(null);
  const [restockSP, setRestockSP] = useState<Sparepart | null>(null);
  const [editSP, setEditSP] = useState<Sparepart | null>(null);
  const [raisePRSP, setRaisePRSP] = useState<Sparepart | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [sps, prData] = await Promise.all([sparepartApi.getAll(), sparepartApi.getPurchaseRequests()]);
    setSpareparts(sps);
    setPRs(prData);
    setLoading(false);
  };

  useEffect(() => { loadData().catch(console.error); }, []);

  const handleCreateSparepart = async (data: any) => { await sparepartApi.create(data); await loadData(); };
  const handleEditSparepart = async (data: any) => {
    if (!editSP) return;
    await sparepartApi.update(editSP.id, data);
    await loadData();
  };
  const handleRestock = async (qty: number) => {
    if (!restockSP) return;
    await sparepartApi.update(restockSP.id, { currentStock: restockSP.currentStock + qty });
    await loadData();
  };
  const handleRaisePR = async (data: { quantityNeeded: number; reason: string }) => {
    if (!raisePRSP) return;
    await sparepartApi.createPurchaseRequest({
      sparepartId: raisePRSP.id,
      quantityNeeded: data.quantityNeeded,
      reason: data.reason,
    });
    await loadData();
  };
  const handleUpdatePRStatus = async (id: string, status: string) => {
    await sparepartApi.updatePRStatus(id, status);
    // If status became FULFILLED, we need to refresh data because stock changed
    if (status === 'FULFILLED') {
      await loadData();
    } else {
      setPRs(prev => prev.map(p => p.id === id ? { ...p, status: status as any } : p));
    }
  };

  const lowStock = spareparts.filter(s => s.currentStock < s.minimumStockLevel);
  const outOfStock = spareparts.filter(s => s.currentStock === 0);
  const filteredPRs = prFilter === 'ALL' ? prs : prs.filter(p => p.status === prFilter);
  const filteredParts = spareparts.filter(s =>
    !searchQuery ||
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.partNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Package size={22} style={{ color: '#a78bfa' }} />
            Inventory <span style={{ color: '#a78bfa' }}>&amp; Parts</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6b7280' }}>Sparepart stock management and purchase requests</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search parts..." className="season-input py-2 text-sm" style={{ width: '200px', paddingLeft: '36px' }} />
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#6b7280' }} />
          </div>
          <button onClick={() => loadData()} className="btn-secondary py-2 px-3 text-sm">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={() => setIsCreateOpen(true)} className="btn-primary">
            <Plus size={16} /> Add Sparepart
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Items', value: spareparts.length, color: '#a78bfa', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.2)' },
          { label: 'Adequate Stock', value: spareparts.length - lowStock.length, color: '#34d399', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
          { label: 'Low Stock', value: lowStock.length, color: '#fbbf24', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
          { label: 'Out of Stock', value: outOfStock.length, color: '#f87171', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
        ].map(({ label, value, color, bg, border }) => (
          <div key={label} className="rounded-xl px-4 py-3 text-center" style={{ background: bg, border: `1px solid ${border}` }}>
            <p className="text-xl font-bold" style={{ color }}>{value}</p>
            <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Low Stock Alert Banner */}
      {lowStock.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)' }}>
          <AlertTriangle size={16} style={{ color: '#fbbf24', flexShrink: 0 }} />
          <span className="text-sm" style={{ color: '#fbbf24' }}>
            {lowStock.length} item(s) below minimum stock level.
          </span>
          <button onClick={() => setActiveTab('purchase-requests')} className="text-xs ml-auto underline" style={{ color: '#fbbf24', background: 'none', border: 'none', cursor: 'pointer' }}>
            View PRs →
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', display: 'inline-flex' }}>
        {[
          { id: 'inventory', label: 'Inventory', icon: Package },
          { id: 'purchase-requests', label: `Purchase Requests (${prs.filter(p => p.status === 'PENDING').length})`, icon: ShoppingCart },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id as any)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all" style={{ background: activeTab === id ? 'rgba(139,92,246,0.2)' : 'transparent', color: activeTab === id ? '#c4b5fd' : '#6b7280', border: activeTab === id ? '1px solid rgba(139,92,246,0.3)' : '1px solid transparent', cursor: 'pointer' }}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ── Inventory Table ── */}
      {activeTab === 'inventory' && (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="season-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Part Number</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Stock Level</th>
                  <th>Min. Stock</th>
                  <th>Unit Price</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>QR</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [1,2,3,4,5].map(i => (
                    <tr key={i}>{[1,2,3,4,5,6,7,8,9,10].map(j => <td key={j}><div className="skeleton h-4 rounded" /></td>)}</tr>
                  ))
                ) : filteredParts.map(sp => {
                  const isLow = sp.currentStock < sp.minimumStockLevel;
                  const isOut = sp.currentStock === 0;
                  return (
                    <tr
                      key={sp.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedSPId(sp.id)}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(139,92,246,0.05)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td className="w-10">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)' }}>
                          <Package size={14} style={{ color: '#a78bfa' }} />
                        </div>
                      </td>
                      <td><span className="font-mono text-xs" style={{ color: '#a78bfa' }}>{sp.partNumber}</span></td>
                      <td>
                        <div className="font-medium text-white">{sp.name}</div>
                        {sp.description && <div className="text-xs mt-0.5 truncate max-w-[180px]" style={{ color: '#6b7280' }}>{sp.description}</div>}
                      </td>
                      <td><span className="badge badge-medium">{sp.category}</span></td>
                      <td>
                        <div className="flex flex-col gap-1 min-w-[100px]">
                          <StockBar current={sp.currentStock} minimum={sp.minimumStockLevel} />
                          <span className="text-xs" style={{ color: '#6b7280' }}>{sp.currentStock} {sp.unit}</span>
                        </div>
                      </td>
                      <td><span className="text-sm" style={{ color: '#94a3b8' }}>{sp.minimumStockLevel} {sp.unit}</span></td>
                      <td><span className="text-sm" style={{ color: '#e2e8f0' }}>${sp.unitPrice.toFixed(2)}</span></td>
                      <td><span className="text-xs" style={{ color: '#6b7280' }}>{sp.location || '—'}</span></td>
                      <td>
                        {isOut ? <span className="badge badge-expired">OUT OF STOCK</span>
                          : isLow ? <span className="badge badge-expiring"><TrendingDown size={10} /> LOW</span>
                          : <span className="badge badge-valid">OK</span>}
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedSPId(sp.id)}
                          className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
                          style={{ background: 'rgba(14,165,233,0.1)', color: '#38bdf8', border: '1px solid rgba(14,165,233,0.25)', cursor: 'pointer' }}
                        >
                          <QrCode size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredParts.length === 0 && !loading && (
                  <tr><td colSpan={10} className="text-center py-12">
                    <Package size={40} className="mx-auto mb-3 opacity-20" style={{ color: '#a78bfa' }} />
                    <p style={{ color: '#4b5563' }}>No spareparts found</p>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Purchase Requests ── */}
      {activeTab === 'purchase-requests' && (
        <div className="space-y-4">
          <div className="glass-card p-4 flex items-center gap-4">
            <Filter size={14} style={{ color: '#a78bfa' }} />
            <span className="text-sm" style={{ color: '#94a3b8' }}>Filter:</span>
            <div className="relative">
              <select value={prFilter} onChange={e => setPrFilter(e.target.value)} className="season-select pr-10 py-2 text-sm" style={{ appearance: 'none', minWidth: '160px' }}>
                {PR_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#6b7280' }} />
            </div>
            <span className="text-xs ml-auto" style={{ color: '#4b5563' }}>{filteredPRs.length} PRs shown</span>
          </div>
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="season-table">
                <thead>
                  <tr><th>PR Number</th><th>Sparepart</th><th>Qty Needed</th><th>Status</th><th>Reason</th><th>Requested</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {filteredPRs.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-10">
                      <ShoppingCart size={36} className="mx-auto mb-3 opacity-20" style={{ color: '#a78bfa' }} />
                      <p style={{ color: '#4b5563' }}>No purchase requests found</p>
                    </td></tr>
                  ) : filteredPRs.map(pr => (
                    <tr key={pr.id}>
                      <td><span className="font-mono text-xs" style={{ color: '#a78bfa' }}>{pr.prNumber}</span></td>
                      <td>
                        <div className="font-medium text-white">{pr.sparepart?.name}</div>
                        <div className="text-xs" style={{ color: '#6b7280' }}>{pr.sparepart?.partNumber}</div>
                      </td>
                      <td><span className="text-sm font-semibold" style={{ color: '#fbbf24' }}>{pr.quantityNeeded} {pr.sparepart?.unit}</span></td>
                      <td><PRStatusBadge status={pr.status} /></td>
                      <td><span className="text-xs max-w-xs truncate block" style={{ color: '#6b7280' }}>{pr.reason || '—'}</span></td>
                      <td><span className="text-xs" style={{ color: '#6b7280' }}>{formatDistanceToNow(new Date(pr.requestedAt), { addSuffix: true })}</span></td>
                      <td>
                        {pr.status === 'PENDING' && (
                          <div className="flex gap-1">
                            <button onClick={() => handleUpdatePRStatus(pr.id, 'APPROVED')} className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)', cursor: 'pointer' }}>Approve</button>
                            <button onClick={() => handleUpdatePRStatus(pr.id, 'CANCELLED')} className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer' }}>Cancel</button>
                          </div>
                        )}
                        {pr.status === 'APPROVED' && <button onClick={() => handleUpdatePRStatus(pr.id, 'ORDERED')} className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(14,165,233,0.15)', color: '#38bdf8', border: '1px solid rgba(14,165,233,0.3)', cursor: 'pointer' }}>Mark Ordered</button>}
                        {pr.status === 'ORDERED' && <button onClick={() => handleUpdatePRStatus(pr.id, 'FULFILLED')} className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)', cursor: 'pointer' }}>Fulfilled</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Modals & Drawer ── */}
      {selectedSPId && (
        <SparepartDetailModal
          sparepartId={selectedSPId}
          onClose={() => setSelectedSPId(null)}
          onRestock={sp => { setSelectedSPId(null); setRestockSP(sp); }}
          onEdit={sp => { setSelectedSPId(null); setEditSP(sp); }}
          onRaisePR={sp => { setSelectedSPId(null); setRaisePRSP(sp); }}
        />
      )}
      {restockSP && <RestockModal sparepart={restockSP} onClose={() => setRestockSP(null)} onSave={handleRestock} />}
      {raisePRSP && <RaisePRModal sparepart={raisePRSP} onClose={() => setRaisePRSP(null)} onSave={handleRaisePR} />}
      {editSP && <SparepartFormModal sparepart={editSP} onClose={() => setEditSP(null)} onSave={handleEditSparepart} />}
      {isCreateOpen && <SparepartFormModal onClose={() => setIsCreateOpen(false)} onSave={handleCreateSparepart} />}
    </div>
  );
}
