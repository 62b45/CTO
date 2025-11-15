import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { PlayerProgressionService } from '../progression/service';
import { InMemoryProgressionRepository } from '../storage/inMemoryProgressionRepository';

describe('PlayerProgressionService', () => {
  let service: PlayerProgressionService;
  let clockNow: number;

  beforeEach(() => {
    clockNow = Date.UTC(2023, 0, 1, 0, 0, 0);
    const repository = new InMemoryProgressionRepository();
    service = new PlayerProgressionService(
      repository,
      { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
      () => clockNow
    );
  });

  describe('XP threshold calculation', () => {
    it('calculates XP thresholds using formula: floor(100 * level^1.5)', () => {
      expect(PlayerProgressionService.calculateXpThreshold(1)).toBe(0);
      expect(PlayerProgressionService.calculateXpThreshold(2)).toBe(
        Math.floor(100 * Math.pow(2, 1.5))
      );
      expect(PlayerProgressionService.calculateXpThreshold(3)).toBe(
        Math.floor(100 * Math.pow(3, 1.5))
      );
      expect(PlayerProgressionService.calculateXpThreshold(10)).toBe(
        Math.floor(100 * Math.pow(10, 1.5))
      );
    });

    it('returns correct XP values for common levels', () => {
      expect(PlayerProgressionService.calculateXpThreshold(2)).toBe(282);
      expect(PlayerProgressionService.calculateXpThreshold(3)).toBe(519);
      expect(PlayerProgressionService.calculateXpThreshold(4)).toBe(800);
      expect(PlayerProgressionService.calculateXpThreshold(5)).toBe(1118);
    });
  });

  describe('cumulative XP calculation', () => {
    it('calculates total XP needed to reach a level', () => {
      const xpForLevel1 = PlayerProgressionService.calculateCumulativeXp(1);
      expect(xpForLevel1).toBe(0);

      const xpForLevel2 = PlayerProgressionService.calculateCumulativeXp(2);
      expect(xpForLevel2).toBe(282);

      const xpForLevel3 = PlayerProgressionService.calculateCumulativeXp(3);
      expect(xpForLevel3).toBe(282 + 519);
    });
  });

  describe('player creation', () => {
    it('creates a new player with initial stats', async () => {
      const player = await service.getOrCreatePlayer('player-1');

      expect(player.playerId).toBe('player-1');
      expect(player.level).toBe(1);
      expect(player.currentXp).toBe(0);
      expect(player.totalXpEarned).toBe(0);
      expect(player.baseStats.strength).toBe(10);
      expect(player.derivedStats.health).toBeGreaterThan(0);
      expect(player.recentLevelGains).toEqual([]);
    });

    it('returns existing player if already created', async () => {
      await service.getOrCreatePlayer('player-2');
      const player = await service.getOrCreatePlayer('player-2');

      expect(player.playerId).toBe('player-2');
      expect(player.level).toBe(1);
    });
  });

  describe('XP gain and leveling', () => {
    it('gains XP without leveling up if below threshold', async () => {
      let player = await service.getOrCreatePlayer('player-3');
      expect(player.currentXp).toBe(0);
      expect(player.level).toBe(1);

      player = await service.gainXp('player-3', 100);
      expect(player.currentXp).toBe(100);
      expect(player.level).toBe(1);
      expect(player.totalXpEarned).toBe(100);
    });

    it('levels up when XP threshold is reached', async () => {
      let player = await service.getOrCreatePlayer('player-4');

      const xpForLevel2 = PlayerProgressionService.calculateXpThreshold(2);
      player = await service.gainXp('player-4', xpForLevel2);

      expect(player.level).toBe(2);
      expect(player.currentXp).toBe(0);
      expect(player.recentLevelGains).toContain(2);
    });

    it('handles multiple level ups in one XP gain', async () => {
      let player = await service.getOrCreatePlayer('player-5');

      const xpForLevel2 = PlayerProgressionService.calculateXpThreshold(2);
      const xpForLevel3 = PlayerProgressionService.calculateXpThreshold(3);
      const totalXp = xpForLevel2 + xpForLevel3 + 100;

      player = await service.gainXp('player-5', totalXp);

      expect(player.level).toBe(3);
      expect(player.currentXp).toBe(100);
      expect(player.recentLevelGains).toEqual([2, 3]);
    });

    it('tracks recent level gains up to 10 entries', async () => {
      let player = await service.getOrCreatePlayer('player-6');

      for (let i = 2; i <= 12; i++) {
        const xpForLevel = PlayerProgressionService.calculateXpThreshold(i);
        player = await service.gainXp('player-6', xpForLevel);
      }

      expect(player.level).toBe(12);
      expect(player.recentLevelGains).toHaveLength(10);
      expect(player.recentLevelGains).toEqual([
        3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
      ]);
    });
  });

  describe('derived stats calculation', () => {
    it('calculates derived stats based on base stats and level', async () => {
      const player = await service.getOrCreatePlayer('player-7');

      expect(player.derivedStats.health).toBe(
        player.baseStats.constitution * 10 + player.level * 5
      );
      expect(player.derivedStats.mana).toBe(
        player.baseStats.intelligence * 8 + player.level * 3
      );
      expect(player.derivedStats.attackPower).toBe(
        player.baseStats.strength * 2 + player.level * 1
      );
      expect(player.derivedStats.defensePower).toBe(
        player.baseStats.constitution * 1.5 + player.level * 0.5
      );
    });

    it('recalculates derived stats when base stats change', async () => {
      let player = await service.getOrCreatePlayer('player-8');
      const initialHealth = player.derivedStats.health;

      player = await service.allocateStat('player-8', 'constitution', 5);

      const expectedHealth =
        player.baseStats.constitution * 10 + player.level * 5;
      expect(player.derivedStats.health).toBe(expectedHealth);
      expect(player.derivedStats.health).toBeGreaterThan(initialHealth);
    });
  });

  describe('stat allocation', () => {
    it('allocates stats to a player', async () => {
      let player = await service.getOrCreatePlayer('player-9');
      const initialStrength = player.baseStats.strength;

      player = await service.allocateStat('player-9', 'strength', 5);

      expect(player.baseStats.strength).toBe(initialStrength + 5);
    });

    it('throws error for non-positive stat amounts', async () => {
      await service.getOrCreatePlayer('player-10');

      await expect(
        service.allocateStat('player-10', 'strength', 0)
      ).rejects.toThrow('Stat amount must be positive');
      await expect(
        service.allocateStat('player-10', 'dexterity', -1)
      ).rejects.toThrow('Stat amount must be positive');
    });

    it('allocates to multiple stats', async () => {
      let player = await service.getOrCreatePlayer('player-11');

      player = await service.allocateStat('player-11', 'strength', 3);
      player = await service.allocateStat('player-11', 'intelligence', 2);
      player = await service.allocateStat('player-11', 'constitution', 1);

      expect(player.baseStats.strength).toBe(13);
      expect(player.baseStats.intelligence).toBe(12);
      expect(player.baseStats.constitution).toBe(11);
    });
  });

  describe('next level XP calculation', () => {
    it('calculates XP needed for next level', async () => {
      const player = await service.getOrCreatePlayer('player-12');

      const nextLevelXp = service.getNextLevelXp(player);
      expect(nextLevelXp).toBe(
        PlayerProgressionService.calculateXpThreshold(2)
      );
    });

    it('updates next level XP after leveling', async () => {
      let player = await service.getOrCreatePlayer('player-13');

      const xpForLevel2 = PlayerProgressionService.calculateXpThreshold(2);
      player = await service.gainXp('player-13', xpForLevel2);

      const nextLevelXp = service.getNextLevelXp(player);
      expect(nextLevelXp).toBe(
        PlayerProgressionService.calculateXpThreshold(3)
      );
    });
  });

  describe('progress to next level', () => {
    it('calculates progress percentage', async () => {
      let player = await service.getOrCreatePlayer('player-14');

      let progress = service.getProgressToNextLevel(player);
      expect(progress).toBe(0);

      const xpForLevel2 = PlayerProgressionService.calculateXpThreshold(2);
      player = await service.gainXp('player-14', Math.floor(xpForLevel2 / 2));

      progress = service.getProgressToNextLevel(player);
      expect(progress).toBeCloseTo(50, -1);

      const xpForLevel3 = PlayerProgressionService.calculateXpThreshold(3);
      player = await service.gainXp(
        'player-14',
        Math.floor(xpForLevel3 * 0.95)
      );
      progress = service.getProgressToNextLevel(player);
      expect(progress).toBeGreaterThan(60);
      expect(progress).toBeLessThanOrEqual(100);
    });
  });

  describe('recalculate derived stats', () => {
    it('recalculates all derived stats for consistency', async () => {
      let player = await service.getOrCreatePlayer('player-15');

      player = await service.allocateStat('player-15', 'constitution', 5);
      player = await service.recalculateDerivedStats('player-15');

      const expectedHealth =
        player.baseStats.constitution * 10 + player.level * 5;
      expect(player.derivedStats.health).toBe(expectedHealth);
    });
  });
});
