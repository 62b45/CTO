import express from 'express';
import { PrismaClient } from './lib/prisma-mock';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { playerContext } from './middleware/playerContext';
import { healthRouter } from './routes/health';
import { playersRouter } from './routes/players';

export interface AppConfig {
  port?: number;
  databaseUrl?: string;
  nodeEnv?: string;
}

export interface AppServices {
  prisma: PrismaClient;
}

export function createApp(config: AppConfig = {}): express.Express {
  const app = express();
  
  // Basic middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Request logging
  if (config.nodeEnv !== 'test') {
    app.use(requestLogger);
  }
  
  // Initialize Prisma client
  const prisma = new PrismaClient();
  
  // Make services available to routes
  app.locals.services = { prisma } as AppServices;
  
  // Health check (before player context)
  app.use('/health', healthRouter);
  
  // Player context middleware for all other routes
  app.use('/api', playerContext);
  
  // API routes
  console.log('Registering players router...');
  app.use('/api', playersRouter);
  console.log('Players router registered.');
  
  // General error handler (must be last)
  app.use(errorHandler);
  
  return app;
}