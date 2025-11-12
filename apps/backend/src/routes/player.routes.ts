import type { Router as ExpressRouter } from 'express';
import { Router } from 'express';
import { loadPlayerContext, requirePlayerContext } from '../middleware/player-context';
import { validate } from '../middleware/validate';
import { PlayerIdentifierSchema, PlayerSummaryResponseSchema } from '../schemas/api';
import { playerService } from '../services/player.service';
import { asyncHandler } from '../utils/async-handler';

export const playerRouter: ExpressRouter = Router();

playerRouter.get(
  '/:playerId/summary',
  validate(PlayerIdentifierSchema, 'params'),
  loadPlayerContext,
  requirePlayerContext,
  asyncHandler(async (req, res) => {
    const summary = playerService.mapToSummary(req.player!, req.session!);

    const response = PlayerSummaryResponseSchema.parse({
      success: true,
      message: 'Player summary fetched',
      data: summary,
    });

    res.json(response);
  }),
);
