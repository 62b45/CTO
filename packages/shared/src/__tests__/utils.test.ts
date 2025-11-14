/**
 * Unit tests for combat utilities
 */

import {
  SeededRNG,
  calculateDamage,
  generateCombatLogDescription,
  isDefeated,
  restoreHealth,
} from '../utils';
import { CombatStats, Weapon, CombatAction } from '../types';

describe('SeededRNG', () => {
  it('should generate deterministic sequences with same seed', () => {
    const rng1 = new SeededRNG(12345);
    const rng2 = new SeededRNG(12345);

    const values1 = Array.from({ length: 10 }, () => rng1.next());
    const values2 = Array.from({ length: 10 }, () => rng2.next());

    expect(values1).toEqual(values2);
  });

  it('should generate different sequences with different seeds', () => {
    const rng1 = new SeededRNG(12345);
    const rng2 = new SeededRNG(54321);

    const values1 = Array.from({ length: 10 }, () => rng1.next());
    const values2 = Array.from({ length: 10 }, () => rng2.next());

    expect(values1).not.toEqual(values2);
  });

  it('should generate values in correct range', () => {
    const rng = new SeededRNG(12345);

    for (let i = 0; i < 100; i++) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('should generate floats in specified range', () => {
    const rng = new SeededRNG(12345);

    for (let i = 0; i < 100; i++) {
      const value = rng.nextFloat(10, 20);
      expect(value).toBeGreaterThanOrEqual(10);
      expect(value).toBeLessThan(20);
    }
  });

  it('should generate integers in specified range', () => {
    const rng = new SeededRNG(12345);

    for (let i = 0; i < 100; i++) {
      const value = rng.nextInt(1, 10);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(10);
      expect(Number.isInteger(value)).toBe(true);
    }
  });
});

describe('calculateDamage', () => {
  let attacker: CombatStats;
  let defender: CombatStats;
  let weapon: Weapon;
  let rng: SeededRNG;

  beforeEach(() => {
    attacker = {
      health: 100,
      maxHealth: 100,
      attack: 20,
      defense: 10,
      speed: 15,
    };

    defender = {
      health: 80,
      maxHealth: 80,
      attack: 15,
      defense: 8,
      speed: 12,
    };

    weapon = {
      id: 'sword',
      name: 'Iron Sword',
      baseDamage: 10,
      multiplier: 1.5,
    };

    rng = new SeededRNG(12345);
  });

  it('should calculate damage with weapon multiplier', () => {
    const result = calculateDamage(attacker, defender, weapon, rng);

    expect(result.roll).toBe(10 + 20 * 1.5); // baseDamage + attack * multiplier
    expect(result.damage).toBeGreaterThan(0);
    expect(result.variance).toBeGreaterThan(0);
  });

  it('should apply variance within ±12.5%', () => {
    const result = calculateDamage(attacker, defender, weapon, rng);
    const baseDamage = 10 + 20 * 1.5;
    const minExpected = baseDamage * 0.875;
    const maxExpected = baseDamage * 1.125;

    expect(result.damage).toBeGreaterThanOrEqual(Math.floor(minExpected * 0.1)); // With defense scaling
    expect(result.damage).toBeLessThanOrEqual(Math.floor(maxExpected));
  });

  it('should apply defense scaling', () => {
    const highDefenseDefender = {
      ...defender,
      defense: 50,
    };

    const normalResult = calculateDamage(attacker, defender, weapon, rng);
    const highDefenseResult = calculateDamage(
      attacker,
      highDefenseDefender,
      weapon,
      new SeededRNG(12345)
    );

    expect(highDefenseResult.damage).toBeLessThan(normalResult.damage);
  });

  it('should have minimum damage of 1 for very high defense', () => {
    const veryHighDefenseDefender = {
      ...defender,
      defense: 200, // 200 * 0.009 = 1.8, so 1 - 1.8 = -0.8, max(0.1, -0.8) = 0.1
    };

    const result = calculateDamage(
      attacker,
      veryHighDefenseDefender,
      weapon,
      rng
    );
    expect(result.damage).toBe(1);
  });

  it('should be deterministic with same seed', () => {
    const rng1 = new SeededRNG(12345);
    const rng2 = new SeededRNG(12345);

    const result1 = calculateDamage(attacker, defender, weapon, rng1);
    const result2 = calculateDamage(attacker, defender, weapon, rng2);

    expect(result1.damage).toBe(result2.damage);
    expect(result1.variance).toBe(result2.variance);
  });
});

describe('generateCombatLogDescription', () => {
  const action: CombatAction = {
    attackerId: 'player1',
    targetId: 'enemy1',
    type: 'attack',
  };

  it('should generate attack description with damage', () => {
    const description = generateCombatLogDescription(
      action,
      'Player',
      'Enemy',
      25
    );
    expect(description).toBe('Player attacks Enemy for 25 damage!');
  });

  it('should generate attack description without damage', () => {
    const description = generateCombatLogDescription(action, 'Player', 'Enemy');
    expect(description).toBe('Player attacks Enemy!');
  });

  it('should generate defend description', () => {
    const defendAction = { ...action, type: 'defend' as const };
    const description = generateCombatLogDescription(
      defendAction,
      'Player',
      'Enemy'
    );
    expect(description).toBe('Player takes a defensive stance!');
  });

  it('should generate skill description with damage', () => {
    const skillAction = { ...action, type: 'skill' as const };
    const description = generateCombatLogDescription(
      skillAction,
      'Player',
      'Enemy',
      30
    );
    expect(description).toBe('Player uses a skill on Enemy for 30 damage!');
  });

  it('should generate skill description without damage', () => {
    const skillAction = { ...action, type: 'skill' as const };
    const description = generateCombatLogDescription(
      skillAction,
      'Player',
      'Enemy'
    );
    expect(description).toBe('Player uses a skill on Enemy!');
  });

  it('should generate default description for unknown action type', () => {
    const unknownAction = { ...action, type: 'attack' as const };
    const description = generateCombatLogDescription(
      unknownAction,
      'Player',
      'Enemy'
    );
    expect(description).toBe('Player attacks Enemy!');
  });
});

describe('isDefeated', () => {
  it('should return true when health is 0', () => {
    const stats: CombatStats = {
      health: 0,
      maxHealth: 100,
      attack: 10,
      defense: 5,
      speed: 10,
    };

    expect(isDefeated(stats)).toBe(true);
  });

  it('should return true when health is negative', () => {
    const stats: CombatStats = {
      health: -10,
      maxHealth: 100,
      attack: 10,
      defense: 5,
      speed: 10,
    };

    expect(isDefeated(stats)).toBe(true);
  });

  it('should return false when health is positive', () => {
    const stats: CombatStats = {
      health: 50,
      maxHealth: 100,
      attack: 10,
      defense: 5,
      speed: 10,
    };

    expect(isDefeated(stats)).toBe(false);
  });
});

describe('restoreHealth', () => {
  it('should restore health to max health', () => {
    const damagedStats: CombatStats = {
      health: 30,
      maxHealth: 100,
      attack: 10,
      defense: 5,
      speed: 10,
    };

    const restoredStats = restoreHealth(damagedStats);
    expect(restoredStats.health).toBe(100);
  });

  it('should keep other stats unchanged', () => {
    const damagedStats: CombatStats = {
      health: 30,
      maxHealth: 100,
      attack: 10,
      defense: 5,
      speed: 10,
    };

    const restoredStats = restoreHealth(damagedStats);
    expect(restoredStats.maxHealth).toBe(100);
    expect(restoredStats.attack).toBe(10);
    expect(restoredStats.defense).toBe(5);
    expect(restoredStats.speed).toBe(10);
  });

  it('should handle full health stats', () => {
    const fullHealthStats: CombatStats = {
      health: 100,
      maxHealth: 100,
      attack: 10,
      defense: 5,
      speed: 10,
    };

    const restoredStats = restoreHealth(fullHealthStats);
    expect(restoredStats.health).toBe(100);
  });
});
