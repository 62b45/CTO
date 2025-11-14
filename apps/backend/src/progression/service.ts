import type { PlayerProgression, PlayerStats, DerivedStats } from '@shared';
import type { ProgressionRepository } from '../storage/progressionRepository';

type Logger = Pick<Console, 'info' | 'warn' | 'error'>;

export interface ProgressionConfig {
  baseStatsPerLevel?: number;
  statRewardPerLevelUp?: number;
}

export class PlayerProgressionService {
  private readonly baseStatsPerLevel: number;
  private readonly statRewardPerLevelUp: number;

  constructor(
    private readonly repository: ProgressionRepository,
    private readonly logger: Logger = console,
    private readonly clock: () => number = () => Date.now(),
    config: ProgressionConfig = {}
  ) {
    this.baseStatsPerLevel = config.baseStatsPerLevel ?? 5;
    this.statRewardPerLevelUp = config.statRewardPerLevelUp ?? 3;
  }

  /**
   * Calculate XP required to reach a given level using the formula: floor(100 * level^1.5)
   */
  static calculateXpThreshold(level: number): number {
    if (level <= 1) {
      return 0;
    }
    return Math.floor(100 * Math.pow(level, 1.5));
  }

  /**
   * Calculate the total XP needed to reach a given level (cumulative)
   */
  static calculateCumulativeXp(level: number): number {
    let total = 0;
    for (let i = 2; i <= level; i++) {
      total += PlayerProgressionService.calculateXpThreshold(i);
    }
    return total;
  }

  /**
   * Get or create a player's progression data
   */
  async getOrCreatePlayer(playerId: string): Promise<PlayerProgression> {
    let player = await this.repository.get(playerId);
    if (!player) {
      player = this.createNewPlayer(playerId);
      await this.repository.set(playerId, player);
    }
    return player;
  }

  private createNewPlayer(playerId: string): PlayerProgression {
    const now = new Date(this.clock());
    return {
      playerId,
      level: 1,
      currentXp: 0,
      totalXpEarned: 0,
      baseStats: {
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
      },
      derivedStats: this.calculateDerivedStats(
        {
          strength: 10,
          dexterity: 10,
          constitution: 10,
          intelligence: 10,
          wisdom: 10,
          charisma: 10,
        },
        1
      ),
      recentLevelGains: [],
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Calculate derived stats based on base stats and level
   */
  private calculateDerivedStats(
    baseStats: PlayerStats,
    level: number
  ): DerivedStats {
    return {
      health: baseStats.constitution * 10 + level * 5,
      mana: baseStats.intelligence * 8 + level * 3,
      attackPower: baseStats.strength * 2 + level * 1,
      defensePower: baseStats.constitution * 1.5 + level * 0.5,
    };
  }

  /**
   * Gain XP for a player and handle level ups
   */
  async gainXp(playerId: string, xpAmount: number): Promise<PlayerProgression> {
    const player = await this.getOrCreatePlayer(playerId);

    player.currentXp += xpAmount;
    player.totalXpEarned += xpAmount;
    const now = this.clock();
    player.updatedAt = new Date(now);

    // Check for level ups
    while (this.canLevelUp(player)) {
      await this.performLevelUp(player);
    }

    await this.repository.set(playerId, player);
    this.logger.info(
      `Player ${playerId} gained ${xpAmount} XP. Level: ${player.level}, Current XP: ${player.currentXp}`
    );

    return player;
  }

  private canLevelUp(player: PlayerProgression): boolean {
    const nextLevelXp = PlayerProgressionService.calculateXpThreshold(
      player.level + 1
    );
    return player.currentXp >= nextLevelXp;
  }

  private performLevelUp(player: PlayerProgression): void {
    const nextLevelXp = PlayerProgressionService.calculateXpThreshold(
      player.level + 1
    );
    player.currentXp -= nextLevelXp;
    player.level += 1;
    player.recentLevelGains.push(player.level);

    // Keep only the last 10 level ups
    if (player.recentLevelGains.length > 10) {
      player.recentLevelGains.shift();
    }

    this.logger.info(
      `Player ${player.playerId} leveled up to level ${player.level}`
    );
  }

  /**
   * Allocate stat rewards (points earned from leveling)
   */
  async allocateStat(
    playerId: string,
    stat: keyof PlayerStats,
    amount: number
  ): Promise<PlayerProgression> {
    if (amount <= 0) {
      throw new Error('Stat amount must be positive');
    }

    const player = await this.getOrCreatePlayer(playerId);
    player.baseStats[stat] += amount;
    player.derivedStats = this.calculateDerivedStats(
      player.baseStats,
      player.level
    );
    const now = this.clock();
    player.updatedAt = new Date(now);

    await this.repository.set(playerId, player);
    this.logger.info(
      `Player ${playerId} allocated +${amount} to ${String(stat)}`
    );

    return player;
  }

  /**
   * Recalculate all derived stats (for consistency)
   */
  async recalculateDerivedStats(playerId: string): Promise<PlayerProgression> {
    const player = await this.getOrCreatePlayer(playerId);
    player.derivedStats = this.calculateDerivedStats(
      player.baseStats,
      player.level
    );
    const now = this.clock();
    player.updatedAt = new Date(now);

    await this.repository.set(playerId, player);
    this.logger.info(`Player ${playerId} derived stats recalculated`);

    return player;
  }

  /**
   * Get XP required for next level
   */
  getNextLevelXp(player: PlayerProgression): number {
    return PlayerProgressionService.calculateXpThreshold(player.level + 1);
  }

  /**
   * Get progress to next level as a percentage (0-100)
   */
  getProgressToNextLevel(player: PlayerProgression): number {
    const nextLevelXp = this.getNextLevelXp(player);
    if (nextLevelXp === 0) {
      return 100;
    }
    return Math.min(100, (player.currentXp / nextLevelXp) * 100);
  }
}
