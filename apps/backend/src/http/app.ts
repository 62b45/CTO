import express, { type Express, type Request, type Response } from 'express';
import type {
  PlayerStats,
  ProfessionType,
  DungeonProgress,
  DungeonRunState,
  DungeonRunRewardSummary,
  CombatResult,
  PlayerArenaState,
  ArenaMatchRecord,
  ArenaOpponent,
} from '@shared';
import {
  ACTION_METADATA,
  ACTION_TYPES,
  ActionHandler,
  ActionResult,
  ActionType,
  createActionHandlers,
  isActionType,
} from '../actions/metadata';
import { CooldownActiveError } from '../cooldowns/errors';
import { ActionCooldownService } from '../cooldowns/service';
import { PlayerProgressionService } from '../progression/service';
import { ProfessionService } from '../professions/service';
import type { EconomyService } from '../economy/service';
import { DungeonService } from '../dungeons/service';
import { ArenaService } from '../arena/service';

export interface CreateAppOptions {
  service: ActionCooldownService;
  progressionService?: PlayerProgressionService;
  professionService?: ProfessionService;
  economyService?: EconomyService;
  dungeonService?: DungeonService;
  arenaService?: ArenaService;
  handlers?: Partial<Record<ActionType, ActionHandler>>;
  logger?: Pick<Console, 'error'>;
}

interface SuccessPayload {
  success: true;
  data: {
    action: ActionType;
    playerId: string;
    triggeredAt: string;
    cooldown: {
      durationMs: number;
      availableAt: string;
      remainingMs: number;
    };
    result: ActionResult;
  };
}

interface ErrorPayload {
  success: false;
  message: string;
  cooldown?: {
    availableAt: string;
    remainingMs: number;
  };
}

type PlayerActionParams = {
  playerId: string;
  action: string;
};

function formatDate(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

function buildHandlers(
  overrides?: Partial<Record<ActionType, ActionHandler>>
): Record<ActionType, ActionHandler> {
  const defaults = createActionHandlers();
  if (!overrides) {
    return defaults;
  }

  return ACTION_TYPES.reduce<Record<ActionType, ActionHandler>>(
    (acc, action) => {
      acc[action] = overrides[action] ?? defaults[action];
      return acc;
    },
    {} as Record<ActionType, ActionHandler>
  );
}

function serializeDate(value?: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function serializeRewardSummary(summary: DungeonRunRewardSummary) {
  return {
    experience: summary.experience,
    gold: summary.gold,
    items: [...summary.items],
  };
}

function serializeDungeonRun(run?: DungeonRunState | null) {
  if (!run) {
    return null;
  }

  return {
    dungeonId: run.dungeonId,
    status: run.status,
    currentFloor: run.currentFloor,
    currentBossPhase: run.currentBossPhase ?? null,
    floorsCleared: [...run.floorsCleared],
    accumulatedRewards: serializeRewardSummary(run.accumulatedRewards),
    startedAt: serializeDate(run.startedAt),
    updatedAt: serializeDate(run.updatedAt),
    lastOutcome: run.lastOutcome ?? null,
  };
}

function serializeDungeonProgress(progress: DungeonProgress) {
  return {
    dungeonId: progress.dungeonId,
    highestFloorReached: progress.highestFloorReached,
    timesCompleted: progress.timesCompleted,
    lastCompletedAt: serializeDate(progress.lastCompletedAt),
    lastResetAt: serializeDate(progress.lastResetAt),
    activeRun: serializeDungeonRun(progress.activeRun ?? null),
  };
}

function serializeCombatResult(result: CombatResult) {
  return {
    winner: result.winner,
    loser: result.loser,
    turns: result.turns,
    rewards: {
      experience: result.rewards.experience,
      gold: result.rewards.gold,
      items: result.rewards.items ? [...result.rewards.items] : [],
    },
    logs: result.logs.map(log => ({
      turn: log.turn,
      timestamp: log.timestamp.toISOString(),
      action: { ...log.action },
      description: log.description,
      remainingHealth: { ...log.remainingHealth },
    })),
  };
}

function serializeArenaMatch(match: ArenaMatchRecord) {
  return {
    matchId: match.matchId,
    playerId: match.playerId,
    opponent: {
      ...match.opponent,
      stats: { ...match.opponent.stats },
      weapon: { ...match.opponent.weapon },
    },
    outcome: match.outcome,
    turns: match.turns,
    rewards: {
      experience: match.rewards.experience,
      gold: match.rewards.gold,
      items: match.rewards.items ? [...match.rewards.items] : [],
    },
    timestamp: match.timestamp.toISOString(),
    logs: match.logs.map(log => ({
      turn: log.turn,
      timestamp: log.timestamp.toISOString(),
      action: { ...log.action },
      description: log.description,
      remainingHealth: { ...log.remainingHealth },
    })),
  };
}

function serializeArenaState(state: PlayerArenaState) {
  return {
    playerId: state.playerId,
    rating: state.rating,
    wins: state.wins,
    losses: state.losses,
    streak: state.streak,
    bestStreak: state.bestStreak,
    createdAt: state.createdAt.toISOString(),
    updatedAt: state.updatedAt.toISOString(),
    history: state.history.map(serializeArenaMatch),
  };
}

export function createApp({
  service,
  progressionService,
  professionService,
  economyService,
  dungeonService,
  arenaService,
  handlers: overrides,
  logger,
}: CreateAppOptions): Express {
  const app = express();
  const handlers = buildHandlers(overrides);
  const errLogger = logger ?? console;

  app.use(express.json());

  app.get('/actions', (_req, res) => {
    res.json({
      success: true,
      data: ACTION_TYPES.map(action => ACTION_METADATA[action]),
    });
  });

  app.get(
    '/players/:playerId/actions/:action/cooldown',
    async (req: Request<PlayerActionParams>, res: Response) => {
      const { playerId, action: actionParam } = req.params;
      if (!isActionType(actionParam)) {
        res
          .status(404)
          .json({ success: false, message: `Unknown action: ${actionParam}` });
        return;
      }

      const action = actionParam as ActionType;
      const snapshot = await service.getCooldown(playerId, action);
      if (!snapshot) {
        res.json({
          success: true,
          data: {
            action,
            playerId,
            cooldown: null,
          },
        });
        return;
      }

      res.json({
        success: true,
        data: {
          action,
          playerId,
          cooldown: {
            lastTriggeredAt: formatDate(snapshot.lastTriggeredAt),
            availableAt: formatDate(snapshot.availableAt),
            remainingMs: snapshot.remainingMs,
          },
        },
      });
    }
  );

  app.post(
    '/players/:playerId/actions/:action',
    async (
      req: Request<PlayerActionParams>,
      res: Response<SuccessPayload | ErrorPayload>
    ) => {
      const { playerId, action: actionParam } = req.params;

      if (!isActionType(actionParam)) {
        res.status(404).json({
          success: false,
          message: `Unknown action: ${actionParam}`,
        });
        return;
      }

      const action = actionParam as ActionType;

      try {
        const outcome = await service.trigger({
          playerId,
          action,
          handler: handlers[action],
        });
        const now = Date.now();
        const remainingMs = Math.max(0, outcome.availableAt - now);

        res.json({
          success: true,
          data: {
            action,
            playerId,
            triggeredAt: formatDate(outcome.triggeredAt),
            cooldown: {
              durationMs: outcome.metadata.cooldownMs,
              availableAt: formatDate(outcome.availableAt),
              remainingMs,
            },
            result: outcome.result,
          },
        });
      } catch (error) {
        if (error instanceof CooldownActiveError) {
          res.status(429).json({
            success: false,
            message: error.message,
            cooldown: {
              availableAt: formatDate(error.availableAt),
              remainingMs: error.remainingMs,
            },
          });
          return;
        }

        errLogger.error(
          'Unexpected error when triggering action %s: %s',
          action,
          (error as Error).stack ?? String(error)
        );

        res.status(500).json({
          success: false,
          message: 'Internal server error',
        });
      }
    }
  );

  if (progressionService) {
    app.get(
      '/players/:playerId/progression',
      async (req: Request<{ playerId: string }>, res: Response) => {
        try {
          const { playerId } = req.params;
          const player = await progressionService.getOrCreatePlayer(playerId);
          const nextLevelXp = progressionService.getNextLevelXp(player);
          const progressToNext =
            progressionService.getProgressToNextLevel(player);

          res.json({
            success: true,
            data: {
              playerId,
              player: {
                level: player.level,
                currentXp: player.currentXp,
                totalXpEarned: player.totalXpEarned,
                nextLevelXp,
                progressToNextLevel: progressToNext,
                baseStats: player.baseStats,
                derivedStats: player.derivedStats,
                recentLevelGains: player.recentLevelGains,
                createdAt: player.createdAt.toISOString(),
                updatedAt: player.updatedAt.toISOString(),
              },
            },
          });
        } catch (error) {
          errLogger.error(
            'Error fetching progression: %s',
            (error as Error).stack ?? String(error)
          );
          res.status(500).json({
            success: false,
            message: 'Internal server error',
          });
        }
      }
    );

    app.post(
      '/players/:playerId/progression/gain-xp',
      async (req: Request<{ playerId: string }>, res: Response) => {
        try {
          const { playerId } = req.params;
          const { amount } = req.body as { amount: number };

          if (!amount || amount <= 0) {
            res.status(400).json({
              success: false,
              message: 'XP amount must be a positive number',
            });
            return;
          }

          const player = await progressionService.gainXp(playerId, amount);
          const nextLevelXp = progressionService.getNextLevelXp(player);
          const progressToNext =
            progressionService.getProgressToNextLevel(player);

          res.json({
            success: true,
            data: {
              playerId,
              player: {
                level: player.level,
                currentXp: player.currentXp,
                totalXpEarned: player.totalXpEarned,
                nextLevelXp,
                progressToNextLevel: progressToNext,
                baseStats: player.baseStats,
                derivedStats: player.derivedStats,
                recentLevelGains: player.recentLevelGains,
                createdAt: player.createdAt.toISOString(),
                updatedAt: player.updatedAt.toISOString(),
              },
            },
          });
        } catch (error) {
          errLogger.error(
            'Error gaining XP: %s',
            (error as Error).stack ?? String(error)
          );
          res.status(500).json({
            success: false,
            message: 'Internal server error',
          });
        }
      }
    );

    app.post(
      '/players/:playerId/progression/allocate-stat',
      async (req: Request<{ playerId: string }>, res: Response) => {
        try {
          const { playerId } = req.params;
          const { stat, amount } = req.body as {
            stat: keyof PlayerStats;
            amount: number;
          };

          if (!stat || !amount || amount <= 0) {
            res.status(400).json({
              success: false,
              message: 'Stat and positive amount are required',
            });
            return;
          }

          const validStats: (keyof PlayerStats)[] = [
            'strength',
            'dexterity',
            'constitution',
            'intelligence',
            'wisdom',
            'charisma',
          ];
          if (!validStats.includes(stat as keyof PlayerStats)) {
            res.status(400).json({
              success: false,
              message: `Invalid stat: ${String(stat)}. Must be one of: ${validStats.join(', ')}`,
            });
            return;
          }

          const player = await progressionService.allocateStat(
            playerId,
            stat,
            amount
          );
          const nextLevelXp = progressionService.getNextLevelXp(player);
          const progressToNext =
            progressionService.getProgressToNextLevel(player);

          res.json({
            success: true,
            data: {
              playerId,
              player: {
                level: player.level,
                currentXp: player.currentXp,
                totalXpEarned: player.totalXpEarned,
                nextLevelXp,
                progressToNextLevel: progressToNext,
                baseStats: player.baseStats,
                derivedStats: player.derivedStats,
                recentLevelGains: player.recentLevelGains,
                createdAt: player.createdAt.toISOString(),
                updatedAt: player.updatedAt.toISOString(),
              },
            },
          });
        } catch (error) {
          if (
            error instanceof Error &&
            error.message.includes('Stat amount must be positive')
          ) {
            res.status(400).json({
              success: false,
              message: error.message,
            });
            return;
          }

          errLogger.error(
            'Error allocating stat: %s',
            (error as Error).stack ?? String(error)
          );
          res.status(500).json({
            success: false,
            message: 'Internal server error',
          });
        }
      }
    );

    app.post(
      '/players/:playerId/progression/recalculate-stats',
      async (req: Request<{ playerId: string }>, res: Response) => {
        try {
          const { playerId } = req.params;
          const player =
            await progressionService.recalculateDerivedStats(playerId);
          const nextLevelXp = progressionService.getNextLevelXp(player);
          const progressToNext =
            progressionService.getProgressToNextLevel(player);

          res.json({
            success: true,
            data: {
              playerId,
              player: {
                level: player.level,
                currentXp: player.currentXp,
                totalXpEarned: player.totalXpEarned,
                nextLevelXp,
                progressToNextLevel: progressToNext,
                baseStats: player.baseStats,
                derivedStats: player.derivedStats,
                recentLevelGains: player.recentLevelGains,
                createdAt: player.createdAt.toISOString(),
                updatedAt: player.updatedAt.toISOString(),
              },
            },
          });
        } catch (error) {
          errLogger.error(
            'Error recalculating stats: %s',
            (error as Error).stack ?? String(error)
          );
          res.status(500).json({
            success: false,
            message: 'Internal server error',
          });
        }
      }
    );
  }

  if (professionService) {
    app.get(
      '/players/:playerId/professions',
      async (req: Request<{ playerId: string }>, res: Response) => {
        try {
          const { playerId } = req.params;
          const professions =
            await professionService.getOrCreateProfessions(playerId);

          res.json({
            success: true,
            data: {
              playerId,
              professions: Object.entries(professions.professions).map(
                ([, prof]) => ({
                  profession: prof.profession,
                  level: prof.level,
                  currentXp: prof.currentXp,
                  totalXpEarned: prof.totalXpEarned,
                  nextLevelXp: professionService.getNextLevelXp(prof),
                  progressToNextLevel:
                    professionService.getProgressToNextLevel(prof),
                  bonus: (
                    professionService.constructor as typeof ProfessionService
                  ).getBonus(prof.profession, prof.level),
                  createdAt: prof.createdAt.toISOString(),
                  updatedAt: prof.updatedAt.toISOString(),
                })
              ),
            },
          });
        } catch (error) {
          errLogger.error(
            'Error fetching professions: %s',
            (error as Error).stack ?? String(error)
          );
          res.status(500).json({
            success: false,
            message: 'Internal server error',
          });
        }
      }
    );

    app.post(
      '/players/:playerId/professions/:profession/gain-xp',
      async (
        req: Request<{ playerId: string; profession: string }>,
        res: Response
      ) => {
        try {
          const { playerId, profession: professionParam } = req.params;
          const { amount } = req.body as { amount: number };

          if (!amount || amount <= 0) {
            res.status(400).json({
              success: false,
              message: 'XP amount must be a positive number',
            });
            return;
          }

          const validProfessions: ProfessionType[] = [
            'worker',
            'crafter',
            'enchanter',
            'merchant',
            'lootboxer',
          ];

          if (!validProfessions.includes(professionParam as ProfessionType)) {
            res.status(400).json({
              success: false,
              message: `Invalid profession: ${professionParam}`,
            });
            return;
          }

          const profession = professionParam as ProfessionType;
          const professions = await professionService.gainProfessionXp(
            playerId,
            profession,
            amount
          );

          const prof = professions.professions[profession];
          res.json({
            success: true,
            data: {
              playerId,
              profession: {
                profession: prof.profession,
                level: prof.level,
                currentXp: prof.currentXp,
                totalXpEarned: prof.totalXpEarned,
                nextLevelXp: professionService.getNextLevelXp(prof),
                progressToNextLevel:
                  professionService.getProgressToNextLevel(prof),
                bonus: (
                  professionService.constructor as typeof ProfessionService
                ).getBonus(prof.profession, prof.level),
                createdAt: prof.createdAt.toISOString(),
                updatedAt: prof.updatedAt.toISOString(),
              },
            },
          });
        } catch (error) {
          errLogger.error(
            'Error gaining profession XP: %s',
            (error as Error).stack ?? String(error)
          );
          res.status(500).json({
            success: false,
            message: 'Internal server error',
          });
        }
      }
    );
  }

  if (dungeonService) {
    app.get(
      '/players/:playerId/dungeons',
      async (req: Request<{ playerId: string }>, res: Response) => {
        try {
          const { playerId } = req.params;
          const summaries = await dungeonService.listForPlayer(playerId);
          res.json({
            success: true,
            data: summaries.map(summary => ({
              definition: summary.definition,
              progress: serializeDungeonProgress(summary.progress),
              unlocked: summary.unlocked,
            })),
          });
        } catch (error) {
          errLogger.error(
            'Error fetching dungeons: %s',
            (error as Error).stack ?? String(error)
          );
          res.status(500).json({
            success: false,
            message: 'Internal server error',
          });
        }
      }
    );

    app.post(
      '/players/:playerId/dungeons/:dungeonId/enter',
      async (
        req: Request<{ playerId: string; dungeonId: string }>,
        res: Response
      ) => {
        try {
          const { playerId, dungeonId } = req.params;
          const { reset } = req.body as { reset?: boolean };
          const run = await dungeonService.enterDungeon(playerId, dungeonId, {
            reset: Boolean(reset),
          });
          const state = await dungeonService.getPlayerState(playerId);
          const progress = state.dungeons[dungeonId];
          res.json({
            success: true,
            data: {
              run: serializeDungeonRun(run),
              progress: progress ? serializeDungeonProgress(progress) : null,
            },
          });
        } catch (error) {
          errLogger.error(
            'Error entering dungeon %s: %s',
            req.params.dungeonId,
            (error as Error).stack ?? String(error)
          );
          res.status(400).json({
            success: false,
            message: (error as Error).message,
          });
        }
      }
    );

    app.post(
      '/players/:playerId/dungeons/:dungeonId/reset',
      async (
        req: Request<{ playerId: string; dungeonId: string }>,
        res: Response
      ) => {
        try {
          const { playerId, dungeonId } = req.params;
          const run = await dungeonService.resetDungeon(playerId, dungeonId);
          const state = await dungeonService.getPlayerState(playerId);
          const progress = state.dungeons[dungeonId];
          res.json({
            success: true,
            data: {
              run: serializeDungeonRun(run),
              progress: progress ? serializeDungeonProgress(progress) : null,
            },
          });
        } catch (error) {
          errLogger.error(
            'Error resetting dungeon %s: %s',
            req.params.dungeonId,
            (error as Error).stack ?? String(error)
          );
          res.status(400).json({
            success: false,
            message: (error as Error).message,
          });
        }
      }
    );

    app.post(
      '/players/:playerId/dungeons/:dungeonId/floors/:floorNumber/enter',
      async (
        req: Request<{ playerId: string; dungeonId: string; floorNumber: string }>,
        res: Response
      ) => {
        try {
          const { playerId, dungeonId, floorNumber } = req.params;
          const parsedFloor = Number.parseInt(floorNumber, 10);
          if (!Number.isFinite(parsedFloor) || parsedFloor <= 0) {
            res.status(400).json({
              success: false,
              message: 'Invalid floor number',
            });
            return;
          }
          const entry = await dungeonService.enterFloor(
            playerId,
            dungeonId,
            parsedFloor
          );
          res.json({
            success: true,
            data: {
              floor: entry.floor,
              run: serializeDungeonRun(entry.run),
              playerCombatant: entry.playerCombatant,
            },
          });
        } catch (error) {
          errLogger.error(
            'Error entering dungeon floor: %s',
            (error as Error).stack ?? String(error)
          );
          res.status(400).json({
            success: false,
            message: (error as Error).message,
          });
        }
      }
    );

    app.post(
      '/players/:playerId/dungeons/:dungeonId/floors/:floorNumber/resolve',
      async (
        req: Request<{ playerId: string; dungeonId: string; floorNumber: string }>,
        res: Response
      ) => {
        try {
          const { playerId, dungeonId, floorNumber } = req.params;
          const parsedFloor = Number.parseInt(floorNumber, 10);
          if (!Number.isFinite(parsedFloor) || parsedFloor <= 0) {
            res.status(400).json({
              success: false,
              message: 'Invalid floor number',
            });
            return;
          }
          const { seed } = req.body as { seed?: number };
          let parsedSeed: number | undefined;
          if (seed !== undefined) {
            parsedSeed = Number(seed);
            if (Number.isNaN(parsedSeed)) {
              res.status(400).json({
                success: false,
                message: 'Seed must be a number',
              });
              return;
            }
          }
          const result = await dungeonService.resolveFloor(
            playerId,
            dungeonId,
            parsedFloor,
            { seed: parsedSeed }
          );
          res.json({
            success: true,
            data: {
              outcome: result.outcome,
              floor: result.floor,
              rewardsEarned: serializeRewardSummary(result.rewardsEarned),
              accumulatedRewards: serializeRewardSummary(
                result.accumulatedRewards
              ),
              drops: result.drops,
              nextFloor: result.nextFloor,
              bossPhase: result.bossPhase ?? null,
              completed: result.completed,
              run: serializeDungeonRun(result.run),
              combats: result.combatResults.map(serializeCombatResult),
            },
          });
        } catch (error) {
          errLogger.error(
            'Error resolving dungeon floor: %s',
            (error as Error).stack ?? String(error)
          );
          res.status(400).json({
            success: false,
            message: (error as Error).message,
          });
        }
      }
    );
  }

  if (economyService) {
    app.get('/shop/items', async (_req, res: Response) => {
      try {
        const items = economyService.getShopItems();
        res.json({
          success: true,
          data: {
            items,
            updatedAt: new Date().toISOString(),
          },
        });
      } catch (error) {
        errLogger.error(
          'Error fetching shop items: %s',
          (error as Error).stack ?? String(error)
        );
        res.status(500).json({
          success: false,
          message: 'Internal server error',
        });
      }
    });

    app.get(
      '/players/:playerId/inventory',
      async (req: Request<{ playerId: string }>, res: Response) => {
        try {
          const { playerId } = req.params;
          const inventory = await economyService.getOrCreateInventory(playerId);

          res.json({
            success: true,
            data: {
              playerId,
              inventory: {
                coins: inventory.coins,
                gems: inventory.gems,
                items: inventory.items,
                createdAt: inventory.createdAt.toISOString(),
                updatedAt: inventory.updatedAt.toISOString(),
                lastTransactionAt: inventory.lastTransactionAt?.toISOString(),
              },
            },
          });
        } catch (error) {
          errLogger.error(
            'Error fetching inventory: %s',
            (error as Error).stack ?? String(error)
          );
          res.status(500).json({
            success: false,
            message: 'Internal server error',
          });
        }
      }
    );

    app.post(
      '/players/:playerId/shop/buy',
      async (req: Request<{ playerId: string }>, res: Response) => {
        try {
          const { playerId } = req.params;
          const { itemId, quantity } = req.body as {
            itemId: string;
            quantity: number;
          };

          if (!itemId || !quantity || quantity <= 0) {
            res.status(400).json({
              success: false,
              message: 'itemId and positive quantity are required',
            });
            return;
          }

          const inventory = await economyService.buyItem(
            playerId,
            itemId,
            quantity
          );

          res.json({
            success: true,
            data: {
              playerId,
              inventory: {
                coins: inventory.coins,
                gems: inventory.gems,
                items: inventory.items,
                createdAt: inventory.createdAt.toISOString(),
                updatedAt: inventory.updatedAt.toISOString(),
                lastTransactionAt: inventory.lastTransactionAt?.toISOString(),
              },
            },
          });
        } catch (error) {
          const errorMessage = (error as Error).message;
          if (
            errorMessage.includes('not found') ||
            errorMessage.includes('Insufficient')
          ) {
            res.status(400).json({
              success: false,
              message: errorMessage,
            });
            return;
          }

          errLogger.error(
            'Error buying item: %s',
            (error as Error).stack ?? String(error)
          );
          res.status(500).json({
            success: false,
            message: 'Internal server error',
          });
        }
      }
    );

    app.post(
      '/players/:playerId/shop/sell',
      async (req: Request<{ playerId: string }>, res: Response) => {
        try {
          const { playerId } = req.params;
          const { itemId, quantity } = req.body as {
            itemId: string;
            quantity: number;
          };

          if (!itemId || !quantity || quantity <= 0) {
            res.status(400).json({
              success: false,
              message: 'itemId and positive quantity are required',
            });
            return;
          }

          const inventory = await economyService.sellItem(
            playerId,
            itemId,
            quantity
          );

          res.json({
            success: true,
            data: {
              playerId,
              inventory: {
                coins: inventory.coins,
                gems: inventory.gems,
                items: inventory.items,
                createdAt: inventory.createdAt.toISOString(),
                updatedAt: inventory.updatedAt.toISOString(),
                lastTransactionAt: inventory.lastTransactionAt?.toISOString(),
              },
            },
          });
        } catch (error) {
          const errorMessage = (error as Error).message;
          if (
            errorMessage.includes('not found') ||
            errorMessage.includes('Insufficient')
          ) {
            res.status(400).json({
              success: false,
              message: errorMessage,
            });
            return;
          }

          errLogger.error(
            'Error selling item: %s',
            (error as Error).stack ?? String(error)
          );
          res.status(500).json({
            success: false,
            message: 'Internal server error',
          });
        }
      }
    );
  }

  if (arenaService) {
    app.get(
      '/players/:playerId/arena',
      async (req: Request<{ playerId: string }>, res: Response) => {
        try {
          const { playerId } = req.params;
          const state = await arenaService.getState(playerId);
          res.json({
            success: true,
            data: serializeArenaState(state),
          });
        } catch (error) {
          errLogger.error(
            'Error fetching arena state: %s',
            (error as Error).stack ?? String(error)
          );
          res.status(500).json({
            success: false,
            message: 'Internal server error',
          });
        }
      }
    );

    app.get(
      '/players/:playerId/arena/opponent',
      async (req: Request<{ playerId: string }>, res: Response) => {
        try {
          const { playerId } = req.params;
          const opponent = await arenaService.generateOpponent(playerId);
          res.json({
            success: true,
            data: opponent,
          });
        } catch (error) {
          errLogger.error(
            'Error generating arena opponent: %s',
            (error as Error).stack ?? String(error)
          );
          res.status(500).json({
            success: false,
            message: 'Internal server error',
          });
        }
      }
    );

    app.post(
      '/players/:playerId/arena/challenge',
      async (req: Request<{ playerId: string }>, res: Response) => {
        try {
          const { playerId } = req.params;
          const body = req.body as { opponent?: unknown; seed?: number };
          const opponent =
            body.opponent && typeof body.opponent === 'object'
              ? (body.opponent as ArenaOpponent)
              : undefined;
          const seed =
            body.seed !== undefined ? Number(body.seed) : undefined;
          if (seed !== undefined && Number.isNaN(seed)) {
            res.status(400).json({
              success: false,
              message: 'Seed must be a number',
            });
            return;
          }

          const result = await arenaService.challenge(playerId, {
            opponent,
            seed,
          });

          res.json({
            success: true,
            data: {
              outcome: result.outcome,
              opponent: result.opponent,
              combat: serializeCombatResult(result.result),
              rewards: {
                experience: result.rewards.experience,
                gold: result.rewards.gold,
                items: result.rewards.items ? [...result.rewards.items] : [],
              },
              match: serializeArenaMatch(result.match),
              state: serializeArenaState(result.state),
            },
          });
        } catch (error) {
          errLogger.error(
            'Error running arena challenge: %s',
            (error as Error).stack ?? String(error)
          );
          res.status(400).json({
            success: false,
            message: (error as Error).message,
          });
        }
      }
    );

    app.get('/arena/leaderboard', async (req: Request, res: Response) => {
      try {
        const limitParam = req.query.limit as string | undefined;
        const parsedLimit = limitParam
          ? Number.parseInt(limitParam, 10)
          : 10;
        const limit =
          Number.isFinite(parsedLimit) && parsedLimit > 0
            ? Math.min(parsedLimit, 100)
            : 10;
        const leaderboard = await arenaService.getLeaderboard(limit);
        res.json({
          success: true,
          data: leaderboard.map(serializeArenaState),
        });
      } catch (error) {
        errLogger.error(
          'Error fetching arena leaderboard: %s',
          (error as Error).stack ?? String(error)
        );
        res.status(500).json({
          success: false,
          message: 'Internal server error',
        });
      }
    });
  }

  return app;
}
