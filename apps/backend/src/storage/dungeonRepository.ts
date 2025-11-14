import { promises as fs } from 'fs';
import path from 'path';
import type { PlayerDungeonState } from '@shared';

export interface DungeonRepository {
  get(playerId: string): Promise<PlayerDungeonState | null>;
  set(playerId: string, state: PlayerDungeonState): Promise<void>;
  list(): Promise<PlayerDungeonState[]>;
}

type PersistedDungeonTable = Record<string, PlayerDungeonState>;

function reviveDungeonState(state: PlayerDungeonState): void {
  state.createdAt = new Date(state.createdAt);
  state.updatedAt = new Date(state.updatedAt);

  Object.values(state.dungeons).forEach(progress => {
    if (progress.lastCompletedAt) {
      progress.lastCompletedAt = new Date(progress.lastCompletedAt);
    }
    if (progress.lastResetAt) {
      progress.lastResetAt = new Date(progress.lastResetAt);
    }

    if (progress.activeRun) {
      progress.activeRun.startedAt = new Date(progress.activeRun.startedAt);
      progress.activeRun.updatedAt = new Date(progress.activeRun.updatedAt);
    }
  });
}

export class FileDungeonRepository implements DungeonRepository {
  private table: PersistedDungeonTable | null = null;

  constructor(private readonly filePath: string) {}

  private async ensureLoaded(): Promise<PersistedDungeonTable> {
    if (this.table) {
      return this.table;
    }

    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as PersistedDungeonTable;
      Object.values(parsed).forEach(state => reviveDungeonState(state));
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

  async get(playerId: string): Promise<PlayerDungeonState | null> {
    const table = await this.ensureLoaded();
    const state = table[playerId];
    return state ? state : null;
  }

  async set(playerId: string, state: PlayerDungeonState): Promise<void> {
    const table = await this.ensureLoaded();
    table[playerId] = state;
    await this.persist();
  }

  async list(): Promise<PlayerDungeonState[]> {
    const table = await this.ensureLoaded();
    return Object.values(table);
  }
}

export class InMemoryDungeonRepository implements DungeonRepository {
  private readonly table = new Map<string, PlayerDungeonState>();

  async get(playerId: string): Promise<PlayerDungeonState | null> {
    return this.table.get(playerId) ?? null;
  }

  async set(playerId: string, state: PlayerDungeonState): Promise<void> {
    this.table.set(playerId, state);
  }

  async list(): Promise<PlayerDungeonState[]> {
    return Array.from(this.table.values());
  }
}
