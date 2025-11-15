import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { ActionCooldownService } from '../cooldowns/actionCooldownService';
import { InMemoryCooldownRepository } from '../storage/inMemoryCooldownRepository';
import { ACTION_METADATA } from '../actions/metadata';

describe('Cooldown Enforcement Tests', () => {
  let cooldownService: ActionCooldownService;
  let testPlayerId: string;

  beforeEach(() => {
    const repository = new InMemoryCooldownRepository();
    cooldownService = new ActionCooldownService(
      repository,
      { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
      () => Date.UTC(2023, 0, 1, 0, 0, 0)
    );
    testPlayerId = 'test-player';
  });

  describe('Basic cooldown functionality', () => {
    it('should set and track cooldowns correctly', async () => {
      const actionType = 'hunt';
      
      // Initially should not be on cooldown
      expect(await cooldownService.isOnCooldown(testPlayerId, actionType)).toBe(false);
      
      // Set cooldown
      await cooldownService.setCooldown(testPlayerId, actionType);
      
      // Should now be on cooldown
      expect(await cooldownService.isOnCooldown(testPlayerId, actionType)).toBe(true);
    });

    it('should respect action-specific cooldown durations', async () => {
      const huntCooldown = ACTION_METADATA.hunt.cooldownMs;
      const dungeonCooldown = ACTION_METADATA.dungeon.cooldownMs;
      
      // Set cooldowns for different actions
      await cooldownService.setCooldown(testPlayerId, 'hunt');
      await cooldownService.setCooldown(testPlayerId, 'dungeon');
      
      // Both should be on cooldown
      expect(await cooldownService.isOnCooldown(testPlayerId, 'hunt')).toBe(true);
      expect(await cooldownService.isOnCooldown(testPlayerId, 'dungeon')).toBe(true);
      
      // Advance time by hunt cooldown duration
      jest.spyOn(Date, 'now').mockReturnValue(
        Date.UTC(2023, 0, 1, 0, 0, Math.floor(huntCooldown / 1000))
      );
      
      // Hunt should be available, dungeon still on cooldown
      expect(await cooldownService.isOnCooldown(testPlayerId, 'hunt')).toBe(false);
      expect(await cooldownService.isOnCooldown(testPlayerId, 'dungeon')).toBe(true);
      
      jest.restoreAllMocks();
    });

    it('should return correct remaining cooldown time', async () => {
      const actionType = 'hunt';
      const cooldownDuration = ACTION_METADATA[actionType].cooldownMs;
      
      await cooldownService.setCooldown(testPlayerId, actionType);
      
      // Immediately after setting, should return full duration
      const remaining1 = await cooldownService.getRemainingCooldown(testPlayerId, actionType);
      expect(remaining1).toBeGreaterThan(cooldownDuration * 0.9); // Allow small variance
      
      // Advance time by half the cooldown
      jest.spyOn(Date, 'now').mockReturnValue(
        Date.UTC(2023, 0, 1, 0, 0, Math.floor(cooldownDuration / 2000))
      );
      
      const remaining2 = await cooldownService.getRemainingCooldown(testPlayerId, actionType);
      expect(remaining2).toBeGreaterThan(cooldownDuration * 0.4);
      expect(remaining2).toBeLessThan(cooldownDuration * 0.6);
      
      jest.restoreAllMocks();
    });
  });

  describe('Cooldown expiration', () => {
    it('should automatically expire cooldowns after duration', async () => {
      const actionType = 'gather_herbs';
      const cooldownDuration = ACTION_METADATA[actionType].cooldownMs;
      
      await cooldownService.setCooldown(testPlayerId, actionType);
      expect(await cooldownService.isOnCooldown(testPlayerId, actionType)).toBe(true);
      
      // Advance time beyond cooldown duration
      jest.spyOn(Date, 'now').mockReturnValue(
        Date.UTC(2023, 0, 1, 0, 0, Math.floor(cooldownDuration / 1000) + 1)
      );
      
      expect(await cooldownService.isOnCooldown(testPlayerId, actionType)).toBe(false);
      expect(await cooldownService.getRemainingCooldown(testPlayerId, actionType)).toBe(0);
      
      jest.restoreAllMocks();
    });

    it('should handle multiple actions with different cooldowns', async () => {
      const actions = ['hunt', 'heal', 'dungeon', 'quest'];
      const cooldowns = actions.map(action => ACTION_METADATA[action as keyof typeof ACTION_METADATA].cooldownMs);
      
      // Set all cooldowns
      for (const action of actions) {
        await cooldownService.setCooldown(testPlayerId, action);
      }
      
      // All should be on cooldown initially
      for (const action of actions) {
        expect(await cooldownService.isOnCooldown(testPlayerId, action)).toBe(true);
      }
      
      // Advance time gradually and test expiration order
      const sortedCooldowns = actions
        .map((action, index) => ({ action, cooldown: cooldowns[index] }))
        .sort((a, b) => a.cooldown - b.cooldown);
      
      let currentTime = 0;
      for (const { action, cooldown } of sortedCooldowns) {
        currentTime += cooldown + 1000; // Add 1 second buffer
        
        jest.spyOn(Date, 'now').mockReturnValue(
          Date.UTC(2023, 0, 1, 0, 0, Math.floor(currentTime / 1000))
        );
        
        // This action should be available
        expect(await cooldownService.isOnCooldown(testPlayerId, action)).toBe(false);
        
        // Actions with longer cooldowns should still be on cooldown
        for (const { action: longerAction, cooldown: longerCooldown } of sortedCooldowns) {
          if (longerCooldown > cooldown) {
            expect(await cooldownService.isOnCooldown(testPlayerId, longerAction)).toBe(true);
          }
        }
      }
      
      jest.restoreAllMocks();
    });
  });

  describe('Concurrent action prevention', () => {
    it('should prevent executing actions while on cooldown', async () => {
      const actionType = 'hunt';
      
      await cooldownService.setCooldown(testPlayerId, actionType);
      
      // Should throw error or return false when trying to execute on cooldown
      await expect(
        cooldownService.executeIfNotOnCooldown(testPlayerId, actionType, async () => {
          return 'action completed';
        })
      ).rejects.toThrow('Action is on cooldown');
    });

    it('should allow execution when not on cooldown', async () => {
      const actionType = 'hunt';
      
      const result = await cooldownService.executeIfNotOnCooldown(
        testPlayerId, 
        actionType, 
        async () => {
          return 'action completed';
        }
      );
      
      expect(result).toBe('action completed');
    });

    it('should set cooldown after successful execution', async () => {
      const actionType = 'craft';
      
      await cooldownService.executeIfNotOnCooldown(
        testPlayerId, 
        actionType, 
        async () => {
          return 'crafting completed';
        }
      );
      
      // Should now be on cooldown
      expect(await cooldownService.isOnCooldown(testPlayerId, actionType)).toBe(true);
    });
  });

  describe('Multi-player isolation', () => {
    it('should isolate cooldowns between different players', async () => {
      const player1Id = 'player-1';
      const player2Id = 'player-2';
      const actionType = 'hunt';
      
      // Set cooldown for player 1
      await cooldownService.setCooldown(player1Id, actionType);
      
      // Player 1 should be on cooldown
      expect(await cooldownService.isOnCooldown(player1Id, actionType)).toBe(true);
      
      // Player 2 should not be on cooldown
      expect(await cooldownService.isOnCooldown(player2Id, actionType)).toBe(false);
      
      // Set cooldown for player 2
      await cooldownService.setCooldown(player2Id, actionType);
      
      // Both should now be on cooldown
      expect(await cooldownService.isOnCooldown(player1Id, actionType)).toBe(true);
      expect(await cooldownService.isOnCooldown(player2Id, actionType)).toBe(true);
    });

    it('should handle many concurrent players efficiently', async () => {
      const playerCount = 1000;
      const actionType = 'heal';
      const players = Array.from({ length: playerCount }, (_, i) => `player-${i}`);
      
      // Set cooldowns for all players
      const startTime = Date.now();
      await Promise.all(
        players.map(playerId => cooldownService.setCooldown(playerId, actionType))
      );
      const setTime = Date.now() - startTime;
      
      // Should complete in reasonable time
      expect(setTime).toBeLessThan(1000); // 1 second max for 1000 players
      
      // All players should be on cooldown
      const cooldownChecks = await Promise.all(
        players.map(playerId => cooldownService.isOnCooldown(playerId, actionType))
      );
      
      expect(cooldownChecks.every(onCooldown => onCooldown)).toBe(true);
    });
  });

  describe('Cooldown reset and management', () => {
    it('should allow manual cooldown reset', async () => {
      const actionType = 'dungeon';
      
      await cooldownService.setCooldown(testPlayerId, actionType);
      expect(await cooldownService.isOnCooldown(testPlayerId, actionType)).toBe(true);
      
      await cooldownService.clearCooldown(testPlayerId, actionType);
      expect(await cooldownService.isOnCooldown(testPlayerId, actionType)).toBe(false);
    });

    it('should clear all cooldowns for a player', async () => {
      const actions = ['hunt', 'heal', 'craft', 'dungeon'];
      
      // Set multiple cooldowns
      for (const action of actions) {
        await cooldownService.setCooldown(testPlayerId, action);
      }
      
      // All should be on cooldown
      for (const action of actions) {
        expect(await cooldownService.isOnCooldown(testPlayerId, action)).toBe(true);
      }
      
      // Clear all cooldowns
      await cooldownService.clearAllCooldowns(testPlayerId);
      
      // None should be on cooldown
      for (const action of actions) {
        expect(await cooldownService.isOnCooldown(testPlayerId, action)).toBe(false);
      }
    });

    it('should handle expired cooldown cleanup', async () => {
      const actionType = 'gather_ore';
      const cooldownDuration = ACTION_METADATA[actionType].cooldownMs;
      
      await cooldownService.setCooldown(testPlayerId, actionType);
      
      // Advance time beyond cooldown
      jest.spyOn(Date, 'now').mockReturnValue(
        Date.UTC(2023, 0, 1, 0, 0, Math.floor(cooldownDuration / 1000) + 10)
      );
      
      // Check if on cooldown (should trigger cleanup)
      expect(await cooldownService.isOnCooldown(testPlayerId, actionType)).toBe(false);
      
      // Should still return 0 for remaining time
      expect(await cooldownService.getRemainingCooldown(testPlayerId, actionType)).toBe(0);
      
      jest.restoreAllMocks();
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle invalid action types gracefully', async () => {
      const invalidAction = 'invalid_action' as any;
      
      // Should not throw but handle gracefully
      expect(await cooldownService.isOnCooldown(testPlayerId, invalidAction)).toBe(false);
      
      await expect(
        cooldownService.setCooldown(testPlayerId, invalidAction)
      ).rejects.toThrow();
    });

    it('should handle empty player IDs', async () => {
      const actionType = 'hunt';
      
      // Should handle empty or null player IDs
      await expect(
        cooldownService.setCooldown('', actionType)
      ).rejects.toThrow();
      
      await expect(
        cooldownService.isOnCooldown('', actionType)
      ).resolves.toBe(false);
    });

    it('should maintain consistency under rapid operations', async () => {
      const actionType = 'heal';
      const operations = 100;
      
      // Rapidly set and check cooldowns
      const promises = Array.from({ length: operations }, async (_, i) => {
        if (i % 2 === 0) {
          await cooldownService.setCooldown(testPlayerId, actionType);
        } else {
          return await cooldownService.isOnCooldown(testPlayerId, actionType);
        }
        return true;
      });
      
      const results = await Promise.all(promises);
      
      // Should complete without errors
      expect(results.every(result => typeof result === 'boolean')).toBe(true);
    });
  });
});