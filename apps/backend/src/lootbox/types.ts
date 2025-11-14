export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface RarityWeights {
  common: number;
  uncommon: number;
  rare: number;
  epic: number;
  legendary: number;
}

export interface LootboxItem {
  itemId: string;
  name: string;
  rarity: ItemRarity;
  quantity: number;
}

export interface LootboxOpenResult {
  item: LootboxItem;
  rarity: ItemRarity;
  isPityDrop: boolean;
  pityCounterReset: boolean;
  animationDuration: number;
}

export interface LootboxProbabilities {
  common: number;
  uncommon: number;
  rare: number;
  epic: number;
  legendary: number;
}
