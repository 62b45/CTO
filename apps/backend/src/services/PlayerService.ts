import { Player } from '../lib/prisma-mock';

export interface PlayerSummary {
  playerId: string;
  name: string;
  stats: {
    level: number;
    xp: number;
    coins: number;
    gems: number;
    baseStats: {
      attack: number;
      defense: number;
      hpMax: number;
      hpCurrent: number;
    };
  };
  currentArea: string;
  progress: Record<string, any>;
  equippedItems: Record<string, any>;
  professions: Record<string, {
    level: number;
    xp: number;
    createdAt: string;
    updatedAt: string;
  }>;
  cooldowns: Record<string, {
    action: string;
    lastUsedAt: string;
    remainingMs: number;
  }>;
  inventory: Array<{
    id: string;
    item: {
      id: string;
      name: string;
      type: string;
      rarity: string;
      power: number;
      bonuses: Record<string, any>;
    };
    quantity: number;
  }>;
}

export class PlayerService {
  async getPlayerSummary(
    player: Player
  ): Promise<PlayerSummary> {
    const now = Date.now();
    
    // Parse JSON fields
    const equippedItems = JSON.parse((player as any).equipped || '{}');
    const progress = JSON.parse((player as any).progress || '{}');
    
    // For now, return empty collections since we're using mock data
    const professions: Record<string, any> = {};
    const cooldowns: Record<string, any> = {};
    const inventory: Array<any> = [];
    
    return {
      playerId: player.id,
      name: player.name,
      stats: {
        level: player.level,
        xp: player.xp,
        coins: player.coins,
        gems: player.gems,
        baseStats: {
          attack: player.atk_base,
          defense: player.def_base,
          hpMax: player.hp_max,
          hpCurrent: player.hp_current
        }
      },
      currentArea: player.area,
      progress,
      equippedItems,
      professions,
      cooldowns,
      inventory
    };
  }
  
  private getCooldownDuration(action: string): number {
    // Default cooldown durations in milliseconds
    const cooldowns: Record<string, number> = {
      'TRAIN': 30000,      // 30 seconds
      'WORK': 60000,       // 1 minute
      'EXPLORE': 120000,   // 2 minutes
      'CRAFT': 45000,      // 45 seconds
      'LOOTBOX': 300000,   // 5 minutes
      'DUNGEON': 600000,   // 10 minutes
      'ARENA': 180000,     // 3 minutes
    };
    
    return cooldowns[action] || 60000; // Default 1 minute
  }
}