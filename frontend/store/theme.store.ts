import { create } from 'zustand';

interface ThemeState {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: typeof window !== 'undefined' ? (localStorage.getItem('season_theme') as 'light' | 'dark') || 'dark' : 'dark',
  toggleTheme: () => set((state) => {
    const newTheme = state.theme === 'light' ? 'dark' : 'light';
    if (typeof window !== 'undefined') localStorage.setItem('season_theme', newTheme);
    return { theme: newTheme };
  }),
  setTheme: (theme) => {
    if (typeof window !== 'undefined') localStorage.setItem('season_theme', theme);
    set({ theme });
  },
}));
