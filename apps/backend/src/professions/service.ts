import type {
  PlayerProfessions,
  ProfessionLevel,
  ProfessionType,
} from '../../shared/src/types';
import type { ProfessionsRepository } from '../storage/professionsRepository';

type Logger = Pick<Console, 'info' | 'warn' | 'error'>;

export interface ProfessionConfig {
  baseXpPerLevel?: number;
}

export class ProfessionService {
  private readonly baseXpPerLevel: number;

  constructor(
    private readonly repository: ProfessionsRepository,
    private readonly logger: Logger = console,
    private readonly clock: () => number = () => Date.now(),
    config: ProfessionConfig = {}
  ) {
    this.baseXpPerLevel = config.baseXpPerLevel ?? 100;
  }

  static calculateXpThreshold(level: number): number {
    if (level <= 1) {
      return 0;
    }
    return Math.floor(150 * Math.pow(level, 1.3));
  }

  static calculateCumulativeXp(level: number): number {
    let total = 0;
    for (let i = 2; i <= level; i++) {
      total += ProfessionService.calculateXpThreshold(i);
    }
    return total;
  }

  static getBonus(profession: ProfessionType, level: number): number {
    const baseBonuses: Record<ProfessionType, number> = {
      worker: 0.05,
      crafter: 0.03,
      enchanter: 0.02,
      merchant: 0.04,
      lootboxer: 0.06,
    };

    const baseBonus = baseBonuses[profession];
    return 1 + baseBonus * (level - 1);
  }

  async getOrCreateProfessions(playerId: string): Promise<PlayerProfessions> {
    let professions = await this.repository.get(playerId);
    if (!professions) {
      professions = this.createNewProfessions(playerId);
      await this.repository.set(playerId, professions);
    }
    return professions;
  }

  private createNewProfessions(playerId: string): PlayerProfessions {
    const now = new Date(this.clock());
    const professions: Record<ProfessionType, ProfessionLevel> = {
      worker: {
        profession: 'worker',
        level: 1,
        currentXp: 0,
        totalXpEarned: 0,
        createdAt: now,
        updatedAt: now,
      },
      crafter: {
        profession: 'crafter',
        level: 1,
        currentXp: 0,
        totalXpEarned: 0,
        createdAt: now,
        updatedAt: now,
      },
      enchanter: {
        profession: 'enchanter',
        level: 1,
        currentXp: 0,
        totalXpEarned: 0,
        createdAt: now,
        updatedAt: now,
      },
      merchant: {
        profession: 'merchant',
        level: 1,
        currentXp: 0,
        totalXpEarned: 0,
        createdAt: now,
        updatedAt: now,
      },
      lootboxer: {
        profession: 'lootboxer',
        level: 1,
        currentXp: 0,
        totalXpEarned: 0,
        createdAt: now,
        updatedAt: now,
      },
    };

    return {
      playerId,
      professions,
      createdAt: now,
      updatedAt: now,
    };
  }

  async gainProfessionXp(
    playerId: string,
    profession: ProfessionType,
    xpAmount: number
  ): Promise<PlayerProfessions> {
    if (xpAmount <= 0) {
      throw new Error('XP amount must be positive');
    }

    const professions = await this.getOrCreateProfessions(playerId);
    const professionLevel = professions.professions[profession];

    professionLevel.currentXp += xpAmount;
    professionLevel.totalXpEarned += xpAmount;
    const now = this.clock();
    professionLevel.updatedAt = new Date(now);

    while (this.canLevelUp(professionLevel)) {
      await this.performLevelUp(professionLevel);
    }

    professions.updatedAt = new Date(now);
    await this.repository.set(playerId, professions);
    this.logger.info(
      `Player ${playerId} gained ${xpAmount} XP for ${profession}. Level: ${professionLevel.level}, Current XP: ${professionLevel.currentXp}`
    );

    return professions;
  }

  private canLevelUp(professionLevel: ProfessionLevel): boolean {
    const nextLevelXp = ProfessionService.calculateXpThreshold(
      professionLevel.level + 1
    );
    return professionLevel.currentXp >= nextLevelXp;
  }

  private performLevelUp(professionLevel: ProfessionLevel): void {
    const nextLevelXp = ProfessionService.calculateXpThreshold(
      professionLevel.level + 1
    );
    professionLevel.currentXp -= nextLevelXp;
    professionLevel.level += 1;

    this.logger.info(
      `Profession ${professionLevel.profession} leveled up to level ${professionLevel.level}`
    );
  }

  getNextLevelXp(professionLevel: ProfessionLevel): number {
    return ProfessionService.calculateXpThreshold(professionLevel.level + 1);
  }

  getProgressToNextLevel(professionLevel: ProfessionLevel): number {
    const nextLevelXp = this.getNextLevelXp(professionLevel);
    if (nextLevelXp === 0) {
      return 100;
    }
    return Math.min(100, (professionLevel.currentXp / nextLevelXp) * 100);
  }

  async updateProfession(
    playerId: string,
    profession: ProfessionType,
    professionLevel: ProfessionLevel
  ): Promise<PlayerProfessions> {
    const professions = await this.getOrCreateProfessions(playerId);
    professions.professions[profession] = professionLevel;
    professions.updatedAt = new Date(this.clock());
    await this.repository.set(playerId, professions);
    return professions;
  }
}
