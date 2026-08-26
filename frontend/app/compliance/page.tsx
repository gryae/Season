'use client';

import { useEffect, useState } from 'react';
import { complianceApi } from '@/lib/api';
import type { VesselCertificate, Alert } from '@/lib/api';
import {
  ShieldCheck, AlertTriangle, Clock, CheckCircle, XCircle,
  Filter, ChevronDown, Bell, Calendar, Plus, X, Loader2
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

const CERT_STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Certificates' },
  { value: 'VALID', label: 'Valid' },
  { value: 'EXPIRING_SOON', label: 'Expiring Soon' },
  { value: 'EXPIRED', label: 'Expired' },
];

function CertStatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; icon: any }> = {
    VALID: { cls: 'badge-valid', icon: CheckCircle },
    EXPIRING_SOON: { cls: 'badge-expiring', icon: AlertTriangle },
    EXPIRED: { cls: 'badge-expired', icon: XCircle },
  };
  const { cls, icon: Icon } = map[status] || { cls: 'badge-medium', icon: Clock };
  return (
    <span className={`badge ${cls}`}>
      <Icon size={10} />
      {status.replace('_', ' ')}
    </span>
  );
}

function DaysUntilExpiry({ expiryDate }: { expiryDate: string }) {
  const days = differenceInDays(new Date(expiryDate), new Date());
  const color = days < 0 ? '#f87171' : days <= 7 ? '#ef4444' : days <= 30 ? '#fbbf24' : '#34d399';
  const label = days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : `${days}d left`;
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2 h-2 rounded-full" style={{ background: color }} />
      <span className="text-sm font-semibold" style={{ color }}>{label}</span>
    </div>
  );
}

// Create Certificate Modal
function CreateCertificateModal({ onClose, onSave }: { onClose: () => void; onSave: (data: any) => Promise<void> }) {
  const [certificateName, setCertificateName] = useState('');
  const [vesselId, setVesselId] = useState('');
  const [certificateNumber, setCertificateNumber] = useState('');
  const [issuingAuthority, setIssuingAuthority] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [vessels, setVessels] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    import('@/lib/api').then(m => m.vesselApi.getAll().then(setVessels).catch(console.error));
  }, []);

  const handleSave = async () => {
    if (!certificateName || !vesselId || !expiryDate) return;
    setIsSaving(true);
    try {
      await onSave({ 
        certificateName, 
        vesselId, 
        certificateNumber, 
        issuingAuthority, 
        issueDate: issueDate ? new Date(issueDate).toISOString() : undefined, 
        expiryDate: new Date(expiryDate).toISOString() 
      });
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
          <h2 className="font-bold text-white text-lg">Add Certificate</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={16} /></button>
        </div>
        <div className="space-y-4">
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
            <label className="block text-xs font-semibold mb-2 uppercase text-slate-400">Certificate Name</label>
            <input value={certificateName} onChange={e => setCertificateName(e.target.value)} className="season-input" placeholder="e.g. Safety Management Certificate" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-2 uppercase text-slate-400">Cert Number</label>
              <input value={certificateNumber} onChange={e => setCertificateNumber(e.target.value)} className="season-input" placeholder="e.g. SMC-12345" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-2 uppercase text-slate-400">Issuing Authority</label>
              <input value={issuingAuthority} onChange={e => setIssuingAuthority(e.target.value)} className="season-input" placeholder="e.g. DNV" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-2 uppercase text-slate-400">Issue Date</label>
              <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className="season-input text-sm p-2" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-2 uppercase text-slate-400">Expiry Date</label>
              <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="season-input text-sm p-2" />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button onClick={handleSave} className="btn-primary flex-1 justify-center" disabled={!certificateName || !vesselId || !expiryDate || isSaving}>
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : 'Save Certificate'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CompliancePage() {
  const [certs, setCerts] = useState<VesselCertificate[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<{ total: number; valid: number; expiringSoon: number; expired: number } | null>(null);
  const [certFilter, setCertFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState<'certificates' | 'alerts'>('certificates');
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [certsData, alertsData, statsData] = await Promise.all([
      complianceApi.getCertificates(),
      complianceApi.getAlerts(),
      complianceApi.getStats(),
    ]);
    setCerts(certsData);
    setAlerts(alertsData);
    setStats(statsData);
    setLoading(false);
  };

  useEffect(() => {
    loadData().catch(console.error);
  }, []);

  const handleCreateCertificate = async (data: any) => {
    await complianceApi.createCertificate(data);
    loadData();
  };

  const markRead = async (id: string) => {
    await complianceApi.markAlertRead(id);
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, isRead: true } : a));
  };

  const filteredCerts = certFilter === 'ALL' ? certs : certs.filter(c => c.status === certFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldCheck size={22} style={{ color: '#a78bfa' }} />
            Compliance <span style={{ color: '#a78bfa' }}>Tracker</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6b7280' }}>
            Certificate validity monitoring with 30-day early warning alerts
          </p>
        </div>
        <button onClick={() => setIsCreateOpen(true)} className="btn-primary">
          <Plus size={16} /> Add Certificate
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-bold" style={{ color: '#a78bfa' }}>{stats?.total ?? 0}</div>
          <div className="text-xs mt-1" style={{ color: '#6b7280' }}>Total Certificates</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-bold" style={{ color: '#34d399' }}>{stats?.valid ?? 0}</div>
          <div className="text-xs mt-1" style={{ color: '#6b7280' }}>Valid</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-bold" style={{ color: '#fbbf24' }}>{stats?.expiringSoon ?? 0}</div>
          <div className="text-xs mt-1" style={{ color: '#6b7280' }}>Expiring Soon</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-bold" style={{ color: '#f87171' }}>{stats?.expired ?? 0}</div>
          <div className="text-xs mt-1" style={{ color: '#6b7280' }}>Expired</div>
        </div>
      </div>

      {/* Critical Banner */}
      {(stats?.expired ?? 0) > 0 && (
        <div className="flex items-center gap-3 px-5 py-4 rounded-2xl" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <XCircle size={18} style={{ color: '#f87171', flexShrink: 0 }} />
          <div>
            <span className="font-bold text-sm" style={{ color: '#f87171' }}>
              {stats?.expired} certificate(s) EXPIRED — Immediate action required!
            </span>
            <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>
              Vessels with expired certificates may be prohibited from operation under maritime law.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', display: 'inline-flex' }}>
        {[
          { id: 'certificates', label: 'Certificates', icon: ShieldCheck },
          { id: 'alerts', label: `Alerts (${alerts.filter(a => !a.isRead).length} unread)`, icon: Bell },
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

      {/* Certificates Table */}
      {activeTab === 'certificates' && (
        <div className="space-y-4">
          {/* Filter Dropdown */}
          <div className="glass-card p-4 flex flex-wrap items-center gap-4">
            <Filter size={14} style={{ color: '#a78bfa' }} />
            <span className="text-sm" style={{ color: '#94a3b8' }}>Filter by Status:</span>
            <div className="relative">
              <select
                value={certFilter}
                onChange={e => setCertFilter(e.target.value)}
                className="season-select pr-10 py-2 text-sm"
                style={{ appearance: 'none', minWidth: '180px' }}
              >
                {CERT_STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#6b7280' }} />
            </div>
            <span className="text-xs ml-auto" style={{ color: '#4b5563' }}>{filteredCerts.length} certificates</span>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="season-table">
                <thead>
                  <tr>
                    <th>Certificate Name</th>
                    <th>Vessel</th>
                    <th>Certificate No.</th>
                    <th>Issuing Authority</th>
                    <th>Issue Date</th>
                    <th>Expiry Date</th>
                    <th>Days Remaining</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    [1,2,3,4].map(i => (
                      <tr key={i}>{[1,2,3,4,5,6,7,8].map(j => <td key={j}><div className="skeleton h-4 rounded" /></td>)}</tr>
                    ))
                  ) : filteredCerts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10">
                        <ShieldCheck size={36} className="mx-auto mb-3 opacity-20" style={{ color: '#a78bfa' }} />
                        <p style={{ color: '#4b5563' }}>No certificates found</p>
                      </td>
                    </tr>
                  ) : (
                    filteredCerts.map(cert => (
                      <tr key={cert.id}>
                        <td>
                          <div className="font-medium text-white">{cert.certificateName}</div>
                        </td>
                        <td>
                          <div className="text-sm text-white">{cert.vessel?.name}</div>
                          <div className="text-xs" style={{ color: '#6b7280' }}>{cert.vessel?.imoNumber}</div>
                        </td>
                        <td>
                          <span className="font-mono text-xs" style={{ color: '#94a3b8' }}>{cert.certificateNumber || '—'}</span>
                        </td>
                        <td>
                          <span className="text-sm" style={{ color: '#94a3b8' }}>{cert.issuingAuthority || '—'}</span>
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5 text-xs" style={{ color: '#6b7280' }}>
                            <Calendar size={10} />
                            {cert.issueDate ? format(new Date(cert.issueDate), 'dd MMM yyyy') : '—'}
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: '#e2e8f0' }}>
                            <Calendar size={10} />
                            {format(new Date(cert.expiryDate), 'dd MMM yyyy')}
                          </div>
                        </td>
                        <td>
                          <DaysUntilExpiry expiryDate={cert.expiryDate} />
                        </td>
                        <td>
                          <CertStatusBadge status={cert.status} />
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

      {/* Alerts Table */}
      {activeTab === 'alerts' && (
        <div className="glass-card p-6">
          <div className="space-y-3">
            {alerts.length === 0 ? (
              <div className="text-center py-12">
                <Bell size={40} className="mx-auto mb-3 opacity-20" style={{ color: '#a78bfa' }} />
                <p style={{ color: '#4b5563' }}>No alerts yet</p>
                <p className="text-xs mt-1" style={{ color: '#374151' }}>Cron job runs daily at 08:00 AM</p>
              </div>
            ) : (
              alerts.map(alert => (
                <div
                  key={alert.id}
                  className="flex items-start gap-4 px-5 py-4 rounded-xl transition-all"
                  style={{
                    background: alert.isRead ? 'transparent' : 'rgba(139, 92, 246, 0.06)',
                    border: `1px solid ${alert.isRead ? 'rgba(255,255,255,0.04)' : 'rgba(139, 92, 246, 0.2)'}`,
                  }}
                >
                  <AlertTriangle
                    size={18}
                    className="mt-0.5 flex-shrink-0"
                    style={{ color: alert.severity === 'CRITICAL' ? '#f87171' : alert.severity === 'WARNING' ? '#fbbf24' : '#a78bfa' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-sm text-white">{alert.title}</span>
                      <span
                        className="badge"
                        style={{
                          background: alert.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.15)' : alert.severity === 'WARNING' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                          color: alert.severity === 'CRITICAL' ? '#f87171' : alert.severity === 'WARNING' ? '#fbbf24' : '#a78bfa',
                          border: `1px solid ${alert.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.3)' : alert.severity === 'WARNING' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`,
                        }}
                      >
                        {alert.severity}
                      </span>
                      {!alert.isRead && (
                        <span className="badge badge-docked" style={{ fontSize: '0.65rem' }}>NEW</span>
                      )}
                    </div>
                    <p className="text-sm" style={{ color: '#94a3b8' }}>{alert.message}</p>
                    <span className="text-xs mt-1 block" style={{ color: '#4b5563' }}>
                      {format(new Date(alert.createdAt), 'dd MMM yyyy, HH:mm')}
                    </span>
                  </div>
                  {!alert.isRead && (
                    <button
                      onClick={() => markRead(alert.id)}
                      className="text-xs px-3 py-1.5 rounded-lg flex-shrink-0"
                      style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa', border: '1px solid rgba(139, 92, 246, 0.3)', cursor: 'pointer' }}
                    >
                      Mark read
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isCreateOpen && (
        <CreateCertificateModal
          onClose={() => setIsCreateOpen(false)}
          onSave={handleCreateCertificate}
        />
      )}
    </div>
  );
}
