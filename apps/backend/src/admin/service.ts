import type { PlayerStats } from '@shared';
import type { ActionType } from '../actions/metadata';
import type { PlayerProgressionService } from '../progression/service';
import type { ProfessionService } from '../professions/service';
import type { EconomyService } from '../economy/service';
import type { ActionCooldownService } from '../cooldowns/service';
import type { EventService } from '../events/service';
import type { ProgressionRepository } from '../storage/progressionRepository';
import type { Logger } from '../http/logger';

export interface AuditLogEntry {
  timestamp: Date;
  action: string;
  playerId?: string;
  details: Record<string, unknown>;
  performedBy?: string;
}

export interface AdminServiceOptions {
  progressionService: PlayerProgressionService;
  progressionRepository: ProgressionRepository;
  professionService: ProfessionService;
  economyService: EconomyService;
  cooldownService: ActionCooldownService;
  eventService?: EventService;
  logger?: Logger;
}

export class AdminService {
  private readonly progressionService: PlayerProgressionService;
  private readonly progressionRepository: ProgressionRepository;
  private readonly professionService: ProfessionService;
  private readonly economyService: EconomyService;
  private readonly cooldownService: ActionCooldownService;
  private readonly eventService?: EventService;
  private readonly logger: Logger;
  private readonly auditLog: AuditLogEntry[] = [];

  constructor(options: AdminServiceOptions) {
    this.progressionService = options.progressionService;
    this.progressionRepository = options.progressionRepository;
    this.professionService = options.professionService;
    this.economyService = options.economyService;
    this.cooldownService = options.cooldownService;
    this.eventService = options.eventService;
    this.logger = options.logger ?? console;
  }

  async adjustResources(
    playerId: string,
    resources: { coins?: number; gems?: number },
    performedBy?: string
  ): Promise<void> {
    this.logger.log(
      `[AdminService] Adjusting resources for player ${playerId}: ${JSON.stringify(resources)}`
    );

    const inventory = await this.economyService.getOrCreateInventory(playerId);

    if (resources.coins !== undefined) {
      const newCoins = Math.max(0, inventory.coins + resources.coins);
      inventory.coins = newCoins;
    }

    if (resources.gems !== undefined) {
      const newGems = Math.max(0, inventory.gems + resources.gems);
      inventory.gems = newGems;
    }

    await this.economyService.updateInventory(playerId, inventory);

    this.logAudit({
      action: 'adjust_resources',
      playerId,
      details: resources,
      performedBy,
    });
  }

  async adjustExperience(
    playerId: string,
    amount: number,
    performedBy?: string
  ): Promise<void> {
    this.logger.log(
      `[AdminService] Adjusting XP for player ${playerId}: ${amount}`
    );

    if (amount > 0) {
      await this.progressionService.gainXp(playerId, amount);
    } else if (amount < 0) {
      const player = await this.progressionService.getOrCreatePlayer(playerId);
      player.currentXp = Math.max(0, player.currentXp + amount);
      player.totalXpEarned = Math.max(0, player.totalXpEarned + amount);
      player.updatedAt = new Date();
      await this.progressionService.recalculateDerivedStats(playerId);
    }

    this.logAudit({
      action: 'adjust_experience',
      playerId,
      details: { amount },
      performedBy,
    });
  }

  async adjustStats(
    playerId: string,
    stats: Partial<PlayerStats>,
    performedBy?: string
  ): Promise<void> {
    this.logger.log(
      `[AdminService] Adjusting stats for player ${playerId}: ${JSON.stringify(stats)}`
    );

    const player = await this.progressionService.getOrCreatePlayer(playerId);

    for (const [stat, value] of Object.entries(stats)) {
      if (value !== undefined && stat in player.baseStats) {
        player.baseStats[stat as keyof PlayerStats] = Math.max(1, value as number);
      }
    }

    player.updatedAt = new Date();
    await this.progressionRepository.set(playerId, player);
    await this.progressionService.recalculateDerivedStats(playerId);

    this.logAudit({
      action: 'adjust_stats',
      playerId,
      details: stats,
      performedBy,
    });
  }

  async resetCooldown(
    playerId: string,
    action: ActionType,
    performedBy?: string
  ): Promise<void> {
    this.logger.log(
      `[AdminService] Resetting cooldown for player ${playerId}, action ${action}`
    );

    await this.cooldownService.clearCooldown(playerId, action);

    this.logAudit({
      action: 'reset_cooldown',
      playerId,
      details: { action },
      performedBy,
    });
  }

  async resetAllCooldowns(
    playerId: string,
    performedBy?: string
  ): Promise<void> {
    this.logger.log(
      `[AdminService] Resetting all cooldowns for player ${playerId}`
    );

    const actions: ActionType[] = [
      'gather',
      'craft',
      'enchant',
      'trade',
      'explore',
    ];

    for (const action of actions) {
      await this.cooldownService.clearCooldown(playerId, action);
    }

    this.logAudit({
      action: 'reset_all_cooldowns',
      playerId,
      details: {},
      performedBy,
    });
  }

  getAuditLog(limit?: number): AuditLogEntry[] {
    const log = [...this.auditLog].reverse();
    return limit ? log.slice(0, limit) : log;
  }

  getPlayerAuditLog(playerId: string, limit?: number): AuditLogEntry[] {
    const filtered = this.auditLog
      .filter(entry => entry.playerId === playerId)
      .reverse();
    return limit ? filtered.slice(0, limit) : filtered;
  }

  private logAudit(entry: Omit<AuditLogEntry, 'timestamp'>): void {
    const auditEntry: AuditLogEntry = {
      timestamp: new Date(),
      ...entry,
    };
    this.auditLog.push(auditEntry);
    this.logger.log(
      `[AdminService] Audit: ${entry.action} ${entry.playerId ? `for ${entry.playerId}` : ''}`
    );
  }
}
