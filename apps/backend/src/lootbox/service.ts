import type { ProfessionService } from '../professions/service';
import type { EconomyService } from '../economy/service';
import type { LootboxOpenResult, RarityWeights, ItemRarity, LootboxProbabilities } from './types';

type Logger = Pick<Console, 'info' | 'warn' | 'error'>;

export interface LootboxConfig {
  baseWeights?: RarityWeights;
  pityThreshold?: number;
}

// Default weighted rarities: 70% common, 20% uncommon, 8% rare, 1.5% epic, 0.5% legendary
const DEFAULT_WEIGHTS: RarityWeights = {
  common: 70,
  uncommon: 20,
  rare: 8,
  epic: 1.5,
  legendary: 0.5,
};

const PITY_THRESHOLD = 40;

// Store pity counters in memory (playerId -> counter)
const pityCounters = new Map<string, number>();

export class LootboxService {
  private readonly baseWeights: RarityWeights;
  private readonly pityThreshold: number;

  constructor(
    private readonly professionService: ProfessionService,
    private readonly economyService: EconomyService,
    private readonly logger: Logger = console,
    private readonly clock: () => number = () => Date.now(),
    config: LootboxConfig = {}
  ) {
    this.baseWeights = config.baseWeights ?? DEFAULT_WEIGHTS;
    this.pityThreshold = config.pityThreshold ?? PITY_THRESHOLD;
  }

  /**
   * Get the current weighted rarities for a player
   * Applies lootboxer profession bonuses
   */
  async getPlayerWeights(playerId: string): Promise<RarityWeights> {
    try {
      const professions = await this.professionService.getOrCreateProfessions(playerId);
      const lootboxerLevel = professions.professions.lootboxer.level;

      // Lootboxer bonus: increases rare+ drop rates
      // Level 1: 1x (no bonus)
      // Level 2: 1.06x bonus to rare+ (base + 6%)
      const lootboxerBonus = 1 + (lootboxerLevel - 1) * 0.06;

      // Apply bonus to rare, epic, and legendary drops
      const weights: RarityWeights = {
        common: this.baseWeights.common,
        uncommon: this.baseWeights.uncommon,
        rare: this.baseWeights.rare * lootboxerBonus,
        epic: this.baseWeights.epic * lootboxerBonus,
        legendary: this.baseWeights.legendary * lootboxerBonus,
      };

      return weights;
    } catch (error) {
      this.logger.warn(
        `Failed to get professions for player ${playerId}, using base weights`,
        error
      );
      return { ...this.baseWeights };
    }
  }

  /**
   * Get probabilities (normalized percentages) for a player
   */
  async getProbabilities(playerId: string): Promise<LootboxProbabilities> {
    const weights = await this.getPlayerWeights(playerId);
    const total = Object.values(weights).reduce((a, b) => a + b, 0);

    return {
      common: (weights.common / total) * 100,
      uncommon: (weights.uncommon / total) * 100,
      rare: (weights.rare / total) * 100,
      epic: (weights.epic / total) * 100,
      legendary: (weights.legendary / total) * 100,
    };
  }

  /**
   * Increment pity counter for a player
   */
  private incrementPityCounter(playerId: string): number {
    const current = pityCounters.get(playerId) ?? 0;
    const updated = current + 1;
    pityCounters.set(playerId, updated);
    return updated;
  }

  /**
   * Get current pity counter for a player
   */
  getPityCounter(playerId: string): number {
    return pityCounters.get(playerId) ?? 0;
  }

  /**
   * Reset pity counter for a player
   */
  private resetPityCounter(playerId: string): void {
    pityCounters.delete(playerId);
  }

  /**
   * Select a rarity based on weighted distribution
   * Applies pity guarantee at threshold
   */
  private selectRarity(weights: RarityWeights, pityCounter: number): ItemRarity {
    // Pity guarantee: at threshold, guarantee rare or better
    if (pityCounter >= this.pityThreshold) {
      const rand = Math.random() * 100;
      const total = weights.rare + weights.epic + weights.legendary;
      const rareChance = (weights.rare / total) * 100;
      const epicChance = rareChance + (weights.epic / total) * 100;

      if (rand < rareChance) return 'rare';
      if (rand < epicChance) return 'epic';
      return 'legendary';
    }

    // Normal distribution
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    let rand = Math.random() * total;

    if (rand < weights.common) return 'common';
    rand -= weights.common;

    if (rand < weights.uncommon) return 'uncommon';
    rand -= weights.uncommon;

    if (rand < weights.rare) return 'rare';
    rand -= weights.rare;

    if (rand < weights.epic) return 'epic';

    return 'legendary';
  }

  /**
   * Get a mock item for demonstration
   * In a real system, this would query from a database
   */
  private getMockItem(rarity: ItemRarity): { itemId: string; name: string; quantity: number } {
    const items: Record<ItemRarity, { itemId: string; name: string; quantity: number }[]> = {
      common: [
        { itemId: 'copper-ore', name: 'Copper Ore', quantity: 10 },
        { itemId: 'iron-ore', name: 'Iron Ore', quantity: 5 },
        { itemId: 'bronze-ingot', name: 'Bronze Ingot', quantity: 3 },
      ],
      uncommon: [
        { itemId: 'steel-ingot', name: 'Steel Ingot', quantity: 2 },
        { itemId: 'mithril-ore', name: 'Mithril Ore', quantity: 4 },
        { itemId: 'emerald-dust', name: 'Emerald Dust', quantity: 5 },
      ],
      rare: [
        { itemId: 'mithril-ingot', name: 'Mithril Ingot', quantity: 2 },
        { itemId: 'sapphire-fragment', name: 'Sapphire Fragment', quantity: 3 },
        { itemId: 'dragon-scale', name: 'Dragon Scale', quantity: 1 },
      ],
      epic: [
        { itemId: 'adamantite-ingot', name: 'Adamantite Ingot', quantity: 1 },
        { itemId: 'ruby-gem', name: 'Ruby Gem', quantity: 2 },
        { itemId: 'phoenix-feather', name: 'Phoenix Feather', quantity: 1 },
      ],
      legendary: [
        { itemId: 'celestial-crystal', name: 'Celestial Crystal', quantity: 1 },
        { itemId: 'gods-tear', name: "God's Tear", quantity: 1 },
        { itemId: 'primordial-essence', name: 'Primordial Essence', quantity: 1 },
      ],
    };

    const rarityItems = items[rarity];
    if (!rarityItems || rarityItems.length === 0) {
      return { itemId: 'unknown-item', name: 'Unknown Item', quantity: 1 };
    }
    const selectedItem = rarityItems[Math.floor(Math.random() * rarityItems.length)];
    return selectedItem || { itemId: 'unknown-item', name: 'Unknown Item', quantity: 1 };
  }

  /**
   * Open a lootbox for a player
   */
  async openLootbox(
    playerId: string,
    lootboxId: string,
    cost: number
  ): Promise<LootboxOpenResult> {
    // Check if player has enough currency
    const inventory = await this.economyService.getOrCreateInventory(playerId);
    if (inventory.coins < cost) {
      throw new Error(
        `Insufficient coins. Have: ${inventory.coins}, Need: ${cost}`
      );
    }

    // Deduct cost
    await this.economyService.removeCurrency(playerId, cost, 0);

    // Get player's weights and current pity counter
    const weights = await this.getPlayerWeights(playerId);
    const pityCounter = this.getPityCounter(playerId);

    // Select rarity
    const rarity = this.selectRarity(weights, pityCounter);

    // Check if this is a pity drop and should reset counter
    const isPityDrop = pityCounter >= this.pityThreshold;
    if (rarity === 'rare' || rarity === 'epic' || rarity === 'legendary') {
      if (isPityDrop) {
        this.resetPityCounter(playerId);
      } else {
        this.resetPityCounter(playerId);
      }
    } else {
      // Increment pity counter for non-rare drops
      this.incrementPityCounter(playerId);
    }

    // Get mock item
    const mockItem = this.getMockItem(rarity);

    const result: LootboxOpenResult = {
      item: {
        itemId: mockItem.itemId,
        name: mockItem.name,
        rarity,
        quantity: mockItem.quantity,
      },
      rarity,
      isPityDrop,
      pityCounterReset: isPityDrop || rarity !== 'common' && rarity !== 'uncommon',
      animationDuration: 1500 + (rarity === 'legendary' ? 1000 : rarity === 'epic' ? 500 : 0),
    };

    this.logger.info(
      `Player ${playerId} opened lootbox ${lootboxId}: got ${rarity} ${mockItem.name} (pity: ${pityCounter})`
    );

    return result;
  }

  /**
   * Clear pity counter (for testing purposes)
   */
  clearPityCounter(playerId: string): void {
    this.resetPityCounter(playerId);
  }

  /**
   * Clear all pity counters (for testing purposes)
   */
  clearAllPityCounters(): void {
    pityCounters.clear();
  }
}
