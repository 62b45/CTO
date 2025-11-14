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
  settings: {
    audioEnabled: boolean;
    visualEffects: boolean;
    adminApiKey: string;
  };
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setUser: (user: AppState['user']) => void;
  clearUser: () => void;
  setSetting: <K extends keyof AppState['settings']>(
    key: K,
    value: AppState['settings'][K]
  ) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    set => ({
      theme: 'light',
      sidebarOpen: true,
      user: null,
      settings: {
        audioEnabled: true,
        visualEffects: true,
        adminApiKey: '',
      },
      toggleTheme: () =>
        set(state => ({
          theme: state.theme === 'light' ? 'dark' : 'light',
        })),
      toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),
      setUser: user => set({ user }),
      clearUser: () => set({ user: null }),
      setSetting: (key, value) =>
        set(state => ({
          settings: { ...state.settings, [key]: value },
        })),
    }),
    {
      name: 'app-storage',
      partialize: state => ({ 
        theme: state.theme, 
        user: state.user,
        settings: state.settings,
      }),
    }
  )
);
