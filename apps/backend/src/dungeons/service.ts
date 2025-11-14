import {
  Area,
  CombatResult,
  CombatRewards,
  Combatant,
  CombatStats,
  DungeonDefinition,
  DungeonFloor,
  DungeonRunRewardSummary,
  DungeonRunState,
  PlayerDungeonState,
  DungeonProgress,
  DungeonReward,
  PlayerProgression,
  Weapon,
} from '@shared';
import { CombatEngine } from '../combat/CombatEngine';
import type { PlayerProgressionService } from '../progression/service';
import type { DungeonRepository } from '../storage/dungeonRepository';

export interface PlayerDungeonSummary {
  definition: DungeonDefinition;
  progress: DungeonProgress;
  unlocked: boolean;
}

export interface EnterFloorResult {
  floor: DungeonFloor;
  run: DungeonRunState;
  playerCombatant: Combatant;
}

export interface ResolveFloorOptions {
  seed?: number;
}

export interface ResolveFloorResult {
  outcome: 'win' | 'loss';
  floor: number;
  rewardsEarned: DungeonRunRewardSummary;
  accumulatedRewards: DungeonRunRewardSummary;
  combatResults: CombatResult[];
  drops: string[];
  nextFloor: number | null;
  bossPhase?: number | null;
  completed: boolean;
  run: DungeonRunState;
}

type Logger = Pick<Console, 'info' | 'warn' | 'error'>;

type RewardLike = Partial<DungeonReward | CombatRewards> | null | undefined;

const DEFAULT_DUNGEONS: DungeonDefinition[] = [
  {
    id: 'forgotten-catacombs',
    name: 'Forgotten Catacombs',
    area: Area.GREENWOOD,
    unlockRequirements: { minLevel: 1 },
    floors: [
      {
        floor: 1,
        name: 'Restless Antechamber',
        description:
          'Shuffling husks stalk these halls, remnants of would-be adventurers.',
        type: 'combat',
        enemy: {
          id: 'catacomb-ghoul',
          name: 'Catacomb Ghoul',
          stats: {
            health: 80,
            maxHealth: 80,
            attack: 14,
            defense: 6,
            speed: 9,
          },
          weapon: {
            id: 'rusted-claws',
            name: 'Rusted Claws',
            baseDamage: 6,
            multiplier: 1.05,
          },
        },
        rewards: {
          experience: 90,
          gold: 25,
          items: ['bone-fragment'],
        },
      },
      {
        floor: 2,
        name: 'Sentinel Corridor',
        description:
          'Animated armor patrols endlessly, driven by lingering necromancy.',
        type: 'combat',
        enemy: {
          id: 'bone-sentinel',
          name: 'Bone Sentinel',
          stats: {
            health: 110,
            maxHealth: 110,
            attack: 18,
            defense: 10,
            speed: 8,
          },
          weapon: {
            id: 'broken-halberd',
            name: 'Broken Halberd',
            baseDamage: 8,
            multiplier: 1.15,
          },
        },
        rewards: {
          experience: 130,
          gold: 40,
          items: ['sentinel-plate-scrap'],
        },
        unlockRequirements: {
          minLevel: 2,
        },
      },
      {
        floor: 3,
        name: 'Seat of the Lich',
        description:
          'The master of the crypt lingers here, phylactery aglow with hunger.',
        type: 'boss',
        boss: {
          id: 'lich-sovereign',
          name: 'Lich Sovereign',
          phases: [
            {
              phase: 1,
              description: 'Soul Husk reforms, cloaked in shadow.',
              enemy: {
                id: 'lich-husk',
                name: 'Sovereign Husk',
                stats: {
                  health: 120,
                  maxHealth: 120,
                  attack: 22,
                  defense: 12,
                  speed: 11,
                },
                weapon: {
                  id: 'void-touch',
                  name: 'Void Touch',
                  baseDamage: 10,
                  multiplier: 1.2,
                },
              },
              rewards: {
                experience: 160,
                gold: 55,
                items: ['shadow-essence'],
              },
              drops: ['shadow-essence'],
            },
            {
              phase: 2,
              description: 'True form emerges, wielding searing soulflame.',
              enemy: {
                id: 'lich-true',
                name: 'Lich Sovereign',
                stats: {
                  health: 150,
                  maxHealth: 150,
                  attack: 28,
                  defense: 14,
                  speed: 12,
                },
                weapon: {
                  id: 'soulfire-brand',
                  name: 'Soulfire Brand',
                  baseDamage: 14,
                  multiplier: 1.3,
                },
              },
              rewards: {
                experience: 210,
                gold: 70,
                items: ['soulfire-ember'],
              },
              drops: ['soulfire-ember'],
            },
          ],
          rewards: {
            experience: 260,
            gold: 90,
            items: ['ancient-phylactery'],
          },
          drops: ['ancient-phylactery'],
        },
        rewards: {
          experience: 200,
          gold: 85,
          items: ['catacomb-keystone'],
        },
        unlockRequirements: {
          minLevel: 3,
        },
      },
    ],
  },
  {
    id: 'ember-spire-gauntlet',
    name: 'Ember Spire Gauntlet',
    area: Area.ASHEN_WASTE,
    unlockRequirements: {
      minLevel: 8,
      prerequisites: ['forgotten-catacombs'],
    },
    floors: [
      {
        floor: 1,
        name: 'Cinder Approach',
        type: 'combat',
        enemy: {
          id: 'ember-acolyte',
          name: 'Ember Acolyte',
          stats: {
            health: 140,
            maxHealth: 140,
            attack: 24,
            defense: 12,
            speed: 12,
          },
          weapon: {
            id: 'ember-staff',
            name: 'Ember Staff',
            baseDamage: 12,
            multiplier: 1.25,
          },
        },
        rewards: {
          experience: 200,
          gold: 65,
          items: ['ember-ash'],
        },
      },
      {
        floor: 2,
        name: 'Forgeheart Hall',
        type: 'combat',
        enemy: {
          id: 'molten-guardian',
          name: 'Molten Guardian',
          stats: {
            health: 170,
            maxHealth: 170,
            attack: 28,
            defense: 16,
            speed: 11,
          },
          weapon: {
            id: 'slag-hammer',
            name: 'Slag Hammer',
            baseDamage: 14,
            multiplier: 1.3,
          },
        },
        rewards: {
          experience: 240,
          gold: 80,
          items: ['forgeharden-shard'],
        },
      },
      {
        floor: 3,
        name: 'Infernal Crucible',
        type: 'boss',
        boss: {
          id: 'pyrelord',
          name: 'Pyrelord Incarnate',
          phases: [
            {
              phase: 1,
              description: 'Molten outer shell cracks under pressure.',
              enemy: {
                id: 'pyrelord-shell',
                name: 'Pyrelord Shell',
                stats: {
                  health: 180,
                  maxHealth: 180,
                  attack: 30,
                  defense: 18,
                  speed: 12,
                },
                weapon: {
                  id: 'slag-burst',
                  name: 'Slag Burst',
                  baseDamage: 16,
                  multiplier: 1.28,
                },
              },
              rewards: {
                experience: 260,
                gold: 90,
                items: ['slag-core'],
              },
              drops: ['slag-core'],
            },
            {
              phase: 2,
              description: 'Blazing core manifests overwhelming heat.',
              enemy: {
                id: 'pyrelord-core',
                name: 'Pyrelord Core',
                stats: {
                  health: 200,
                  maxHealth: 200,
                  attack: 34,
                  defense: 19,
                  speed: 13,
                },
                weapon: {
                  id: 'flame-scythe',
                  name: 'Flame Scythe',
                  baseDamage: 18,
                  multiplier: 1.35,
                },
              },
              rewards: {
                experience: 300,
                gold: 105,
                items: ['blazing-heart'],
              },
              drops: ['blazing-heart'],
            },
            {
              phase: 3,
              description: 'Final incarnation wreathed in controlled flame.',
              enemy: {
                id: 'pyrelord-incarnate',
                name: 'Pyrelord Incarnate',
                stats: {
                  health: 220,
                  maxHealth: 220,
                  attack: 38,
                  defense: 20,
                  speed: 14,
                },
                weapon: {
                  id: 'cinder-lash',
                  name: 'Cinder Lash',
                  baseDamage: 20,
                  multiplier: 1.4,
                },
              },
              rewards: {
                experience: 340,
                gold: 130,
                items: ['inferno-thread'],
              },
              drops: ['inferno-thread'],
            },
          ],
          rewards: {
            experience: 400,
            gold: 150,
            items: ['pyrelord-signet'],
          },
          drops: ['pyrelord-signet'],
        },
        rewards: {
          experience: 320,
          gold: 120,
          items: ['ember-sigil'],
        },
      },
    ],
  },
];

export class DungeonService {
  private readonly dungeonsById: Map<string, DungeonDefinition>;

  constructor(
    private readonly repository: DungeonRepository,
    private readonly progressionService: PlayerProgressionService,
    private readonly logger: Logger = console,
    private readonly clock: () => number = () => Date.now()
  ) {
    this.dungeonsById = new Map(
      DEFAULT_DUNGEONS.map(dungeon => [dungeon.id, this.sortFloors(dungeon)])
    );
  }

  listDefinitions(): DungeonDefinition[] {
    return Array.from(this.dungeonsById.values());
  }

  async listForPlayer(playerId: string): Promise<PlayerDungeonSummary[]> {
    const progression = await this.progressionService.getOrCreatePlayer(playerId);
    const state = await this.getOrCreateState(playerId);
    let mutated = false;

    const summaries = Array.from(this.dungeonsById.values()).map(
      definition => {
        const existing = state.dungeons[definition.id];
        const progress = this.ensureProgress(state, definition.id);
        if (!existing) {
          mutated = true;
        }
        const unlocked = this.isDungeonUnlocked(definition, progression, state);
        return {
          definition,
          progress,
          unlocked,
        } satisfies PlayerDungeonSummary;
      }
    );

    if (mutated) {
      await this.saveState(state);
    }

    return summaries;
  }

  async getPlayerState(playerId: string): Promise<PlayerDungeonState> {
    return this.getOrCreateState(playerId);
  }

  async enterDungeon(
    playerId: string,
    dungeonId: string,
    options: { reset?: boolean } = {}
  ): Promise<DungeonRunState> {
    const definition = this.getDungeonDefinition(dungeonId);
    const progression = await this.progressionService.getOrCreatePlayer(playerId);
    const state = await this.getOrCreateState(playerId);
    const progress = this.ensureProgress(state, dungeonId);

    if (!this.isDungeonUnlocked(definition, progression, state)) {
      throw new Error(
        `Dungeon '${definition.name}' is locked for player ${playerId}`
      );
    }

    const shouldReset =
      options.reset === true ||
      !progress.activeRun ||
      progress.activeRun.status === 'completed';

    if (shouldReset) {
      progress.activeRun = this.createNewRun(dungeonId);
      progress.lastResetAt = new Date(this.clock());
      this.logger.info(
        `Player ${playerId} started a new run for dungeon ${dungeonId}`
      );
    }

    await this.saveState(state);
    return this.cloneRunState(progress.activeRun!);
  }

  async resetDungeon(playerId: string, dungeonId: string): Promise<DungeonRunState> {
    const definition = this.getDungeonDefinition(dungeonId);
    const state = await this.getOrCreateState(playerId);
    const progress = this.ensureProgress(state, dungeonId);

    progress.activeRun = this.createNewRun(definition.id);
    progress.lastResetAt = new Date(this.clock());

    await this.saveState(state);
    this.logger.info(
      `Player ${playerId} reset dungeon run for ${definition.name}`
    );
    return this.cloneRunState(progress.activeRun);
  }

  async enterFloor(
    playerId: string,
    dungeonId: string,
    floorNumber: number
  ): Promise<EnterFloorResult> {
    const definition = this.getDungeonDefinition(dungeonId);
    const floor = this.getFloor(definition, floorNumber);
    const progression = await this.progressionService.getOrCreatePlayer(playerId);
    const state = await this.getOrCreateState(playerId);
    const progress = this.ensureProgress(state, dungeonId);
    const run = progress.activeRun;

    if (!run || run.status === 'completed') {
      throw new Error(`Player ${playerId} has no active run for ${dungeonId}`);
    }

    if (run.currentFloor !== floorNumber) {
      throw new Error('Cannot enter a floor that is not the current objective');
    }

    if (!this.isFloorUnlocked(floor, progression)) {
      throw new Error(`Floor ${floorNumber} is locked for player ${playerId}`);
    }

    if (floor.type === 'boss' && run.currentBossPhase == null) {
      const boss = floor.boss;
      if (!boss || boss.phases.length === 0) {
        throw new Error(`Boss floor ${floorNumber} is missing phases definition`);
      }
      run.currentBossPhase = boss.phases[0].phase;
      await this.saveState(state);
    }

    return {
      floor,
      run: this.cloneRunState(run),
      playerCombatant: this.buildPlayerCombatant(progression),
    } satisfies EnterFloorResult;
  }

  async resolveFloor(
    playerId: string,
    dungeonId: string,
    floorNumber: number,
    options: ResolveFloorOptions = {}
  ): Promise<ResolveFloorResult> {
    const definition = this.getDungeonDefinition(dungeonId);
    const floor = this.getFloor(definition, floorNumber);
    const progression = await this.progressionService.getOrCreatePlayer(playerId);
    const state = await this.getOrCreateState(playerId);
    const progress = this.ensureProgress(state, dungeonId);
    const run = progress.activeRun;

    if (!run || run.status === 'completed') {
      throw new Error(`Player ${playerId} has no active run for ${dungeonId}`);
    }

    if (run.currentFloor !== floorNumber) {
      throw new Error('Cannot resolve a floor out of order');
    }

    if (!this.isFloorUnlocked(floor, progression)) {
      throw new Error(`Floor ${floorNumber} is locked for player ${playerId}`);
    }

    const earnedThisAttempt = this.emptyRewards();
    const drops: string[] = [];
    const combatResults: CombatResult[] = [];
    const playerCombatant = this.buildPlayerCombatant(progression);

    const now = new Date(this.clock());
    let outcome: 'win' | 'loss' = 'win';
    let completed = false;
    let nextFloor: number | null = null;
    let bossPhase: number | null | undefined = undefined;

    if (floor.type === 'combat') {
      const enemyCombatant = this.buildEnemyCombatant(floor);
      const engine = new CombatEngine(options.seed);
      const result = engine.resolveCombat(
        playerCombatant,
        enemyCombatant,
        floor.rewards
      );
      combatResults.push(result);

      if (result.winner !== playerCombatant.id) {
        outcome = 'loss';
        run.lastOutcome = 'loss';
        run.updatedAt = now;
        await this.saveState(state);
        return {
          outcome,
          floor: floorNumber,
          rewardsEarned: earnedThisAttempt,
          accumulatedRewards: this.cloneRewards(run.accumulatedRewards),
          combatResults,
          drops,
          nextFloor: run.currentFloor,
          bossPhase: run.currentBossPhase ?? null,
          completed,
          run: this.cloneRunState(run),
        } satisfies ResolveFloorResult;
      }

      this.accumulateRewards(earnedThisAttempt, result.rewards);
      this.accumulateRewards(run.accumulatedRewards, result.rewards);
      if (result.rewards.items && result.rewards.items.length > 0) {
        drops.push(...result.rewards.items);
      }
    } else {
      const boss = floor.boss;
      if (!boss || boss.phases.length === 0) {
        throw new Error(`Boss floor ${floorNumber} is missing phases definition`);
      }

      let phaseIndex = 0;
      if (run.currentBossPhase != null) {
        const located = boss.phases.findIndex(
          phase => phase.phase === run.currentBossPhase
        );
        phaseIndex = located >= 0 ? located : 0;
      } else {
        run.currentBossPhase = boss.phases[0].phase;
        phaseIndex = 0;
      }

      for (let idx = phaseIndex; idx < boss.phases.length; idx++) {
        const phase = boss.phases[idx];
        const enemyCombatant = this.buildBossPhaseCombatant(phase);
        const phaseSeed =
          options.seed !== undefined ? options.seed + idx : undefined;
        const engine = new CombatEngine(phaseSeed);
        const rewards: CombatRewards = phase.rewards
          ? {
              experience: phase.rewards.experience,
              gold: phase.rewards.gold,
              items: phase.rewards.items,
            }
          : { experience: 0, gold: 0, items: [] };
        const result = engine.resolveCombat(
          playerCombatant,
          enemyCombatant,
          rewards
        );
        combatResults.push(result);

        if (result.winner !== playerCombatant.id) {
          outcome = 'loss';
          run.lastOutcome = 'loss';
          run.currentBossPhase = phase.phase;
          run.updatedAt = now;
          bossPhase = phase.phase;
          await this.saveState(state);
          return {
            outcome,
            floor: floorNumber,
            rewardsEarned: earnedThisAttempt,
            accumulatedRewards: this.cloneRewards(run.accumulatedRewards),
            combatResults,
            drops,
            nextFloor: run.currentFloor,
            bossPhase,
            completed,
            run: this.cloneRunState(run),
          } satisfies ResolveFloorResult;
        }

        this.accumulateRewards(earnedThisAttempt, result.rewards);
        this.accumulateRewards(run.accumulatedRewards, result.rewards);
        if (result.rewards.items && result.rewards.items.length > 0) {
          drops.push(...result.rewards.items);
        }
        if (phase.drops) {
          drops.push(...phase.drops);
        }
        run.currentBossPhase =
          idx + 1 < boss.phases.length
            ? boss.phases[idx + 1].phase
            : null;
      }

      // Boss defeated, add floor and boss rewards
      this.accumulateRewards(earnedThisAttempt, floor.rewards);
      this.accumulateRewards(run.accumulatedRewards, floor.rewards);
      if (floor.rewards.items) {
        drops.push(...floor.rewards.items);
      }

      if (boss.rewards) {
        this.accumulateRewards(earnedThisAttempt, boss.rewards);
        this.accumulateRewards(run.accumulatedRewards, boss.rewards);
        if (boss.rewards.items) {
          drops.push(...boss.rewards.items);
        }
        if (boss.drops) {
          drops.push(...boss.drops);
        }
      }

      bossPhase = null;
    }

    run.lastOutcome = 'win';
    run.updatedAt = now;
    if (!run.floorsCleared.includes(floorNumber)) {
      run.floorsCleared.push(floorNumber);
      run.floorsCleared.sort((a, b) => a - b);
    }

    const totalFloors = definition.floors.length;
    if (floorNumber >= totalFloors) {
      run.status = 'completed';
      completed = true;
      progress.timesCompleted += 1;
      progress.lastCompletedAt = now;
      nextFloor = null;
    } else {
      const subsequentFloor = floorNumber + 1;
      run.currentFloor = subsequentFloor;
      run.currentBossPhase = null;
      nextFloor = subsequentFloor;
    }

    if (floorNumber > progress.highestFloorReached) {
      progress.highestFloorReached = floorNumber;
    }

    await this.saveState(state);

    this.logger.info(
      `Player ${playerId} cleared floor ${floorNumber} of ${dungeonId}`
    );

    return {
      outcome,
      floor: floorNumber,
      rewardsEarned: earnedThisAttempt,
      accumulatedRewards: this.cloneRewards(run.accumulatedRewards),
      combatResults,
      drops,
      nextFloor,
      bossPhase,
      completed,
      run: this.cloneRunState(run),
    } satisfies ResolveFloorResult;
  }

  private getDungeonDefinition(dungeonId: string): DungeonDefinition {
    const dungeon = this.dungeonsById.get(dungeonId);
    if (!dungeon) {
      throw new Error(`Unknown dungeon: ${dungeonId}`);
    }
    return dungeon;
  }

  private getFloor(
    dungeon: DungeonDefinition,
    floorNumber: number
  ): DungeonFloor {
    const floor = dungeon.floors.find(f => f.floor === floorNumber);
    if (!floor) {
      throw new Error(`Unknown floor ${floorNumber} for dungeon ${dungeon.id}`);
    }
    return floor;
  }

  private async getOrCreateState(playerId: string): Promise<PlayerDungeonState> {
    const existing = await this.repository.get(playerId);
    if (existing) {
      return existing;
    }

    const now = new Date(this.clock());
    const state: PlayerDungeonState = {
      playerId,
      dungeons: {},
      createdAt: now,
      updatedAt: now,
    };
    await this.repository.set(playerId, state);
    return state;
  }

  private ensureProgress(
    state: PlayerDungeonState,
    dungeonId: string
  ): DungeonProgress {
    let progress = state.dungeons[dungeonId];
    if (!progress) {
      progress = {
        dungeonId,
        highestFloorReached: 0,
        timesCompleted: 0,
        activeRun: null,
      };
      state.dungeons[dungeonId] = progress;
    }
    return progress;
  }

  private async saveState(state: PlayerDungeonState): Promise<void> {
    state.updatedAt = new Date(this.clock());
    await this.repository.set(state.playerId, state);
  }

  private isDungeonUnlocked(
    definition: DungeonDefinition,
    progression: PlayerProgression,
    state: PlayerDungeonState
  ): boolean {
    const requirements = definition.unlockRequirements;
    if (requirements.minLevel && progression.level < requirements.minLevel) {
      return false;
    }

    if (requirements.prerequisites) {
      const unmet = requirements.prerequisites.some(prereqId => {
        const progress = state.dungeons[prereqId];
        return !progress || progress.timesCompleted === 0;
      });
      if (unmet) {
        return false;
      }
    }

    return true;
  }

  private isFloorUnlocked(
    floor: DungeonFloor,
    progression: PlayerProgression
  ): boolean {
    if (!floor.unlockRequirements) {
      return true;
    }

    if (
      floor.unlockRequirements.minLevel &&
      progression.level < floor.unlockRequirements.minLevel
    ) {
      return false;
    }

    return true;
  }

  private createNewRun(dungeonId: string): DungeonRunState {
    const now = new Date(this.clock());
    return {
      dungeonId,
      status: 'in_progress',
      currentFloor: 1,
      currentBossPhase: null,
      floorsCleared: [],
      accumulatedRewards: this.emptyRewards(),
      startedAt: now,
      updatedAt: now,
    };
  }

  private emptyRewards(): DungeonRunRewardSummary {
    return {
      experience: 0,
      gold: 0,
      items: [],
    };
  }

  private cloneRewards(
    summary: DungeonRunRewardSummary
  ): DungeonRunRewardSummary {
    return {
      experience: summary.experience,
      gold: summary.gold,
      items: [...summary.items],
    };
  }

  private accumulateRewards(
    target: DungeonRunRewardSummary,
    rewards: RewardLike
  ): void {
    if (!rewards) {
      return;
    }

    if (typeof rewards.experience === 'number') {
      target.experience += rewards.experience;
    }

    if (typeof rewards.gold === 'number') {
      target.gold += rewards.gold;
    }

    if (Array.isArray(rewards.items) && rewards.items.length > 0) {
      target.items.push(...rewards.items);
    }
  }

  private buildEnemyCombatant(floor: DungeonFloor): Combatant {
    if (!floor.enemy) {
      throw new Error('Combat floor is missing enemy definition');
    }
    return {
      id: floor.enemy.id,
      name: floor.enemy.name,
      stats: { ...floor.enemy.stats },
      weapon: floor.enemy.weapon,
    };
  }

  private buildBossPhaseCombatant(
    phase: DungeonDefinition['floors'][number]['boss']['phases'][number]
  ): Combatant {
    return {
      id: `${phase.enemy.id}-phase-${phase.phase}`,
      name: phase.enemy.name,
      stats: { ...phase.enemy.stats },
      weapon: phase.enemy.weapon,
      isPlayer: false,
    };
  }

  private buildPlayerCombatant(progression: PlayerProgression): Combatant {
    const stats = this.deriveCombatStats(progression);
    return {
      id: progression.playerId,
      name: 'Adventurer',
      stats,
      weapon: this.derivePlayerWeapon(progression),
      isPlayer: true,
    };
  }

  private deriveCombatStats(progression: PlayerProgression): CombatStats {
    const { derivedStats, baseStats, level } = progression;
    const speedBase = baseStats.dexterity + baseStats.wisdom * 0.5;
    return {
      health: Math.max(derivedStats.health, 50),
      maxHealth: Math.max(derivedStats.health, 50),
      attack: Math.max(Math.floor(derivedStats.attackPower), 8 + level),
      defense: Math.max(Math.floor(derivedStats.defensePower / 1.5), 6 + level),
      speed: Math.max(Math.floor(speedBase / 2) + level, 8),
    };
  }

  private derivePlayerWeapon(progression: PlayerProgression): Weapon {
    const baseDamage = 8 + Math.floor(progression.level * 1.5);
    const multiplier = 1 + progression.level * 0.05;
    return {
      id: 'adventurer-blade',
      name: 'Adventurer Blade',
      baseDamage,
      multiplier: Number(multiplier.toFixed(2)),
    };
  }

  private cloneRunState(run: DungeonRunState): DungeonRunState {
    return {
      dungeonId: run.dungeonId,
      status: run.status,
      currentFloor: run.currentFloor,
      currentBossPhase: run.currentBossPhase ?? null,
      floorsCleared: [...run.floorsCleared],
      accumulatedRewards: this.cloneRewards(run.accumulatedRewards),
      startedAt: new Date(run.startedAt),
      updatedAt: new Date(run.updatedAt),
      lastOutcome: run.lastOutcome,
    };
  }

  private sortFloors(dungeon: DungeonDefinition): DungeonDefinition {
    return {
      ...dungeon,
      floors: [...dungeon.floors].sort((a, b) => a.floor - b.floor),
    };
  }
}
