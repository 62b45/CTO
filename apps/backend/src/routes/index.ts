import type { Router as ExpressRouter } from 'express';
import { Router } from 'express';
import { healthRouter } from './health.routes';
import { playerRouter } from './player.routes';

export const createRoutes = (): ExpressRouter => {
  const router = Router();

  router.use('/health', healthRouter);
  router.use('/players', playerRouter);

  return router;
};
