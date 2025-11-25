import { promises as fs } from 'fs';
import path from 'path';
import type { PlayerProfessions } from '@shared';

export interface ProfessionsRepository {
  get(playerId: string): Promise<PlayerProfessions | null>;
  set(playerId: string, professions: PlayerProfessions): Promise<void>;
}

interface PersistedProfessions {
  [playerId: string]: PlayerProfessions;
}

export class FileProfessionsRepository implements ProfessionsRepository {
  private table: PersistedProfessions | null = null;

  constructor(private readonly filePath: string) {}

  private async ensureLoaded(): Promise<PersistedProfessions> {
    if (this.table) {
      return this.table;
    }

    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const data = JSON.parse(raw) as PersistedProfessions;
      this.table = data;
      Object.keys(this.table).forEach(playerId => {
        const professions = this.table![playerId];
        if (professions && typeof professions.createdAt === 'string') {
          professions.createdAt = new Date(professions.createdAt);
        }
        if (professions && typeof professions.updatedAt === 'string') {
          professions.updatedAt = new Date(professions.updatedAt);
        }
        Object.values(professions.professions).forEach(prof => {
          if (typeof prof.createdAt === 'string') {
            prof.createdAt = new Date(prof.createdAt);
          }
          if (typeof prof.updatedAt === 'string') {
            prof.updatedAt = new Date(prof.updatedAt);
          }
        });
      });
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        await fs.mkdir(path.dirname(this.filePath), { recursive: true });
        this.table = {};
      } else {
        throw error;
      }
    }

    return this.table!;
  }

  private async persist(): Promise<void> {
    if (!this.table) {
      return;
    }

    await fs.writeFile(
      this.filePath,
      JSON.stringify(this.table, null, 2),
      'utf8'
    );
  }

  async get(playerId: string): Promise<PlayerProfessions | null> {
    const table = await this.ensureLoaded();
    return table[playerId] ?? null;
  }

  async set(playerId: string, professions: PlayerProfessions): Promise<void> {
    const table = await this.ensureLoaded();
    table[playerId] = professions;
    await this.persist();
  }
}

export class InMemoryProfessionsRepository implements ProfessionsRepository {
  private table: PersistedProfessions = {};

  async get(playerId: string): Promise<PlayerProfessions | null> {
    return this.table[playerId] ?? null;
  }

  async set(playerId: string, professions: PlayerProfessions): Promise<void> {
    this.table[playerId] = professions;
  }
}
