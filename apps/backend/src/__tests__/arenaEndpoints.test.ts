import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Express } from 'express';
import { createApp } from '../http/app';
import { ActionCooldownService } from '../cooldowns/service';
import { PlayerProgressionService } from '../progression/service';
import { ArenaService } from '../arena/service';
import { InMemoryCooldownRepository } from '../storage/inMemoryCooldownRepository';
import { InMemoryProgressionRepository } from '../storage/inMemoryProgressionRepository';
import { InMemoryArenaRepository } from '../storage/arenaRepository';

const noopLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

describe('Arena API endpoints', () => {
  let app: Express;
  let progressionService: PlayerProgressionService;
  let arenaService: ArenaService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.UTC(2024, 0, 1, 0, 0, 0)));

    const cooldownRepository = new InMemoryCooldownRepository();
    const progressionRepository = new InMemoryProgressionRepository();
    const arenaRepository = new InMemoryArenaRepository();

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

    let currentTime = Date.UTC(2024, 0, 1, 0, 0, 0);
    const clock = () => {
      currentTime += 1000;
      return currentTime;
    };

    let rngIndex = 0;
    const rngValues = [0.4, 0.6, 0.2, 0.8];
    const rng = () => {
      const value = rngValues[rngIndex % rngValues.length];
      rngIndex += 1;
      return value;
    };

    arenaService = new ArenaService(
      arenaRepository,
      progressionService,
      noopLogger,
      clock,
      {
        historyLimit: 10,
        rng,
      }
    );

    app = createApp({
      service: cooldownService,
      progressionService,
      arenaService,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
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

  it('provides arena state, opponents, and challenge results through the API', async () => {
    const playerId = 'arena-api';
    await levelPlayer(playerId, 24);

    const stateResponse = await request(app)
      .get(`/players/${playerId}/arena`)
      .expect(200);
    expect(stateResponse.body.success).toBe(true);
    expect(stateResponse.body.data.playerId).toBe(playerId);
    expect(stateResponse.body.data.history).toEqual([]);

    const opponentResponse = await request(app)
      .get(`/players/${playerId}/arena/opponent`)
      .expect(200);
    expect(opponentResponse.body.success).toBe(true);
    const opponent = opponentResponse.body.data;
    expect(opponent).toHaveProperty('id');
    expect(opponent).toHaveProperty('stats');

    const challengeResponse = await request(app)
      .post(`/players/${playerId}/arena/challenge`)
      .send({ opponent, seed: 777 })
      .expect(200);
    expect(challengeResponse.body.success).toBe(true);
    expect(challengeResponse.body.data.state.history.length).toBe(1);
    expect(challengeResponse.body.data.match.opponent.id).toBe(opponent.id);

    const leaderboardResponse = await request(app)
      .get('/arena/leaderboard?limit=1')
      .expect(200);
    expect(leaderboardResponse.body.success).toBe(true);
    expect(leaderboardResponse.body.data.length).toBe(1);
  });
});
