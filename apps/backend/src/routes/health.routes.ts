import type { Router as ExpressRouter } from 'express';
import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { HealthCheckResponseSchema } from '../schemas/api';
import { asyncHandler } from '../utils/async-handler';

export const healthRouter: ExpressRouter = Router();

const startTime = Date.now();

healthRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    let databaseStatus: 'connected' | 'disconnected' = 'disconnected';

    try {
      await prisma.$queryRaw`SELECT 1`;
      databaseStatus = 'connected';
    } catch (error) {
      databaseStatus = 'disconnected';
    }

    const response = HealthCheckResponseSchema.parse({
      success: true,
      message: 'Server is healthy',
      data: {
        status: 'ok' as const,
        timestamp: new Date().toISOString(),
        uptime: Math.floor((Date.now() - startTime) / 1000),
        database: databaseStatus,
      },
    });

    res.json(response);
  }),
);
