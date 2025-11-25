import type { ActionType } from '../actions/metadata';
import type { CooldownEntry, CooldownRepository } from './cooldownRepository';

export class InMemoryCooldownRepository implements CooldownRepository {
  private readonly store = new Map<string, Map<ActionType, CooldownEntry>>();

  async get(
    playerId: string,
    action: ActionType
  ): Promise<CooldownEntry | null> {
    return this.store.get(playerId)?.get(action) ?? null;
  }

  async set(
    playerId: string,
    action: ActionType,
    entry: CooldownEntry
  ): Promise<void> {
    const playerMap =
      this.store.get(playerId) ?? new Map<ActionType, CooldownEntry>();
    playerMap.set(action, entry);
    this.store.set(playerId, playerMap);
  }

  async delete(playerId: string, action: ActionType): Promise<void> {
    const playerMap = this.store.get(playerId);
    if (!playerMap) {
      return;
    }

    playerMap.delete(action);
    if (playerMap.size === 0) {
      this.store.delete(playerId);
    }
  }

  async getAll(playerId: string): Promise<Record<ActionType, CooldownEntry>> {
    const playerMap = this.store.get(playerId);
    if (!playerMap) {
      return {} as Record<ActionType, CooldownEntry>;
    }

    return Array.from(playerMap.entries()).reduce<Record<ActionType, CooldownEntry>>((acc, [action, entry]) => {
      acc[action] = entry;
      return acc;
    }, {} as Record<ActionType, CooldownEntry>);
  }
}
