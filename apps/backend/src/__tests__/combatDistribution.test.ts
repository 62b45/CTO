import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { CombatService } from '../combat/CombatService';
import { CombatEngine } from '../combat/CombatEngine';
import { CombatStats, Weapon } from '@shared';

describe('Combat Distribution Analysis', () => {
  let combatService: CombatService;
  let combatEngine: CombatEngine;

  beforeEach(() => {
    combatService = new CombatService();
    combatEngine = new CombatEngine(12345); // Fixed seed for reproducible tests
  });

  describe('Damage distribution', () => {
    it('should produce damage within expected ranges', () => {
      const playerStats: CombatStats = {
        health: 100,
        maxHealth: 100,
        attack: 20,
        defense: 10,
        speed: 15,
      };

      const playerWeapon: Weapon = {
        id: 'test_sword',
        name: 'Test Sword',
        baseDamage: 15,
        multiplier: 1.2,
      };

      // Run multiple damage calculations
      const damages: number[] = [];
      for (let i = 0; i < 1000; i++) {
        const damage = combatEngine.calculateDamage(playerStats, playerWeapon);
        damages.push(damage);
      }

      // Analyze distribution
      const minDamage = Math.min(...damages);
      const maxDamage = Math.max(...damages);
      const avgDamage = damages.reduce((sum, d) => sum + d, 0) / damages.length;

      // Damage should be within reasonable bounds
      expect(minDamage).toBeGreaterThan(0);
      expect(maxDamage).toBeLessThan(100); // Upper bound for balance
      expect(avgDamage).toBeGreaterThan(10);
      expect(avgDamage).toBeLessThan(50);

      // Should have variance (not constant damage)
      expect(minDamage).toBeLessThan(maxDamage);
    });

    it('should scale damage with stats and weapon correctly', () => {
      const baseStats: CombatStats = {
        health: 100,
        maxHealth: 100,
        attack: 10,
        defense: 10,
        speed: 10,
      };

      const baseWeapon: Weapon = {
        id: 'base_weapon',
        name: 'Base Weapon',
        baseDamage: 10,
        multiplier: 1.0,
      };

      const damage1 = combatEngine.calculateDamage(baseStats, baseWeapon);

      // Double attack stat
      const highAttackStats = { ...baseStats, attack: 20 };
      const damage2 = combatEngine.calculateDamage(highAttackStats, baseWeapon);

      // Double weapon damage
      const highDamageWeapon = { ...baseWeapon, baseDamage: 20 };
      const damage3 = combatEngine.calculateDamage(baseStats, highDamageWeapon);

      expect(damage2).toBeGreaterThan(damage1);
      expect(damage3).toBeGreaterThan(damage1);
      expect(damage2).toBeLessThan(damage3 * 1.5); // Reasonable scaling
    });
  });

  describe('Combat outcome distribution', () => {
    it('should produce balanced win rates over many simulations', () => {
      const playerStats: CombatStats = {
        health: 100,
        maxHealth: 100,
        attack: 15,
        defense: 12,
        speed: 12,
      };

      const playerWeapon: Weapon = {
        id: 'player_sword',
        name: 'Player Sword',
        baseDamage: 12,
        multiplier: 1.1,
      };

      const enemyTemplate = combatService.getEnemyTemplate('goblin');
      expect(enemyTemplate).toBeTruthy();

      const wins = { player: 0, enemy: 0 };
      const simulations = 1000;

      for (let i = 0; i < simulations; i++) {
        const engine = new CombatEngine(Date.now() + i);
        const result = engine.resolveCombat(
          {
            id: 'player',
            name: 'Player',
            stats: { ...playerStats },
            weapon: playerWeapon,
            isPlayer: true,
          },
          {
            id: 'goblin',
            name: 'Goblin',
            stats: { ...enemyTemplate!.stats },
            weapon: enemyTemplate!.weapon,
            isPlayer: false,
          },
          enemyTemplate!.rewards
        );

        if (result.victory) {
          wins.player++;
        } else {
          wins.enemy++;
        }
      }

      const winRate = wins.player / simulations;
      
      // Win rate should be reasonable (not 0% or 100%)
      expect(winRate).toBeGreaterThan(0.3);
      expect(winRate).toBeLessThan(0.8);
    });

    it('should scale combat difficulty appropriately', () => {
      const playerStats: CombatStats = {
        health: 100,
        maxHealth: 100,
        attack: 15,
        defense: 12,
        speed: 12,
      };

      const playerWeapon: Weapon = {
        id: 'player_sword',
        name: 'Player Sword',
        baseDamage: 12,
        multiplier: 1.1,
      };

      // Test against different enemies
      const goblin = combatService.getEnemyTemplate('goblin')!;
      const orc = combatService.getEnemyTemplate('orc')!;

      const goblinWins = simulateCombat(playerStats, playerWeapon, goblin, 100);
      const orcWins = simulateCombat(playerStats, playerWeapon, orc, 100);

      // Should be harder to beat orc than goblin
      expect(goblinWins).toBeGreaterThan(orcWins);
    });
  });

  describe('Reward distribution', () => {
    it('should distribute rewards according to enemy difficulty', () => {
      const goblin = combatService.getEnemyTemplate('goblin')!;
      const orc = combatService.getEnemyTemplate('orc')!;
      const dragon = combatService.getEnemyTemplate('dragon')!;

      // Rewards should scale with difficulty
      expect(goblin.rewards.experience).toBeLessThan(orc.rewards.experience);
      expect(orc.rewards.experience).toBeLessThan(dragon.rewards.experience);

      expect(goblin.rewards.gold).toBeLessThan(orc.rewards.gold);
      expect(orc.rewards.gold).toBeLessThan(dragon.rewards.gold);
    });

    it('should provide balanced loot drops', () => {
      const dragon = combatService.getEnemyTemplate('dragon')!;
      const itemDrops: string[] = [];

      // Simulate many dragon kills for loot analysis
      for (let i = 0; i < 100; i++) {
        if (dragon.rewards.items) {
          itemDrops.push(...dragon.rewards.items);
        }
      }

      // Dragon should drop rare items
      expect(itemDrops.length).toBeGreaterThan(0);
      expect(itemDrops.includes('dragon_scale')).toBe(true);
      expect(itemDrops.includes('fire_essence')).toBe(true);
    });
  });

  describe('Combat balance validation', () => {
    it('should maintain combat duration balance', () => {
      const playerStats: CombatStats = {
        health: 100,
        maxHealth: 100,
        attack: 15,
        defense: 12,
        speed: 12,
      };

      const playerWeapon: Weapon = {
        id: 'player_sword',
        name: 'Player Sword',
        baseDamage: 12,
        multiplier: 1.1,
      };

      const goblin = combatService.getEnemyTemplate('goblin')!;
      const durations: number[] = [];

      for (let i = 0; i < 100; i++) {
        const engine = new CombatEngine(Date.now() + i);
        const result = engine.resolveCombat(
          {
            id: 'player',
            name: 'Player',
            stats: { ...playerStats },
            weapon: playerWeapon,
            isPlayer: true,
          },
          {
            id: 'goblin',
            name: 'Goblin',
            stats: { ...goblin.stats },
            weapon: goblin.weapon,
            isPlayer: false,
          },
          goblin.rewards
        );

        durations.push(result.logs.length);
      }

      const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      
      // Combat should not be too short or too long
      expect(avgDuration).toBeGreaterThan(3); // At least 3 rounds on average
      expect(avgDuration).toBeLessThan(20); // Not more than 20 rounds on average
    });

    it('should ensure speed stat affects combat order', () => {
      const slowPlayer: CombatStats = {
        health: 100,
        maxHealth: 100,
        attack: 15,
        defense: 12,
        speed: 5, // Very slow
      };

      const fastPlayer: CombatStats = {
        health: 100,
        maxHealth: 100,
        attack: 15,
        defense: 12,
        speed: 20, // Very fast
      };

      const weapon: Weapon = {
        id: 'test_weapon',
        name: 'Test Weapon',
        baseDamage: 10,
        multiplier: 1.0,
      };

      const goblin = combatService.getEnemyTemplate('goblin')!;

      // Fast player should get more turns or act first
      const fastResult = combatEngine.resolveCombat(
        {
          id: 'fast_player',
          name: 'Fast Player',
          stats: { ...fastPlayer },
          weapon,
          isPlayer: true,
        },
        {
          id: 'goblin',
          name: 'Goblin',
          stats: { ...goblin.stats },
          weapon: goblin.weapon,
          isPlayer: false,
        },
        goblin.rewards
      );

      const slowResult = combatEngine.resolveCombat(
        {
          id: 'slow_player',
          name: 'Slow Player',
          stats: { ...slowPlayer },
          weapon,
          isPlayer: true,
        },
        {
          id: 'goblin',
          name: 'Goblin',
          stats: { ...goblin.stats },
          weapon: goblin.weapon,
          isPlayer: false,
        },
        goblin.rewards
      );

      // Fast player should have advantage
      expect(fastResult.logs.length).toBeLessThanOrEqual(slowResult.logs.length);
    });
  });

  function simulateCombat(
    playerStats: CombatStats,
    playerWeapon: Weapon,
    enemyTemplate: any,
    simulations: number
  ): number {
    let wins = 0;

    for (let i = 0; i < simulations; i++) {
      const engine = new CombatEngine(Date.now() + i);
      const result = engine.resolveCombat(
        {
          id: 'player',
          name: 'Player',
          stats: { ...playerStats },
          weapon: playerWeapon,
          isPlayer: true,
        },
        {
          id: enemyTemplate.id,
          name: enemyTemplate.name,
          stats: { ...enemyTemplate.stats },
          weapon: enemyTemplate.weapon,
          isPlayer: false,
        },
        enemyTemplate.rewards
      );

      if (result.victory) {
        wins++;
      }
    }

    return wins;
  }
});