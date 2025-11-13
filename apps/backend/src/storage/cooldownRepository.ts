import { promises as fs } from 'fs';
import path from 'path';
import type { ActionType } from '../actions/metadata';

export interface CooldownEntry {
  action: ActionType;
  availableAt: number;
  lastTriggeredAt: number;
}

export interface CooldownRepository {
  get(playerId: string, action: ActionType): Promise<CooldownEntry | null>;
  set(playerId: string, action: ActionType, entry: CooldownEntry): Promise<void>;
}

interface PersistedTable {
  [playerId: string]: {
    [action in ActionType]?: CooldownEntry;
  };
}

export class FileCooldownRepository implements CooldownRepository {
  private table: PersistedTable | null = null;

  constructor(private readonly filePath: string) {}

  private async ensureLoaded(): Promise<PersistedTable> {
    if (this.table) {
      return this.table;
    }

    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      this.table = JSON.parse(raw) as PersistedTable;
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

    await fs.writeFile(this.filePath, JSON.stringify(this.table, null, 2), 'utf8');
  }

  async get(playerId: string, action: ActionType): Promise<CooldownEntry | null> {
    const table = await this.ensureLoaded();
    return table[playerId]?.[action] ?? null;
  }

  async set(playerId: string, action: ActionType, entry: CooldownEntry): Promise<void> {
    const table = await this.ensureLoaded();
    table[playerId] = table[playerId] ?? {};
    table[playerId]![action] = entry;
    await this.persist();
  }
}
