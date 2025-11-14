/**
 * Unit tests for CombatEngine
 */

import { CombatEngine } from '../CombatEngine';
import { Combatant, Weapon, CombatRewards } from '@shared';

describe('CombatEngine', () => {
  let combatEngine: CombatEngine;
  let player: Combatant;
  let enemy: Combatant;
  let rewards: CombatRewards;

  beforeEach(() => {
    // Use fixed seed for deterministic tests
    combatEngine = new CombatEngine(12345);

    // Create test player
    player = {
      id: 'player1',
      name: 'Test Player',
      stats: {
        health: 100,
        maxHealth: 100,
        attack: 20,
        defense: 10,
        speed: 15,
      },
      weapon: {
        id: 'sword',
        name: 'Iron Sword',
        baseDamage: 10,
        multiplier: 1.5,
      },
      isPlayer: true,
    };

    // Create test enemy
    enemy = {
      id: 'enemy1',
      name: 'Test Enemy',
      stats: {
        health: 80,
        maxHealth: 80,
        attack: 15,
        defense: 8,
        speed: 12,
      },
      weapon: {
        id: 'dagger',
        name: 'Rusty Dagger',
        baseDamage: 5,
        multiplier: 1.0,
      },
      isPlayer: false,
    };

    rewards = {
      experience: 50,
      gold: 25,
    };
  });

  describe('resolveCombat', () => {
    it('should resolve combat with player winning', () => {
      const result = combatEngine.resolveCombat(player, enemy, rewards);

      expect(result.winner).toBe('player1');
      expect(result.loser).toBe('enemy1');
      expect(result.turns).toBeGreaterThan(0);
      expect(result.logs).toHaveLength(result.turns * 2); // Each turn has 2 actions
      expect(result.rewards).toEqual(rewards);
    });

    it('should resolve combat with enemy winning when enemy is stronger', () => {
      // Make enemy much stronger
      enemy.stats.health = 200;
      enemy.stats.attack = 50;

      const result = combatEngine.resolveCombat(player, enemy, rewards);

      expect(result.winner).toBe('enemy1');
      expect(result.loser).toBe('player1');
      expect(result.turns).toBeGreaterThan(0);
    });

    it('should produce deterministic results with same seed', () => {
      const engine1 = new CombatEngine(12345);
      const engine2 = new CombatEngine(12345);

      const result1 = engine1.resolveCombat(player, enemy, rewards);
      const result2 = engine2.resolveCombat(player, enemy, rewards);

      expect(result1.winner).toBe(result2.winner);
      expect(result1.turns).toBe(result2.turns);
      expect(result1.logs).toHaveLength(result2.logs.length);

      // Check that damage values are the same
      result1.logs.forEach((log, index) => {
        expect(log.action.damage).toBe(result2.logs[index].action.damage);
        expect(log.action.variance).toBe(result2.logs[index].action.variance);
      });
    });

    it('should produce different results with different seeds', () => {
      const engine1 = new CombatEngine(12345);
      const engine2 = new CombatEngine(54321);

      const result1 = engine1.resolveCombat(player, enemy, rewards);
      const result2 = engine2.resolveCombat(player, enemy, rewards);

      // Results should be different
      const damages1 = result1.logs.map(log => log.action.damage);
      const damages2 = result2.logs.map(log => log.action.damage);

      expect(damages1).not.toEqual(damages2);
    });

    it('should handle combatants without weapons', () => {
      const unarmedPlayer = { ...player, weapon: undefined };
      const unarmedEnemy = { ...enemy, weapon: undefined };

      const result = combatEngine.resolveCombat(
        unarmedPlayer,
        unarmedEnemy,
        rewards
      );

      expect(result.winner).toBeDefined();
      expect(result.loser).toBeDefined();
      expect(result.turns).toBeGreaterThan(0);
      expect(result.logs.length).toBeGreaterThan(0);
    });

    it('should respect turn order based on speed', () => {
      // Make player faster
      player.stats.speed = 20;
      enemy.stats.speed = 10;

      const result = combatEngine.resolveCombat(player, enemy, rewards);

      // First action should be from player (faster)
      expect(result.logs[0].action.attackerId).toBe('player1');
    });

    it('should have enemy go first when enemy is faster', () => {
      // Make enemy faster
      player.stats.speed = 10;
      enemy.stats.speed = 20;

      const result = combatEngine.resolveCombat(player, enemy, rewards);

      // First action should be from enemy (faster)
      expect(result.logs[0].action.attackerId).toBe('enemy1');
    });
  });

  describe('getLogs', () => {
    beforeEach(() => {
      // Run a combat to generate logs
      combatEngine.resolveCombat(player, enemy, rewards);
    });

    it('should return all logs when no range specified', () => {
      const logs = combatEngine.getLogs();
      expect(logs.length).toBeGreaterThan(0);
    });

    it('should return logs within specified turn range', () => {
      const allLogs = combatEngine.getLogs();
      const turn1Logs = combatEngine.getLogs(1, 1);

      expect(turn1Logs.length).toBeLessThanOrEqual(allLogs.length);
      turn1Logs.forEach(log => {
        expect(log.turn).toBe(1);
      });
    });

    it('should return logs from start turn when only start specified', () => {
      const startTurn = 2;
      const logs = combatEngine.getLogs(startTurn);

      logs.forEach(log => {
        expect(log.turn).toBeGreaterThanOrEqual(startTurn);
      });
    });

    it('should return logs up to end turn when only end specified', () => {
      const endTurn = 2;
      const logs = combatEngine.getLogs(undefined, endTurn);

      logs.forEach(log => {
        expect(log.turn).toBeLessThanOrEqual(endTurn);
      });
    });
  });
});
