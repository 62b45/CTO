import { Request, Response, NextFunction } from 'express';
import { PrismaClient, Player, Cooldown, ProfessionProgress, InventoryItem, ItemDefinition } from '../lib/prisma-mock';

export interface AuthenticatedRequest extends Request {
  player?: any; // Prisma Player type
}

export async function playerContext(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    console.log('Player context middleware called');
    const playerId = req.headers['x-player-id'] as string;
    
    if (!playerId) {
      console.log('No player ID found in headers');
      res.status(401).json({
        success: false,
        message: 'Player ID required (x-player-id header)'
      });
      return;
    }
    
    console.log('Player ID:', playerId);
    const prisma = req.app.locals.services.prisma as PrismaClient;
    
    let player = await prisma.player.findUnique({
      where: { id: playerId }
    });
    
    console.log('Found player:', !!player);
    
    // Create default player if not found (for testing)
    if (!player) {
      console.log('Creating new player');
      player = await prisma.player.create({
        data: {
          id: playerId,
          name: `Player_${playerId.slice(-8)}`,
          level: 1,
          xp: 0,
          coins: 100,
          gems: 0,
          atk_base: 10,
          def_base: 10,
          hp_max: 100,
          hp_current: 100,
          area: 'GREENWOOD'
        }
      });
      console.log('Created player:', player);
    }
    
    req.player = player;
    console.log('Calling next()');
    next();
  } catch (error) {
    console.error('Player context error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load player context'
    });
  }
}