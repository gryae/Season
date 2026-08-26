'use client';

import { useEffect, useState } from 'react';
import { sparepartApi } from '@/lib/api';
import type { Sparepart, PurchaseRequest } from '@/lib/api';
import { Package, AlertTriangle, TrendingDown, ShoppingCart, ChevronDown, Filter, Plus, X } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const PR_STATUS_OPTIONS = [
  { value: 'ALL', label: 'All PRs' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'ORDERED', label: 'Ordered' },
  { value: 'FULFILLED', label: 'Fulfilled' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

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
    PENDING: 'badge-pending',
    APPROVED: 'badge-progress',
    ORDERED: 'badge-docked',
    FULFILLED: 'badge-completed',
    CANCELLED: 'badge-cancelled',
  };
  return <span className={`badge ${map[status] || 'badge-medium'}`}>{status}</span>;
}

// Create Sparepart Modal
function CreateSparepartModal({ onClose, onSave }: { onClose: () => void; onSave: (data: any) => Promise<void> }) {
  const [partNumber, setPartNumber] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [currentStock, setCurrentStock] = useState<number>(0);
  const [minimumStockLevel, setMinimumStockLevel] = useState<number>(0);
  const [unit, setUnit] = useState('pcs');
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!partNumber || !name || !category) return;
    setIsSaving(true);
    try {
      await onSave({ partNumber, name, category, currentStock, minimumStockLevel, unit, unitPrice });
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
      <div className="relative w-full max-w-lg bg-[#120a2e] border border-purple-500/30 shadow-[0_0_60px_rgba(139,92,246,0.3)] rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h2 className="font-bold text-white text-lg">Add Sparepart</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={16} /></button>
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
          <div className="flex gap-3 pt-4">
            <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button onClick={handleSave} className="btn-primary flex-1 justify-center" disabled={!partNumber || !name || !category || isSaving}>
              Save Part
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const [spareparts, setSpareparts] = useState<Sparepart[]>([]);
  const [prs, setPRs] = useState<PurchaseRequest[]>([]);
  const [prFilter, setPrFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'inventory' | 'purchase-requests'>('inventory');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [sps, prData] = await Promise.all([
      sparepartApi.getAll(),
      sparepartApi.getPurchaseRequests(),
    ]);
    setSpareparts(sps);
    setPRs(prData);
    setLoading(false);
  };

  useEffect(() => {
    loadData().catch(console.error);
  }, []);

  const handleCreateSparepart = async (data: any) => {
    await sparepartApi.create(data);
    loadData();
  };

  const lowStock = spareparts.filter(s => s.currentStock < s.minimumStockLevel);
  const outOfStock = spareparts.filter(s => s.currentStock === 0);

  const filteredPRs = prFilter === 'ALL' ? prs : prs.filter(p => p.status === prFilter);

  const handleUpdatePRStatus = async (id: string, status: string) => {
    await sparepartApi.updatePRStatus(id, status);
    setPRs(prev => prev.map(p => p.id === id ? { ...p, status: status as any } : p));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Package size={22} style={{ color: '#a78bfa' }} />
            Inventory <span style={{ color: '#a78bfa' }}>& Parts</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6b7280' }}>Sparepart stock management and purchase requests</p>
        </div>
        <button onClick={() => setIsCreateOpen(true)} className="btn-primary">
          <Plus size={16} /> Add Sparepart
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-bold" style={{ color: '#a78bfa' }}>{spareparts.length}</div>
          <div className="text-xs mt-1" style={{ color: '#6b7280' }}>Total Items</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-bold" style={{ color: '#34d399' }}>{spareparts.length - lowStock.length}</div>
          <div className="text-xs mt-1" style={{ color: '#6b7280' }}>Adequate Stock</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-bold" style={{ color: '#f59e0b' }}>{lowStock.length}</div>
          <div className="text-xs mt-1" style={{ color: '#6b7280' }}>Low Stock</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-bold" style={{ color: '#ef4444' }}>{outOfStock.length}</div>
          <div className="text-xs mt-1" style={{ color: '#6b7280' }}>Out of Stock</div>
        </div>
      </div>

      {/* Low Stock Alert Banner */}
      {lowStock.length > 0 && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl animate-fade-in"
          style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)' }}
        >
          <AlertTriangle size={16} style={{ color: '#fbbf24', flexShrink: 0 }} />
          <span className="text-sm" style={{ color: '#fbbf24' }}>
            {lowStock.length} item(s) below minimum stock level. Purchase Requests have been auto-generated.
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
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{
              background: activeTab === id ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
              color: activeTab === id ? '#c4b5fd' : '#6b7280',
              border: activeTab === id ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid transparent',
              cursor: 'pointer',
            }}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Inventory Table */}
      {activeTab === 'inventory' && (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="season-table">
              <thead>
                <tr>
                  <th>Part Number</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Stock Level</th>
                  <th>Min. Stock</th>
                  <th>Unit Price</th>
                  <th>Location</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [1,2,3,4,5].map(i => (
                    <tr key={i}>
                      {[1,2,3,4,5,6,7,8].map(j => <td key={j}><div className="skeleton h-4 rounded" /></td>)}
                    </tr>
                  ))
                ) : (
                  spareparts.map(sp => {
                    const isLow = sp.currentStock < sp.minimumStockLevel;
                    const isOut = sp.currentStock === 0;
                    return (
                      <tr key={sp.id}>
                        <td>
                          <span className="font-mono text-xs" style={{ color: '#a78bfa' }}>{sp.partNumber}</span>
                        </td>
                        <td>
                          <div className="font-medium text-white">{sp.name}</div>
                          {sp.description && <div className="text-xs mt-0.5 truncate max-w-xs" style={{ color: '#6b7280' }}>{sp.description}</div>}
                        </td>
                        <td><span className="badge badge-medium">{sp.category}</span></td>
                        <td>
                          <div className="flex flex-col gap-1 min-w-[100px]">
                            <StockBar current={sp.currentStock} minimum={sp.minimumStockLevel} />
                            <span className="text-xs" style={{ color: '#6b7280' }}>{sp.currentStock} {sp.unit}</span>
                          </div>
                        </td>
                        <td>
                          <span className="text-sm" style={{ color: '#94a3b8' }}>{sp.minimumStockLevel} {sp.unit}</span>
                        </td>
                        <td>
                          <span className="text-sm" style={{ color: '#e2e8f0' }}>${sp.unitPrice.toFixed(2)}</span>
                        </td>
                        <td>
                          <span className="text-xs" style={{ color: '#6b7280' }}>{sp.location || '—'}</span>
                        </td>
                        <td>
                          {isOut ? (
                            <span className="badge badge-expired">OUT OF STOCK</span>
                          ) : isLow ? (
                            <span className="badge badge-expiring">
                              <TrendingDown size={10} />
                              LOW STOCK
                            </span>
                          ) : (
                            <span className="badge badge-valid">OK</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Purchase Requests Table */}
      {activeTab === 'purchase-requests' && (
        <div className="space-y-4">
          {/* PR Filter Dropdown */}
          <div className="glass-card p-4 flex items-center gap-4">
            <Filter size={14} style={{ color: '#a78bfa' }} />
            <span className="text-sm" style={{ color: '#94a3b8' }}>Filter by Status:</span>
            <div className="relative">
              <select
                value={prFilter}
                onChange={e => setPrFilter(e.target.value)}
                className="season-select pr-10 py-2 text-sm"
                style={{ appearance: 'none', minWidth: '160px' }}
              >
                {PR_STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#6b7280' }} />
            </div>
            <span className="text-xs ml-auto" style={{ color: '#4b5563' }}>{filteredPRs.length} PRs shown</span>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="season-table">
                <thead>
                  <tr>
                    <th>PR Number</th>
                    <th>Sparepart</th>
                    <th>Qty Needed</th>
                    <th>Status</th>
                    <th>Reason</th>
                    <th>Requested</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPRs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10">
                        <ShoppingCart size={36} className="mx-auto mb-3 opacity-20" style={{ color: '#a78bfa' }} />
                        <p style={{ color: '#4b5563' }}>No purchase requests found</p>
                      </td>
                    </tr>
                  ) : (
                    filteredPRs.map(pr => (
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
                              <button
                                onClick={() => handleUpdatePRStatus(pr.id, 'APPROVED')}
                                className="text-xs px-2 py-1 rounded-lg"
                                style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', cursor: 'pointer' }}
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleUpdatePRStatus(pr.id, 'CANCELLED')}
                                className="text-xs px-2 py-1 rounded-lg"
                                style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)', cursor: 'pointer' }}
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                          {pr.status === 'APPROVED' && (
                            <button
                              onClick={() => handleUpdatePRStatus(pr.id, 'ORDERED')}
                              className="text-xs px-2 py-1 rounded-lg"
                              style={{ background: 'rgba(14, 165, 233, 0.15)', color: '#38bdf8', border: '1px solid rgba(14, 165, 233, 0.3)', cursor: 'pointer' }}
                            >
                              Mark Ordered
                            </button>
                          )}
                          {pr.status === 'ORDERED' && (
                            <button
                              onClick={() => handleUpdatePRStatus(pr.id, 'FULFILLED')}
                              className="text-xs px-2 py-1 rounded-lg"
                              style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', cursor: 'pointer' }}
                            >
                              Fulfilled
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isCreateOpen && (
        <CreateSparepartModal
          onClose={() => setIsCreateOpen(false)}
          onSave={handleCreateSparepart}
        />
      )}
    </div>
  );
}
