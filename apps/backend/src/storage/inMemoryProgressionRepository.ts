import type { PlayerProgression } from '@shared';
import type { ProgressionRepository } from './progressionRepository';

export class InMemoryProgressionRepository implements ProgressionRepository {
  private readonly store = new Map<string, PlayerProgression>();

  async get(playerId: string): Promise<PlayerProgression | null> {
    return this.store.get(playerId) ?? null;
  }

  async set(playerId: string, player: PlayerProgression): Promise<void> {
    this.store.set(playerId, player);
  }
}
