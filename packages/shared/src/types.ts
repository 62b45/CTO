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

export interface PlayerStats {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

export interface DerivedStats {
  health: number;
  mana: number;
  attackPower: number;
  defensePower: number;
}

export interface PlayerProgression {
  playerId: string;
  level: number;
  currentXp: number;
  totalXpEarned: number;
  baseStats: PlayerStats;
  derivedStats: DerivedStats;
  recentLevelGains: number[];
  createdAt: Date;
  updatedAt: Date;
}
