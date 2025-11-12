import type { Application } from 'express';
import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/error-handler';
import { notFoundHandler } from './middleware/not-found';
import { createRoutes } from './routes';

export const createApp = (): Application => {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use('/api', createRoutes());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
