/**
 * Shared utility functions
 */

import {
  User,
  ApiResponse,
  CombatStats,
  Weapon,
  CombatLogEntry,
  CombatAction,
} from './types';

/**
 * Format a user's full name
 */
export function formatUserName(user: User): string {
  return `${user.name} <${user.email}>`;
}

/**
 * Create a successful API response
 */
export function createSuccessResponse<T>(data: T): ApiResponse<T> {
  return {
    data,
    message: 'Success',
    success: true,
  };
}

/**
 * Create an error API response
 */
export function createErrorResponse(message: string): ApiResponse<never> {
  return {
    data: null as never,
    message,
    success: false,
  };
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Seeded random number generator for deterministic combat
 */
export class SeededRNG {
  private seed: number;

  constructor(seed: number = Date.now()) {
    this.seed = seed;
  }

  // Simple LCG (Linear Congruential Generator)
  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }

  nextFloat(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.nextFloat(min, max + 1));
  }
}

/**
 * Calculate damage with weapon multiplier and variance
 */
export function calculateDamage(
  attacker: CombatStats,
  defender: CombatStats,
  weapon: Weapon,
  rng: SeededRNG
): { damage: number; roll: number; variance: number } {
  // Base damage from weapon and attack stat
  const baseDamage = weapon.baseDamage + attacker.attack * weapon.multiplier;

  // Random variance of ±12.5%
  const variancePercent = 0.125; // 12.5%
  const variance = rng.nextFloat(1 - variancePercent, 1 + variancePercent);

  // Apply variance
  const damageWithVariance = baseDamage * variance;

  // Apply defense scaling (defense reduces damage by up to 90%, minimum 10% gets through)
  const defenseReduction = Math.max(0.1, 1 - defender.defense * 0.009); // Each defense point reduces 0.9% damage
  const finalDamage = Math.max(
    1,
    Math.floor(damageWithVariance * defenseReduction)
  );

  return {
    damage: finalDamage,
    roll: baseDamage,
    variance: variance,
  };
}

/**
 * Generate combat log description
 */
export function generateCombatLogDescription(
  action: CombatAction,
  attackerName: string,
  targetName: string,
  damage?: number
): string {
  switch (action.type) {
    case 'attack':
      if (damage !== undefined) {
        return `${attackerName} attacks ${targetName} for ${damage} damage!`;
      }
      return `${attackerName} attacks ${targetName}!`;
    case 'defend':
      return `${attackerName} takes a defensive stance!`;
    case 'skill':
      if (damage !== undefined) {
        return `${attackerName} uses a skill on ${targetName} for ${damage} damage!`;
      }
      return `${attackerName} uses a skill on ${targetName}!`;
    default:
      return `${attackerName} performs an action!`;
  }
}

/**
 * Check if combatant is defeated
 */
export function isDefeated(stats: CombatStats): boolean {
  return stats.health <= 0;
}

/**
 * Restore combat stats to full health
 */
export function restoreHealth(stats: CombatStats): CombatStats {
  return {
    ...stats,
    health: stats.maxHealth,
  };
}
