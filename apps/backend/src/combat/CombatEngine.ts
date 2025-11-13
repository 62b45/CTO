/**
 * Combat Engine - Turn-based combat resolver with deterministic RNG
 */

import {
  Combatant,
  CombatStats,
  CombatLogEntry,
  CombatAction,
  CombatResult,
  CombatRewards,
  Weapon,
  SeededRNG,
  calculateDamage,
  generateCombatLogDescription,
  isDefeated,
  restoreHealth
} from '@shared';

export class CombatEngine {
  private rng: SeededRNG;
  private logs: CombatLogEntry[] = [];
  private turn: number = 1;

  constructor(seed?: number) {
    this.rng = new SeededRNG(seed);
  }

  /**
   * Resolve turn-based combat between two combatants
   */
  resolveCombat(
    attacker: Combatant,
    defender: Combatant,
    rewards: CombatRewards
  ): CombatResult {
    // Reset state
    this.logs = [];
    this.turn = 1;

    // Create copies of combatants with full health
    const combatants: { [id: string]: Combatant } = {
      [attacker.id]: { ...attacker, stats: restoreHealth(attacker.stats) },
      [defender.id]: { ...defender, stats: restoreHealth(defender.stats) }
    };

    // Determine turn order based on speed
    const turnOrder = this.determineTurnOrder(attacker, defender);
    
    let currentAttacker = turnOrder[0];
    let currentDefender = turnOrder[1];

    // Main combat loop
    while (!isDefeated(combatants[currentAttacker.id].stats) && 
           !isDefeated(combatants[currentDefender.id].stats)) {
      
      // Attacker's turn
      this.executeTurn(combatants[currentAttacker], combatants[currentDefender]);
      
      // Check if defender is defeated
      if (isDefeated(combatants[currentDefender.id].stats)) {
        break;
      }

      // Defender's turn
      this.executeTurn(combatants[currentDefender], combatants[currentAttacker]);
      
      this.turn++;
    }

    // Determine winner
    const winner = isDefeated(combatants[attacker.id].stats) ? defender.id : attacker.id;
    const loser = winner === attacker.id ? defender.id : attacker.id;

    return {
      winner,
      loser,
      turns: this.turn,
      logs: this.logs,
      rewards
    };
  }

  /**
   * Determine turn order based on speed stats
   */
  private determineTurnOrder(attacker: Combatant, defender: Combatant): [Combatant, Combatant] {
    if (attacker.stats.speed >= defender.stats.speed) {
      return [attacker, defender];
    }
    return [defender, attacker];
  }

  /**
   * Execute a single turn in combat
   */
  private executeTurn(attacker: Combatant, defender: Combatant): void {
    const action = this.createAttackAction(attacker, defender);
    const damage = action.damage || 0;

    // Apply damage to defender
    defender.stats.health = Math.max(0, defender.stats.health - damage);

    // Create log entry
    const logEntry: CombatLogEntry = {
      turn: this.turn,
      timestamp: new Date(),
      action,
      description: generateCombatLogDescription(action, attacker.name, defender.name, damage),
      remainingHealth: {
        [attacker.id]: attacker.stats.health,
        [defender.id]: defender.stats.health
      }
    };

    this.logs.push(logEntry);
  }

  /**
   * Create an attack action with damage calculation
   */
  private createAttackAction(attacker: Combatant, defender: Combatant): CombatAction {
    if (!attacker.weapon) {
      // Unarmed attack
      const baseDamage = attacker.stats.attack;
      const variance = this.rng.nextFloat(0.875, 1.125); // ±12.5%
      const defenseReduction = Math.max(0.1, 1 - defender.stats.defense * 0.01);
      const damage = Math.max(1, Math.floor(baseDamage * variance * defenseReduction));

      return {
        attackerId: attacker.id,
        targetId: defender.id,
        type: 'attack',
        damage,
        roll: baseDamage,
        variance
      };
    }

    // Armed attack
    const damageResult = calculateDamage(
      attacker.stats,
      defender.stats,
      attacker.weapon,
      this.rng
    );

    return {
      attackerId: attacker.id,
      targetId: defender.id,
      type: 'attack',
      damage: damageResult.damage,
      roll: damageResult.roll,
      variance: damageResult.variance
    };
  }

  /**
   * Get combat logs for a specific turn range
   */
  getLogs(startTurn?: number, endTurn?: number): CombatLogEntry[] {
    if (startTurn === undefined && endTurn === undefined) {
      return [...this.logs];
    }

    return this.logs.filter(log => {
      if (startTurn !== undefined && log.turn < startTurn) return false;
      if (endTurn !== undefined && log.turn > endTurn) return false;
      return true;
    });
  }
}