/**
 * Unit tests for CombatService
 */

import { CombatService } from '../CombatService';
import { CombatSimulationRequest, Weapon, CombatStats } from '@shared';

describe('CombatService', () => {
  let combatService: CombatService;
  let mockRequest: CombatSimulationRequest;

  beforeEach(() => {
    combatService = new CombatService();

    mockRequest = {
      playerId: 'player1',
      playerStats: {
        health: 100,
        maxHealth: 100,
        attack: 20,
        defense: 10,
        speed: 15,
      },
      playerWeapon: {
        id: 'sword',
        name: 'Iron Sword',
        baseDamage: 10,
        multiplier: 1.5,
      },
      enemyTemplateId: 'goblin',
      seed: 12345,
    };
  });

  describe('getEnemyTemplates', () => {
    it('should return all available enemy templates', () => {
      const templates = combatService.getEnemyTemplates();

      expect(templates).toHaveLength(3); // goblin, orc, dragon
      expect(templates.find(t => t.id === 'goblin')).toBeDefined();
      expect(templates.find(t => t.id === 'orc')).toBeDefined();
      expect(templates.find(t => t.id === 'dragon')).toBeDefined();
    });

    it('should return templates with correct structure', () => {
      const templates = combatService.getEnemyTemplates();

      templates.forEach(template => {
        expect(template.id).toBeDefined();
        expect(template.name).toBeDefined();
        expect(template.stats).toBeDefined();
        expect(template.rewards).toBeDefined();

        expect(template.stats.health).toBeGreaterThan(0);
        expect(template.stats.maxHealth).toBeGreaterThan(0);
        expect(template.stats.attack).toBeGreaterThan(0);
        expect(template.stats.defense).toBeGreaterThanOrEqual(0);
        expect(template.stats.speed).toBeGreaterThan(0);

        expect(template.rewards.experience).toBeGreaterThan(0);
        expect(template.rewards.gold).toBeGreaterThan(0);
      });
    });
  });

  describe('getEnemyTemplate', () => {
    it('should return correct enemy template by ID', () => {
      const goblin = combatService.getEnemyTemplate('goblin');

      expect(goblin).toBeDefined();
      expect(goblin!.id).toBe('goblin');
      expect(goblin!.name).toBe('Goblin');
      expect(goblin!.stats.health).toBe(50);
      expect(goblin!.rewards.experience).toBe(25);
    });

    it('should return null for non-existent template', () => {
      const nonExistent = combatService.getEnemyTemplate('non_existent');
      expect(nonExistent).toBeNull();
    });
  });

  describe('setEnemyTemplate', () => {
    it('should add new enemy template', () => {
      const newTemplate = {
        id: 'skeleton',
        name: 'Skeleton Warrior',
        stats: {
          health: 60,
          maxHealth: 60,
          attack: 12,
          defense: 6,
          speed: 14,
        },
        rewards: {
          experience: 35,
          gold: 15,
        },
      };

      combatService.setEnemyTemplate(newTemplate);

      const retrieved = combatService.getEnemyTemplate('skeleton');
      expect(retrieved).toEqual(newTemplate);
    });

    it('should update existing enemy template', () => {
      const updatedGoblin = {
        id: 'goblin',
        name: 'Elite Goblin',
        stats: {
          health: 75,
          maxHealth: 75,
          attack: 25,
          defense: 12,
          speed: 18,
        },
        rewards: {
          experience: 50,
          gold: 25,
        },
      };

      combatService.setEnemyTemplate(updatedGoblin);

      const retrieved = combatService.getEnemyTemplate('goblin');
      expect(retrieved).toEqual(updatedGoblin);
    });
  });

  describe('simulateCombat', () => {
    it('should simulate combat successfully', () => {
      const result = combatService.simulateCombat(mockRequest);

      expect(result.result).toBeDefined();
      expect(result.updatedPlayerStats).toBeDefined();
      expect(result.result.winner).toBeDefined();
      expect(result.result.loser).toBeDefined();
      expect(result.result.turns).toBeGreaterThan(0);
      expect(result.result.logs).toHaveLength(result.result.turns * 2);
      expect(result.result.rewards).toBeDefined();
    });

    it('should restore player health after combat', () => {
      const result = combatService.simulateCombat(mockRequest);

      expect(result.updatedPlayerStats.health).toBe(
        result.updatedPlayerStats.maxHealth
      );
    });

    it('should produce deterministic results with same seed', () => {
      const request1 = { ...mockRequest, seed: 12345 };
      const request2 = { ...mockRequest, seed: 12345 };

      const result1 = combatService.simulateCombat(request1);
      const result2 = combatService.simulateCombat(request2);

      expect(result1.result.winner).toBe(result2.result.winner);
      expect(result1.result.turns).toBe(result2.result.turns);

      // Check that damage values are the same
      const damages1 = result1.result.logs.map(log => log.action.damage);
      const damages2 = result2.result.logs.map(log => log.action.damage);
      expect(damages1).toEqual(damages2);
    });

    it('should throw error for non-existent enemy template', () => {
      const invalidRequest = {
        ...mockRequest,
        enemyTemplateId: 'non_existent',
      };

      expect(() => {
        combatService.simulateCombat(invalidRequest);
      }).toThrow("Enemy template 'non_existent' not found");
    });

    it('should handle different enemy types', () => {
      const orcRequest = { ...mockRequest, enemyTemplateId: 'orc' };
      const dragonRequest = { ...mockRequest, enemyTemplateId: 'dragon' };

      const orcResult = combatService.simulateCombat(orcRequest);
      const dragonResult = combatService.simulateCombat(dragonRequest);

      expect(orcResult.result.rewards.experience).toBe(75);
      expect(orcResult.result.rewards.gold).toBe(30);

      expect(dragonResult.result.rewards.experience).toBe(500);
      expect(dragonResult.result.rewards.gold).toBe(200);
      expect(dragonResult.result.rewards.items).toContain('dragon_scale');
    });
  });

  describe('getPlayerCombatLogs', () => {
    it('should return empty logs for new player', () => {
      const logs = combatService.getPlayerCombatLogs('new_player');
      expect(logs).toHaveLength(0);
    });

    it('should return logs after combat simulation', () => {
      combatService.simulateCombat(mockRequest);

      const logs = combatService.getPlayerCombatLogs('player1');
      expect(logs).toHaveLength(1);
      expect(logs[0].logs.length).toBeGreaterThan(0);
    });

    it('should respect limit parameter', () => {
      // Simulate multiple combats
      for (let i = 0; i < 5; i++) {
        combatService.simulateCombat({
          ...mockRequest,
          seed: 12345 + i,
        });
      }

      const limitedLogs = combatService.getPlayerCombatLogs('player1', 3);
      expect(limitedLogs).toHaveLength(3);

      const allLogs = combatService.getPlayerCombatLogs('player1', 10);
      expect(allLogs).toHaveLength(5);
    });
  });

  describe('getCombatLogs', () => {
    it('should return null for non-existent combat session', () => {
      const logs = combatService.getCombatLogs(
        'player1',
        'non_existent_session'
      );
      expect(logs).toBeNull();
    });

    it('should return logs for existing combat session', () => {
      const result = combatService.simulateCombat(mockRequest);
      const sessionId = result.result.logs[0].timestamp.getTime().toString();

      // Get the actual session ID from stored logs
      const playerLogs = combatService.getPlayerCombatLogs('player1');
      const actualSessionId = playerLogs[0].id;

      const logs = combatService.getCombatLogs('player1', actualSessionId);
      expect(logs).toBeDefined();
      expect(logs!.length).toBeGreaterThan(0);
    });
  });
});
