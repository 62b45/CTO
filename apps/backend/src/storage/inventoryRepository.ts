import { promises as fs } from 'fs';
import path from 'path';
import type { PlayerInventory } from '../../shared/src/types';

export interface InventoryRepository {
  get(playerId: string): Promise<PlayerInventory | null>;
  set(playerId: string, inventory: PlayerInventory): Promise<void>;
}

interface PersistedInventories {
  [playerId: string]: PlayerInventory;
}

export class FileInventoryRepository implements InventoryRepository {
  private table: PersistedInventories | null = null;

  constructor(private readonly filePath: string) {}

  private async ensureLoaded(): Promise<PersistedInventories> {
    if (this.table) {
      return this.table;
    }

    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const data = JSON.parse(raw) as PersistedInventories;
      this.table = data;
      Object.keys(this.table).forEach(playerId => {
        const inventory = this.table![playerId];
        if (inventory && typeof inventory.createdAt === 'string') {
          inventory.createdAt = new Date(inventory.createdAt);
        }
        if (inventory && typeof inventory.updatedAt === 'string') {
          inventory.updatedAt = new Date(inventory.updatedAt);
        }
        if (
          inventory &&
          inventory.lastTransactionAt &&
          typeof inventory.lastTransactionAt === 'string'
        ) {
          inventory.lastTransactionAt = new Date(inventory.lastTransactionAt);
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

  async get(playerId: string): Promise<PlayerInventory | null> {
    const table = await this.ensureLoaded();
    return table[playerId] ?? null;
  }

  async set(playerId: string, inventory: PlayerInventory): Promise<void> {
    const table = await this.ensureLoaded();
    table[playerId] = inventory;
    await this.persist();
  }
}

export class InMemoryInventoryRepository implements InventoryRepository {
  private table: PersistedInventories = {};

  async get(playerId: string): Promise<PlayerInventory | null> {
    return this.table[playerId] ?? null;
  }

  async set(playerId: string, inventory: PlayerInventory): Promise<void> {
    this.table[playerId] = inventory;
  }
}
