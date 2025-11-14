import { promises as fs } from 'fs';
import path from 'path';
import type { PlayerArenaState } from '@shared';

export interface ArenaRepository {
  get(playerId: string): Promise<PlayerArenaState | null>;
  set(playerId: string, state: PlayerArenaState): Promise<void>;
  list(): Promise<PlayerArenaState[]>;
}

type PersistedArenaTable = Record<string, PlayerArenaState>;

function reviveArenaState(state: PlayerArenaState): void {
  state.createdAt = new Date(state.createdAt);
  state.updatedAt = new Date(state.updatedAt);

  state.history = state.history.map(record => {
    record.timestamp = new Date(record.timestamp);
    record.logs = record.logs.map(log => ({
      ...log,
      timestamp: new Date(log.timestamp),
    }));
    return record;
  });
}

export class FileArenaRepository implements ArenaRepository {
  private table: PersistedArenaTable | null = null;

  constructor(private readonly filePath: string) {}

  private async ensureLoaded(): Promise<PersistedArenaTable> {
    if (this.table) {
      return this.table;
    }

    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as PersistedArenaTable;
      Object.values(parsed).forEach(state => reviveArenaState(state));
      this.table = parsed;
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

  async get(playerId: string): Promise<PlayerArenaState | null> {
    const table = await this.ensureLoaded();
    return table[playerId] ?? null;
  }

  async set(playerId: string, state: PlayerArenaState): Promise<void> {
    const table = await this.ensureLoaded();
    table[playerId] = state;
    await this.persist();
  }

  async list(): Promise<PlayerArenaState[]> {
    const table = await this.ensureLoaded();
    return Object.values(table);
  }
}

export class InMemoryArenaRepository implements ArenaRepository {
  private readonly table = new Map<string, PlayerArenaState>();

  async get(playerId: string): Promise<PlayerArenaState | null> {
    return this.table.get(playerId) ?? null;
  }

  async set(playerId: string, state: PlayerArenaState): Promise<void> {
    this.table.set(playerId, state);
  }

  async list(): Promise<PlayerArenaState[]> {
    return Array.from(this.table.values());
  }
}
