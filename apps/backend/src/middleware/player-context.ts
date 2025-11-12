import type { RequestHandler } from 'express';
import { PlayerIdentifierSchema } from '../schemas/api';
import { playerService } from '../services/player.service';
import { ValidationError } from '../utils/errors';

export const loadPlayerContext: RequestHandler = async (req, res, next) => {
  const playerIdInput = req.params.playerId ?? req.header('x-player-id');

  const parsedPlayerId = PlayerIdentifierSchema.safeParse({ playerId: playerIdInput });

  if (!parsedPlayerId.success) {
    return next(
      new ValidationError(
        'Invalid player identifier',
        parsedPlayerId.error.issues.map(issue => ({
          path: issue.path,
          message: issue.message,
        })),
      ),
    );
  }

  try {
    const context = await playerService.getPlayerContext(parsedPlayerId.data.playerId);
    req.player = context.player;
    req.session = context.session;
    res.locals.playerContext = context;
    return next();
  } catch (error) {
    return next(error);
  }
};

export const requirePlayerContext: RequestHandler = (req, res, next) => {
  if (!req.player || !req.session) {
    return next(new ValidationError('Player context is not loaded'));
  }

  return next();
};
