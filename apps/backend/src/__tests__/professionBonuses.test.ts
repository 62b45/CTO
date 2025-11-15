import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { ProfessionService } from '../professions/service';
import { InMemoryProfessionsRepository } from '../storage/professionsRepository';

describe('Profession Bonuses Tests', () => {
  let professionService: ProfessionService;
  let testPlayerId: string;

  beforeEach(() => {
    const repository = new InMemoryProfessionsRepository();
    professionService = new ProfessionService(
      repository,
      { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
      () => Date.UTC(2023, 0, 1, 0, 0, 0)
    );
    testPlayerId = 'test-player';
  });

  describe('Profession leveling and experience', () => {
    it('should track profession experience correctly', async () => {
      const professionType = 'alchemist';
      
      // Add experience to profession
      await professionService.addProfessionExperience(testPlayerId, professionType, 100);
      
      const profession = await professionService.getPlayerProfession(testPlayerId, professionType);
      expect(profession).toBeTruthy();
      expect(profession!.experience).toBe(100);
      expect(profession!.level).toBe(1);
    });

    it('should level up professions at correct thresholds', async () => {
      const professionType = 'blacksmith';
      
      // Add enough experience to level up
      await professionService.addProfessionExperience(testPlayerId, professionType, 500);
      
      const profession = await professionService.getPlayerProfession(testPlayerId, professionType);
      expect(profession!.level).toBeGreaterThan(1);
      expect(profession!.experience).toBeGreaterThanOrEqual(0);
    });

    it('should calculate profession level thresholds correctly', () => {
      // Test level threshold calculation
      expect(ProfessionService.calculateExperienceThreshold(1)).toBe(0);
      expect(ProfessionService.calculateExperienceThreshold(2)).toBe(200);
      expect(ProfessionService.calculateExperienceThreshold(3)).toBe(500);
      expect(ProfessionService.calculateExperienceThreshold(5)).toBe(1200);
    });
  });

  describe('XP bonus calculations', () => {
    it('should calculate XP bonuses based on profession level', async () => {
      const professionType = 'alchemist';
      const baseXP = 100;
      
      // Level 1 should give 6% bonus
      await professionService.addProfessionExperience(testPlayerId, professionType, 100);
      const bonus1 = professionService.calculateBonusXP(testPlayerId, 'gather_herbs', baseXP);
      expect(bonus1).toBe(Math.floor(baseXP * 0.06));
      
      // Level up to get higher bonus
      await professionService.addProfessionExperience(testPlayerId, professionType, 500);
      const profession = await professionService.getPlayerProfession(testPlayerId, professionType);
      const expectedBonus = Math.floor(baseXP * (profession!.level * 0.06));
      const bonus2 = professionService.calculateBonusXP(testPlayerId, 'gather_herbs', baseXP);
      expect(bonus2).toBe(expectedBonus);
    });

    it('should apply bonuses only to relevant actions', async () => {
      const professionType = 'alchemist';
      const baseXP = 100;
      
      await professionService.addProfessionExperience(testPlayerId, professionType, 300);
      
      // Should give bonus for herb gathering
      const herbBonus = professionService.calculateBonusXP(testPlayerId, 'gather_herbs', baseXP);
      expect(herbBonus).toBeGreaterThan(0);
      
      // Should not give bonus for unrelated actions
      const huntBonus = professionService.calculateBonusXP(testPlayerId, 'hunt', baseXP);
      expect(huntBonus).toBe(0);
      
      const craftBonus = professionService.calculateBonusXP(testPlayerId, 'craft', baseXP);
      expect(craftBonus).toBe(0);
    });

    it('should handle multiple profession bonuses', async () => {
      const baseXP = 100;
      
      // Level up multiple professions
      await professionService.addProfessionExperience(testPlayerId, 'alchemist', 300);
      await professionService.addProfessionExperience(testPlayerId, 'blacksmith', 300);
      
      // For crafting action, should get bonus from relevant profession
      const craftBonus = professionService.calculateBonusXP(testPlayerId, 'craft', baseXP);
      expect(craftBonus).toBeGreaterThan(0);
      
      // Should not double-dip bonuses
      const maxExpectedBonus = Math.floor(baseXP * 0.12); // Max 6% per level * 2 levels
      expect(craftBonus).toBeLessThanOrEqual(maxExpectedBonus);
    });
  });

  describe('Profession-action mapping', () => {
    it('should correctly map actions to professions', () => {
      const mappings = [
        { action: 'gather_herbs', profession: 'alchemist' },
        { action: 'craft', profession: 'blacksmith' },
        { action: 'gather_ore', profession: 'blacksmith' },
        { action: 'gather_wood', profession: 'carpenter' },
        { action: 'lootbox', profession: 'lootboxer' },
      ];
      
      for (const { action, profession } of mappings) {
        const relevantProfession = professionService.getProfessionForAction(action);
        expect(relevantProfession).toBe(profession);
      }
    });

    it('should return null for unmapped actions', () => {
      const unmappedActions = ['hunt', 'heal', 'arena', 'dungeon', 'quest', 'adventure'];
      
      for (const action of unmappedActions) {
        const relevantProfession = professionService.getProfessionForAction(action);
        expect(relevantProfession).toBeNull();
      }
    });
  });

  describe('Gold and resource bonuses', () => {
    it('should calculate gold bonuses for gathering professions', async () => {
      const professionType = 'alchemist';
      const baseGold = 50;
      
      await professionService.addProfessionExperience(testPlayerId, professionType, 300);
      
      const goldBonus = professionService.calculateBonusGold(testPlayerId, 'gather_herbs', baseGold);
      expect(goldBonus).toBeGreaterThan(0);
      expect(goldBonus).toBeLessThanOrEqual(baseGold); // Bonus shouldn't exceed base amount
    });

    it('should provide resource bonuses for crafting professions', async () => {
      const professionType = 'blacksmith';
      const baseResources = ['iron_ore', 'coal'];
      
      await professionService.addProfessionExperience(testPlayerId, professionType, 300);
      
      const resourceBonus = professionService.calculateBonusResources(
        testPlayerId, 
        'craft', 
        baseResources
      );
      
      expect(resourceBonus).toHaveProperty('bonusResources');
      expect(resourceBonus.bonusResources.length).toBeGreaterThan(0);
    });

    it('should scale bonuses with profession level', async () => {
      const professionType = 'lootboxer';
      const baseValue = 100;
      
      // Test at different levels
      const level1Bonus = professionService.calculateBonusValue(testPlayerId, 'lootbox', baseValue);
      
      await professionService.addProfessionExperience(testPlayerId, professionType, 1000);
      const level5Bonus = professionService.calculateBonusValue(testPlayerId, 'lootbox', baseValue);
      
      expect(level5Bonus).toBeGreaterThan(level1Bonus);
      expect(level5Bonus).toBeLessThanOrEqual(baseValue * 0.5); // Reasonable upper bound
    });
  });

  describe('Profession mastery and specializations', () => {
    it('should track profession mastery progress', async () => {
      const professionType = 'alchemist';
      
      // Add significant experience
      await professionService.addProfessionExperience(testPlayerId, professionType, 2000);
      
      const profession = await professionService.getPlayerProfession(testPlayerId, professionType);
      expect(profession!.level).toBeGreaterThan(5);
      
      // Check mastery status
      const masteryInfo = professionService.getMasteryInfo(testPlayerId, professionType);
      expect(masteryInfo).toHaveProperty('isMaster');
      expect(masteryInfo).toHaveProperty('masteryProgress');
    });

    it('should unlock special bonuses at high levels', async () => {
      const professionType = 'blacksmith';
      
      // Level up to high level
      await professionService.addProfessionExperience(testPlayerId, professionType, 5000);
      
      const profession = await professionService.getPlayerProfession(testPlayerId, professionType);
      expect(profession!.level).toBeGreaterThan(10);
      
      // Should have access to special bonuses
      const specialBonuses = professionService.getSpecialBonuses(testPlayerId, professionType);
      expect(specialBonuses.length).toBeGreaterThan(0);
    });
  });

  describe('Multi-profession management', () => {
    it('should handle multiple professions per player', async () => {
      const professions = ['alchemist', 'blacksmith', 'carpenter'];
      
      // Level up multiple professions
      for (const profession of professions) {
        await professionService.addProfessionExperience(testPlayerId, profession, 300);
      }
      
      const allProfessions = await professionService.getPlayerProfessions(testPlayerId);
      expect(allProfessions).toHaveLength(professions.length);
      
      for (const professionData of allProfessions) {
        expect(professions).toContain(professionData.type);
        expect(professionData.level).toBeGreaterThan(1);
      }
    });

    it('should prevent profession bonus stacking abuse', async () => {
      const baseXP = 100;
      
      // Level up all professions to max
      const professions = ['alchemist', 'blacksmith', 'carpenter', 'lootboxer'];
      for (const profession of professions) {
        await professionService.addProfessionExperience(testPlayerId, profession, 10000);
      }
      
      // Even with maxed professions, bonus should be reasonable
      const maxBonus = professionService.calculateBonusXP(testPlayerId, 'craft', baseXP);
      expect(maxBonus).toBeLessThan(baseXP); // Shouldn't exceed base XP
      expect(maxBonus).toBeLessThan(baseXP * 0.5); // Reasonable cap
    });
  });

  describe('Profession balance validation', () => {
    it('should maintain balanced progression across professions', async () => {
      const experienceAmount = 500;
      const professions = ['alchemist', 'blacksmith', 'carpenter', 'lootboxer'];
      const levels: number[] = [];
      
      // Give same experience to all professions
      for (const profession of professions) {
        const playerId = `test-player-${profession}`;
        await professionService.addProfessionExperience(playerId, profession, experienceAmount);
        
        const professionData = await professionService.getPlayerProfession(playerId, profession);
        levels.push(professionData!.level);
      }
      
      // Levels should be similar (balanced progression)
      const maxLevel = Math.max(...levels);
      const minLevel = Math.min(...levels);
      expect(maxLevel - minLevel).toBeLessThanOrEqual(1); // At most 1 level difference
    });

    it('should provide meaningful bonuses at all levels', async () => {
      const professionType = 'alchemist';
      const baseXP = 100;
      
      // Test bonus progression
      const bonuses: number[] = [];
      
      for (let level = 1; level <= 10; level++) {
        const playerId = `test-player-level-${level}`;
        
        // Add just enough experience for this level
        const requiredXP = ProfessionService.calculateExperienceThreshold(level);
        await professionService.addProfessionExperience(playerId, professionType, requiredXP);
        
        const bonus = professionService.calculateBonusXP(playerId, 'gather_herbs', baseXP);
        bonuses.push(bonus);
      }
      
      // Each level should provide increasing bonuses
      for (let i = 1; i < bonuses.length; i++) {
        expect(bonuses[i]).toBeGreaterThanOrEqual(bonuses[i - 1]);
      }
      
      // Even at level 1, should provide some bonus
      expect(bonuses[0]).toBeGreaterThan(0);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle non-existent professions gracefully', async () => {
      const baseXP = 100;
      
      const bonus = professionService.calculateBonusXP(testPlayerId, 'gather_herbs', baseXP);
      expect(bonus).toBe(0);
    });

    it('should handle invalid action types', async () => {
      await professionService.addProfessionExperience(testPlayerId, 'alchemist', 100);
      
      const bonus = professionService.calculateBonusXP(testPlayerId, 'invalid_action', 100);
      expect(bonus).toBe(0);
    });

    it('should handle zero or negative experience amounts', async () => {
      await professionService.addProfessionExperience(testPlayerId, 'alchemist', 100);
      
      expect(
        professionService.calculateBonusXP(testPlayerId, 'gather_herbs', 0)
      ).toBe(0);
      
      expect(
        professionService.calculateBonusXP(testPlayerId, 'gather_herbs', -100)
      ).toBe(0);
    });
  });
});