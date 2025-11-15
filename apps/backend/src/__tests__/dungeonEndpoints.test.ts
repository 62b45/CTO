import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach, vi } from '@jest/globals';
import type { Express } from 'express';
import { createApp } from '../http/app';
import { ActionCooldownService } from '../cooldowns/service';
import { PlayerProgressionService } from '../progression/service';
import { DungeonService } from '../dungeons/service';
import { InMemoryCooldownRepository } from '../storage/inMemoryCooldownRepository';
import { InMemoryProgressionRepository } from '../storage/inMemoryProgressionRepository';
import { InMemoryDungeonRepository } from '../storage/dungeonRepository';

const noopLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe('Dungeon API endpoints', () => {
  let app: Express;
  let progressionService: PlayerProgressionService;
  let dungeonService: DungeonService;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(Date.UTC(2024, 0, 1, 0, 0, 0)));

    const cooldownRepository = new InMemoryCooldownRepository();
    const progressionRepository = new InMemoryProgressionRepository();
    const dungeonRepository = new InMemoryDungeonRepository();

    const cooldownService = new ActionCooldownService(
      cooldownRepository,
      noopLogger,
      () => Date.now()
    );
    progressionService = new PlayerProgressionService(
      progressionRepository,
      noopLogger,
      () => Date.now()
    );
    dungeonService = new DungeonService(
      dungeonRepository,
      progressionService,
      noopLogger,
      () => Date.now()
    );

    app = createApp({
      service: cooldownService,
      progressionService,
      dungeonService,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  async function levelPlayer(playerId: string, targetLevel: number): Promise<void> {
    if (targetLevel <= 1) {
      await progressionService.getOrCreatePlayer(playerId);
      return;
    }

    let totalXp = 0;
    for (let level = 2; level <= targetLevel; level++) {
      totalXp += PlayerProgressionService.calculateXpThreshold(level);
    }
    await progressionService.gainXp(playerId, totalXp);
  }

  it('returns dungeon listings with unlock state', async () => {
    const response = await request(app)
      .get('/players/test-player/dungeons')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(response.body.data[0]).toHaveProperty('definition');
    expect(response.body.data[0]).toHaveProperty('progress');
  });

  it('supports entering and clearing a dungeon run via API', async () => {
    const playerId = 'api-progress';
    await levelPlayer(playerId, 4);

    await request(app)
      .post(`/players/${playerId}/dungeons/forgotten-catacombs/enter`)
      .send({})
      .expect(200)
      .then(res => {
        expect(res.body.success).toBe(true);
        expect(res.body.data.run.status).toBe('in_progress');
      });

    await request(app)
      .post(`/players/${playerId}/dungeons/forgotten-catacombs/floors/1/resolve`)
      .send({ seed: 210 })
      .expect(200)
      .then(res => {
        expect(res.body.success).toBe(true);
        expect(res.body.data.outcome).toBe('win');
        expect(res.body.data.nextFloor).toBe(2);
      });

    await request(app)
      .post(`/players/${playerId}/dungeons/forgotten-catacombs/floors/2/resolve`)
      .send({ seed: 211 })
      .expect(200)
      .then(res => {
        expect(res.body.success).toBe(true);
        expect(res.body.data.run.currentFloor).toBe(3);
      });

    await request(app)
      .post(`/players/${playerId}/dungeons/forgotten-catacombs/floors/3/resolve`)
      .send({ seed: 212 })
      .expect(200)
      .then(res => {
        expect(res.body.success).toBe(true);
        expect(res.body.data.completed).toBe(true);
        expect(res.body.data.combats).toHaveLength(2);
      });

    const finalState = await request(app)
      .get(`/players/${playerId}/dungeons`)
      .expect(200);

    const summaries: Array<{
      definition: { id: string };
      progress: { timesCompleted: number; highestFloorReached: number };
      unlocked: boolean;
    }> = finalState.body.data;

    const catacombs = summaries.find(
      summary => summary.definition.id === 'forgotten-catacombs'
    );
    expect(catacombs).toBeTruthy();
    expect(catacombs?.progress.timesCompleted).toBe(1);
    expect(catacombs?.progress.highestFloorReached).toBe(3);
    expect(catacombs?.unlocked).toBe(true);
  });
});
