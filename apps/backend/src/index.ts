import http from 'http';
import path from 'path';
import type { Express } from 'express';
import { createApp } from './http/app';
import { FileCooldownRepository } from './storage/cooldownRepository';
import { FileProgressionRepository } from './storage/progressionRepository';
import { FileProfessionsRepository } from './storage/professionsRepository';
import { FileInventoryRepository } from './storage/inventoryRepository';
import { FileDungeonRepository } from './storage/dungeonRepository';
import { FileArenaRepository } from './storage/arenaRepository';
import { ActionCooldownService } from './cooldowns/service';
import { PlayerProgressionService } from './progression/service';
import { ProfessionService } from './professions/service';
import { EconomyService } from './economy/service';
import { DungeonService } from './dungeons/service';
import { ArenaService } from './arena/service';
import { LootboxService } from './lootbox/service';
import { EventService } from './events/service';
import { SaveService } from './save/service';
import { PlayerStateService } from './save/playerStateService';
import { AdminService } from './admin/service';
import { CraftingService } from './crafting/service';
import { EquipmentService } from './equipment/service';

export interface ServerConfig {
  port?: number;
  databaseFile?: string;
  progressionDatabaseFile?: string;
  professionsDatabaseFile?: string;
  inventoryDatabaseFile?: string;
  dungeonDatabaseFile?: string;
  arenaDatabaseFile?: string;
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
  const dungeonDatabaseFile = path.resolve(
    config.dungeonDatabaseFile ??
      process.env.DUNGEON_DB_PATH ??
      path.join(process.cwd(), 'data', 'dungeons.json')
  );
  const arenaDatabaseFile = path.resolve(
    config.arenaDatabaseFile ??
      process.env.ARENA_DB_PATH ??
      path.join(process.cwd(), 'data', 'arena.json')
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
  const dungeonRepository = new FileDungeonRepository(dungeonDatabaseFile);
  const arenaRepository = new FileArenaRepository(arenaDatabaseFile);

  const service = new ActionCooldownService(repository);
  const progressionService = new PlayerProgressionService(
    progressionRepository
  );
  const professionService = new ProfessionService(professionsRepository);
  const economyService = new EconomyService(
    inventoryRepository,
    professionService
  );
  const dungeonService = new DungeonService(
    dungeonRepository,
    progressionService
  );
  const arenaService = new ArenaService(
    arenaRepository,
    progressionService
  );
  const lootboxService = new LootboxService(
    professionService,
    economyService
  );
  const eventService = new EventService();
  const saveService = new SaveService();
  const playerStateService = new PlayerStateService({
    progressionRepository,
    professionsRepository,
    inventoryRepository,
    dungeonRepository,
    arenaRepository,
    cooldownRepository: repository,
  });
  const adminService = new AdminService({
    progressionService,
    progressionRepository,
    professionService,
    economyService,
    cooldownService: service,
    eventService,
  });
  const craftingService = new CraftingService(
    professionService,
    economyService,
    inventoryRepository
  );
  const equipmentService = new EquipmentService(
    economyService,
    inventoryRepository
  );

  const app = createApp({
    service,
    progressionService,
    professionService,
    economyService,
    dungeonService,
    arenaService,
    lootboxService,
    eventService,
    saveService,
    playerStateService,
    adminService,
    craftingService,
    equipmentService,
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
  DungeonService,
  FileDungeonRepository,
  ArenaService,
  FileArenaRepository,
  LootboxService,
  EventService,
  SaveService,
  PlayerStateService,
  AdminService,
  CraftingService,
  EquipmentService,
};
