import 'dotenv/config';
import http from 'http';
import { env } from './config';
import { createApp } from './app';
import { prisma } from './lib/prisma';

const app = createApp();
const server = http.createServer(app);

const start = async () => {
  server.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend server running on http://localhost:${env.port}`);
  });
};

start().catch(error => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server', error);
  process.exit(1);
});

const gracefulShutdown = async (signal: NodeJS.Signals) => {
  // eslint-disable-next-line no-console
  console.log(`Received ${signal}, shutting down gracefully`);

  server.close(async closeError => {
    if (closeError) {
      // eslint-disable-next-line no-console
      console.error('Error during server shutdown', closeError);
      process.exit(1);
    }

    try {
      await prisma.$disconnect();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error disconnecting Prisma', error);
    } finally {
      process.exit(0);
    }
  });
};

['SIGTERM', 'SIGINT'].forEach(signal => {
  process.on(signal as NodeJS.Signals, gracefulShutdown);
});

process.on('uncaughtException', error => {
  // eslint-disable-next-line no-console
  console.error('Uncaught exception', error);
  gracefulShutdown('SIGTERM');
});

process.on('unhandledRejection', error => {
  // eslint-disable-next-line no-console
  console.error('Unhandled rejection', error);
  gracefulShutdown('SIGTERM');
});
