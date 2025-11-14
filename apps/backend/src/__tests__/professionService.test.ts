import { describe, expect, it, beforeEach, vi } from 'vitest';
import { ProfessionService } from '../professions/service';
import { InMemoryProfessionsRepository } from '../storage/professionsRepository';

const noopLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

describe('ProfessionService', () => {
  let service: ProfessionService;
  let clockNow: number;

  beforeEach(() => {
    clockNow = Date.UTC(2023, 0, 1, 0, 0, 0);
    const repository = new InMemoryProfessionsRepository();
    service = new ProfessionService(repository, noopLogger, () => clockNow);
  });

  describe('XP threshold calculation', () => {
    it('calculates XP thresholds using formula: floor(150 * level^1.3)', () => {
      expect(ProfessionService.calculateXpThreshold(1)).toBe(0);
      expect(ProfessionService.calculateXpThreshold(2)).toBe(
        Math.floor(150 * Math.pow(2, 1.3))
      );
      expect(ProfessionService.calculateXpThreshold(3)).toBe(
        Math.floor(150 * Math.pow(3, 1.3))
      );
    });
  });

  describe('cumulative XP calculation', () => {
    it('calculates total XP needed to reach a level', () => {
      const xpForLevel1 = ProfessionService.calculateCumulativeXp(1);
      expect(xpForLevel1).toBe(0);

      const xpForLevel2 = ProfessionService.calculateCumulativeXp(2);
      expect(xpForLevel2).toBe(ProfessionService.calculateXpThreshold(2));

      const xpForLevel3 = ProfessionService.calculateCumulativeXp(3);
      expect(xpForLevel3).toBe(
        ProfessionService.calculateXpThreshold(2) +
          ProfessionService.calculateXpThreshold(3)
      );
    });
  });

  describe('profession bonuses', () => {
    it('calculates correct bonuses for each profession at level 1', () => {
      expect(ProfessionService.getBonus('worker', 1)).toBeCloseTo(1);
      expect(ProfessionService.getBonus('crafter', 1)).toBeCloseTo(1);
      expect(ProfessionService.getBonus('enchanter', 1)).toBeCloseTo(1);
      expect(ProfessionService.getBonus('merchant', 1)).toBeCloseTo(1);
      expect(ProfessionService.getBonus('lootboxer', 1)).toBeCloseTo(1);
    });

    it('calculates correct bonuses for each profession at higher levels', () => {
      expect(ProfessionService.getBonus('worker', 2)).toBeCloseTo(1.05);
      expect(ProfessionService.getBonus('merchant', 2)).toBeCloseTo(1.04);
      expect(ProfessionService.getBonus('lootboxer', 2)).toBeCloseTo(1.06);
      expect(ProfessionService.getBonus('crafter', 10)).toBeCloseTo(
        1 + 0.03 * 9
      );
      expect(ProfessionService.getBonus('enchanter', 10)).toBeCloseTo(
        1 + 0.02 * 9
      );
    });
  });

  describe('getOrCreateProfessions', () => {
    it('creates new professions for a new player', async () => {
      const professions = await service.getOrCreateProfessions('player-1');

      expect(professions.playerId).toBe('player-1');
      expect(Object.keys(professions.professions)).toHaveLength(5);
      expect(professions.professions.worker.level).toBe(1);
      expect(professions.professions.crafter.level).toBe(1);
      expect(professions.professions.enchanter.level).toBe(1);
      expect(professions.professions.merchant.level).toBe(1);
      expect(professions.professions.lootboxer.level).toBe(1);
    });

    it('returns existing professions for an existing player', async () => {
      const professions1 = await service.getOrCreateProfessions('player-1');
      const professions2 = await service.getOrCreateProfessions('player-1');

      expect(professions1.playerId).toBe(professions2.playerId);
      expect(professions1.professions).toEqual(professions2.professions);
    });
  });

  describe('gainProfessionXp', () => {
    it('gains XP without leveling up', async () => {
      const professions = await service.gainProfessionXp(
        'player-1',
        'worker',
        50
      );

      expect(professions.professions.worker.currentXp).toBe(50);
      expect(professions.professions.worker.totalXpEarned).toBe(50);
      expect(professions.professions.worker.level).toBe(1);
    });

    it('levels up when XP threshold is reached', async () => {
      const nextLevelXp = ProfessionService.calculateXpThreshold(2);
      const professions = await service.gainProfessionXp(
        'player-1',
        'worker',
        nextLevelXp
      );

      expect(professions.professions.worker.level).toBe(2);
      expect(professions.professions.worker.currentXp).toBe(0);
      expect(professions.professions.worker.totalXpEarned).toBe(nextLevelXp);
    });

    it('handles multiple level ups', async () => {
      const level2Xp = ProfessionService.calculateXpThreshold(2);
      const level3Xp = ProfessionService.calculateXpThreshold(3);
      const totalXp = level2Xp + level3Xp + 50;

      const professions = await service.gainProfessionXp(
        'player-1',
        'crafter',
        totalXp
      );

      expect(professions.professions.crafter.level).toBe(3);
      expect(professions.professions.crafter.currentXp).toBe(50);
      expect(professions.professions.crafter.totalXpEarned).toBe(totalXp);
    });

    it('throws error for negative XP', async () => {
      await expect(
        service.gainProfessionXp('player-1', 'worker', -10)
      ).rejects.toThrow('XP amount must be positive');
    });

    it('throws error for zero XP', async () => {
      await expect(
        service.gainProfessionXp('player-1', 'worker', 0)
      ).rejects.toThrow('XP amount must be positive');
    });

    it('only gains XP for the specified profession', async () => {
      const xpAmount = 100;
      const professions = await service.gainProfessionXp(
        'player-1',
        'worker',
        xpAmount
      );

      expect(professions.professions.worker.currentXp).toBe(xpAmount);
      expect(professions.professions.crafter.currentXp).toBe(0);
      expect(professions.professions.enchanter.currentXp).toBe(0);
    });
  });

  describe('progress tracking', () => {
    it('calculates progress to next level correctly', async () => {
      const professions = await service.getOrCreateProfessions('player-1');
      const prof = professions.professions.worker;

      await service.gainProfessionXp('player-1', 'worker', 50);
      const updatedProf = (await service.getOrCreateProfessions('player-1'))
        .professions.worker;

      const nextLevelXp = service.getNextLevelXp(updatedProf);
      const progress = service.getProgressToNextLevel(updatedProf);

      expect(nextLevelXp).toBeGreaterThan(0);
      expect(progress).toBeGreaterThan(0);
      expect(progress).toBeLessThan(100);
    });
  });
});
