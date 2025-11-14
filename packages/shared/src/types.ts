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

export type ProfessionType =
  | 'worker'
  | 'crafter'
  | 'enchanter'
  | 'merchant'
  | 'lootboxer';

export const PROFESSIONS: ProfessionType[] = [
  'worker',
  'crafter',
  'enchanter',
  'merchant',
  'lootboxer',
];

export interface ProfessionLevel {
  profession: ProfessionType;
  level: number;
  currentXp: number;
  totalXpEarned: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlayerProfessions {
  playerId: string;
  professions: Record<ProfessionType, ProfessionLevel>;
  createdAt: Date;
  updatedAt: Date;
}

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface InventoryItem {
  itemId: string;
  name: string;
  rarity: ItemRarity;
  value: number;
  quantity: number;
  professionAffinity?: ProfessionType;
}

export interface PlayerInventory {
  playerId: string;
  coins: number;
  gems: number;
  items: InventoryItem[];
  lastTransactionAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShopItem {
  itemId: string;
  name: string;
  rarity: ItemRarity;
  price: number;
  priceType: 'coins' | 'gems';
  stock: number;
  professionAffinity?: ProfessionType;
  description?: string;
}

export interface ShopInventory {
  items: ShopItem[];
  updatedAt: Date;
}

// Prisma Schema Enums (matching apps/backend/prisma/schema.prisma)
export enum ItemType {
  WEAPON = 'WEAPON',
  ARMOR = 'ARMOR',
  ACCESSORY = 'ACCESSORY',
  CONSUMABLE = 'CONSUMABLE',
  MATERIAL = 'MATERIAL',
}

export enum ItemRarityEnum {
  COMMON = 'COMMON',
  UNCOMMON = 'UNCOMMON',
  RARE = 'RARE',
  EPIC = 'EPIC',
  LEGENDARY = 'LEGENDARY',
}

export enum Area {
  GREENWOOD = 'GREENWOOD',
  ASHEN_WASTE = 'ASHEN_WASTE',
  CRYSTAL_DEPTHS = 'CRYSTAL_DEPTHS',
  STORM_PEAKS = 'STORM_PEAKS',
  VOID_RIFT = 'VOID_RIFT',
}

export enum Profession {
  WORKER = 'WORKER',
  CRAFTER = 'CRAFTER',
  ENCHANTER = 'ENCHANTER',
  MERCHANT = 'MERCHANT',
  LOOTBOXER = 'LOOTBOXER',
}

export enum EventType {
  WORLD_BOSS = 'WORLD_BOSS',
  FESTIVAL = 'FESTIVAL',
  DOUBLE_LOOT = 'DOUBLE_LOOT',
  RIFT_INVASION = 'RIFT_INVASION',
  TRIALS = 'TRIALS',
}
