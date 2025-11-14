// Re-exported Prisma types from @prisma/client
export * from '@prisma/client';

// Enum type definitions for TypeScript (matching Prisma schema)
export enum ItemType {
  WEAPON = 'WEAPON',
  ARMOR = 'ARMOR',
  ACCESSORY = 'ACCESSORY',
  CONSUMABLE = 'CONSUMABLE',
  MATERIAL = 'MATERIAL',
}

export enum ItemRarity {
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

// Legacy enums from old schema (kept for backward compatibility)
export enum ProfessionType {
  FISHING = 'FISHING',
  COOKING = 'COOKING',
  CRAFTING = 'CRAFTING',
  SMITHING = 'SMITHING',
  ALCHEMY = 'ALCHEMY',
}

export enum MobType {
  COMMON = 'COMMON',
  ELITE = 'ELITE',
  BOSS = 'BOSS',
}

export enum QuestStatus {
  AVAILABLE = 'AVAILABLE',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  ABANDONED = 'ABANDONED',
}

export enum QuestRewardType {
  EXPERIENCE = 'EXPERIENCE',
  ITEM = 'ITEM',
  CURRENCY = 'CURRENCY',
}

export enum DungeonDifficulty {
  EASY = 'EASY',
  NORMAL = 'NORMAL',
  HARD = 'HARD',
  NIGHTMARE = 'NIGHTMARE',
}
