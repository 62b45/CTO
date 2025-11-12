import { Player, PlayerSession } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      player?: Player;
      session?: PlayerSession;
    }
  }
}

export {};
