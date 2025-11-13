// Re-exported Prisma types from @prisma/client
export * from '@prisma/client';

// Enum type definitions for TypeScript
export enum ProfessionType {
  FISHING = 'FISHING',
  COOKING = 'COOKING',
  CRAFTING = 'CRAFTING',
  SMITHING = 'SMITHING',
  ALCHEMY = 'ALCHEMY',
}

export enum ItemRarity {
  COMMON = 'COMMON',
  UNCOMMON = 'UNCOMMON',
  RARE = 'RARE',
  EPIC = 'EPIC',
  LEGENDARY = 'LEGENDARY',
}

export enum ItemType {
  WEAPON = 'WEAPON',
  ARMOR = 'ARMOR',
  CONSUMABLE = 'CONSUMABLE',
  QUEST_ITEM = 'QUEST_ITEM',
  INGREDIENT = 'INGREDIENT',
  LOOT = 'LOOT',
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
