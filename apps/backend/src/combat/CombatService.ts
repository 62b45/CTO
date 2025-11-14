/**
 * Combat Service - Manages combat simulations and enemy templates
 */

import {
  EnemyTemplate,
  CombatSimulationRequest,
  CombatSimulationResponse,
  CombatStats,
  Weapon,
  Combatant,
  CombatRewards,
  restoreHealth
} from '@shared';
import { CombatEngine } from './CombatEngine';
import { CombatLogStorage } from './CombatLogStorage';

export class CombatService {
  private combatEngine: CombatEngine;
  private logStorage: CombatLogStorage;
  private enemyTemplates: Map<string, EnemyTemplate> = new Map();

  constructor() {
    this.combatEngine = new CombatEngine();
    this.logStorage = new CombatLogStorage();
    this.initializeEnemyTemplates();
  }

  /**
   * Initialize default enemy templates
   */
  private initializeEnemyTemplates(): void {
    // Goblin template
    this.enemyTemplates.set('goblin', {
      id: 'goblin',
      name: 'Goblin',
      stats: {
        health: 50,
        maxHealth: 50,
        attack: 8,
        defense: 5,
        speed: 12
      },
      weapon: {
        id: 'rusty_dagger',
        name: 'Rusty Dagger',
        baseDamage: 5,
        multiplier: 1.0
      },
      rewards: {
        experience: 25,
        gold: 10
      }
    });

    // Orc template
    this.enemyTemplates.set('orc', {
      id: 'orc',
      name: 'Orc Warrior',
      stats: {
        health: 100,
        maxHealth: 100,
        attack: 15,
        defense: 10,
        speed: 8
      },
      weapon: {
        id: 'iron_axe',
        name: 'Iron Axe',
        baseDamage: 12,
        multiplier: 1.2
      },
      rewards: {
        experience: 75,
        gold: 30
      }
    });

    // Dragon template
    this.enemyTemplates.set('dragon', {
      id: 'dragon',
      name: 'Ancient Dragon',
      stats: {
        health: 300,
        maxHealth: 300,
        attack: 35,
        defense: 20,
        speed: 15
      },
      weapon: {
        id: 'dragon_breath',
        name: 'Dragon Breath',
        baseDamage: 25,
        multiplier: 1.5
      },
      rewards: {
        experience: 500,
        gold: 200,
        items: ['dragon_scale', 'fire_essence']
      }
    });
  }

  /**
   * Get all available enemy templates
   */
  getEnemyTemplates(): EnemyTemplate[] {
    return Array.from(this.enemyTemplates.values());
  }

  /**
   * Get specific enemy template by ID
   */
  getEnemyTemplate(id: string): EnemyTemplate | null {
    return this.enemyTemplates.get(id) || null;
  }

  /**
   * Add or update an enemy template
   */
  setEnemyTemplate(template: EnemyTemplate): void {
    this.enemyTemplates.set(template.id, template);
  }

  /**
   * Simulate combat between player and enemy
   */
  simulateCombat(request: CombatSimulationRequest): CombatSimulationResponse {
    const enemyTemplate = this.enemyTemplates.get(request.enemyTemplateId);
    if (!enemyTemplate) {
      throw new Error(`Enemy template '${request.enemyTemplateId}' not found`);
    }

    // Create combat engine with seed for deterministic results
    const engine = new CombatEngine(request.seed);

    // Create combatants
    const player: Combatant = {
      id: request.playerId,
      name: 'Player',
      stats: { ...request.playerStats },
      weapon: request.playerWeapon,
      isPlayer: true
    };

    const enemy: Combatant = {
      id: enemyTemplate.id,
      name: enemyTemplate.name,
      stats: { ...enemyTemplate.stats },
      weapon: enemyTemplate.weapon,
      isPlayer: false
    };

    // Resolve combat
    const result = engine.resolveCombat(player, enemy, enemyTemplate.rewards);

    // Store combat logs for the player
    this.logStorage.storeCombatLogs(request.playerId, result.logs);

    // Calculate updated player stats (restore health after combat)
    const updatedPlayerStats = restoreHealth(request.playerStats);

    return {
      result,
      updatedPlayerStats
    };
  }

  /**
   * Get recent combat logs for a player
   */
  getPlayerCombatLogs(playerId: string, limit: number = 10) {
    return this.logStorage.getPlayerLogs(playerId, limit);
  }

  /**
   * Get combat logs from a specific combat session
   */
  getCombatLogs(playerId: string, combatId: string) {
    return this.logStorage.getCombatLogs(playerId, combatId);
  }
}