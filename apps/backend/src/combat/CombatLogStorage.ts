/**
 * Combat Log Storage - Manages persistence of combat logs per player
 */

import { CombatLogEntry } from '@shared';

interface StoredCombatSession {
  id: string;
  timestamp: Date;
  logs: CombatLogEntry[];
}

interface PlayerCombatData {
  playerId: string;
  sessions: StoredCombatSession[];
  lastUpdated: Date;
}

export class CombatLogStorage {
  private playerData: Map<string, PlayerCombatData> = new Map();
  private maxSessionsPerPlayer: number = 50; // Keep last 50 combat sessions
  private maxLogsPerSession: number = 1000; // Max logs per combat session

  /**
   * Store combat logs for a player
   */
  storeCombatLogs(playerId: string, logs: CombatLogEntry[], timestamp?: Date): string {
    const sessionId = this.generateSessionId();
    const session: StoredCombatSession = {
      id: sessionId,
      timestamp: timestamp || new Date(),
      logs: logs.slice(0, this.maxLogsPerSession) // Limit logs per session
    };

    // Get or create player data
    let playerData = this.playerData.get(playerId);
    if (!playerData) {
      playerData = {
        playerId,
        sessions: [],
        lastUpdated: new Date()
      };
      this.playerData.set(playerId, playerData);
    }

    // Add new session
    playerData.sessions.unshift(session);
    playerData.lastUpdated = new Date();

    // Limit number of sessions per player
    if (playerData.sessions.length > this.maxSessionsPerPlayer) {
      playerData.sessions = playerData.sessions.slice(0, this.maxSessionsPerPlayer);
    }

    return sessionId;
  }

  /**
   * Get recent combat logs for a player
   */
  getPlayerLogs(playerId: string, limit: number = 10): StoredCombatSession[] {
    const playerData = this.playerData.get(playerId);
    if (!playerData) {
      return [];
    }

    return playerData.sessions.slice(0, limit);
  }

  /**
   * Get combat logs from a specific combat session
   */
  getCombatLogs(playerId: string, combatId: string): CombatLogEntry[] | null {
    const playerData = this.playerData.get(playerId);
    if (!playerData) {
      return null;
    }

    const session = playerData.sessions.find(s => s.id === combatId);
    return session ? session.logs : null;
  }

  /**
   * Get all combat sessions for a player
   */
  getAllPlayerSessions(playerId: string): StoredCombatSession[] {
    const playerData = this.playerData.get(playerId);
    return playerData ? [...playerData.sessions] : [];
  }

  /**
   * Clear all combat logs for a player
   */
  clearPlayerLogs(playerId: string): void {
    this.playerData.delete(playerId);
  }

  /**
   * Clear logs older than specified number of days
   */
  cleanupOldLogs(daysOld: number = 30): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    for (const [playerId, playerData] of this.playerData.entries()) {
      playerData.sessions = playerData.sessions.filter(
        session => session.timestamp > cutoffDate
      );

      // Remove player data if no sessions remain
      if (playerData.sessions.length === 0) {
        this.playerData.delete(playerId);
      }
    }
  }

  /**
   * Get storage statistics
   */
  getStorageStats(): {
    totalPlayers: number;
    totalSessions: number;
    totalLogs: number;
  } {
    let totalSessions = 0;
    let totalLogs = 0;

    for (const playerData of this.playerData.values()) {
      totalSessions += playerData.sessions.length;
      totalLogs += playerData.sessions.reduce((sum, session) => sum + session.logs.length, 0);
    }

    return {
      totalPlayers: this.playerData.size,
      totalSessions,
      totalLogs
    };
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `combat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}