/**
 * Unit tests for CombatLogStorage
 */

import { CombatLogStorage } from '../CombatLogStorage';
import { CombatLogEntry } from '@shared';

describe('CombatLogStorage', () => {
  let storage: CombatLogStorage;
  let mockLogs: CombatLogEntry[];

  beforeEach(() => {
    storage = new CombatLogStorage();
    mockLogs = [
      {
        turn: 1,
        timestamp: new Date('2023-01-01T10:00:00Z'),
        action: {
          attackerId: 'player1',
          targetId: 'enemy1',
          type: 'attack',
          damage: 25,
          roll: 40,
          variance: 0.95
        },
        description: 'Player attacks Enemy for 25 damage!',
        remainingHealth: {
          player1: 100,
          enemy1: 55
        }
      },
      {
        turn: 2,
        timestamp: new Date('2023-01-01T10:00:05Z'),
        action: {
          attackerId: 'enemy1',
          targetId: 'player1',
          type: 'attack',
          damage: 15,
          roll: 23,
          variance: 1.05
        },
        description: 'Enemy attacks Player for 15 damage!',
        remainingHealth: {
          player1: 85,
          enemy1: 55
        }
      }
    ];
  });

  describe('storeCombatLogs', () => {
    it('should store combat logs and return session ID', () => {
      const sessionId = storage.storeCombatLogs('player1', mockLogs);
      
      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
      expect(sessionId).toMatch(/^combat_\d+_[a-z0-9]+$/);
    });

    it('should store logs correctly', () => {
      const sessionId = storage.storeCombatLogs('player1', mockLogs);
      
      const playerLogs = storage.getPlayerLogs('player1');
      expect(playerLogs).toHaveLength(1);
      expect(playerLogs[0].id).toBe(sessionId);
      expect(playerLogs[0].logs).toEqual(mockLogs);
    });

    it('should limit logs per session', () => {
      // Create many logs to exceed the limit
      const manyLogs = Array.from({ length: 1500 }, (_, i) => ({
        ...mockLogs[0],
        turn: i + 1
      }));

      const sessionId = storage.storeCombatLogs('player1', manyLogs);
      const storedLogs = storage.getCombatLogs('player1', sessionId);
      
      expect(storedLogs).toHaveLength(1000); // Should be limited to maxLogsPerSession
    });

    it('should handle multiple players separately', () => {
      const sessionId1 = storage.storeCombatLogs('player1', mockLogs);
      const sessionId2 = storage.storeCombatLogs('player2', mockLogs);
      
      expect(sessionId1).not.toBe(sessionId2);
      
      const player1Logs = storage.getPlayerLogs('player1');
      const player2Logs = storage.getPlayerLogs('player2');
      
      expect(player1Logs).toHaveLength(1);
      expect(player2Logs).toHaveLength(1);
      expect(player1Logs[0].id).toBe(sessionId1);
      expect(player2Logs[0].id).toBe(sessionId2);
    });
  });

  describe('getPlayerLogs', () => {
    beforeEach(() => {
      // Store some test data
      storage.storeCombatLogs('player1', mockLogs);
      storage.storeCombatLogs('player1', mockLogs);
      storage.storeCombatLogs('player2', mockLogs);
    });

    it('should return empty array for non-existent player', () => {
      const logs = storage.getPlayerLogs('non_existent');
      expect(logs).toHaveLength(0);
    });

    it('should return logs for existing player', () => {
      const logs = storage.getPlayerLogs('player1');
      expect(logs).toHaveLength(2);
    });

    it('should respect limit parameter', () => {
      // Store more sessions
      for (let i = 0; i < 5; i++) {
        storage.storeCombatLogs('player1', mockLogs);
      }
      
      const limitedLogs = storage.getPlayerLogs('player1', 3);
      expect(limitedLogs).toHaveLength(3);
      
      const allLogs = storage.getPlayerLogs('player1', 10);
      expect(allLogs.length).toBeGreaterThan(3);
    });

    it('should return logs in reverse chronological order', () => {
      const sessionId1 = storage.storeCombatLogs('player1', mockLogs);
      const sessionId2 = storage.storeCombatLogs('player1', mockLogs);
      
      const logs = storage.getPlayerLogs('player1');
      expect(logs[0].id).toBe(sessionId2); // Most recent first
      expect(logs[1].id).toBe(sessionId1);
    });
  });

  describe('getCombatLogs', () => {
    let sessionId: string;

    beforeEach(() => {
      sessionId = storage.storeCombatLogs('player1', mockLogs);
    });

    it('should return null for non-existent player', () => {
      const logs = storage.getCombatLogs('non_existent', sessionId);
      expect(logs).toBeNull();
    });

    it('should return null for non-existent session', () => {
      const logs = storage.getCombatLogs('player1', 'non_existent_session');
      expect(logs).toBeNull();
    });

    it('should return logs for existing session', () => {
      const logs = storage.getCombatLogs('player1', sessionId);
      expect(logs).toEqual(mockLogs);
    });
  });

  describe('getAllPlayerSessions', () => {
    beforeEach(() => {
      storage.storeCombatLogs('player1', mockLogs);
      storage.storeCombatLogs('player1', mockLogs);
    });

    it('should return all sessions for player', () => {
      const sessions = storage.getAllPlayerSessions('player1');
      expect(sessions).toHaveLength(2);
    });

    it('should return empty array for non-existent player', () => {
      const sessions = storage.getAllPlayerSessions('non_existent');
      expect(sessions).toHaveLength(0);
    });
  });

  describe('clearPlayerLogs', () => {
    beforeEach(() => {
      storage.storeCombatLogs('player1', mockLogs);
      storage.storeCombatLogs('player2', mockLogs);
    });

    it('should clear logs for specific player', () => {
      storage.clearPlayerLogs('player1');
      
      const player1Logs = storage.getPlayerLogs('player1');
      const player2Logs = storage.getPlayerLogs('player2');
      
      expect(player1Logs).toHaveLength(0);
      expect(player2Logs).toHaveLength(1);
    });
  });

  describe('cleanupOldLogs', () => {
    it('should remove old logs', () => {
      // Mock current date
      const mockCurrentDate = new Date('2023-12-01T00:00:00Z');
      
      // Store some logs with different timestamps
      const oldDate = new Date('2023-10-20T00:00:00Z'); // 42 days ago
      const recentDate = new Date('2023-11-20T00:00:00Z'); // 11 days ago
      
      const oldLogs = mockLogs.map(log => ({
        ...log,
        timestamp: oldDate
      }));
      
      const recentLogs = mockLogs.map(log => ({
        ...log,
        timestamp: recentDate
      }));
      
      // Store logs with specific timestamps
      storage.storeCombatLogs('player1', oldLogs, oldDate);
      storage.storeCombatLogs('player2', recentLogs, recentDate);
      
      // Clean up logs older than 30 days from mock current date
      storage.cleanupOldLogs(30);
      
      const player1LogsAfterCleanup = storage.getPlayerLogs('player1');
      const player2LogsAfterCleanup = storage.getPlayerLogs('player2');
      
      expect(player1LogsAfterCleanup).toHaveLength(0); // Should be removed
      expect(player2LogsAfterCleanup).toHaveLength(1); // Should remain
    });
  });

  describe('getStorageStats', () => {
    beforeEach(() => {
      storage.storeCombatLogs('player1', mockLogs);
      storage.storeCombatLogs('player1', mockLogs);
      storage.storeCombatLogs('player2', mockLogs);
    });

    it('should return correct statistics', () => {
      const stats = storage.getStorageStats();
      
      expect(stats.totalPlayers).toBe(2);
      expect(stats.totalSessions).toBe(3);
      expect(stats.totalLogs).toBe(6); // 3 sessions * 2 logs each
    });

    it('should return zero stats for empty storage', () => {
      const emptyStorage = new CombatLogStorage();
      const stats = emptyStorage.getStorageStats();
      
      expect(stats.totalPlayers).toBe(0);
      expect(stats.totalSessions).toBe(0);
      expect(stats.totalLogs).toBe(0);
    });
  });
});