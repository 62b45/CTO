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

export interface CombatStats {
  health: number;
  maxHealth: number;
  attack: number;
  defense: number;
  speed: number;
}

export interface Weapon {
  id: string;
  name: string;
  baseDamage: number;
  multiplier: number;
}

export type CombatActionType = 'attack' | 'defend' | 'skill';

export interface CombatAction {
  attackerId: string;
  targetId: string;
  type: CombatActionType;
  damage?: number;
  roll?: number;
  variance?: number;
}

export interface CombatLogEntry {
  turn: number;
  timestamp: Date;
  action: CombatAction;
  description: string;
  remainingHealth: Record<string, number>;
}

export interface CombatRewards {
  experience: number;
  gold: number;
  items?: string[];
}

export interface Combatant {
  id: string;
  name: string;
  stats: CombatStats;
  weapon?: Weapon;
  isPlayer?: boolean;
}

export interface CombatResult {
  winner: string;
  loser: string;
  turns: number;
  logs: CombatLogEntry[];
  rewards: CombatRewards;
}

export interface CombatSimulationRequest {
  playerId: string;
  playerStats: CombatStats;
  playerWeapon: Weapon;
  enemyTemplateId: string;
  seed?: number;
}

export interface CombatSimulationResponse {
  result: CombatResult;
  updatedPlayerStats: CombatStats;
}

export interface EnemyTemplate {
  id: string;
  name: string;
  stats: CombatStats;
  weapon?: Weapon;
  rewards: CombatRewards;
}

export interface DungeonUnlockRequirements {
  minLevel?: number;
  prerequisites?: string[];
}

export interface DungeonReward {
  experience: number;
  gold: number;
  items?: string[];
}

export interface DungeonEnemy {
  id: string;
  name: string;
  stats: CombatStats;
  weapon?: Weapon;
}

export interface DungeonBossPhase {
  phase: number;
  description?: string;
  enemy: DungeonEnemy;
  rewards?: DungeonReward;
  drops?: string[];
}

export interface DungeonBossDefinition {
  id: string;
  name: string;
  phases: DungeonBossPhase[];
  rewards: DungeonReward;
  drops?: string[];
}

export interface DungeonFloor {
  floor: number;
  name: string;
  description?: string;
  type: 'combat' | 'boss';
  enemy?: DungeonEnemy;
  boss?: DungeonBossDefinition;
  rewards: DungeonReward;
  unlockRequirements?: DungeonUnlockRequirements;
}

export interface DungeonDefinition {
  id: string;
  name: string;
  area: Area;
  unlockRequirements: DungeonUnlockRequirements;
  floors: DungeonFloor[];
}

export interface DungeonRunRewardSummary {
  experience: number;
  gold: number;
  items: string[];
}

export interface DungeonRunState {
  dungeonId: string;
  status: 'in_progress' | 'completed';
  currentFloor: number;
  currentBossPhase?: number | null;
  floorsCleared: number[];
  accumulatedRewards: DungeonRunRewardSummary;
  startedAt: Date;
  updatedAt: Date;
  lastOutcome?: 'win' | 'loss';
}

export interface DungeonProgress {
  dungeonId: string;
  highestFloorReached: number;
  timesCompleted: number;
  lastCompletedAt?: Date;
  lastResetAt?: Date;
  activeRun?: DungeonRunState | null;
}

export interface PlayerDungeonState {
  playerId: string;
  dungeons: Record<string, DungeonProgress>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ArenaOpponent {
  id: string;
  name: string;
  level: number;
  stats: CombatStats;
  weapon: Weapon;
  modifier: number;
  seed: number;
}

export interface ArenaMatchRecord {
  matchId: string;
  playerId: string;
  opponent: ArenaOpponent;
  outcome: 'win' | 'loss';
  turns: number;
  rewards: CombatRewards;
  timestamp: Date;
  logs: CombatLogEntry[];
}

export interface PlayerArenaState {
  playerId: string;
  rating: number;
  wins: number;
  losses: number;
  streak: number;
  bestStreak: number;
  history: ArenaMatchRecord[];
  createdAt: Date;
  updatedAt: Date;
}

export enum EquipmentSlot {
  WEAPON = 'WEAPON',
  ARMOR = 'ARMOR',
  ACCESSORY_1 = 'ACCESSORY_1',
  ACCESSORY_2 = 'ACCESSORY_2',
  ACCESSORY_3 = 'ACCESSORY_3',
}

export interface EquippedItem {
  slot: EquipmentSlot;
  itemId: string;
  name: string;
  durability?: number;
  maxDurability?: number;
  bonuses: Record<string, number>;
}

export interface PlayerEquipment {
  playerId: string;
  equipped: Record<EquipmentSlot, EquippedItem | null>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ItemDefinitionData {
  id: string;
  name: string;
  type: string;
  rarity: string;
  power: number;
  bonuses: Record<string, number>;
  durability?: number;
  level_req: number;
  buy_value: number;
  sell_value: number;
  drop_weight: number;
}

export interface CraftingRecipe {
  id: string;
  name: string;
  resultItemId: string;
  resultItemName: string;
  profession: ProfessionType;
  minLevel: number;
  materials: Array<{
    itemId: string;
    itemName: string;
    quantity: number;
  }>;
  baseSuccessChance: number;
  experience: number;
}

export interface CraftingResult {
  success: boolean;
  itemId: string;
  itemName: string;
  experienceGained: number;
  professionLevelUp?: number;
  message: string;
}
