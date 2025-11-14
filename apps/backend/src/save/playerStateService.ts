import type {
  PlayerProgression,
  PlayerProfessions,
  PlayerInventory,
  PlayerDungeonState,
  PlayerArenaState,
} from '@shared';
import type { ActionType } from '../actions/metadata';
import type { CooldownEntry } from '../storage/cooldownRepository';
import type { ProgressionRepository } from '../storage/progressionRepository';
import type { ProfessionsRepository } from '../storage/professionsRepository';
import type { InventoryRepository } from '../storage/inventoryRepository';
import type { DungeonRepository } from '../storage/dungeonRepository';
import type { ArenaRepository } from '../storage/arenaRepository';
import type { CooldownRepository } from '../storage/cooldownRepository';
import type { Logger } from '../http/logger';

export interface ExportedPlayerState {
  playerId: string;
  exportedAt: string;
  version: string;
  progression?: PlayerProgression;
  professions?: PlayerProfessions;
  inventory?: PlayerInventory;
  dungeons?: PlayerDungeonState;
  arena?: PlayerArenaState;
  cooldowns?: Record<ActionType, CooldownEntry>;
}

export interface ImportValidationError {
  field: string;
  message: string;
}

export interface ImportResult {
  success: boolean;
  errors?: ImportValidationError[];
  imported?: {
    progression: boolean;
    professions: boolean;
    inventory: boolean;
    dungeons: boolean;
    arena: boolean;
    cooldowns: boolean;
  };
}

export interface PlayerStateServiceOptions {
  progressionRepository: ProgressionRepository;
  professionsRepository: ProfessionsRepository;
  inventoryRepository: InventoryRepository;
  dungeonRepository: DungeonRepository;
  arenaRepository: ArenaRepository;
  cooldownRepository: CooldownRepository;
  logger?: Logger;
}

export class PlayerStateService {
  private readonly progressionRepository: ProgressionRepository;
  private readonly professionsRepository: ProfessionsRepository;
  private readonly inventoryRepository: InventoryRepository;
  private readonly dungeonRepository: DungeonRepository;
  private readonly arenaRepository: ArenaRepository;
  private readonly cooldownRepository: CooldownRepository;
  private readonly logger: Logger;
  private readonly version = '1.0.0';

  constructor(options: PlayerStateServiceOptions) {
    this.progressionRepository = options.progressionRepository;
    this.professionsRepository = options.professionsRepository;
    this.inventoryRepository = options.inventoryRepository;
    this.dungeonRepository = options.dungeonRepository;
    this.arenaRepository = options.arenaRepository;
    this.cooldownRepository = options.cooldownRepository;
    this.logger = options.logger ?? console;
  }

  async exportPlayerState(playerId: string): Promise<ExportedPlayerState> {
    this.logger.log(`[PlayerStateService] Exporting state for player ${playerId}`);

    const progression = await this.progressionRepository.get(playerId);
    const professions = await this.professionsRepository.get(playerId);
    const inventory = await this.inventoryRepository.get(playerId);
    const dungeons = await this.dungeonRepository.get(playerId);
    const arena = await this.arenaRepository.get(playerId);

    const cooldowns: Record<string, CooldownEntry> = {};
    const actions: ActionType[] = [
      'gather',
      'craft',
      'enchant',
      'trade',
      'explore',
    ];

    for (const action of actions) {
      const cooldown = await this.cooldownRepository.get(playerId, action);
      if (cooldown) {
        cooldowns[action] = cooldown;
      }
    }

    return {
      playerId,
      exportedAt: new Date().toISOString(),
      version: this.version,
      progression: progression ?? undefined,
      professions: professions ?? undefined,
      inventory: inventory ?? undefined,
      dungeons: dungeons ?? undefined,
      arena: arena ?? undefined,
      cooldowns: Object.keys(cooldowns).length > 0 ? cooldowns as Record<ActionType, CooldownEntry> : undefined,
    };
  }

  async importPlayerState(
    state: ExportedPlayerState,
    options: { overwrite?: boolean } = {}
  ): Promise<ImportResult> {
    const { playerId } = state;
    const { overwrite = false } = options;

    this.logger.log(
      `[PlayerStateService] Importing state for player ${playerId} (overwrite: ${overwrite})`
    );

    const errors = this.validateImport(state);
    if (errors.length > 0) {
      return { success: false, errors };
    }

    if (!overwrite) {
      const existing = await this.checkExistingData(playerId);
      if (existing.hasData) {
        return {
          success: false,
          errors: [
            {
              field: 'playerId',
              message: `Player ${playerId} already has data. Use overwrite option to replace.`,
            },
          ],
        };
      }
    }

    const imported = {
      progression: false,
      professions: false,
      inventory: false,
      dungeons: false,
      arena: false,
      cooldowns: false,
    };

    try {
      if (state.progression) {
        const progression = this.deserializeProgression(state.progression);
        await this.progressionRepository.set(playerId, progression);
        imported.progression = true;
      }

      if (state.professions) {
        const professions = this.deserializeProfessions(state.professions);
        await this.professionsRepository.set(playerId, professions);
        imported.professions = true;
      }

      if (state.inventory) {
        const inventory = this.deserializeInventory(state.inventory);
        await this.inventoryRepository.set(playerId, inventory);
        imported.inventory = true;
      }

      if (state.dungeons) {
        const dungeons = this.deserializeDungeons(state.dungeons);
        await this.dungeonRepository.set(playerId, dungeons);
        imported.dungeons = true;
      }

      if (state.arena) {
        const arena = this.deserializeArena(state.arena);
        await this.arenaRepository.set(playerId, arena);
        imported.arena = true;
      }

      if (state.cooldowns) {
        for (const [action, entry] of Object.entries(state.cooldowns)) {
          await this.cooldownRepository.set(
            playerId,
            action as ActionType,
            entry
          );
        }
        imported.cooldowns = true;
      }

      this.logger.log(
        `[PlayerStateService] Successfully imported state for player ${playerId}`
      );

      return { success: true, imported };
    } catch (error) {
      this.logger.error(
        `[PlayerStateService] Error importing state: ${(error as Error).message}`
      );
      return {
        success: false,
        errors: [
          {
            field: 'import',
            message: `Failed to import state: ${(error as Error).message}`,
          },
        ],
      };
    }
  }

  private validateImport(state: ExportedPlayerState): ImportValidationError[] {
    const errors: ImportValidationError[] = [];

    if (!state.playerId || typeof state.playerId !== 'string') {
      errors.push({ field: 'playerId', message: 'Player ID is required' });
    }

    if (!state.version || typeof state.version !== 'string') {
      errors.push({ field: 'version', message: 'Version is required' });
    }

    if (
      !state.progression &&
      !state.professions &&
      !state.inventory &&
      !state.dungeons &&
      !state.arena &&
      !state.cooldowns
    ) {
      errors.push({
        field: 'data',
        message: 'At least one data type must be provided',
      });
    }

    return errors;
  }

  private async checkExistingData(
    playerId: string
  ): Promise<{ hasData: boolean }> {
    const [progression, professions, inventory, dungeons, arena] =
      await Promise.all([
        this.progressionRepository.get(playerId),
        this.professionsRepository.get(playerId),
        this.inventoryRepository.get(playerId),
        this.dungeonRepository.get(playerId),
        this.arenaRepository.get(playerId),
      ]);

    return {
      hasData: Boolean(
        progression || professions || inventory || dungeons || arena
      ),
    };
  }

  private deserializeProgression(data: PlayerProgression): PlayerProgression {
    return {
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    };
  }

  private deserializeProfessions(data: PlayerProfessions): PlayerProfessions {
    const professions = { ...data.professions };
    for (const key in professions) {
      const prof = professions[key as keyof typeof professions];
      prof.createdAt = new Date(prof.createdAt);
      prof.updatedAt = new Date(prof.updatedAt);
    }
    return {
      ...data,
      professions,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    };
  }

  private deserializeInventory(data: PlayerInventory): PlayerInventory {
    return {
      ...data,
      lastTransactionAt: data.lastTransactionAt
        ? new Date(data.lastTransactionAt)
        : undefined,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    };
  }

  private deserializeDungeons(data: PlayerDungeonState): PlayerDungeonState {
    const dungeons = { ...data.dungeons };
    for (const key in dungeons) {
      const dungeon = dungeons[key];
      if (dungeon.lastCompletedAt) {
        dungeon.lastCompletedAt = new Date(dungeon.lastCompletedAt);
      }
      if (dungeon.lastResetAt) {
        dungeon.lastResetAt = new Date(dungeon.lastResetAt);
      }
      if (dungeon.activeRun) {
        dungeon.activeRun.startedAt = new Date(dungeon.activeRun.startedAt);
        dungeon.activeRun.updatedAt = new Date(dungeon.activeRun.updatedAt);
      }
    }
    return {
      ...data,
      dungeons,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    };
  }

  private deserializeArena(data: PlayerArenaState): PlayerArenaState {
    return {
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      history: data.history.map(match => ({
        ...match,
        timestamp: new Date(match.timestamp),
        logs: match.logs.map(log => ({
          ...log,
          timestamp: new Date(log.timestamp),
        })),
      })),
    };
  }
}
