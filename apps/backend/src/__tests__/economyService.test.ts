import { describe, expect, it, beforeEach, vi } from '@jest/globals';
import { EconomyService } from '../economy/service';
import { InMemoryInventoryRepository } from '../storage/inventoryRepository';
import { ProfessionService } from '../professions/service';
import { InMemoryProfessionsRepository } from '../storage/professionsRepository';

const noopLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe('EconomyService', () => {
  let economyService: EconomyService;
  let professionService: ProfessionService;
  let clockNow: number;

  beforeEach(() => {
    clockNow = Date.UTC(2023, 0, 1, 0, 0, 0);
    const inventoryRepository = new InMemoryInventoryRepository();
    const professionsRepository = new InMemoryProfessionsRepository();

    professionService = new ProfessionService(
      professionsRepository,
      noopLogger,
      () => clockNow
    );

    economyService = new EconomyService(
      inventoryRepository,
      professionService,
      noopLogger,
      () => clockNow
    );
  });

  describe('inventory management', () => {
    it('creates new inventory for new player', async () => {
      const inventory = await economyService.getOrCreateInventory('player-1');

      expect(inventory.playerId).toBe('player-1');
      expect(inventory.coins).toBe(1000);
      expect(inventory.gems).toBe(50);
      expect(inventory.items).toHaveLength(0);
    });

    it('returns existing inventory for existing player', async () => {
      const inventory1 = await economyService.getOrCreateInventory('player-1');
      await economyService.addCurrency('player-1', 100, 10);
      const inventory2 = await economyService.getOrCreateInventory('player-1');

      expect(inventory2.coins).toBe(1100);
      expect(inventory2.gems).toBe(60);
    });
  });

  describe('shop items', () => {
    it('returns all shop items', () => {
      const items = economyService.getShopItems();

      expect(items.length).toBeGreaterThan(0);
      expect(items.some(item => item.itemId === 'sword-bronze')).toBe(true);
      expect(items.some(item => item.itemId === 'ore-copper')).toBe(true);
    });

    it('shop items have required properties', () => {
      const items = economyService.getShopItems();
      const item = items[0];

      expect(item.itemId).toBeDefined();
      expect(item.name).toBeDefined();
      expect(item.rarity).toBeDefined();
      expect(item.price).toBeGreaterThan(0);
      expect(item.priceType).toMatch(/coins|gems/);
      expect(item.stock).toBeGreaterThan(0);
    });
  });

  describe('buying items', () => {
    it('buys an item with coins', async () => {
      const inventory = await economyService.buyItem(
        'player-1',
        'sword-bronze',
        1
      );

      expect(inventory.coins).toBe(900);
      expect(inventory.items).toHaveLength(1);
      expect(inventory.items[0].itemId).toBe('sword-bronze');
      expect(inventory.items[0].quantity).toBe(1);
    });

    it('stacks items with same itemId', async () => {
      await economyService.buyItem('player-1', 'sword-bronze', 1);
      const inventory = await economyService.buyItem(
        'player-1',
        'sword-bronze',
        2
      );

      expect(inventory.items).toHaveLength(1);
      expect(inventory.items[0].quantity).toBe(3);
    });

    it('buys multiple quantities at once', async () => {
      const inventory = await economyService.buyItem(
        'player-1',
        'ore-copper',
        5
      );

      expect(inventory.coins).toBe(750);
      expect(inventory.items[0].quantity).toBe(5);
    });

    it('throws error for non-existent item', async () => {
      await expect(
        economyService.buyItem('player-1', 'non-existent', 1)
      ).rejects.toThrow('Shop item not found');
    });

    it('throws error for insufficient coins', async () => {
      await expect(
        economyService.buyItem('player-1', 'shield-iron', 10)
      ).rejects.toThrow('Insufficient coins');
    });

    it('throws error for insufficient stock', async () => {
      const items = economyService.getShopItems();
      const item = items.find(i => i.itemId === 'crystal-mana');
      const stock = item?.stock || 1;

      await expect(
        economyService.buyItem('player-1', 'crystal-mana', stock + 1)
      ).rejects.toThrow('Insufficient stock');
    });

    it('throws error for zero quantity', async () => {
      await expect(
        economyService.buyItem('player-1', 'sword-bronze', 0)
      ).rejects.toThrow('Quantity must be positive');
    });

    it('throws error for negative quantity', async () => {
      await expect(
        economyService.buyItem('player-1', 'sword-bronze', -1)
      ).rejects.toThrow('Quantity must be positive');
    });

    it('decreases shop stock', async () => {
      const shopBefore = economyService.getShopItems();
      const swordBefore = shopBefore.find(i => i.itemId === 'sword-bronze')!;
      const initialStock = swordBefore.stock;

      await economyService.buyItem('player-1', 'sword-bronze', 5);

      const shopAfter = economyService.getShopItems();
      const swordAfter = shopAfter.find(i => i.itemId === 'sword-bronze')!;

      expect(swordAfter.stock).toBe(initialStock - 5);
    });
  });

  describe('selling items', () => {
    it('sells an item for coins', async () => {
      await economyService.buyItem('player-1', 'sword-bronze', 1);
      const inventory = await economyService.sellItem(
        'player-1',
        'sword-bronze',
        1
      );

      expect(inventory.coins).toBe(900 + Math.floor(100 * 0.5));
      expect(inventory.items).toHaveLength(0);
    });

    it('applies sell ratio correctly', async () => {
      const buyPrice = 100;
      const sellRatio = 0.5;
      const expectedSellPrice = Math.floor(buyPrice * sellRatio);

      await economyService.buyItem('player-1', 'sword-bronze', 1);
      const inventory = await economyService.sellItem(
        'player-1',
        'sword-bronze',
        1
      );

      expect(inventory.coins).toBe(900 + expectedSellPrice);
    });

    it('applies merchant bonus to sell price', async () => {
      const repos1 = {
        inventory: new InMemoryInventoryRepository(),
        professions: new InMemoryProfessionsRepository(),
      };
      const profService1 = new ProfessionService(repos1.professions);
      const ecoService1 = new EconomyService(repos1.inventory, profService1);

      const repos2 = {
        inventory: new InMemoryInventoryRepository(),
        professions: new InMemoryProfessionsRepository(),
      };
      const profService2 = new ProfessionService(repos2.professions);
      const ecoService2 = new EconomyService(repos2.inventory, profService2);

      await profService1.gainProfessionXp('player-1', 'merchant', 1000);

      await ecoService1.buyItem('player-1', 'sword-bronze', 1);
      const inventoryWithBonus = await ecoService1.sellItem(
        'player-1',
        'sword-bronze',
        1
      );

      await ecoService2.buyItem('player-1', 'sword-bronze', 1);
      const inventoryNoBonus = await ecoService2.sellItem(
        'player-1',
        'sword-bronze',
        1
      );

      expect(inventoryWithBonus.coins).toBeGreaterThan(inventoryNoBonus.coins);
    });

    it('sells partial quantity', async () => {
      await economyService.buyItem('player-1', 'sword-bronze', 5);
      const inventory = await economyService.sellItem(
        'player-1',
        'sword-bronze',
        2
      );

      expect(inventory.items).toHaveLength(1);
      expect(inventory.items[0].quantity).toBe(3);
    });

    it('removes item from inventory when quantity reaches zero', async () => {
      await economyService.buyItem('player-1', 'sword-bronze', 1);
      const inventory = await economyService.sellItem(
        'player-1',
        'sword-bronze',
        1
      );

      expect(inventory.items).toHaveLength(0);
    });

    it('throws error for item not in inventory', async () => {
      await expect(
        economyService.sellItem('player-1', 'sword-bronze', 1)
      ).rejects.toThrow('Item not found in inventory');
    });

    it('throws error for insufficient quantity', async () => {
      await economyService.buyItem('player-1', 'sword-bronze', 2);

      await expect(
        economyService.sellItem('player-1', 'sword-bronze', 5)
      ).rejects.toThrow('Insufficient quantity');
    });

    it('throws error for zero quantity', async () => {
      await expect(
        economyService.sellItem('player-1', 'sword-bronze', 0)
      ).rejects.toThrow('Quantity must be positive');
    });

    it('throws error for negative quantity', async () => {
      await expect(
        economyService.sellItem('player-1', 'sword-bronze', -1)
      ).rejects.toThrow('Quantity must be positive');
    });

    it('increases shop stock', async () => {
      const shopBefore = economyService.getShopItems();
      const swordBefore = shopBefore.find(i => i.itemId === 'sword-bronze')!;
      const initialStock = swordBefore.stock;

      await economyService.buyItem('player-1', 'sword-bronze', 5);
      await economyService.sellItem('player-1', 'sword-bronze', 5);

      const shopAfter = economyService.getShopItems();
      const swordAfter = shopAfter.find(i => i.itemId === 'sword-bronze')!;

      expect(swordAfter.stock).toBe(initialStock);
    });
  });

  describe('currency management', () => {
    it('adds coins', async () => {
      const inventory = await economyService.addCurrency('player-1', 100, 0);

      expect(inventory.coins).toBe(1100);
      expect(inventory.gems).toBe(50);
    });

    it('adds gems', async () => {
      const inventory = await economyService.addCurrency('player-1', 0, 10);

      expect(inventory.coins).toBe(1000);
      expect(inventory.gems).toBe(60);
    });

    it('adds both coins and gems', async () => {
      const inventory = await economyService.addCurrency('player-1', 100, 10);

      expect(inventory.coins).toBe(1100);
      expect(inventory.gems).toBe(60);
    });

    it('removes coins', async () => {
      const inventory = await economyService.removeCurrency('player-1', 100, 0);

      expect(inventory.coins).toBe(900);
      expect(inventory.gems).toBe(50);
    });

    it('removes gems', async () => {
      const inventory = await economyService.removeCurrency('player-1', 0, 10);

      expect(inventory.coins).toBe(1000);
      expect(inventory.gems).toBe(40);
    });

    it('removes both coins and gems', async () => {
      const inventory = await economyService.removeCurrency(
        'player-1',
        100,
        10
      );

      expect(inventory.coins).toBe(900);
      expect(inventory.gems).toBe(40);
    });

    it('throws error for insufficient coins', async () => {
      await expect(
        economyService.removeCurrency('player-1', 2000, 0)
      ).rejects.toThrow('Insufficient coins');
    });

    it('throws error for insufficient gems', async () => {
      await expect(
        economyService.removeCurrency('player-1', 0, 100)
      ).rejects.toThrow('Insufficient gems');
    });

    it('throws error for negative currency amounts', async () => {
      await expect(
        economyService.addCurrency('player-1', -100, 0)
      ).rejects.toThrow('Currency amounts cannot be negative');
    });
  });

  describe('economy calculations', () => {
    it('calculates gathering yield with worker bonus', () => {
      const baseYield = 100;
      const workerLevel = 1;
      const yield1 = economyService.calculateGatheringYield(
        baseYield,
        workerLevel
      );
      expect(yield1).toBe(100);

      const yield5 = economyService.calculateGatheringYield(baseYield, 5);
      expect(yield5).toBe(Math.floor(100 * (1 + 0.05 * 4)));
    });

    it('calculates crafting success rate', () => {
      const success1 = economyService.calculateCraftingSuccess(1);
      expect(success1).toBe(0.7);

      const success5 = economyService.calculateCraftingSuccess(5);
      expect(success5).toBeCloseTo(0.7 + 0.03 * 4);
    });

    it('caps crafting success at 0.99', () => {
      const success = economyService.calculateCraftingSuccess(50);
      expect(success).toBe(0.99);
    });

    it('calculates enchanting bonus', () => {
      const bonus1 = economyService.calculateEnchantingBonus(1);
      expect(bonus1).toBe(1);

      const bonus10 = economyService.calculateEnchantingBonus(10);
      expect(bonus10).toBeCloseTo(1 + 0.02 * 9);
    });
  });

  describe('transactional safety', () => {
    it('persists transactions correctly', async () => {
      const repo = new InMemoryInventoryRepository();
      const service = new EconomyService(
        repo,
        professionService,
        noopLogger,
        () => clockNow
      );

      await service.buyItem('player-1', 'sword-bronze', 1);
      const inv1 = await repo.get('player-1');
      expect(inv1?.coins).toBe(900);

      await service.addCurrency('player-1', 100, 0);
      const inv2 = await repo.get('player-1');
      expect(inv2?.coins).toBe(1000);
    });

    it('updates lastTransactionAt on each transaction', async () => {
      const inventoryRepository = new InMemoryInventoryRepository();
      const professionsRepository = new InMemoryProfessionsRepository();
      let clock = Date.UTC(2023, 0, 1, 0, 0, 0);

      const profService = new ProfessionService(
        professionsRepository,
        noopLogger,
        () => clock
      );
      const service = new EconomyService(
        inventoryRepository,
        profService,
        noopLogger,
        () => clock
      );

      const inv1 = await service.getOrCreateInventory('player-1');
      expect(inv1.lastTransactionAt).toBeUndefined();

      await service.buyItem('player-1', 'sword-bronze', 1);
      const inv2Stored = await inventoryRepository.get('player-1');
      const transaction1Time = inv2Stored?.lastTransactionAt?.getTime() || 0;
      expect(transaction1Time).toBeGreaterThan(0);

      clock += 1000;
      await service.addCurrency('player-1', 100, 0);
      const inv3Stored = await inventoryRepository.get('player-1');
      const transaction2Time = inv3Stored?.lastTransactionAt?.getTime() || 0;

      expect(transaction2Time).toBeGreaterThan(transaction1Time);
    });
  });
});
