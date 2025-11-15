import request from 'supertest';
import { describe, expect, it, beforeEach, vi, afterEach } from '@jest/globals';
import type { Express } from 'express';
import { createApp } from '../http/app';
import { ActionCooldownService } from '../cooldowns/service';
import { ProfessionService } from '../professions/service';
import { EconomyService } from '../economy/service';
import { InMemoryCooldownRepository } from '../storage/inMemoryCooldownRepository';
import { InMemoryProfessionsRepository } from '../storage/professionsRepository';
import { InMemoryInventoryRepository } from '../storage/inventoryRepository';

const noopLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe('Economy API endpoints', () => {
  let app: Express;
  let professionService: ProfessionService;
  let economyService: EconomyService;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(Date.UTC(2023, 0, 1, 0, 0, 0)));

    const cooldownRepository = new InMemoryCooldownRepository();
    const professionsRepository = new InMemoryProfessionsRepository();
    const inventoryRepository = new InMemoryInventoryRepository();

    const cooldownService = new ActionCooldownService(
      cooldownRepository,
      noopLogger,
      () => Date.now()
    );

    professionService = new ProfessionService(
      professionsRepository,
      noopLogger,
      () => Date.now()
    );

    economyService = new EconomyService(
      inventoryRepository,
      professionService,
      noopLogger,
      () => Date.now()
    );

    app = createApp({
      service: cooldownService,
      professionService,
      economyService,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('GET /shop/items', () => {
    it('returns all shop items', async () => {
      const response = await request(app).get('/shop/items');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toBeInstanceOf(Array);
      expect(response.body.data.items.length).toBeGreaterThan(0);
      expect(response.body.data.updatedAt).toBeDefined();
    });

    it('includes required item fields', async () => {
      const response = await request(app).get('/shop/items');
      const item = response.body.data.items[0];

      expect(item.itemId).toBeDefined();
      expect(item.name).toBeDefined();
      expect(item.rarity).toBeDefined();
      expect(item.price).toBeDefined();
      expect(item.priceType).toBeDefined();
      expect(item.stock).toBeDefined();
    });
  });

  describe('GET /players/:playerId/inventory', () => {
    it('returns inventory for new player', async () => {
      const response = await request(app).get('/players/player-1/inventory');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.playerId).toBe('player-1');
      expect(response.body.data.inventory.coins).toBe(1000);
      expect(response.body.data.inventory.gems).toBe(50);
      expect(response.body.data.inventory.items).toEqual([]);
    });

    it('returns updated inventory after transactions', async () => {
      await request(app)
        .post('/players/player-1/shop/buy')
        .send({ itemId: 'sword-bronze', quantity: 1 });

      const response = await request(app).get('/players/player-1/inventory');

      expect(response.body.success).toBe(true);
      expect(response.body.data.inventory.coins).toBe(900);
      expect(response.body.data.inventory.items).toHaveLength(1);
    });
  });

  describe('POST /players/:playerId/shop/buy', () => {
    it('buys an item successfully', async () => {
      const response = await request(app)
        .post('/players/player-1/shop/buy')
        .send({ itemId: 'sword-bronze', quantity: 1 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.inventory.coins).toBe(900);
      expect(response.body.data.inventory.items).toHaveLength(1);
      expect(response.body.data.inventory.items[0].itemId).toBe('sword-bronze');
    });

    it('buys multiple quantities', async () => {
      const response = await request(app)
        .post('/players/player-1/shop/buy')
        .send({ itemId: 'ore-copper', quantity: 5 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.inventory.items[0].quantity).toBe(5);
      expect(response.body.data.inventory.coins).toBe(750);
    });

    it('stacks items with same ID', async () => {
      await request(app)
        .post('/players/player-1/shop/buy')
        .send({ itemId: 'sword-bronze', quantity: 2 });

      const response = await request(app)
        .post('/players/player-1/shop/buy')
        .send({ itemId: 'sword-bronze', quantity: 3 });

      expect(response.body.success).toBe(true);
      expect(response.body.data.inventory.items).toHaveLength(1);
      expect(response.body.data.inventory.items[0].quantity).toBe(5);
    });

    it('returns error for non-existent item', async () => {
      const response = await request(app)
        .post('/players/player-1/shop/buy')
        .send({ itemId: 'non-existent', quantity: 1 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('returns error for insufficient funds', async () => {
      const response = await request(app)
        .post('/players/player-1/shop/buy')
        .send({ itemId: 'crystal-mana', quantity: 100 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Insufficient');
    });

    it('returns error for insufficient stock', async () => {
      const response = await request(app)
        .post('/players/player-1/shop/buy')
        .send({ itemId: 'sword-bronze', quantity: 1000 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Insufficient stock');
    });

    it('returns error for invalid quantity', async () => {
      const response = await request(app)
        .post('/players/player-1/shop/buy')
        .send({ itemId: 'sword-bronze', quantity: 0 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('positive quantity');
    });

    it('returns error for missing itemId', async () => {
      const response = await request(app)
        .post('/players/player-1/shop/buy')
        .send({ quantity: 1 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('returns error for missing quantity', async () => {
      const response = await request(app)
        .post('/players/player-1/shop/buy')
        .send({ itemId: 'sword-bronze' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /players/:playerId/shop/sell', () => {
    beforeEach(async () => {
      await request(app)
        .post('/players/player-1/shop/buy')
        .send({ itemId: 'sword-bronze', quantity: 5 });
    });

    it('sells an item successfully', async () => {
      const response = await request(app)
        .post('/players/player-1/shop/sell')
        .send({ itemId: 'sword-bronze', quantity: 1 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.inventory.coins).toBe(550);
      expect(response.body.data.inventory.items).toHaveLength(1);
      expect(response.body.data.inventory.items[0].quantity).toBe(4);
    });

    it('removes item when all quantities are sold', async () => {
      const response = await request(app)
        .post('/players/player-1/shop/sell')
        .send({ itemId: 'sword-bronze', quantity: 5 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.inventory.items).toHaveLength(0);
    });

    it('applies sell ratio correctly', async () => {
      const inventoryBefore = await request(app).get(
        '/players/player-1/inventory'
      );
      const coinsBefore = inventoryBefore.body.data.inventory.coins;

      await request(app)
        .post('/players/player-1/shop/sell')
        .send({ itemId: 'sword-bronze', quantity: 1 });

      const inventoryAfter = await request(app).get(
        '/players/player-1/inventory'
      );
      const coinsAfter = inventoryAfter.body.data.inventory.coins;

      expect(coinsAfter).toBe(coinsBefore + Math.floor(100 * 0.5));
    });

    it('returns error for item not in inventory', async () => {
      const response = await request(app)
        .post('/players/player-1/shop/sell')
        .send({ itemId: 'non-existent', quantity: 1 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('returns error for insufficient quantity', async () => {
      const response = await request(app)
        .post('/players/player-1/shop/sell')
        .send({ itemId: 'sword-bronze', quantity: 100 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Insufficient quantity');
    });

    it('returns error for invalid quantity', async () => {
      const response = await request(app)
        .post('/players/player-1/shop/sell')
        .send({ itemId: 'sword-bronze', quantity: 0 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});

describe('Profession API endpoints', () => {
  let app: Express;
  let professionService: ProfessionService;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(Date.UTC(2023, 0, 1, 0, 0, 0)));

    const cooldownRepository = new InMemoryCooldownRepository();
    const professionsRepository = new InMemoryProfessionsRepository();

    const cooldownService = new ActionCooldownService(
      cooldownRepository,
      noopLogger,
      () => Date.now()
    );

    professionService = new ProfessionService(
      professionsRepository,
      noopLogger,
      () => Date.now()
    );

    app = createApp({
      service: cooldownService,
      professionService,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('GET /players/:playerId/professions', () => {
    it('returns professions for new player', async () => {
      const response = await request(app).get('/players/player-1/professions');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.playerId).toBe('player-1');
      expect(response.body.data.professions).toHaveLength(5);
    });

    it('includes all professions', async () => {
      const response = await request(app).get('/players/player-1/professions');
      const profs = response.body.data.professions;
      const profNames = profs.map((p: any) => p.profession);

      expect(profNames).toContain('worker');
      expect(profNames).toContain('crafter');
      expect(profNames).toContain('enchanter');
      expect(profNames).toContain('merchant');
      expect(profNames).toContain('lootboxer');
    });

    it('includes required profession fields', async () => {
      const response = await request(app).get('/players/player-1/professions');
      const prof = response.body.data.professions[0];

      expect(prof.profession).toBeDefined();
      expect(prof.level).toBeDefined();
      expect(prof.currentXp).toBeDefined();
      expect(prof.totalXpEarned).toBeDefined();
      expect(prof.nextLevelXp).toBeDefined();
      expect(prof.progressToNextLevel).toBeDefined();
      expect(prof.bonus).toBeDefined();
    });

    it('shows all professions at level 1 for new player', async () => {
      const response = await request(app).get('/players/player-1/professions');
      const profs = response.body.data.professions;

      profs.forEach((prof: any) => {
        expect(prof.level).toBe(1);
        expect(prof.currentXp).toBe(0);
        expect(prof.bonus).toBeCloseTo(1);
      });
    });
  });

  describe('POST /players/:playerId/professions/:profession/gain-xp', () => {
    it('gains XP for a profession', async () => {
      const response = await request(app)
        .post('/players/player-1/professions/worker/gain-xp')
        .send({ amount: 100 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.profession.currentXp).toBe(100);
      expect(response.body.data.profession.totalXpEarned).toBe(100);
    });

    it('levels up when threshold is reached', async () => {
      const xpNeeded = Math.floor(150 * Math.pow(2, 1.3));
      const response = await request(app)
        .post('/players/player-1/professions/worker/gain-xp')
        .send({ amount: xpNeeded });

      expect(response.status).toBe(200);
      expect(response.body.data.profession.level).toBe(2);
    });

    it('returns updated bonus after level up', async () => {
      const xpNeeded = Math.floor(150 * Math.pow(2, 1.3));
      const response = await request(app)
        .post('/players/player-1/professions/worker/gain-xp')
        .send({ amount: xpNeeded });

      expect(response.body.data.profession.bonus).toBeGreaterThan(1);
    });

    it('returns error for invalid profession', async () => {
      const response = await request(app)
        .post('/players/player-1/professions/invalid/gain-xp')
        .send({ amount: 100 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('returns error for invalid XP amount', async () => {
      const response = await request(app)
        .post('/players/player-1/professions/worker/gain-xp')
        .send({ amount: 0 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('returns error for negative XP', async () => {
      const response = await request(app)
        .post('/players/player-1/professions/worker/gain-xp')
        .send({ amount: -100 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('returns error for missing amount', async () => {
      const response = await request(app)
        .post('/players/player-1/professions/worker/gain-xp')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('gains XP only for specified profession', async () => {
      await request(app)
        .post('/players/player-1/professions/worker/gain-xp')
        .send({ amount: 100 });

      const response = await request(app).get('/players/player-1/professions');
      const profs = response.body.data.professions;

      const worker = profs.find((p: any) => p.profession === 'worker');
      const crafter = profs.find((p: any) => p.profession === 'crafter');

      expect(worker.currentXp).toBe(100);
      expect(crafter.currentXp).toBe(0);
    });
  });
});
