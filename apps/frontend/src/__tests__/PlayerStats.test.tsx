import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from './utils';
import PlayerStats from '../components/PlayerStats';

// Mock the API calls
jest.mock('../api/player', () => ({
  getPlayerStats: jest.fn(),
  updatePlayerStats: jest.fn(),
}));

describe('PlayerStats Component', () => {
  const mockPlayerStats = {
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
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render player stats correctly', async () => {
    const { getPlayerStats } = require('../api/player');
    getPlayerStats.mockResolvedValue(mockPlayerStats);

    render(<PlayerStats playerId="test-player-1" />);

    await waitFor(() => {
      expect(screen.getByText('Test Player')).toBeInTheDocument();
      expect(screen.getByText('Level 5')).toBeInTheDocument();
      expect(screen.getByText('150 / 150 HP')).toBeInTheDocument();
    });

    // Check individual stats
    expect(screen.getByText('Attack: 15')).toBeInTheDocument();
    expect(screen.getByText('Defense: 12')).toBeInTheDocument();
    expect(screen.getByText('Speed: 12')).toBeInTheDocument();
    expect(screen.getByText('Strength: 12')).toBeInTheDocument();
    expect(screen.getByText('Agility: 10')).toBeInTheDocument();
    expect(screen.getByText('Intelligence: 8')).toBeInTheDocument();
  });

  it('should display available stat points', async () => {
    const { getPlayerStats } = require('../api/player');
    getPlayerStats.mockResolvedValue(mockPlayerStats);

    render(<PlayerStats playerId="test-player-1" />);

    await waitFor(() => {
      expect(screen.getByText('Available Stat Points: 3')).toBeInTheDocument();
    });
  });

  it('should show stat allocation buttons when points are available', async () => {
    const { getPlayerStats } = require('../api/player');
    getPlayerStats.mockResolvedValue(mockPlayerStats);

    render(<PlayerStats playerId="test-player-1" />);

    await waitFor(() => {
      expect(screen.getByText('Allocate Stat Points')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Allocate Stat Points'));

    await waitFor(() => {
      expect(screen.getByText('Strength +')).toBeInTheDocument();
      expect(screen.getByText('Agility +')).toBeInTheDocument();
      expect(screen.getByText('Intelligence +')).toBeInTheDocument();
    });
  });

  it('should not show allocation buttons when no points available', async () => {
    const noPointsPlayer = {
      ...mockPlayerStats,
      stats: {
        ...mockPlayerStats.stats,
        statPoints: 0,
      },
    };

    const { getPlayerStats } = require('../api/player');
    getPlayerStats.mockResolvedValue(noPointsPlayer);

    render(<PlayerStats playerId="test-player-1" />);

    await waitFor(() => {
      expect(screen.queryByText('Allocate Stat Points')).not.toBeInTheDocument();
      expect(screen.queryByText('Strength +')).not.toBeInTheDocument();
    });
  });

  it('should handle stat point allocation', async () => {
    const { getPlayerStats, updatePlayerStats } = require('../api/player');
    getPlayerStats.mockResolvedValue(mockPlayerStats);
    updatePlayerStats.mockResolvedValue({
      ...mockPlayerStats,
      stats: {
        ...mockPlayerStats.stats,
        strength: 13,
        statPoints: 2,
      },
    });

    render(<PlayerStats playerId="test-player-1" />);

    await waitFor(() => {
      expect(screen.getByText('Allocate Stat Points')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Allocate Stat Points'));

    await waitFor(() => {
      expect(screen.getByText('Strength +')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Strength +'));

    await waitFor(() => {
      expect(updatePlayerStats).toHaveBeenCalledWith('test-player-1', {
        strength: 13,
        statPoints: 2,
      });
    });
  });

  it('should handle loading state', () => {
    const { getPlayerStats } = require('../api/player');
    getPlayerStats.mockReturnValue(new Promise(() => {})); // Never resolves

    render(<PlayerStats playerId="test-player-1" />);

    expect(screen.getByText('Loading player stats...')).toBeInTheDocument();
  });

  it('should handle error state', async () => {
    const { getPlayerStats } = require('../api/player');
    getPlayerStats.mockRejectedValue(new Error('Failed to load player stats'));

    render(<PlayerStats playerId="test-player-1" />);

    await waitFor(() => {
      expect(screen.getByText('Error loading player stats')).toBeInTheDocument();
    });
  });

  it('should update health display dynamically', async () => {
    const { getPlayerStats } = require('../api/player');
    getPlayerStats
      .mockResolvedValueOnce(mockPlayerStats)
      .mockResolvedValueOnce({
        ...mockPlayerStats,
        stats: {
          ...mockPlayerStats.stats,
          health: 120,
        },
      });

    render(<PlayerStats playerId="test-player-1" />);

    await waitFor(() => {
      expect(screen.getByText('150 / 150 HP')).toBeInTheDocument();
    });

    // Simulate health update
    fireEvent.click(screen.getByText('Refresh Stats'));

    await waitFor(() => {
      expect(screen.getByText('120 / 150 HP')).toBeInTheDocument();
    });
  });
});