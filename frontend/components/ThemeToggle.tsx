'use client';

import { useThemeStore } from '@/store/theme.store';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle({ className = '', collapsed = false }: { className?: string, collapsed?: boolean }) {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <button
      onClick={toggleTheme}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-season-muted hover:bg-season-border transition-colors ${className}`}
      title={collapsed ? "Toggle Theme" : undefined}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      {!collapsed && <span className="text-sm font-medium">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
    </button>
  );
}
