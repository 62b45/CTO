import { promises as fs } from 'fs';
import path from 'path';
import type { PlayerProgression } from '@shared';

export interface ProgressionRepository {
  get(playerId: string): Promise<PlayerProgression | null>;
  set(playerId: string, player: PlayerProgression): Promise<void>;
}

interface PersistedPlayers {
  [playerId: string]: PlayerProgression;
}

export class FileProgressionRepository implements ProgressionRepository {
  private table: PersistedPlayers | null = null;

  constructor(private readonly filePath: string) {}

  private async ensureLoaded(): Promise<PersistedPlayers> {
    if (this.table) {
      return this.table;
    }

    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const data = JSON.parse(raw) as PersistedPlayers;
      this.table = data;
      // Convert date strings back to Date objects
      Object.keys(this.table).forEach(playerId => {
        const player = this.table![playerId];
        if (player && typeof player.createdAt === 'string') {
          player.createdAt = new Date(player.createdAt);
        }
        if (player && typeof player.updatedAt === 'string') {
          player.updatedAt = new Date(player.updatedAt);
        }
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

  async get(playerId: string): Promise<PlayerProgression | null> {
    const table = await this.ensureLoaded();
    return table[playerId] ?? null;
  }

  async set(playerId: string, player: PlayerProgression): Promise<void> {
    const table = await this.ensureLoaded();
    table[playerId] = player;
    await this.persist();
  }
}
