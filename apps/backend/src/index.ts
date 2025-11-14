import http from 'http';
import path from 'path';
import type { Express } from 'express';
import { createApp } from './http/app';
import { FileCooldownRepository } from './storage/cooldownRepository';
import { FileProgressionRepository } from './storage/progressionRepository';
import { ActionCooldownService } from './cooldowns/service';
import { PlayerProgressionService } from './progression/service';

export interface ServerConfig {
  port?: number;
  databaseFile?: string;
  progressionDatabaseFile?: string;
}

export interface BuiltServer {
  app: Express;
  start(): http.Server;
}

export function buildServer(config: ServerConfig = {}): BuiltServer {
  const port = config.port ?? Number(process.env.PORT ?? 3001);
  const databaseFile = path.resolve(
    config.databaseFile ??
      process.env.COOLDOWN_DB_PATH ??
      path.join(process.cwd(), 'data', 'cooldowns.json')
  );
  const progressionDatabaseFile = path.resolve(
    config.progressionDatabaseFile ??
      process.env.PROGRESSION_DB_PATH ??
      path.join(process.cwd(), 'data', 'progression.json')
  );

  const repository = new FileCooldownRepository(databaseFile);
  const progressionRepository = new FileProgressionRepository(
    progressionDatabaseFile
  );
  const service = new ActionCooldownService(repository);
  const progressionService = new PlayerProgressionService(
    progressionRepository
  );
  const app = createApp({ service, progressionService });

  return {
    app,
    start(): http.Server {
      return app.listen(port, () => {
        console.log(`Action service listening on port ${port}`);
      });
    },
  };
}

function main() {
  const { start } = buildServer();
  start();
}

if (require.main === module) {
  main();
}

export {
  ActionCooldownService,
  FileCooldownRepository,
  PlayerProgressionService,
  FileProgressionRepository,
};
