'use client';

import { ThemeToggle } from './ThemeToggle';
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
  Ship,
  FileCheck,
  Activity,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { complianceApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { LogOut } from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/fleet', label: 'Fleet & GPS', icon: Map },
  { href: '/work-orders', label: 'Work Orders', icon: ClipboardList },
  { href: '/inventory', label: 'Inventory', icon: Package },
  { href: '/compliance', label: 'Compliance', icon: ShieldCheck },
  { href: '/meters', label: 'Measures', icon: Activity },
];

export function Sidebar() {
  const pathname = usePathname();
  const [alertCount, setAlertCount] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const logout = useAuthStore(s => s.logout);

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
        background: 'var(--season-surface)',
        borderRight: '1px solid var(--season-border)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5" style={{ borderBottom: '1px solid var(--season-border)' }}>
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
            <div className="text-season-text font-bold text-lg leading-none tracking-tight" style={{ fontFamily: 'Inter, sans-serif' }}>
              Sea<span style={{ color: '#a78bfa' }}>Son</span>
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--season-muted)' }}>
              Ship Management
            </div>
          </div>
        )}
      </div>

      <div className="px-3 mt-2 flex justify-center">
        <ThemeToggle collapsed={collapsed} className={collapsed ? 'justify-center w-full' : 'w-full'} />
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

      {/* Bottom: Vessel Status Indicator & Logout */}
      <div className="px-3 pb-3 space-y-2">
        {!collapsed && (
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
        )}
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
          style={collapsed ? { justifyContent: 'center' } : {}}
          title={collapsed ? "Log out" : undefined}
        >
          <LogOut size={18} />
          {!collapsed && <span className="text-sm font-medium">Log out</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center w-full py-3 transition-all"
        style={{
          borderTop: '1px solid var(--season-border)',
          color: 'var(--season-muted)',
          background: 'transparent',
          cursor: 'pointer',
          border: 'none',
          borderTopWidth: '1px',
          borderTopStyle: 'solid',
          borderTopColor: 'var(--season-border)',
        }}
      >
        <span style={{ fontSize: '0.75rem' }}>{collapsed ? '▶' : '◀'}</span>
      </button>
    </aside>
  );
}
