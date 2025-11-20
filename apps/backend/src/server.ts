import { createApp } from './app';

const port = Number(process.env.PORT) || 3001;
const databaseUrl = process.env.DATABASE_URL;
const nodeEnv = process.env.NODE_ENV || 'development';

const app = createApp({
  port,
  databaseUrl,
  nodeEnv
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
const server = app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
  console.log(`Environment: ${nodeEnv}`);
  console.log(`Database: ${databaseUrl}`);
});

export { server };