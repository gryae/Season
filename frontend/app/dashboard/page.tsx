'use client';

import { useEffect, useState } from 'react';
import { vesselApi, workOrderApi, complianceApi, sparepartApi } from '@/lib/api';
import type { Alert } from '@/lib/api';
import {
  Anchor, Map, ClipboardList, Package, ShieldCheck,
  AlertTriangle, TrendingUp, Activity, Bell, Zap, Clock,
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface DashboardStats {
  vessels: { total: number; active: number; maintenance: number; docked: number };
  workOrders: { total: number; pending: number; inProgress: number; completed: number };
  compliance: { total: number; valid: number; expiringSoon: number; expired: number };
}

function KpiCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: number | string; icon: any; color: string; sub?: string;
}) {
  return (
    <div className="glass-card p-6 animate-fade-in">
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}18`, border: `1px solid ${color}30` }}
        >
          <Icon size={22} style={{ color }} />
        </div>
        <TrendingUp size={14} style={{ color: '#34d399' }} />
      </div>
      <div className="kpi-number" style={{ background: `linear-gradient(135deg, ${color}, #c4b5fd)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
        {value}
      </div>
      <div className="text-sm mt-1 font-medium" style={{ color: '#e2e8f0' }}>{label}</div>
      {sub && <div className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{sub}</div>}
    </div>
  );
}

function AlertBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    CRITICAL: 'badge-expired',
    WARNING: 'badge-expiring',
    INFO: 'badge-medium',
  };
  return <span className={`badge ${map[severity] || 'badge-medium'}`}>{severity}</span>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [vessels, workOrders, compliance, alertsData] = await Promise.all([
          vesselApi.getStats(),
          workOrderApi.getStats(),
          complianceApi.getStats(),
          complianceApi.getAlerts(),
        ]);
        setStats({ vessels, workOrders, compliance });
        setAlerts(alertsData.slice(0, 6));
      } catch (e) {
        console.error('Dashboard load error:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const markRead = async (id: string) => {
    await complianceApi.markAlertRead(id);
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, isRead: true } : a));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-10 w-64 mb-8" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-36 rounded-2xl" />)}
        </div>
        <div className="skeleton h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-season-text">
            Command <span style={{ color: '#a78bfa' }}>Bridge</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6b7280' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm"
            style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#34d399' }}
          >
            <Activity size={14} />
            Live
          </div>
        </div>
      </div>

      {/* Critical Alerts Banner */}
      {alerts.some(a => a.severity === 'CRITICAL' && !a.isRead) && (
        <div
          className="flex items-center gap-4 px-5 py-4 rounded-2xl animate-fade-in"
          style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
        >
          <AlertTriangle size={20} style={{ color: '#f87171', flexShrink: 0 }} />
          <div className="flex-1">
            <span className="font-semibold text-sm" style={{ color: '#f87171' }}>
              {alerts.filter(a => a.severity === 'CRITICAL' && !a.isRead).length} critical alert(s) require immediate attention
            </span>
            <span className="text-xs ml-2" style={{ color: '#9ca3af' }}>
              Expired certificates or critical stock levels detected
            </span>
          </div>
          <Link href="/compliance" className="text-sm font-semibold underline" style={{ color: '#f87171' }}>
            View →
          </Link>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Fleet" value={stats?.vessels.total ?? 0} icon={Anchor} color="#a78bfa" sub={`${stats?.vessels.active} active`} />
        <KpiCard label="Work Orders" value={stats?.workOrders.total ?? 0} icon={ClipboardList} color="#60a5fa" sub={`${stats?.workOrders.pending} pending`} />
        <KpiCard label="Certificates" value={stats?.compliance.total ?? 0} icon={ShieldCheck} color="#34d399" sub={`${(stats?.compliance.expiringSoon ?? 0) + (stats?.compliance.expired ?? 0)} need attention`} />
        <KpiCard label="WO Completed" value={stats?.workOrders.completed ?? 0} icon={Zap} color="#fbbf24" sub="this period" />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Alerts Feed */}
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <Bell size={18} style={{ color: '#a78bfa' }} />
              <h2 className="font-semibold text-season-text">System Alerts</h2>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-bold"
                style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171' }}
              >
                {alerts.filter(a => !a.isRead).length} new
              </span>
            </div>
            <Link href="/compliance" className="text-xs" style={{ color: '#a78bfa' }}>View all →</Link>
          </div>
          <div className="space-y-3">
            {alerts.length === 0 ? (
              <div className="text-center py-8" style={{ color: '#4b5563' }}>
                <Bell size={32} className="mx-auto mb-2 opacity-30" />
                <p>No alerts</p>
              </div>
            ) : (
              alerts.map(alert => (
                <div
                  key={alert.id}
                  className="flex items-start gap-4 px-4 py-3 rounded-xl transition-all"
                  style={{
                    background: alert.isRead ? 'transparent' : 'rgba(139, 92, 246, 0.06)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    opacity: alert.isRead ? 0.6 : 1,
                  }}
                >
                  <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" style={{
                    color: alert.severity === 'CRITICAL' ? '#f87171' : alert.severity === 'WARNING' ? '#fbbf24' : '#a78bfa'
                  }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-season-text">{alert.title}</span>
                      <AlertBadge severity={alert.severity} />
                    </div>
                    <p className="text-xs mt-1 truncate" style={{ color: '#6b7280' }}>{alert.message}</p>
                    <span className="text-xs" style={{ color: '#4b5563' }}>
                      {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  {!alert.isRead && (
                    <button
                      onClick={() => markRead(alert.id)}
                      className="text-xs flex-shrink-0 px-2 py-1 rounded-lg transition-all"
                      style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa', border: 'none', cursor: 'pointer' }}
                    >
                      Mark read
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Status Panel */}
        <div className="space-y-4">
          {/* WO Status Breakdown */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardList size={16} style={{ color: '#a78bfa' }} />
              <h3 className="font-semibold text-season-text text-sm">Work Order Status</h3>
            </div>
            {[
              { label: 'Pending', value: stats?.workOrders.pending ?? 0, color: '#fbbf24' },
              { label: 'In Progress', value: stats?.workOrders.inProgress ?? 0, color: '#38bdf8' },
              { label: 'Completed', value: stats?.workOrders.completed ?? 0, color: '#34d399' },
            ].map(({ label, value, color }) => {
              const total = stats?.workOrders.total || 1;
              const pct = Math.round((value / total) * 100);
              return (
                <div key={label} className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: '#94a3b8' }}>{label}</span>
                    <span style={{ color }}>{value}</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-1.5 rounded-full transition-all duration-1000" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              );
            })}
            <Link href="/work-orders" className="btn-secondary w-full mt-3 justify-center text-xs" style={{ display: 'flex' }}>
              View All WOs →
            </Link>
          </div>

          {/* Compliance Quick Stats */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck size={16} style={{ color: '#34d399' }} />
              <h3 className="font-semibold text-season-text text-sm">Compliance</h3>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Valid', value: stats?.compliance.valid ?? 0, color: '#34d399' },
                { label: 'Expiring', value: stats?.compliance.expiringSoon ?? 0, color: '#fbbf24' },
                { label: 'Expired', value: stats?.compliance.expired ?? 0, color: '#f87171' },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center py-3 rounded-xl" style={{ background: `${color}10`, border: `1px solid ${color}20` }}>
                  <div className="text-xl font-bold" style={{ color }}>{value}</div>
                  <div className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="glass-card p-4">
            <h3 className="font-semibold text-season-text text-sm mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <Link href="/fleet" className="sidebar-link text-sm">
                <Map size={14} />
                Open Fleet Map
              </Link>
              <Link href="/work-orders" className="sidebar-link text-sm">
                <ClipboardList size={14} />
                Create Work Order
              </Link>
              <Link href="/inventory" className="sidebar-link text-sm">
                <Package size={14} />
                View Inventory
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs py-2" style={{ color: '#374151', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <span>SeaSon v1.0 · Maritime Management Platform</span>
        <span className="flex items-center gap-1">
          <Clock size={10} />
          Last updated: {new Date().toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}
