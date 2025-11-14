import express, { type Express, type Request, type Response } from 'express';
import type { PlayerStats } from '@shared';
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

export interface CreateAppOptions {
  service: ActionCooldownService;
  progressionService?: PlayerProgressionService;
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

export function createApp({
  service,
  progressionService,
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

  return app;
}
