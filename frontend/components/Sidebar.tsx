'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Anchor,
  LayoutDashboard,
  Map,
  ClipboardList,
  Package,
  ShieldCheck,
  Bell,
  Settings,
  Waves,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { complianceApi } from '@/lib/api';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/fleet', label: 'Fleet & GPS', icon: Map },
  { href: '/work-orders', label: 'Work Orders', icon: ClipboardList },
  { href: '/inventory', label: 'Inventory', icon: Package },
  { href: '/compliance', label: 'Compliance', icon: ShieldCheck },
];

export function Sidebar() {
  const pathname = usePathname();
  const [alertCount, setAlertCount] = useState(0);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    complianceApi.getAlerts()
      .then(alerts => setAlertCount(alerts.filter(a => !a.isRead).length))
      .catch(() => {});
  }, [pathname]);

  // Hide sidebar on landing page
  if (pathname === '/') return null;

  return (
    <aside
      className="flex flex-col transition-all duration-300 ease-in-out"
      style={{
        width: collapsed ? '72px' : '240px',
        minWidth: collapsed ? '72px' : '240px',
        background: 'rgba(10, 5, 20, 0.95)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="relative flex-shrink-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #0ea5e9)' }}
          >
            <Anchor size={20} color="white" strokeWidth={2.5} />
          </div>
          <div
            className="absolute inset-0 rounded-xl animate-pulse-slow"
            style={{ background: 'rgba(124, 58, 237, 0.3)', filter: 'blur(8px)', zIndex: -1 }}
          />
        </div>
        {!collapsed && (
          <div>
            <div className="text-white font-bold text-lg leading-none tracking-tight" style={{ fontFamily: 'Inter, sans-serif' }}>
              Sea<span style={{ color: '#a78bfa' }}>Son</span>
            </div>
            <div className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
              Ship Management
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {!collapsed && (
          <div className="px-3 mb-3">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#4b5563' }}>
              Navigation
            </span>
          </div>
        )}
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
              style={collapsed ? { justifyContent: 'center', padding: '10px' } : {}}
              title={collapsed ? label : undefined}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
              {!collapsed && label === 'Compliance' && alertCount > 0 && (
                <span
                  className="ml-auto text-xs font-bold rounded-full px-2 py-0.5"
                  style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                >
                  {alertCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: Vessel Status Indicator */}
      {!collapsed && (
        <div className="px-3 pb-3">
          <div
            className="px-3 py-3 rounded-xl text-xs"
            style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.2)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Waves size={14} style={{ color: '#a78bfa' }} />
              <span style={{ color: '#a78bfa', fontWeight: 600 }}>System Status</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span style={{ color: '#94a3b8' }}>All systems operational</span>
            </div>
          </div>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center w-full py-3 transition-all"
        style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          color: '#4b5563',
          background: 'transparent',
          cursor: 'pointer',
          border: 'none',
          borderTopWidth: '1px',
          borderTopStyle: 'solid',
          borderTopColor: 'rgba(255,255,255,0.06)',
        }}
      >
        <span style={{ fontSize: '0.75rem' }}>{collapsed ? '▶' : '◀'}</span>
      </button>
    </aside>
  );
}
