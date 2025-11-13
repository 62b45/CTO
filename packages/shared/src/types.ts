/**
 * Shared types used across the monorepo
 */

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

export interface Config {
  apiUrl: string;
  environment: 'development' | 'staging' | 'production';
  features: {
    authentication: boolean;
    analytics: boolean;
  };
}

// Combat Engine Types
export interface Weapon {
  id: string;
  name: string;
  baseDamage: number;
  multiplier: number;
}

export interface CombatStats {
  health: number;
  maxHealth: number;
  attack: number;
  defense: number;
  speed: number;
}

export interface Combatant {
  id: string;
  name: string;
  stats: CombatStats;
  weapon?: Weapon;
  isPlayer: boolean;
}

export interface CombatAction {
  attackerId: string;
  targetId: string;
  type: 'attack' | 'defend' | 'skill';
  damage?: number;
  roll?: number;
  variance?: number;
}

export interface CombatLogEntry {
  turn: number;
  timestamp: Date;
  action: CombatAction;
  description: string;
  remainingHealth: { [combatantId: string]: number };
}

export interface CombatResult {
  winner: string;
  loser: string;
  turns: number;
  logs: CombatLogEntry[];
  rewards: CombatRewards;
}

export interface CombatRewards {
  experience: number;
  gold: number;
  items?: string[];
}

export interface EnemyTemplate {
  id: string;
  name: string;
  stats: CombatStats;
  weapon?: Weapon;
  rewards: CombatRewards;
}

export interface CombatSimulationRequest {
  playerId: string;
  playerStats: CombatStats;
  playerWeapon: Weapon;
  enemyTemplateId: string;
  seed?: number; // For deterministic RNG
}

export interface CombatSimulationResponse {
  result: CombatResult;
  updatedPlayerStats: CombatStats;
}
