'use client';

import { useEffect, useState } from 'react';
import { useWorkOrderStore } from '@/store/workorders.store';
import { sparepartApi } from '@/lib/api';
import type { WorkOrder, Sparepart, WorkOrderComment } from '@/lib/api';
import {
  ClipboardList, Plus, Filter, ChevronDown, X, Save,
  AlertTriangle, Clock, CheckCircle2, Loader2, Anchor,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { uploadApi } from '@/lib/api';

// ============================================================
// STATUS CONFIG
// ============================================================
const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Orders' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

function StatusBadge({ status }: { status: string }) {
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

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    LOW: 'badge-low', MEDIUM: 'badge-medium', HIGH: 'badge-high', CRITICAL: 'badge-critical',
  };
  return <span className={`badge ${map[priority] || 'badge-medium'}`}>{priority}</span>;
}

// ============================================================
// CREATE WO MODAL
// ============================================================
function CreateWOModal({ onClose, onSave }: { onClose: () => void; onSave: (data: any) => Promise<void> }) {
  const [title, setTitle] = useState('');
  const [vesselId, setVesselId] = useState('');
  const [type, setType] = useState('CORRECTIVE');
  const [priority, setPriority] = useState('MEDIUM');
  const [notes, setNotes] = useState('');
  const [vessels, setVessels] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Recurrence state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState('TIME_BASED');
  const [timeFrequency, setTimeFrequency] = useState('MONTHLY');
  const [timeInterval, setTimeInterval] = useState(1);
  const [intervalRunHours, setIntervalRunHours] = useState(500);

  useEffect(() => {
    import('@/lib/api').then(m => m.vesselApi.getAll().then(setVessels).catch(console.error));
  }, []);

  const handleSave = async () => {
    if (!title || !vesselId) return;
    setIsSaving(true);
    try {
      if (type === 'PREVENTIVE' && isRecurring) {
        await onSave({
          title,
          vesselId,
          description: notes,
          isRecurring: true,
          recurrenceType,
          timeFrequency: recurrenceType === 'TIME_BASED' ? timeFrequency : undefined,
          timeInterval: recurrenceType === 'TIME_BASED' ? timeInterval : undefined,
          intervalRunHours: recurrenceType === 'RUN_HOURS' ? intervalRunHours : undefined,
        });
      } else {
        await onSave({ title, vesselId, type, priority, notes, status: 'PENDING' });
      }
      onClose();
    } catch(e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#120a2e] border border-purple-500/30 shadow-[0_0_60px_rgba(139,92,246,0.3)] rounded-2xl p-6">
        <div className="flex justify-between items-center mb-5">
          <h2 className="font-bold text-white text-lg">Create Work Order</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={16} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-2 uppercase text-slate-400">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className="season-input" placeholder="E.g. Engine Inspection" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-2 uppercase text-slate-400">Vessel</label>
              <div className="relative">
                <select value={vesselId} onChange={e => setVesselId(e.target.value)} className="season-select w-full" style={{ appearance: 'none' }}>
                  <option value="" disabled>Select Vessel...</option>
                  {vessels.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#6b7280' }} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-2 uppercase text-slate-400">Type</label>
              <div className="relative">
                <select value={type} onChange={e => { setType(e.target.value); setIsRecurring(false); }} className="season-select w-full" style={{ appearance: 'none' }}>
                  <option value="CORRECTIVE">Corrective</option>
                  <option value="PREVENTIVE">Preventive</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#6b7280' }} />
              </div>
            </div>
          </div>

          {type === 'PREVENTIVE' && (
            <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} className="rounded border-purple-500/50 bg-[#1e1346] text-purple-500 focus:ring-purple-500" />
                <span className="text-sm font-semibold text-white">Make this a Recurring Work Order</span>
              </label>

              {isRecurring && (
                <div className="space-y-3 pt-2">
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input type="radio" name="recType" value="TIME_BASED" checked={recurrenceType === 'TIME_BASED'} onChange={() => setRecurrenceType('TIME_BASED')} />
                      Calendar Time
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input type="radio" name="recType" value="RUN_HOURS" checked={recurrenceType === 'RUN_HOURS'} onChange={() => setRecurrenceType('RUN_HOURS')} />
                      Run Hours
                    </label>
                  </div>
                  
                  {recurrenceType === 'TIME_BASED' ? (
                    <div className="flex gap-2 items-center">
                      <span className="text-sm text-slate-400">Repeat Every</span>
                      <input type="number" min={1} value={timeInterval} onChange={e => setTimeInterval(parseInt(e.target.value) || 1)} className="season-input w-20 text-center" />
                      <select value={timeFrequency} onChange={e => setTimeFrequency(e.target.value)} className="season-select flex-1">
                        <option value="DAILY">Day(s)</option>
                        <option value="WEEKLY">Week(s)</option>
                        <option value="MONTHLY">Month(s)</option>
                        <option value="YEARLY">Year(s)</option>
                      </select>
                    </div>
                  ) : (
                    <div className="flex gap-2 items-center">
                      <span className="text-sm text-slate-400">Repeat Every</span>
                      <input type="number" min={1} value={intervalRunHours} onChange={e => setIntervalRunHours(parseInt(e.target.value) || 500)} className="season-input flex-1" />
                      <span className="text-sm text-slate-400">Hours</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {!isRecurring && (
            <div>
              <label className="block text-xs font-semibold mb-2 uppercase text-slate-400">Priority</label>
              <div className="relative">
                <select value={priority} onChange={e => setPriority(e.target.value)} className="season-select w-full" style={{ appearance: 'none' }}>
                  {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#6b7280' }} />
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-xs font-semibold mb-2 uppercase text-slate-400">Notes / Description</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} className="season-input resize-none" rows={2} />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button onClick={handleSave} className="btn-primary flex-1 justify-center" disabled={!title || !vesselId || isSaving}>
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// WORK ORDER DETAILS MODAL (MAINTAINX STYLE)
// ============================================================
function UpdateWOModal({ wo, onClose, onSave }: {
  wo: WorkOrder;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}) {
  const [status, setStatus] = useState(wo.status);
  const [notes, setNotes] = useState(wo.notes || '');
  const [assignedTo, setAssignedTo] = useState(wo.assignedTo || '');
  const [spareparts, setSpareparts] = useState<Sparepart[]>([]);
  const [sparepartsUsed, setSparepartsUsed] = useState<Array<{ sparepartId: string; quantity: number; name: string }>>(
    wo.sparepartUsages?.map(u => ({ sparepartId: u.sparepart.id, quantity: u.quantityUsed, name: u.sparepart.name })) || []
  );
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Chat state
  const [comments, setComments] = useState<WorkOrderComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    sparepartApi.getAll().then(setSpareparts).catch(console.error);
    fetchComments();
  }, [wo.id]);

  const fetchComments = async () => {
    const { workOrderApi } = await import('@/lib/api');
    workOrderApi.getComments(wo.id).then(setComments).catch(console.error);
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setIsSending(true);
    try {
      const { workOrderApi } = await import('@/lib/api');
      await workOrderApi.addComment(wo.id, { senderName: 'Technician', message: newComment });
      setNewComment('');
      fetchComments();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSending(false);
    }
  };

  const addSparepart = () => {
    if (spareparts.length === 0) return;
    setSparepartsUsed(prev => [...prev, { sparepartId: spareparts[0].id, quantity: 1, name: spareparts[0].name }]);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let uploadedPhotoUrl = wo.photoUrl;
      if (photoFile) {
        const { url } = await uploadApi.uploadFile(photoFile);
        uploadedPhotoUrl = `http://localhost:4000${url}`;
      }
      
      await onSave({
        status,
        notes,
        assignedTo,
        photoUrl: uploadedPhotoUrl,
        sparepartsUsed: sparepartsUsed.map(s => ({ sparepartId: s.sparepartId, quantity: s.quantity })),
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-5xl h-[85vh] flex flex-col rounded-2xl overflow-hidden"
        style={{ background: '#120a2e', border: '1px solid rgba(139, 92, 246, 0.3)', boxShadow: '0 0 60px rgba(139, 92, 246, 0.3)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-purple-500/20 bg-[#0a0514]/50">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="font-bold text-white text-lg">{wo.title}</h2>
              <StatusBadge status={wo.status} />
              <PriorityBadge priority={wo.priority} />
              <span className="badge badge-medium">{wo.type}</span>
            </div>
            <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>
              {wo.woNumber} · {wo.vessel?.name} ({wo.vessel?.imoNumber})
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl transition-all hover:bg-white/5 text-slate-400">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel: Form Details */}
          <div className="w-1/2 p-6 overflow-y-auto border-r border-purple-500/20 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase text-slate-400">Status</label>
                <div className="relative">
                  <select value={status} onChange={e => setStatus(e.target.value as any)} className="season-select w-full" style={{ appearance: 'none' }}>
                    {STATUS_OPTIONS.filter(o => o.value !== 'ALL').map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase text-slate-400">Assigned To</label>
                <input value={assignedTo} onChange={e => setAssignedTo(e.target.value)} placeholder="Engineer name..." className="season-input" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-2 uppercase text-slate-400">Notes / Findings</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="season-input resize-none" placeholder="Work performed..." />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-2 uppercase text-slate-400">Photo Proof</label>
              {wo.photoUrl && !photoFile && (
                <div className="mb-2"><img src={wo.photoUrl} alt="WO Proof" className="h-32 w-auto rounded-lg border border-purple-500/20" /></div>
              )}
              <input type="file" accept="image/*" onChange={e => setPhotoFile(e.target.files?.[0] || null)} className="season-input text-sm p-2" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold uppercase text-slate-400">Spareparts Used</label>
                <button onClick={addSparepart} className="btn-secondary text-xs py-1 px-2"><Plus size={12} /> Add Part</button>
              </div>
              <div className="space-y-2">
                {sparepartsUsed.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <div className="flex-1 relative">
                      <select className="season-select text-xs py-2 w-full" style={{ appearance: 'none' }} value={item.sparepartId} onChange={e => {
                        const sp = spareparts.find(s => s.id === e.target.value);
                        setSparepartsUsed(prev => prev.map((s, i) => i === idx ? { ...s, sparepartId: e.target.value, name: sp?.name || '' } : s));
                      }}>
                        {spareparts.map(sp => <option key={sp.id} value={sp.id}>{sp.name} ({sp.currentStock} in stock)</option>)}
                      </select>
                      <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" />
                    </div>
                    <input type="number" min={1} value={item.quantity} onChange={e => setSparepartsUsed(prev => prev.map((s, i) => i === idx ? { ...s, quantity: parseInt(e.target.value) || 1 } : s))} className="season-input text-xs py-2 w-[70px]" />
                    <button onClick={() => setSparepartsUsed(prev => prev.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-300"><X size={14} /></button>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={handleSave} className="btn-primary w-full justify-center mt-4" disabled={isSaving}>
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Changes
            </button>
          </div>

          {/* Right Panel: Chat / Comments */}
          <div className="w-1/2 flex flex-col bg-[#0f0826]">
            <div className="p-4 border-b border-purple-500/20">
              <h3 className="font-semibold text-white text-sm">Work Order Updates & Chat</h3>
            </div>
            <div className="flex-1 p-4 overflow-y-auto space-y-4 flex flex-col">
              {comments.length === 0 ? (
                <div className="text-center text-slate-500 text-sm mt-10">No updates or messages yet.</div>
              ) : (
                comments.map(c => (
                  <div key={c.id} className="bg-purple-500/10 border border-purple-500/20 p-3 rounded-xl rounded-tl-sm self-start max-w-[85%]">
                    <div className="flex justify-between items-center mb-1 gap-4">
                      <span className="font-semibold text-xs text-purple-300">{c.senderName}</span>
                      <span className="text-[10px] text-slate-500">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</span>
                    </div>
                    <p className="text-sm text-slate-300">{c.message}</p>
                  </div>
                ))
              )}
            </div>
            <form onSubmit={handleSendComment} className="p-4 border-t border-purple-500/20 flex gap-2">
              <input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Type a message..." className="season-input flex-1" />
              <button type="submit" disabled={isSending || !newComment.trim()} className="btn-primary">
                {isSending ? <Loader2 size={16} className="animate-spin" /> : 'Send'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function WorkOrdersPage() {
  const { workOrders, selectedStatus, stats, isLoading, fetchWorkOrders, fetchStats, setStatusFilter, updateWorkOrderStatus } = useWorkOrderStore();
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  useEffect(() => {
    fetchWorkOrders();
    fetchStats();
  }, [fetchWorkOrders, fetchStats]);

  const handleUpdateStatus = async (data: any) => {
    if (!selectedWO) return;
    await updateWorkOrderStatus(selectedWO.id, data);
    setSelectedWO(null);
  };

  const handleCreate = async (data: any) => {
    const { workOrderApi } = await import('@/lib/api');
    if (data.isRecurring) {
      await workOrderApi.createRecurring(data);
    } else {
      await workOrderApi.create(data);
    }
    fetchWorkOrders();
    fetchStats();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ClipboardList size={22} style={{ color: '#a78bfa' }} />
            Work <span style={{ color: '#a78bfa' }}>Orders</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6b7280' }}>
            Ground crew task management &amp; preventive maintenance tracker
          </p>
        </div>
        <button onClick={() => setIsCreateOpen(true)} className="btn-primary">
          <Plus size={16} /> Create Work Order
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats?.total ?? 0, color: '#a78bfa' },
          { label: 'Pending', value: stats?.pending ?? 0, color: '#fbbf24' },
          { label: 'In Progress', value: stats?.inProgress ?? 0, color: '#38bdf8' },
          { label: 'Completed', value: stats?.completed ?? 0, color: '#34d399' },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass-card p-4 text-center">
            <div className="text-2xl font-bold" style={{ color }}>{value}</div>
            <div className="text-xs mt-1" style={{ color: '#6b7280' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="glass-card p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter size={14} style={{ color: '#a78bfa' }} />
          <span className="text-sm font-medium" style={{ color: '#94a3b8' }}>Filter by Status:</span>
        </div>
        {/* DROPDOWN SELECTOR — as required */}
        <div className="relative">
          <select
            value={selectedStatus}
            onChange={e => setStatusFilter(e.target.value)}
            className="season-select pr-10 py-2 text-sm"
            style={{ appearance: 'none', minWidth: '160px' }}
          >
            {STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#6b7280' }} />
        </div>
        <span className="text-xs ml-auto" style={{ color: '#4b5563' }}>
          {workOrders.length} orders shown
        </span>
      </div>

      {/* Work Orders Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="season-table">
            <thead>
              <tr>
                <th>WO Number</th>
                <th>Title</th>
                <th>Type</th>
                <th>Vessel</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Assigned To</th>
                <th>Scheduled</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [1,2,3,4].map(i => (
                  <tr key={i}>
                    {[1,2,3,4,5,6,7,8,9].map(j => (
                      <td key={j}><div className="skeleton h-4 rounded" /></td>
                    ))}
                  </tr>
                ))
              ) : workOrders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12">
                    <ClipboardList size={40} className="mx-auto mb-3 opacity-20" style={{ color: '#a78bfa' }} />
                    <p style={{ color: '#4b5563' }}>No work orders found</p>
                    <p className="text-xs mt-1" style={{ color: '#374151' }}>
                      {selectedStatus !== 'ALL' ? `No orders with status "${selectedStatus}"` : 'Create the first work order'}
                    </p>
                  </td>
                </tr>
              ) : (
                workOrders.map(wo => (
                  <tr key={wo.id} className="cursor-pointer" onClick={() => setSelectedWO(wo)}>
                    <td>
                      <span className="font-mono text-xs" style={{ color: '#a78bfa' }}>{wo.woNumber}</span>
                    </td>
                    <td>
                      <div className="max-w-xs">
                        <div className="text-sm font-medium text-white truncate">{wo.title}</div>
                        {wo.maintenanceSchedule && (
                          <div className="text-xs mt-0.5" style={{ color: '#6b7280' }}>PM: {wo.maintenanceSchedule.taskName}</div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${wo.type === 'PREVENTIVE' ? 'badge-low' : 'badge-medium'}`}>
                        {wo.type}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Anchor size={12} style={{ color: '#a78bfa', flexShrink: 0 }} />
                        <span className="text-sm">{wo.vessel?.name || '—'}</span>
                      </div>
                    </td>
                    <td><PriorityBadge priority={wo.priority} /></td>
                    <td><StatusBadge status={wo.status} /></td>
                    <td>
                      <span className="text-sm" style={{ color: wo.assignedTo ? '#e2e8f0' : '#4b5563' }}>
                        {wo.assignedTo || 'Unassigned'}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs" style={{ color: '#94a3b8' }}>
                        {wo.scheduledDate ? format(new Date(wo.scheduledDate), 'dd MMM yyyy') : '—'}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs" style={{ color: '#6b7280' }}>
                        {formatDistanceToNow(new Date(wo.createdAt), { addSuffix: true })}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={e => { e.stopPropagation(); setSelectedWO(wo); }}
                        className="btn-secondary text-xs py-1.5 px-3"
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        Update
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Update Modal */}
      {selectedWO && (
        <UpdateWOModal
          wo={selectedWO}
          onClose={() => setSelectedWO(null)}
          onSave={handleUpdateStatus}
        />
      )}
      
      {/* Create Modal */}
      {isCreateOpen && (
        <CreateWOModal
          onClose={() => setIsCreateOpen(false)}
          onSave={handleCreate}
        />
      )}
    </div>
  );
}
