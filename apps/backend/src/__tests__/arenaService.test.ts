import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ArenaService } from '../arena/service';
import { PlayerProgressionService } from '../progression/service';
import { InMemoryProgressionRepository } from '../storage/inMemoryProgressionRepository';
import { InMemoryArenaRepository } from '../storage/arenaRepository';

const noopLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

describe('ArenaService', () => {
  let progressionService: PlayerProgressionService;
  let arenaRepository: InMemoryArenaRepository;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.UTC(2024, 0, 1, 0, 0, 0)));
    const progressionRepository = new InMemoryProgressionRepository();
    progressionService = new PlayerProgressionService(
      progressionRepository,
      noopLogger,
      () => Date.now()
    );
    arenaRepository = new InMemoryArenaRepository();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  function createRng(values: number[]): () => number {
    let index = 0;
    return () => {
      const value = values[index % values.length];
      index += 1;
      return value;
    };
  }

  function createClock(start: number = Date.UTC(2024, 0, 1, 0, 0, 0)) {
    let current = start;
    return () => {
      current += 1000;
      return current;
    };
  }

  function createArenaService(
    rngValues: number[],
    historyLimit: number = 15
  ): ArenaService {
    return new ArenaService(
      arenaRepository,
      progressionService,
      noopLogger,
      createClock(),
      {
        historyLimit,
        rng: createRng(rngValues),
      }
    );
  }

  async function levelPlayer(playerId: string, targetLevel: number) {
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

  it('generates opponents scaled within ±10% of player level (lower bound)', async () => {
    const arenaService = createArenaService([0, 0.2, 0.4, 0.6]);
    const playerId = 'scaling-low';
    await levelPlayer(playerId, 20);

    const opponent = await arenaService.generateOpponent(playerId);
    const expectedLevel = Math.max(1, Math.round(20 * 0.9));
    expect(opponent.level).toBe(expectedLevel);
    expect(opponent.modifier).toBeCloseTo(-0.1, 3);
  });

  it('generates opponents scaled within ±10% of player level (upper bound)', async () => {
    const arenaService = createArenaService([0.999, 0.3, 0.5, 0.7]);
    const playerId = 'scaling-high';
    await levelPlayer(playerId, 20);

    const opponent = await arenaService.generateOpponent(playerId);
    const expectedLevel = Math.max(1, Math.round(20 * 1.099));
    expect(opponent.level).toBe(expectedLevel);
    expect(opponent.modifier).toBeGreaterThan(0);
  });

  it('records arena battles and updates player history', async () => {
    const arenaService = createArenaService([0.5, 0.4, 0.3, 0.2]);
    const playerId = 'history-player';
    await levelPlayer(playerId, 25);

    const opponent = await arenaService.generateOpponent(playerId);
    const result = await arenaService.challenge(playerId, {
      opponent,
      seed: 1234,
    });

    const state = await arenaService.getState(playerId);
    expect(state.history.length).toBe(1);
    expect(state.history[0].opponent.id).toBe(opponent.id);
    expect(state.history[0].outcome).toBe(result.outcome);
    expect(state.history[0].logs.length).toBeGreaterThan(0);
    expect(state.wins + state.losses).toBe(1);
    if (result.outcome === 'win') {
      expect(state.wins).toBe(1);
      expect(state.rating).toBeGreaterThan(1000);
      expect(result.rewards.items?.length ?? 0).toBeGreaterThan(0);
    } else {
      expect(state.losses).toBe(1);
      expect(result.rewards.items?.length ?? 0).toBe(0);
    }
  });

  it('trims history to configured limit', async () => {
    const arenaService = createArenaService([0.4, 0.6, 0.2, 0.8], 3);
    const playerId = 'history-limit';
    await levelPlayer(playerId, 30);

    for (let i = 0; i < 5; i++) {
      const opponent = await arenaService.generateOpponent(playerId);
      await arenaService.challenge(playerId, {
        opponent,
        seed: 500 + i,
      });
    }

    const state = await arenaService.getState(playerId);
    expect(state.history.length).toBe(3);
  });

  it('builds a leaderboard ordered by rating', async () => {
    const arenaService = createArenaService([0.4, 0.5, 0.6, 0.7]);

    await levelPlayer('alpha', 28);
    await levelPlayer('beta', 22);
    await levelPlayer('gamma', 18);

    const opponents = await Promise.all([
      arenaService.generateOpponent('alpha'),
      arenaService.generateOpponent('beta'),
      arenaService.generateOpponent('gamma'),
    ]);

    await arenaService.challenge('alpha', { opponent: opponents[0], seed: 900 });
    await arenaService.challenge('alpha', { opponent: opponents[0], seed: 901 });
    await arenaService.challenge('beta', { opponent: opponents[1], seed: 902 });
    await arenaService.challenge('gamma', { opponent: opponents[2], seed: 903 });

    const leaderboard = await arenaService.getLeaderboard(2);
    expect(leaderboard.length).toBe(2);
    expect(leaderboard[0].rating).toBeGreaterThanOrEqual(leaderboard[1].rating);
  });
});
