import type { Logger } from '../http/logger';

export interface SaveSnapshot {
  playerId: string;
  timestamp: Date;
  action?: string;
  data: Record<string, unknown>;
}

export interface SaveServiceOptions {
  logger?: Logger;
  enableSnapshots?: boolean;
  snapshotRetention?: number;
}

export class SaveService {
  private snapshots: Map<string, SaveSnapshot[]> = new Map();
  private readonly logger: Logger;
  private readonly enableSnapshots: boolean;
  private readonly snapshotRetention: number;

  constructor(options: SaveServiceOptions = {}) {
    this.logger = options.logger ?? console;
    this.enableSnapshots = options.enableSnapshots ?? true;
    this.snapshotRetention = options.snapshotRetention ?? 50;
  }

  logSnapshot(snapshot: SaveSnapshot): void {
    if (!this.enableSnapshots) {
      return;
    }

    const { playerId } = snapshot;
    const snapshots = this.snapshots.get(playerId) ?? [];
    snapshots.push(snapshot);

    if (snapshots.length > this.snapshotRetention) {
      snapshots.shift();
    }

    this.snapshots.set(playerId, snapshots);
    this.logger.log(
      `[SaveService] Snapshot saved for player ${playerId} (${snapshot.action ?? 'manual'})`
    );
  }

  getSnapshots(playerId: string): SaveSnapshot[] {
    return this.snapshots.get(playerId) ?? [];
  }

  getLatestSnapshot(playerId: string): SaveSnapshot | null {
    const snapshots = this.snapshots.get(playerId);
    return snapshots && snapshots.length > 0
      ? snapshots[snapshots.length - 1]
      : null;
  }

  clearSnapshots(playerId: string): void {
    this.snapshots.delete(playerId);
    this.logger.log(`[SaveService] Snapshots cleared for player ${playerId}`);
  }
}
