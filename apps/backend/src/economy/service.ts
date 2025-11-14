import type {
  PlayerInventory,
  InventoryItem,
  ShopItem,
  ProfessionType,
} from '../../shared/src/types';
import type { InventoryRepository } from '../storage/inventoryRepository';
import type { ProfessionService } from '../professions/service';

type Logger = Pick<Console, 'info' | 'warn' | 'error'>;

export interface EconomyConfig {
  sellRatio?: number;
  merchantModifier?: number;
}

export class EconomyService {
  private readonly sellRatio: number;
  private readonly merchantModifier: number;
  private shopItems: ShopItem[] = [];

  constructor(
    private readonly repository: InventoryRepository,
    private readonly professionService: ProfessionService,
    private readonly logger: Logger = console,
    private readonly clock: () => number = () => Date.now(),
    config: EconomyConfig = {}
  ) {
    this.sellRatio = config.sellRatio ?? 0.5;
    this.merchantModifier = config.merchantModifier ?? 0.1;
    this.initializeShop();
  }

  private initializeShop(): void {
    this.shopItems = [
      {
        itemId: 'sword-bronze',
        name: 'Bronze Sword',
        rarity: 'common',
        price: 100,
        priceType: 'coins',
        stock: 50,
        description: 'A basic bronze sword',
      },
      {
        itemId: 'shield-iron',
        name: 'Iron Shield',
        rarity: 'uncommon',
        price: 250,
        priceType: 'coins',
        stock: 30,
        description: 'A sturdy iron shield',
      },
      {
        itemId: 'ore-copper',
        name: 'Copper Ore',
        rarity: 'common',
        price: 50,
        priceType: 'coins',
        stock: 100,
        professionAffinity: 'worker',
        description: 'Raw copper ore for crafting',
      },
      {
        itemId: 'ore-iron',
        name: 'Iron Ore',
        rarity: 'uncommon',
        price: 150,
        priceType: 'coins',
        stock: 50,
        professionAffinity: 'worker',
        description: 'Raw iron ore for crafting',
      },
      {
        itemId: 'scroll-magic',
        name: 'Magic Scroll',
        rarity: 'rare',
        price: 500,
        priceType: 'coins',
        stock: 10,
        professionAffinity: 'enchanter',
        description: 'An enchanted scroll',
      },
      {
        itemId: 'crystal-mana',
        name: 'Mana Crystal',
        rarity: 'epic',
        price: 1000,
        priceType: 'gems',
        stock: 5,
        professionAffinity: 'enchanter',
        description: 'A powerful mana crystal',
      },
    ];
  }

  async getOrCreateInventory(playerId: string): Promise<PlayerInventory> {
    let inventory = await this.repository.get(playerId);
    if (!inventory) {
      inventory = this.createNewInventory(playerId);
      await this.repository.set(playerId, inventory);
    }
    return inventory;
  }

  private createNewInventory(playerId: string): PlayerInventory {
    const now = new Date(this.clock());
    return {
      playerId,
      coins: 1000,
      gems: 50,
      items: [],
      createdAt: now,
      updatedAt: now,
    };
  }

  getShopItems(): ShopItem[] {
    return [...this.shopItems];
  }

  async buyItem(
    playerId: string,
    itemId: string,
    quantity: number
  ): Promise<PlayerInventory> {
    if (quantity <= 0) {
      throw new Error('Quantity must be positive');
    }

    const shopItem = this.shopItems.find(item => item.itemId === itemId);
    if (!shopItem) {
      throw new Error(`Shop item not found: ${itemId}`);
    }

    if (shopItem.stock < quantity) {
      throw new Error(
        `Insufficient stock. Available: ${shopItem.stock}, Requested: ${quantity}`
      );
    }

    const inventory = await this.getOrCreateInventory(playerId);

    const totalCost = shopItem.price * quantity;

    if (shopItem.priceType === 'coins') {
      if (inventory.coins < totalCost) {
        throw new Error(
          `Insufficient coins. Have: ${inventory.coins}, Need: ${totalCost}`
        );
      }
      inventory.coins -= totalCost;
    } else if (shopItem.priceType === 'gems') {
      if (inventory.gems < totalCost) {
        throw new Error(
          `Insufficient gems. Have: ${inventory.gems}, Need: ${totalCost}`
        );
      }
      inventory.gems -= totalCost;
    }

    const existingItem = inventory.items.find(item => item.itemId === itemId);
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      inventory.items.push({
        itemId: shopItem.itemId,
        name: shopItem.name,
        rarity: shopItem.rarity,
        value: shopItem.price,
        quantity,
        professionAffinity: shopItem.professionAffinity,
      });
    }

    shopItem.stock -= quantity;
    inventory.lastTransactionAt = new Date(this.clock());
    inventory.updatedAt = new Date(this.clock());

    await this.repository.set(playerId, inventory);
    this.logger.info(
      `Player ${playerId} bought ${quantity}x ${itemId} for ${totalCost} ${shopItem.priceType}`
    );

    return inventory;
  }

  async sellItem(
    playerId: string,
    itemId: string,
    quantity: number
  ): Promise<PlayerInventory> {
    if (quantity <= 0) {
      throw new Error('Quantity must be positive');
    }

    const inventory = await this.getOrCreateInventory(playerId);
    const inventoryItem = inventory.items.find(item => item.itemId === itemId);

    if (!inventoryItem) {
      throw new Error(`Item not found in inventory: ${itemId}`);
    }

    if (inventoryItem.quantity < quantity) {
      throw new Error(
        `Insufficient quantity. Have: ${inventoryItem.quantity}, Requested: ${quantity}`
      );
    }

    const professions =
      await this.professionService.getOrCreateProfessions(playerId);
    const merchantBonus =
      professions.professions.merchant.level > 1
        ? 1 +
          (professions.professions.merchant.level - 1) * this.merchantModifier
        : 1;

    const saleValue = Math.floor(
      inventoryItem.value * quantity * this.sellRatio * merchantBonus
    );
    inventory.coins += saleValue;

    inventoryItem.quantity -= quantity;
    if (inventoryItem.quantity === 0) {
      inventory.items = inventory.items.filter(item => item.itemId !== itemId);
    }

    const shopItem = this.shopItems.find(item => item.itemId === itemId);
    if (shopItem) {
      shopItem.stock += quantity;
    }

    inventory.lastTransactionAt = new Date(this.clock());
    inventory.updatedAt = new Date(this.clock());

    await this.repository.set(playerId, inventory);
    this.logger.info(
      `Player ${playerId} sold ${quantity}x ${itemId} for ${saleValue} coins`
    );

    return inventory;
  }

  async addCurrency(
    playerId: string,
    coinsAmount: number,
    gemsAmount: number = 0
  ): Promise<PlayerInventory> {
    const inventory = await this.getOrCreateInventory(playerId);

    if (coinsAmount < 0 || gemsAmount < 0) {
      throw new Error('Currency amounts cannot be negative');
    }

    if (coinsAmount > 0) {
      inventory.coins += coinsAmount;
    }
    if (gemsAmount > 0) {
      inventory.gems += gemsAmount;
    }

    inventory.lastTransactionAt = new Date(this.clock());
    inventory.updatedAt = new Date(this.clock());

    await this.repository.set(playerId, inventory);
    this.logger.info(
      `Player ${playerId} gained ${coinsAmount} coins and ${gemsAmount} gems`
    );

    return inventory;
  }

  async removeCurrency(
    playerId: string,
    coinsAmount: number,
    gemsAmount: number = 0
  ): Promise<PlayerInventory> {
    const inventory = await this.getOrCreateInventory(playerId);

    if (coinsAmount > inventory.coins) {
      throw new Error(
        `Insufficient coins. Have: ${inventory.coins}, Need: ${coinsAmount}`
      );
    }

    if (gemsAmount > inventory.gems) {
      throw new Error(
        `Insufficient gems. Have: ${inventory.gems}, Need: ${gemsAmount}`
      );
    }

    if (coinsAmount < 0 || gemsAmount < 0) {
      throw new Error('Currency amounts cannot be negative');
    }

    inventory.coins -= coinsAmount;
    inventory.gems -= gemsAmount;

    inventory.lastTransactionAt = new Date(this.clock());
    inventory.updatedAt = new Date(this.clock());

    await this.repository.set(playerId, inventory);
    this.logger.info(
      `Player ${playerId} lost ${coinsAmount} coins and ${gemsAmount} gems`
    );

    return inventory;
  }

  calculateGatheringYield(baseYield: number, workerLevel: number): number {
    const bonus = 1 + (workerLevel - 1) * 0.05;
    return Math.floor(baseYield * bonus);
  }

  calculateCraftingSuccess(crafterLevel: number): number {
    const baseSuccess = 0.7;
    const bonus = (crafterLevel - 1) * 0.03;
    return Math.min(0.99, baseSuccess + bonus);
  }

  calculateEnchantingBonus(enchanterLevel: number): number {
    return 1 + (enchanterLevel - 1) * 0.02;
  }

  async updateInventory(
    playerId: string,
    inventory: PlayerInventory
  ): Promise<void> {
    inventory.updatedAt = new Date(this.clock());
    await this.repository.set(playerId, inventory);
  }
}
