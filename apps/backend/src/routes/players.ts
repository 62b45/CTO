import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/playerContext';
import { PlayerService } from '../services/PlayerService';

export const playersRouter = Router();
const playerService = new PlayerService();

// GET /api/players/:playerId - Fetch complete player summary
playersRouter.get(
  '/:playerId',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { playerId } = req.params;
      
      // Basic validation
      if (!playerId || typeof playerId !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Valid player ID is required'
        });
      }
      
      // Ensure the requested player matches the authenticated player
      if (playerId !== req.player?.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: cannot access other player data'
        });
      }
      
      const summary = await playerService.getPlayerSummary(req.player);
      
      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Error fetching player summary:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch player summary'
      });
    }
  }
);