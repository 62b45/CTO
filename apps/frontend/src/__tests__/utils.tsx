import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

// Test utility function to render components with providers
export const renderWithProviders = (
  ui: React.ReactElement,
  { 
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    }),
    ...renderOptions 
  } = {}
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Mock API responses
export const createMockApiResponse = <T>(data: T, status = 200) => {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
  } as Response;
};

// Common test data
export const mockPlayer = {
  id: 'test-player-1',
  name: 'Test Player',
  stats: {
    level: 5,
    health: 150,
    maxHealth: 150,
    attack: 15,
    defense: 12,
    speed: 12,
    strength: 12,
    agility: 10,
    intelligence: 8,
    statPoints: 3,
  },
  inventory: [
    { id: 'sword-1', name: 'Iron Sword', quantity: 1 },
    { id: 'potion-1', name: 'Health Potion', quantity: 5 },
  ],
  gold: 1000,
};

export const mockCombatLog = [
  {
    id: 'combat-1',
    timestamp: Date.now(),
    enemy: 'Goblin',
    victory: true,
    experience: 25,
    gold: 10,
    duration: 45,
  },
  {
    id: 'combat-2',
    timestamp: Date.now() - 60000,
    enemy: 'Orc',
    victory: false,
    experience: 0,
    gold: 0,
    duration: 67,
  },
];

export const mockLootbox = {
  id: 'lootbox-1',
  type: 'common',
  items: [
    { id: 'item-1', name: 'Common Sword', rarity: 'common', value: 50 },
  ],
  openedAt: Date.now(),
};

// Re-export testing library utilities
export { screen, fireEvent, waitFor, within } from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';