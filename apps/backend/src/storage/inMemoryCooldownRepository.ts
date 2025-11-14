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
}
