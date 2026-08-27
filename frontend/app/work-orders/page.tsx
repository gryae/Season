'use client';

import { useEffect, useState, useMemo } from 'react';
import { useWorkOrderStore } from '@/store/workorders.store';
import { sparepartApi } from '@/lib/api';
import type { WorkOrder, Sparepart, WorkOrderComment } from '@/lib/api';
import {
  ClipboardList, Plus, ChevronDown, X, Save,
  Clock, CheckCircle2, Loader2, Anchor, List,
  LayoutGrid, Calendar, AlertTriangle, Search,
  ChevronLeft, ChevronRight, FileText, Camera,
  User, Timer, CalendarDays, Tag,
} from 'lucide-react';
import { formatDistanceToNow, format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isSameDay, addMonths, subMonths, getDay, startOfWeek, endOfWeek } from 'date-fns';
import { uploadApi } from '@/lib/api';

// ── Status / Priority config ───────────────────────────────────
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

// ── Badges ────────────────────────────────────────────────────
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

// ══════════════════════════════════════════════════════════════
// CREATE WO MODAL  (enhanced)
// ══════════════════════════════════════════════════════════════
function CreateWOModal({ onClose, onSave, preVesselId, preVesselName }: {
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  preVesselId?: string;
  preVesselName?: string;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [vesselId, setVesselId] = useState(preVesselId || '');
  const [type, setType] = useState('CORRECTIVE');
  const [priority, setPriority] = useState('MEDIUM');
  const [assignedTo, setAssignedTo] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [estHours, setEstHours] = useState(1);
  const [estMinutes, setEstMinutes] = useState(0);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [vessels, setVessels] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Recurrence
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState('TIME_BASED');
  const [timeFrequency, setTimeFrequency] = useState('MONTHLY');
  const [timeInterval, setTimeInterval] = useState(1);
  const [intervalRunHours, setIntervalRunHours] = useState(500);

  useEffect(() => {
    import('@/lib/api').then(m => m.vesselApi.getAll().then(setVessels).catch(console.error));
  }, []);

  const handlePhotoChange = (file: File | null) => {
    setPhotoFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setPhotoPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPhotoPreview(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) handlePhotoChange(file);
  };

  const handleSave = async () => {
    if (!title || !vesselId) return;
    setIsSaving(true);
    try {
      let photoUrl: string | undefined;
      if (photoFile) {
        const { url } = await uploadApi.uploadFile(photoFile);
        photoUrl = `http://localhost:4000${url}`;
      }
      if (type === 'PREVENTIVE' && isRecurring) {
        await onSave({
          title, vesselId, description, isRecurring: true, recurrenceType,
          timeFrequency: recurrenceType === 'TIME_BASED' ? timeFrequency : undefined,
          timeInterval: recurrenceType === 'TIME_BASED' ? timeInterval : undefined,
          intervalRunHours: recurrenceType === 'RUN_HOURS' ? intervalRunHours : undefined,
        });
      } else {
        await onSave({
          title, vesselId, type, priority, notes: description,
          assignedTo: assignedTo || undefined,
          scheduledDate: scheduledDate || undefined,
          dueDate: dueDate || undefined,
          status: 'PENDING',
          photoUrl,
        });
      }
      onClose();
    } catch (e) { console.error(e); }
    finally { setIsSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-xl flex flex-col rounded-2xl overflow-hidden"
        style={{
          background: '#120a2e',
          border: '1px solid rgba(139, 92, 246, 0.35)',
          boxShadow: '0 0 80px rgba(139,92,246,0.25)',
          maxHeight: '92vh',
        }}
      >
        {/* Header bar */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #0ea5e9)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}
        >
          <h2 className="font-bold text-white text-base flex items-center gap-2">
            <ClipboardList size={18} /> New Work Order
          </h2>
          <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.7)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Title */}
          <div>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="season-input text-base font-semibold"
              placeholder="What needs to be done? (Required)"
              style={{ borderColor: title ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.1)', fontSize: '1rem' }}
            />
          </div>

          {/* Photo upload */}
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('wo-photo-input')?.click()}
            className="rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all"
            style={{
              border: `2px dashed ${isDragging ? 'rgba(139,92,246,0.8)' : 'rgba(139,92,246,0.3)'}`,
              background: isDragging ? 'rgba(139,92,246,0.08)' : 'rgba(14,165,233,0.04)',
              minHeight: photoPreview ? 'auto' : '110px',
              padding: '16px',
            }}
          >
            {photoPreview ? (
              <div className="relative w-full">
                <img src={photoPreview} alt="preview" className="rounded-xl max-h-48 mx-auto object-cover" />
                <button
                  onClick={e => { e.stopPropagation(); handlePhotoChange(null); }}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.7)', color: 'white', border: 'none', cursor: 'pointer' }}
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <>
                <Camera size={28} style={{ color: '#38bdf8' }} className="mb-2" />
                <p className="text-sm font-medium" style={{ color: '#38bdf8' }}>Add or drag pictures</p>
                <p className="text-xs mt-1" style={{ color: '#4b5563' }}>PNG, JPG up to 10MB</p>
              </>
            )}
          </div>
          <input
            id="wo-photo-input"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => handlePhotoChange(e.target.files?.[0] || null)}
          />

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold mb-2 uppercase" style={{ color: '#6b7280' }}>Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="season-input resize-none"
              placeholder="Add a description..."
            />
          </div>

          {/* Vessel + Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-2 uppercase" style={{ color: '#6b7280' }}>
                <Anchor size={11} className="inline mr-1" />Vessel (Required)
              </label>
              <div className="relative">
                <select value={vesselId} onChange={e => setVesselId(e.target.value)} className="season-select w-full" style={{ appearance: 'none' }}>
                  <option value="" disabled>Select vessel...</option>
                  {vessels.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#6b7280' }} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-2 uppercase" style={{ color: '#6b7280' }}>
                <Tag size={11} className="inline mr-1" />Work Type
              </label>
              <div className="relative">
                <select value={type} onChange={e => { setType(e.target.value); setIsRecurring(false); }} className="season-select w-full" style={{ appearance: 'none' }}>
                  <option value="CORRECTIVE">Corrective</option>
                  <option value="PREVENTIVE">Preventive</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#6b7280' }} />
              </div>
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-semibold mb-2 uppercase" style={{ color: '#6b7280' }}>
              <AlertTriangle size={11} className="inline mr-1" />Priority
            </label>
            <div className="flex gap-2">
              {PRIORITY_OPTIONS.map(p => (
                <button
                  key={p.value}
                  onClick={() => setPriority(p.value)}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: priority === p.value
                      ? p.value === 'LOW' ? 'rgba(100,116,139,0.3)' : p.value === 'MEDIUM' ? 'rgba(99,102,241,0.3)' : p.value === 'HIGH' ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'
                      : 'rgba(255,255,255,0.04)',
                    color: priority === p.value
                      ? p.value === 'LOW' ? '#94a3b8' : p.value === 'MEDIUM' ? '#a5b4fc' : p.value === 'HIGH' ? '#fbbf24' : '#f87171'
                      : '#6b7280',
                    border: `1px solid ${priority === p.value
                      ? p.value === 'LOW' ? 'rgba(100,116,139,0.5)' : p.value === 'MEDIUM' ? 'rgba(99,102,241,0.5)' : p.value === 'HIGH' ? 'rgba(245,158,11,0.5)' : 'rgba(239,68,68,0.5)'
                      : 'rgba(255,255,255,0.08)'}`,
                    cursor: 'pointer',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Assign + Estimated Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-2 uppercase" style={{ color: '#6b7280' }}>
                <User size={11} className="inline mr-1" />Assign To
              </label>
              <input
                value={assignedTo}
                onChange={e => setAssignedTo(e.target.value)}
                className="season-input"
                placeholder="Type name or email..."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-2 uppercase" style={{ color: '#6b7280' }}>
                <Timer size={11} className="inline mr-1" />Estimated Time
              </label>
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <input type="number" min={0} value={estHours} onChange={e => setEstHours(parseInt(e.target.value) || 0)} className="season-input text-center" placeholder="0" />
                  <p className="text-xs text-center mt-1" style={{ color: '#4b5563' }}>Hours</p>
                </div>
                <span className="text-white font-bold mb-4">:</span>
                <div className="flex-1">
                  <input type="number" min={0} max={59} value={estMinutes} onChange={e => setEstMinutes(parseInt(e.target.value) || 0)} className="season-input text-center" placeholder="0" />
                  <p className="text-xs text-center mt-1" style={{ color: '#4b5563' }}>Minutes</p>
                </div>
              </div>
            </div>
          </div>

          {/* Start / Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-2 uppercase" style={{ color: '#6b7280' }}>
                <CalendarDays size={11} className="inline mr-1" />Start Date
              </label>
              <input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} className="season-input" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-2 uppercase" style={{ color: '#6b7280' }}>
                <CalendarDays size={11} className="inline mr-1" />Due Date
              </label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="season-input" />
            </div>
          </div>

          {/* Recurring (Preventive only) */}
          {type === 'PREVENTIVE' && (
            <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)' }}>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} style={{ accentColor: '#7c3aed' }} />
                <span className="text-sm font-semibold text-white">Make this a Recurring Work Order</span>
              </label>
              {isRecurring && (
                <div className="space-y-3 pt-1">
                  <div className="flex gap-4">
                    {[['TIME_BASED', 'Calendar Time'], ['RUN_HOURS', 'Run Hours']].map(([v, l]) => (
                      <label key={v} className="flex items-center gap-2 text-sm" style={{ color: '#94a3b8', cursor: 'pointer' }}>
                        <input type="radio" name="recType" value={v} checked={recurrenceType === v} onChange={() => setRecurrenceType(v)} style={{ accentColor: '#7c3aed' }} />
                        {l}
                      </label>
                    ))}
                  </div>
                  {recurrenceType === 'TIME_BASED' ? (
                    <div className="flex gap-2 items-center">
                      <span className="text-sm flex-shrink-0" style={{ color: '#6b7280' }}>Repeat Every</span>
                      <input type="number" min={1} value={timeInterval} onChange={e => setTimeInterval(parseInt(e.target.value) || 1)} className="season-input text-center" style={{ width: '100px', flexShrink: 0 }} />
                      <select value={timeFrequency} onChange={e => setTimeFrequency(e.target.value)} className="season-select" style={{ appearance: 'none', flex: 1, minWidth: 0 }}>
                        <option value="DAILY">Day(s)</option>
                        <option value="WEEKLY">Week(s)</option>
                        <option value="MONTHLY">Month(s)</option>
                        <option value="YEARLY">Year(s)</option>
                      </select>
                    </div>
                  ) : (
                    <div className="flex gap-2 items-center">
                      <span className="text-sm" style={{ color: '#6b7280' }}>Repeat Every</span>
                      <input type="number" min={1} value={intervalRunHours} onChange={e => setIntervalRunHours(parseInt(e.target.value) || 500)} className="season-input flex-1" />
                      <span className="text-sm" style={{ color: '#6b7280' }}>Run Hours</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button
            onClick={handleSave}
            disabled={!title || !vesselId || isSaving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm"
            style={{
              background: (!title || !vesselId) ? 'rgba(139,92,246,0.2)' : 'linear-gradient(135deg,#7c3aed,#0ea5e9)',
              color: (!title || !vesselId) ? '#6b7280' : 'white',
              border: 'none',
              cursor: (!title || !vesselId) ? 'not-allowed' : 'pointer',
            }}
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Create Work Order
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// UPDATE WO MODAL
// ══════════════════════════════════════════════════════════════
function UpdateWOModal({ wo, onClose, onSave }: { wo: WorkOrder; onClose: () => void; onSave: (data: any) => Promise<void> }) {
  const [status, setStatus] = useState(wo.status);
  const [notes, setNotes] = useState(wo.notes || '');
  const [assignedTo, setAssignedTo] = useState(wo.assignedTo || '');
  const [spareparts, setSpareparts] = useState<Sparepart[]>([]);
  const [sparepartsUsed, setSparepartsUsed] = useState<Array<{ sparepartId: string; quantity: number; name: string }>>([]);
  const [savedUsages, setSavedUsages] = useState(wo.sparepartUsages || []);
  
  useEffect(() => {
    setSavedUsages(wo.sparepartUsages || []);
  }, [wo.sparepartUsages]);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [comments, setComments] = useState<WorkOrderComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    sparepartApi.getAll().then(setSpareparts).catch(console.error);
    import('@/lib/api').then(m => m.workOrderApi.getComments(wo.id).then(setComments).catch(console.error));
  }, [wo.id]);

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setIsSending(true);
    try {
      const { workOrderApi } = await import('@/lib/api');
      await workOrderApi.addComment(wo.id, { senderName: 'Technician', message: newComment });
      setNewComment('');
      workOrderApi.getComments(wo.id).then(setComments);
    } catch (e) { console.error(e); } finally { setIsSending(false); }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let uploadedPhotoUrl = wo.photoUrl;
      if (photoFile) {
        const { url } = await uploadApi.uploadFile(photoFile);
        uploadedPhotoUrl = `http://localhost:4000${url}`;
      }
      await onSave({ status, notes, assignedTo, photoUrl: uploadedPhotoUrl, sparepartsUsed: sparepartsUsed.map(s => ({ sparepartId: s.sparepartId, quantity: s.quantity })) });
      // Reset sparepartsUsed so they are not sent again if clicked multiple times
      setSparepartsUsed([]);
      // Do not call onClose() as requested by user
    } catch (err) { console.error(err); } finally { setIsSaving(false); }
  };

  const handleDeleteSavedUsage = async (usageId: string) => {
    try {
      const apiMod = await import('@/lib/api');
      const updatedWo = await apiMod.workOrderApi.removeSparepart(wo.id, usageId);
      setSavedUsages(updatedWo.sparepartUsages || []);
    } catch(e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-5xl h-[85vh] flex flex-col rounded-2xl overflow-hidden" style={{ background: '#120a2e', border: '1px solid rgba(139,92,246,0.3)', boxShadow: '0 0 60px rgba(139,92,246,0.3)' }}>
        <div className="flex items-center justify-between p-5 border-b border-purple-500/20 bg-[#0a0514]/50">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="font-bold text-white text-lg">{wo.title}</h2>
              <StatusBadge status={wo.status} />
              <PriorityBadge priority={wo.priority} />
            </div>
            <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>{wo.woNumber} · {wo.vessel?.name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-slate-400" style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="w-1/2 p-6 overflow-y-auto border-r border-purple-500/20 space-y-4">
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
              {wo.photoUrl && !photoFile && <div className="mb-2"><img src={wo.photoUrl} alt="proof" className="h-32 w-auto rounded-lg border border-purple-500/20" /></div>}
              <input type="file" accept="image/*" onChange={e => setPhotoFile(e.target.files?.[0] || null)} className="season-input text-sm p-2" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold uppercase text-slate-400">Spareparts Used</label>
                <button onClick={() => { 
                  const availablePart = spareparts.find(sp => sp.currentStock > 0);
                  if (availablePart) {
                    setSparepartsUsed(p => [...p, { sparepartId: availablePart.id, quantity: 1, name: availablePart.name }]);
                  }
                }} className="btn-secondary text-xs py-1 px-2"><Plus size={12} /> Add Part</button>
              </div>
              <div className="space-y-2">
                {/* Saved Usages (Read Only) */}
                {savedUsages.map((usage: any) => (
                  <div key={usage.id} className="flex gap-2 items-center">
                    <div className="relative season-input text-sm py-2 flex items-center justify-between" style={{ flex: 1, minWidth: 0, background: 'rgba(255,255,255,0.02)', opacity: 0.8 }}>
                      <span className="truncate">{usage.sparepart?.name}</span>
                    </div>
                    <div className="season-input text-sm py-2 text-center flex items-center justify-center" style={{ width: '80px', flexShrink: 0, background: 'rgba(255,255,255,0.02)', opacity: 0.8 }}>
                      {usage.quantityUsed}
                    </div>
                    <button onClick={() => handleDeleteSavedUsage(usage.id)} title="Return stock and remove" style={{ color: '#f87171', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', cursor: 'pointer', flexShrink: 0, width: '32px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <X size={16} />
                    </button>
                  </div>
                ))}
                
                {/* Newly Added Usages */}
                {sparepartsUsed.map((item, idx) => {
                  const sp = spareparts.find(s => s.id === item.sparepartId);
                  return (
                    <div key={idx} className="flex gap-2 items-center">
                      <div className="relative" style={{ flex: 1, minWidth: 0 }}>
                        <select className="season-select text-sm py-2" style={{ appearance: 'none', width: '100%', borderColor: 'rgba(139,92,246,0.5)' }} value={item.sparepartId} onChange={e => { const sp = spareparts.find(s => s.id === e.target.value); setSparepartsUsed(p => p.map((s, i) => i === idx ? { ...s, sparepartId: e.target.value, name: sp?.name || '' } : s)); }}>
                          {spareparts.map(s => <option key={s.id} value={s.id} disabled={s.currentStock <= 0}>{s.name}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" />
                      </div>
                      <div className="text-xs whitespace-nowrap" style={{ color: sp?.currentStock === 0 ? '#f87171' : '#94a3b8', width: '60px', textAlign: 'right' }}>
                        {sp?.currentStock || 0} in stock
                      </div>
                      <input type="number" min={1} max={sp?.currentStock || 1} value={item.quantity} onChange={e => setSparepartsUsed(p => p.map((s, i) => i === idx ? { ...s, quantity: parseInt(e.target.value) || 1 } : s))} className="season-input text-sm py-2 text-center" style={{ width: '80px', flexShrink: 0, borderColor: 'rgba(139,92,246,0.5)' }} />
                      <button onClick={() => setSparepartsUsed(p => p.filter((_, i) => i !== idx))} style={{ color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: '4px' }}><X size={16} /></button>
                    </div>
                  );
                })}
              </div>
            </div>
            <button onClick={handleSave} className="btn-primary w-full justify-center mt-4" disabled={isSaving}>
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Changes
            </button>
          </div>
          <div className="w-1/2 flex flex-col bg-[#0f0826]">
            <div className="p-4 border-b border-purple-500/20"><h3 className="font-semibold text-white text-sm">Work Order Updates & Chat</h3></div>
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {comments.length === 0 ? <div className="text-center text-slate-500 text-sm mt-10">No updates yet.</div> : comments.map(c => (
                <div key={c.id} className="bg-purple-500/10 border border-purple-500/20 p-3 rounded-xl rounded-tl-sm max-w-[85%]">
                  <div className="flex justify-between items-center mb-1 gap-4">
                    <span className="font-semibold text-xs text-purple-300">{c.senderName}</span>
                    <span className="text-[10px] text-slate-500">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</span>
                  </div>
                  <p className="text-sm text-slate-300">{c.message}</p>
                </div>
              ))}
            </div>
            <form onSubmit={handleSendComment} className="p-4 border-t border-purple-500/20 flex gap-2">
              <input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Type a message..." className="season-input flex-1" />
              <button type="submit" disabled={isSending || !newComment.trim()} className="btn-primary">{isSending ? <Loader2 size={16} className="animate-spin" /> : 'Send'}</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// TODO VIEW  (Kanban-style columns)
// ══════════════════════════════════════════════════════════════
function TodoView({ workOrders, onSelect }: { workOrders: WorkOrder[]; onSelect: (wo: WorkOrder) => void }) {
  const columns = [
    { key: 'PENDING', label: 'To Do', color: '#fbbf24', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
    { key: 'IN_PROGRESS', label: 'In Progress', color: '#38bdf8', bg: 'rgba(14,165,233,0.08)', border: 'rgba(14,165,233,0.2)' },
    { key: 'COMPLETED', label: 'Done', color: '#34d399', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
    { key: 'CANCELLED', label: 'Cancelled', color: '#f87171', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      {columns.map(col => {
        const items = workOrders.filter(wo => wo.status === col.key);
        return (
          <div key={col.key}>
            <div className="flex items-center gap-2 mb-3 px-1">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: col.color }} />
              <span className="text-sm font-semibold text-white">{col.label}</span>
              <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: col.bg, color: col.color, border: `1px solid ${col.border}` }}>{items.length}</span>
            </div>
            <div className="space-y-2 min-h-[200px]" style={{ maxHeight: 'calc(100vh - 380px)', overflowY: 'auto' }}>
              {items.length === 0 ? (
                <div className="rounded-xl p-4 text-center" style={{ border: `1px dashed ${col.border}`, background: col.bg }}>
                  <p className="text-xs" style={{ color: '#4b5563' }}>No orders</p>
                </div>
              ) : items.map(wo => (
                <div
                  key={wo.id}
                  onClick={() => onSelect(wo)}
                  className="rounded-xl p-3.5 cursor-pointer transition-all"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(139,92,246,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                >
                  <div className="flex items-start gap-2 mb-2">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.2)' }}>
                      <FileText size={11} style={{ color: '#a78bfa' }} />
                    </div>
                    <p className="text-sm font-semibold text-white leading-snug line-clamp-2">{wo.title}</p>
                  </div>
                  <p className="text-xs mb-2" style={{ color: '#6b7280' }}>
                    <Anchor size={10} className="inline mr-1" style={{ color: '#a78bfa' }} />
                    {wo.vessel?.name || '—'}
                  </p>
                  <div className="flex items-center justify-between">
                    <PriorityBadge priority={wo.priority} />
                    <span className="text-xs font-mono" style={{ color: '#4b5563' }}>{wo.woNumber}</span>
                  </div>
                  {wo.scheduledDate && (
                    <div className="flex items-center gap-1 mt-2 text-xs" style={{ color: new Date(wo.scheduledDate) < new Date() ? '#f87171' : '#4b5563' }}>
                      <Clock size={10} /> Due {format(new Date(wo.scheduledDate), 'dd MMM')}
                      {new Date(wo.scheduledDate) < new Date() && wo.status !== 'COMPLETED' && <span className="ml-1 text-red-400 font-semibold">Overdue</span>}
                    </div>
                  )}
                  {wo.assignedTo && (
                    <div className="flex items-center gap-1 mt-1.5 text-xs" style={{ color: '#6b7280' }}>
                      <User size={10} /> {wo.assignedTo}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// TABLE VIEW
// ══════════════════════════════════════════════════════════════
function TableView({ workOrders, onSelect }: { workOrders: WorkOrder[]; onSelect: (wo: WorkOrder) => void }) {
  const [page, setPage] = useState(1);
  const perPage = 25;
  const totalPages = Math.ceil(workOrders.length / perPage);
  const paged = workOrders.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="season-table">
          <thead>
            <tr>
              <th></th>
              <th>Title</th>
              <th>ID</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Work Type</th>
              <th>Assigned To</th>
              <th>Vessel</th>
              <th>Scheduled</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {paged.map(wo => (
              <tr key={wo.id} className="cursor-pointer" onClick={() => onSelect(wo)}>
                <td className="w-10">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)' }}>
                    <FileText size={13} style={{ color: '#a78bfa' }} />
                  </div>
                </td>
                <td>
                  <div className="max-w-xs">
                    <div className="text-sm font-medium text-white truncate">{wo.title}</div>
                    {wo.maintenanceSchedule && <div className="text-xs mt-0.5" style={{ color: '#6b7280' }}>PM: {wo.maintenanceSchedule.taskName}</div>}
                  </div>
                </td>
                <td><span className="font-mono text-xs" style={{ color: '#a78bfa' }}>{wo.woNumber}</span></td>
                <td><StatusBadge status={wo.status} /></td>
                <td><PriorityBadge priority={wo.priority} /></td>
                <td><span className={`badge ${wo.type === 'PREVENTIVE' ? 'badge-low' : 'badge-medium'}`}>{wo.type}</span></td>
                <td><span className="text-sm" style={{ color: wo.assignedTo ? '#e2e8f0' : '#4b5563' }}>{wo.assignedTo || 'Unassigned'}</span></td>
                <td>
                  <div className="flex items-center gap-1.5">
                    <Anchor size={11} style={{ color: '#a78bfa', flexShrink: 0 }} />
                    <span className="text-sm">{wo.vessel?.name || '—'}</span>
                  </div>
                </td>
                <td><span className="text-xs" style={{ color: '#94a3b8' }}>{wo.scheduledDate ? format(new Date(wo.scheduledDate), 'dd MMM yyyy') : '—'}</span></td>
                <td><span className="text-xs" style={{ color: '#6b7280' }}>{formatDistanceToNow(new Date(wo.createdAt), { addSuffix: true })}</span></td>
              </tr>
            ))}
            {paged.length === 0 && (
              <tr><td colSpan={10} className="text-center py-12">
                <ClipboardList size={40} className="mx-auto mb-3 opacity-20" style={{ color: '#a78bfa' }} />
                <p style={{ color: '#4b5563' }}>No work orders found</p>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <span className="text-xs" style={{ color: '#4b5563' }}>
            Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, workOrders.length)} of {workOrders.length}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#6b7280', cursor: page === 1 ? 'not-allowed' : 'pointer' }}>
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              const pg = i + 1;
              return (
                <button key={pg} onClick={() => setPage(pg)} className="w-7 h-7 rounded-lg text-xs font-medium" style={{ background: page === pg ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.04)', color: page === pg ? '#c4b5fd' : '#6b7280', border: `1px solid ${page === pg ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.08)'}`, cursor: 'pointer' }}>
                  {pg}
                </button>
              );
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#6b7280', cursor: page === totalPages ? 'not-allowed' : 'pointer' }}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// CALENDAR VIEW
// ══════════════════════════════════════════════════════════════
function CalendarView({ workOrders, onSelect }: { workOrders: WorkOrder[]; onSelect: (wo: WorkOrder) => void }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calMode, setCalMode] = useState<'month' | 'week'>('month');

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const getWOsForDay = (day: Date) =>
    workOrders.filter(wo => {
      const dateStr = wo.scheduledDate || wo.createdAt;
      return isSameDay(new Date(dateStr), day);
    });

  const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  const statusColor = (status: string) => ({
    PENDING: '#fbbf24', IN_PROGRESS: '#38bdf8', COMPLETED: '#34d399', CANCELLED: '#f87171',
  }[status] || '#a78bfa');

  return (
    <div className="glass-card overflow-hidden">
      {/* Calendar header */}
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
            {(['month', 'week'] as const).map(m => (
              <button key={m} onClick={() => setCalMode(m)} className="px-3 py-1.5 text-xs font-semibold capitalize" style={{ background: calMode === m ? 'rgba(139,92,246,0.3)' : 'transparent', color: calMode === m ? '#c4b5fd' : '#6b7280', border: 'none', cursor: 'pointer' }}>
                {m}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentDate(d => subMonths(d, 1))} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', cursor: 'pointer' }}>
            <ChevronLeft size={16} />
          </button>
          <span className="font-bold text-white text-base">{format(currentDate, 'MMMM yyyy')}</span>
          <button onClick={() => setCurrentDate(d => addMonths(d, 1))} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', cursor: 'pointer' }}>
            <ChevronRight size={16} />
          </button>
        </div>
        <div />
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {DAYS.map(d => (
          <div key={d} className="py-2 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: '#4b5563' }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7" style={{ minHeight: '500px' }}>
        {days.map((day, idx) => {
          const dayWOs = getWOsForDay(day);
          const isToday = isSameDay(day, new Date());
          const isCurrentMonth = isSameMonth(day, currentDate);
          const maxShow = 2;
          const extra = dayWOs.length - maxShow;

          return (
            <div
              key={idx}
              className="relative"
              style={{
                borderRight: (idx + 1) % 7 === 0 ? 'none' : '1px solid rgba(255,255,255,0.04)',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                background: isToday ? 'rgba(139,92,246,0.06)' : 'transparent',
                minHeight: '100px',
                padding: '6px',
              }}
            >
              {/* Day number */}
              <div className="flex items-center justify-center mb-1">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold"
                  style={{
                    background: isToday ? '#7c3aed' : 'transparent',
                    color: isToday ? 'white' : isCurrentMonth ? '#94a3b8' : '#374151',
                  }}
                >
                  {format(day, 'd')}
                </span>
              </div>

              {/* Work orders */}
              <div className="space-y-1">
                {dayWOs.slice(0, maxShow).map(wo => (
                  <div
                    key={wo.id}
                    onClick={() => onSelect(wo)}
                    className="rounded text-xs px-1.5 py-0.5 cursor-pointer truncate font-medium transition-all"
                    style={{
                      background: `${statusColor(wo.status)}20`,
                      color: statusColor(wo.status),
                      border: `1px solid ${statusColor(wo.status)}40`,
                    }}
                    title={wo.title}
                  >
                    {wo.status === 'COMPLETED' ? '✓ ' : wo.status === 'PENDING' ? '○ ' : '◎ '}{wo.title}
                  </div>
                ))}
                {extra > 0 && (
                  <div className="text-xs px-1 font-medium" style={{ color: '#a78bfa' }}>
                    {extra} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════
type ViewMode = 'todo' | 'table' | 'calendar';

export default function WorkOrdersPage() {
  const { workOrders, selectedStatus, stats, isLoading, fetchWorkOrders, fetchStats, setStatusFilter, updateWorkOrderStatus } = useWorkOrderStore();
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('todo');
  const [searchQuery, setSearchQuery] = useState('');

  // URL query param: pre-fill vessel
  const [preVesselId, setPreVesselId] = useState('');
  const [preVesselName, setPreVesselName] = useState('');

  useEffect(() => {
    fetchWorkOrders();
    fetchStats();
    // Check for vesselId query param (from fleet page "Use in Work Order")
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const vid = params.get('vesselId') || '';
      const vname = params.get('vesselName') || '';
      if (vid) { setPreVesselId(vid); setPreVesselName(vname); setIsCreateOpen(true); }
    }
  }, [fetchWorkOrders, fetchStats]);

  const handleUpdateStatus = async (data: any) => {
    if (!selectedWO) return;
    await updateWorkOrderStatus(selectedWO.id, data);
    setSelectedWO(null);
  };

  const handleCreate = async (data: any) => {
    const { workOrderApi } = await import('@/lib/api');
    if (data.isRecurring) await workOrderApi.createRecurring(data);
    else await workOrderApi.create(data);
    fetchWorkOrders();
    fetchStats();
  };

  const filtered = useMemo(() => {
    let list = workOrders;
    if (selectedStatus !== 'ALL') list = list.filter(wo => wo.status === selectedStatus);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(wo =>
        wo.title.toLowerCase().includes(q) ||
        wo.woNumber.toLowerCase().includes(q) ||
        (wo.vessel?.name || '').toLowerCase().includes(q) ||
        (wo.assignedTo || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [workOrders, selectedStatus, searchQuery]);

  const views = [
    { mode: 'todo' as ViewMode, icon: LayoutGrid, label: 'To Do View' },
    { mode: 'table' as ViewMode, icon: List, label: 'Table View' },
    { mode: 'calendar' as ViewMode, icon: Calendar, label: 'Calendar View' },
  ];

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ClipboardList size={22} style={{ color: '#a78bfa' }} />
            Work <span style={{ color: '#a78bfa' }}>Orders</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6b7280' }}>Task management & preventive maintenance tracker</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative">
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search work orders..."
              className="season-input py-2 text-sm"
              style={{ width: '220px', paddingLeft: '36px' }}
            />
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#6b7280' }} />
          </div>

          {/* View toggle */}
          <div className="flex items-center rounded-xl p-1 gap-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {views.map(({ mode, icon: Icon, label }) => (
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

          <button onClick={() => setIsCreateOpen(true)} className="btn-primary">
            <Plus size={16} /> New Work Order
          </button>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats?.total ?? 0, color: '#a78bfa', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.2)' },
          { label: 'Pending', value: stats?.pending ?? 0, color: '#fbbf24', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
          { label: 'In Progress', value: stats?.inProgress ?? 0, color: '#38bdf8', bg: 'rgba(14,165,233,0.08)', border: 'rgba(14,165,233,0.2)' },
          { label: 'Completed', value: stats?.completed ?? 0, color: '#34d399', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
        ].map(({ label, value, color, bg, border }) => (
          <div key={label} className="rounded-xl px-4 py-3 text-center" style={{ background: bg, border: `1px solid ${border}` }}>
            <p className="text-xl font-bold" style={{ color }}>{value}</p>
            <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* ── Filter bar ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-xs" style={{ color: '#6b7280' }}>
          <span>Filter:</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUS_OPTIONS.map(o => (
            <button
              key={o.value}
              onClick={() => setStatusFilter(o.value)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: selectedStatus === o.value ? 'rgba(139,92,246,0.25)' : 'rgba(255,255,255,0.04)',
                color: selectedStatus === o.value ? '#c4b5fd' : '#6b7280',
                border: `1px solid ${selectedStatus === o.value ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.08)'}`,
                cursor: 'pointer',
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs" style={{ color: '#4b5563' }}>{filtered.length} orders shown</span>
      </div>

      {/* ── Loading state ── */}
      {isLoading && (
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-32 rounded-xl" />)}
        </div>
      )}

      {/* ── Views ── */}
      {!isLoading && viewMode === 'todo' && <TodoView workOrders={filtered} onSelect={setSelectedWO} />}
      {!isLoading && viewMode === 'table' && <TableView workOrders={filtered} onSelect={setSelectedWO} />}
      {!isLoading && viewMode === 'calendar' && <CalendarView workOrders={filtered} onSelect={setSelectedWO} />}

      {/* ── Modals ── */}
      {selectedWO && <UpdateWOModal wo={selectedWO} onClose={() => setSelectedWO(null)} onSave={handleUpdateStatus} />}
      {isCreateOpen && (
        <CreateWOModal
          onClose={() => { setIsCreateOpen(false); setPreVesselId(''); setPreVesselName(''); }}
          onSave={handleCreate}
          preVesselId={preVesselId}
          preVesselName={preVesselName}
        />
      )}
    </div>
  );
}
