import { create } from 'zustand';

interface User {
  id: string;
  username: string;
  name: string;
  role: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
}

// Simple store, for persistence you'd use localStorage middleware, but since Next.js SSR can complicate it,
// we will just use basic state and hydration in layout or handle it client-side.
export const useAuthStore = create<AuthState>((set) => ({
  token: typeof window !== 'undefined' ? localStorage.getItem('season_token') : null,
  user: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('season_user') || 'null') : null,
  
  setAuth: (token, user) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('season_token', token);
      localStorage.setItem('season_user', JSON.stringify(user));
    }
    set({ token, user });
  },
  
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('season_token');
      localStorage.removeItem('season_user');
    }
    set({ token: null, user: null });
  },
}));
