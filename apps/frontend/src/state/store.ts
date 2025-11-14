import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AppState {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setUser: (user: AppState['user']) => void;
  clearUser: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    set => ({
      theme: 'light',
      sidebarOpen: true,
      user: null,
      toggleTheme: () =>
        set(state => ({
          theme: state.theme === 'light' ? 'dark' : 'light',
        })),
      toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),
      setUser: user => set({ user }),
      clearUser: () => set({ user: null }),
    }),
    {
      name: 'app-storage',
      partialize: state => ({ theme: state.theme, user: state.user }),
    }
  )
);
