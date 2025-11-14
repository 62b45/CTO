import http from 'http';
import path from 'path';
import type { Express } from 'express';
import { createApp } from './http/app';
import { FileCooldownRepository } from './storage/cooldownRepository';
import { FileProgressionRepository } from './storage/progressionRepository';
import { FileProfessionsRepository } from './storage/professionsRepository';
import { FileInventoryRepository } from './storage/inventoryRepository';
import { ActionCooldownService } from './cooldowns/service';
import { PlayerProgressionService } from './progression/service';
import { ProfessionService } from './professions/service';
import { EconomyService } from './economy/service';

export interface ServerConfig {
  port?: number;
  databaseFile?: string;
  progressionDatabaseFile?: string;
  professionsDatabaseFile?: string;
  inventoryDatabaseFile?: string;
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
  const professionsDatabaseFile = path.resolve(
    config.professionsDatabaseFile ??
      process.env.PROFESSIONS_DB_PATH ??
      path.join(process.cwd(), 'data', 'professions.json')
  );
  const inventoryDatabaseFile = path.resolve(
    config.inventoryDatabaseFile ??
      process.env.INVENTORY_DB_PATH ??
      path.join(process.cwd(), 'data', 'inventory.json')
  );

  const repository = new FileCooldownRepository(databaseFile);
  const progressionRepository = new FileProgressionRepository(
    progressionDatabaseFile
  );
  const professionsRepository = new FileProfessionsRepository(
    professionsDatabaseFile
  );
  const inventoryRepository = new FileInventoryRepository(
    inventoryDatabaseFile
  );

  const service = new ActionCooldownService(repository);
  const progressionService = new PlayerProgressionService(
    progressionRepository
  );
  const professionService = new ProfessionService(professionsRepository);
  const economyService = new EconomyService(
    inventoryRepository,
    professionService
  );

  const app = createApp({
    service,
    progressionService,
    professionService,
    economyService,
  });

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
  ProfessionService,
  FileProfessionsRepository,
  EconomyService,
  FileInventoryRepository,
};
