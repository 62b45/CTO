import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DungeonService } from '../dungeons/service';
import { InMemoryDungeonRepository } from '../storage/dungeonRepository';
import { PlayerProgressionService } from '../progression/service';
import { InMemoryProgressionRepository } from '../storage/inMemoryProgressionRepository';

const noopLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

describe('DungeonService', () => {
  let dungeonService: DungeonService;
  let progressionService: PlayerProgressionService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.UTC(2024, 0, 1, 0, 0, 0)));

    const progressionRepository = new InMemoryProgressionRepository();
    progressionService = new PlayerProgressionService(
      progressionRepository,
      noopLogger,
      () => Date.now()
    );

    const dungeonRepository = new InMemoryDungeonRepository();
    dungeonService = new DungeonService(
      dungeonRepository,
      progressionService,
      noopLogger,
      () => Date.now()
    );
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

  it('prevents entering locked dungeons when requirements are not met', async () => {
    const playerId = 'lock-test';
    await levelPlayer(playerId, 3);

    await expect(
      dungeonService.enterDungeon(playerId, 'ember-spire-gauntlet')
    ).rejects.toThrow(/locked/i);
  });

  it('enforces floor progression order', async () => {
    const playerId = 'order-test';
    await levelPlayer(playerId, 3);
    await dungeonService.enterDungeon(playerId, 'forgotten-catacombs');

    await expect(
      dungeonService.resolveFloor(playerId, 'forgotten-catacombs', 2, {
        seed: 15,
      })
    ).rejects.toThrow(/out of order/i);
  });

  it('clears dungeons with multi-phase bosses and persists progress', async () => {
    const playerId = 'progress-test';
    await levelPlayer(playerId, 4);
    await dungeonService.enterDungeon(playerId, 'forgotten-catacombs');

    const floorOne = await dungeonService.resolveFloor(
      playerId,
      'forgotten-catacombs',
      1,
      { seed: 101 }
    );
    expect(floorOne.outcome).toBe('win');
    expect(floorOne.nextFloor).toBe(2);
    expect(floorOne.run.status).toBe('in_progress');

    const floorTwo = await dungeonService.resolveFloor(
      playerId,
      'forgotten-catacombs',
      2,
      { seed: 102 }
    );
    expect(floorTwo.outcome).toBe('win');
    expect(floorTwo.run.currentFloor).toBe(3);

    const floorThree = await dungeonService.resolveFloor(
      playerId,
      'forgotten-catacombs',
      3,
      { seed: 103 }
    );
    expect(floorThree.outcome).toBe('win');
    expect(floorThree.completed).toBe(true);
    expect(floorThree.run.status).toBe('completed');
    expect(floorThree.combatResults).toHaveLength(2);
    expect(floorThree.accumulatedRewards.items).toEqual(
      expect.arrayContaining(['ancient-phylactery'])
    );

    const state = await dungeonService.getPlayerState(playerId);
    const progress = state.dungeons['forgotten-catacombs'];
    expect(progress).toBeDefined();
    expect(progress.highestFloorReached).toBe(3);
    expect(progress.timesCompleted).toBe(1);
    expect(progress.activeRun?.status).toBe('completed');
    expect(progress.lastCompletedAt).not.toBeUndefined();
  });
});
