import express, { type Express, type Request, type Response } from 'express';
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

export interface CreateAppOptions {
  service: ActionCooldownService;
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

function buildHandlers(overrides?: Partial<Record<ActionType, ActionHandler>>): Record<ActionType, ActionHandler> {
  const defaults = createActionHandlers();
  if (!overrides) {
    return defaults;
  }

  return ACTION_TYPES.reduce<Record<ActionType, ActionHandler>>((acc, action) => {
    acc[action] = overrides[action] ?? defaults[action];
    return acc;
  }, {} as Record<ActionType, ActionHandler>);
}

export function createApp({ service, handlers: overrides, logger }: CreateAppOptions): Express {
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
        res.status(404).json({ success: false, message: `Unknown action: ${actionParam}` });
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
    },
  );

  app.post(
    '/players/:playerId/actions/:action',
    async (req: Request<PlayerActionParams>, res: Response<SuccessPayload | ErrorPayload>) => {
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
        const outcome = await service.trigger({ playerId, action, handler: handlers[action] });
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
          (error as Error).stack ?? String(error),
        );

        res.status(500).json({
          success: false,
          message: 'Internal server error',
        });
      }
    },
  );

  return app;
}
