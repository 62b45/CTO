import request from 'supertest';
import { describe, expect, it, beforeEach, vi, afterEach } from '@jest/globals';
import type { Express } from 'express';
import { createApp } from '../http/app';
import { ActionCooldownService } from '../cooldowns/service';
import { PlayerProgressionService } from '../progression/service';
import { InMemoryCooldownRepository } from '../storage/inMemoryCooldownRepository';
import { InMemoryProgressionRepository } from '../storage/inMemoryProgressionRepository';

const noopLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe('Player progression API endpoints', () => {
  let cooldownService: ActionCooldownService;
  let progressionService: PlayerProgressionService;
  let app: Express;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(Date.UTC(2023, 0, 1, 0, 0, 0)));

    const cooldownRepository = new InMemoryCooldownRepository();
    const progressionRepository = new InMemoryProgressionRepository();

    cooldownService = new ActionCooldownService(
      cooldownRepository,
      noopLogger,
      () => Date.now()
    );
    progressionService = new PlayerProgressionService(
      progressionRepository,
      noopLogger,
      () => Date.now()
    );

    app = createApp({ service: cooldownService, progressionService });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('GET /players/:playerId/progression', () => {
    it('returns player progression data for a new player', async () => {
      const response = await request(app)
        .get('/players/player-1/progression')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.playerId).toBe('player-1');
      expect(response.body.data.player.level).toBe(1);
      expect(response.body.data.player.currentXp).toBe(0);
      expect(response.body.data.player.totalXpEarned).toBe(0);
      expect(response.body.data.player.baseStats).toBeDefined();
      expect(response.body.data.player.derivedStats).toBeDefined();
      expect(response.body.data.player.nextLevelXp).toBeGreaterThan(0);
      expect(response.body.data.player.progressToNextLevel).toBe(0);
      expect(response.body.data.player.recentLevelGains).toEqual([]);
    });

    it('returns updated progression data after gaining XP', async () => {
      await request(app)
        .post('/players/player-2/progression/gain-xp')
        .send({ amount: 100 })
        .expect(200);

      const response = await request(app)
        .get('/players/player-2/progression')
        .expect(200);

      expect(response.body.data.player.currentXp).toBe(100);
      expect(response.body.data.player.totalXpEarned).toBe(100);
    });
  });

  describe('POST /players/:playerId/progression/gain-xp', () => {
    it('gains XP without leveling', async () => {
      const response = await request(app)
        .post('/players/player-3/progression/gain-xp')
        .send({ amount: 100 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.player.currentXp).toBe(100);
      expect(response.body.data.player.level).toBe(1);
      expect(response.body.data.player.totalXpEarned).toBe(100);
    });

    it('returns 400 for missing XP amount', async () => {
      const response = await request(app)
        .post('/players/player-4/progression/gain-xp')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain(
        'XP amount must be a positive number'
      );
    });

    it('returns 400 for zero XP', async () => {
      const response = await request(app)
        .post('/players/player-5/progression/gain-xp')
        .send({ amount: 0 })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('returns 400 for negative XP', async () => {
      const response = await request(app)
        .post('/players/player-6/progression/gain-xp')
        .send({ amount: -10 })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('levels up when XP threshold is reached', async () => {
      const xpForLevel2 = PlayerProgressionService.calculateXpThreshold(2);
      const response = await request(app)
        .post('/players/player-7/progression/gain-xp')
        .send({ amount: xpForLevel2 })
        .expect(200);

      expect(response.body.data.player.level).toBe(2);
      expect(response.body.data.player.currentXp).toBe(0);
      expect(response.body.data.player.recentLevelGains).toContain(2);
    });

    it('handles multiple level ups', async () => {
      const xpForLevel2 = PlayerProgressionService.calculateXpThreshold(2);
      const xpForLevel3 = PlayerProgressionService.calculateXpThreshold(3);
      const totalXp = xpForLevel2 + xpForLevel3 + 50;

      const response = await request(app)
        .post('/players/player-8/progression/gain-xp')
        .send({ amount: totalXp })
        .expect(200);

      expect(response.body.data.player.level).toBe(3);
      expect(response.body.data.player.currentXp).toBe(50);
      expect(response.body.data.player.recentLevelGains).toEqual([2, 3]);
    });

    it('updates nextLevelXp and progressToNextLevel', async () => {
      const xpForLevel2 = PlayerProgressionService.calculateXpThreshold(2);

      const response = await request(app)
        .post('/players/player-9/progression/gain-xp')
        .send({ amount: xpForLevel2 })
        .expect(200);

      expect(response.body.data.player.nextLevelXp).toBe(
        PlayerProgressionService.calculateXpThreshold(3)
      );
      expect(response.body.data.player.progressToNextLevel).toBe(0);
    });
  });

  describe('POST /players/:playerId/progression/allocate-stat', () => {
    it('allocates a stat to a player', async () => {
      const response = await request(app)
        .post('/players/player-10/progression/allocate-stat')
        .send({ stat: 'strength', amount: 5 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.player.baseStats.strength).toBe(15);
    });

    it('returns 400 for missing stat', async () => {
      const response = await request(app)
        .post('/players/player-11/progression/allocate-stat')
        .send({ amount: 5 })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('returns 400 for missing amount', async () => {
      const response = await request(app)
        .post('/players/player-12/progression/allocate-stat')
        .send({ stat: 'strength' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('returns 400 for zero amount', async () => {
      const response = await request(app)
        .post('/players/player-13/progression/allocate-stat')
        .send({ stat: 'strength', amount: 0 })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('returns 400 for invalid stat', async () => {
      const response = await request(app)
        .post('/players/player-14/progression/allocate-stat')
        .send({ stat: 'invalid_stat', amount: 5 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid stat');
    });

    it('updates derived stats after stat allocation', async () => {
      const initialResponse = await request(app)
        .get('/players/player-15/progression')
        .expect(200);
      const initialHealth =
        initialResponse.body.data.player.derivedStats.health;

      await request(app)
        .post('/players/player-15/progression/allocate-stat')
        .send({ stat: 'constitution', amount: 5 })
        .expect(200);

      const updatedResponse = await request(app)
        .get('/players/player-15/progression')
        .expect(200);
      const updatedHealth =
        updatedResponse.body.data.player.derivedStats.health;

      expect(updatedHealth).toBeGreaterThan(initialHealth);
    });

    it('allocates to multiple stats over multiple requests', async () => {
      await request(app)
        .post('/players/player-16/progression/allocate-stat')
        .send({ stat: 'strength', amount: 3 })
        .expect(200);

      await request(app)
        .post('/players/player-16/progression/allocate-stat')
        .send({ stat: 'intelligence', amount: 2 })
        .expect(200);

      const response = await request(app)
        .get('/players/player-16/progression')
        .expect(200);

      expect(response.body.data.player.baseStats.strength).toBe(13);
      expect(response.body.data.player.baseStats.intelligence).toBe(12);
    });
  });

  describe('POST /players/:playerId/progression/recalculate-stats', () => {
    it('recalculates derived stats', async () => {
      await request(app)
        .post('/players/player-17/progression/allocate-stat')
        .send({ stat: 'constitution', amount: 5 })
        .expect(200);

      const response = await request(app)
        .post('/players/player-17/progression/recalculate-stats')
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.player.derivedStats).toBeDefined();
    });
  });

  describe('persistence and consistency', () => {
    it('persists level ups across requests', async () => {
      const xpForLevel2 = PlayerProgressionService.calculateXpThreshold(2);

      await request(app)
        .post('/players/player-18/progression/gain-xp')
        .send({ amount: xpForLevel2 })
        .expect(200);

      const response = await request(app)
        .get('/players/player-18/progression')
        .expect(200);

      expect(response.body.data.player.level).toBe(2);
      expect(response.body.data.player.recentLevelGains).toContain(2);
    });

    it('persists stat allocations across requests', async () => {
      await request(app)
        .post('/players/player-19/progression/allocate-stat')
        .send({ stat: 'strength', amount: 5 })
        .expect(200);

      const response = await request(app)
        .get('/players/player-19/progression')
        .expect(200);

      expect(response.body.data.player.baseStats.strength).toBe(15);
    });

    it('maintains consistent state through multiple operations', async () => {
      const xpForLevel2 = PlayerProgressionService.calculateXpThreshold(2);

      // Gain XP and level up
      await request(app)
        .post('/players/player-20/progression/gain-xp')
        .send({ amount: xpForLevel2 })
        .expect(200);

      // Allocate stats
      await request(app)
        .post('/players/player-20/progression/allocate-stat')
        .send({ stat: 'strength', amount: 3 })
        .expect(200);

      // Check final state
      const response = await request(app)
        .get('/players/player-20/progression')
        .expect(200);

      expect(response.body.data.player.level).toBe(2);
      expect(response.body.data.player.baseStats.strength).toBe(13);
      expect(response.body.data.player.recentLevelGains).toContain(2);
    });
  });
});
