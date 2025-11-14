import {
  ArenaMatchRecord,
  ArenaOpponent,
  CombatResult,
  Combatant,
  CombatRewards,
  CombatStats,
  PlayerArenaState,
  PlayerProgression,
  Weapon,
} from '@shared';
import { CombatEngine } from '../combat/CombatEngine';
import type { PlayerProgressionService } from '../progression/service';
import type { ArenaRepository } from '../storage/arenaRepository';

type Logger = Pick<Console, 'info' | 'warn' | 'error'>;
export interface ArenaServiceConfig {
  historyLimit?: number;
  baseRating?: number;
  winRatingDelta?: number;
  lossRatingDelta?: number;
  rng?: () => number;
}

export interface ArenaChallengeResult {
  outcome: 'win' | 'loss';
  opponent: ArenaOpponent;
  result: CombatResult;
  rewards: CombatRewards;
  match: ArenaMatchRecord;
  state: PlayerArenaState;
}

const DEFAULT_HISTORY_LIMIT = 15;
const DEFAULT_BASE_RATING = 1000;
const DEFAULT_WIN_DELTA = 24;
const DEFAULT_LOSS_DELTA = 14;

export class ArenaService {
  private readonly historyLimit: number;
  private readonly baseRating: number;
  private readonly winDelta: number;
  private readonly lossDelta: number;
  private readonly rng: () => number;

  constructor(
    private readonly repository: ArenaRepository,
    private readonly progressionService: PlayerProgressionService,
    private readonly logger: Logger = console,
    private readonly clock: () => number = () => Date.now(),
    config: ArenaServiceConfig = {}
  ) {
    this.historyLimit = config.historyLimit ?? DEFAULT_HISTORY_LIMIT;
    this.baseRating = config.baseRating ?? DEFAULT_BASE_RATING;
    this.winDelta = config.winRatingDelta ?? DEFAULT_WIN_DELTA;
    this.lossDelta = config.lossRatingDelta ?? DEFAULT_LOSS_DELTA;
    this.rng = config.rng ?? Math.random;
  }

  async getState(playerId: string): Promise<PlayerArenaState> {
    return this.getOrCreateState(playerId);
  }

  async getLeaderboard(limit: number = 10): Promise<PlayerArenaState[]> {
    const allStates = await this.repository.list();
    return allStates
      .slice()
      .sort((a, b) => {
        if (b.rating !== a.rating) {
          return b.rating - a.rating;
        }
        const winDiff = b.wins - a.wins;
        if (winDiff !== 0) {
          return winDiff;
        }
        return b.bestStreak - a.bestStreak;
      })
      .slice(0, limit)
      .map(state => this.cloneState(state));
  }

  async generateOpponent(playerId: string): Promise<ArenaOpponent> {
    const progression = await this.progressionService.getOrCreatePlayer(
      playerId
    );
    const playerStats = this.deriveCombatStats(progression);
    const modifier = this.randomModifier();
    const opponentLevel = Math.max(
      1,
      Math.round(progression.level * (1 + modifier))
    );
    const stats = this.scaleOpponentStats(
      playerStats,
      opponentLevel,
      modifier
    );
    const weapon = this.createOpponentWeapon(opponentLevel, modifier);
    const seed = this.generateSeed();

    return {
      id: `arena-opponent-${playerId}-${seed}`,
      name: this.generateOpponentName(opponentLevel, modifier),
      level: opponentLevel,
      stats,
      weapon,
      modifier,
      seed,
    };
  }

  async challenge(
    playerId: string,
    options: { opponent?: ArenaOpponent; seed?: number } = {}
  ): Promise<ArenaChallengeResult> {
    const opponent =
      options.opponent ?? (await this.generateOpponent(playerId));
    const seed = options.seed ?? opponent.seed;

    const progression = await this.progressionService.getOrCreatePlayer(
      playerId
    );
    const playerCombatant = this.buildPlayerCombatant(progression);
    const opponentCombatant = this.buildOpponentCombatant(opponent);

    const engine = new CombatEngine(seed);
    const result = engine.resolveCombat(
      playerCombatant,
      opponentCombatant,
      { experience: 0, gold: 0, items: [] }
    );

    const outcome: 'win' | 'loss' =
      result.winner === playerCombatant.id ? 'win' : 'loss';
    result.rewards = this.calculateRewards(opponent, outcome);
    const record = await this.recordMatch(
      playerId,
      opponent,
      result,
      outcome
    );

    this.logger.info(
      `Player ${playerId} fought arena opponent ${opponent.id} with outcome ${outcome}`
    );

    return {
      outcome,
      opponent,
      result,
      rewards: result.rewards,
      match: record.match,
      state: record.state,
    };
  }

  private async recordMatch(
    playerId: string,
    opponent: ArenaOpponent,
    result: CombatResult,
    outcome: 'win' | 'loss'
  ): Promise<{ match: ArenaMatchRecord; state: PlayerArenaState }> {
    const state = await this.getOrCreateState(playerId);
    const timestamp = new Date(this.clock());
    const match: ArenaMatchRecord = {
      matchId: `arena_${timestamp.getTime()}_${Math.floor(this.rng() * 1e6)}`,
      playerId,
      opponent,
      outcome,
      turns: result.turns,
      rewards: result.rewards,
      timestamp,
      logs: result.logs,
    };

    state.history.unshift(match);
    if (state.history.length > this.historyLimit) {
      state.history = state.history.slice(0, this.historyLimit);
    }

    if (outcome === 'win') {
      state.wins += 1;
      state.streak += 1;
      state.bestStreak = Math.max(state.bestStreak, state.streak);
      state.rating += Math.round(this.winDelta + opponent.modifier * 30);
    } else {
      state.losses += 1;
      state.streak = 0;
      state.rating = Math.max(
        Math.floor(this.baseRating * 0.5),
        state.rating - this.lossDelta
      );
    }

    state.updatedAt = timestamp;
    await this.repository.set(playerId, state);

    return { match, state: this.cloneState(state) };
  }

  private async getOrCreateState(playerId: string): Promise<PlayerArenaState> {
    const existing = await this.repository.get(playerId);
    if (existing) {
      return existing;
    }

    const now = new Date(this.clock());
    const state: PlayerArenaState = {
      playerId,
      rating: this.baseRating,
      wins: 0,
      losses: 0,
      streak: 0,
      bestStreak: 0,
      history: [],
      createdAt: now,
      updatedAt: now,
    };
    await this.repository.set(playerId, state);
    return state;
  }

  private cloneState(state: PlayerArenaState): PlayerArenaState {
    return {
      playerId: state.playerId,
      rating: state.rating,
      wins: state.wins,
      losses: state.losses,
      streak: state.streak,
      bestStreak: state.bestStreak,
      history: state.history.map(match => ({
        matchId: match.matchId,
        playerId: match.playerId,
        opponent: {
          ...match.opponent,
          stats: { ...match.opponent.stats },
          weapon: { ...match.opponent.weapon },
        },
        outcome: match.outcome,
        turns: match.turns,
        rewards: { ...match.rewards, items: match.rewards.items ? [...match.rewards.items] : [] },
        timestamp: new Date(match.timestamp),
        logs: match.logs.map(log => ({
          ...log,
          timestamp: new Date(log.timestamp),
          action: { ...log.action },
          remainingHealth: { ...log.remainingHealth },
        })),
      })),
      createdAt: new Date(state.createdAt),
      updatedAt: new Date(state.updatedAt),
    };
  }

  private buildPlayerCombatant(progression: PlayerProgression): Combatant {
    const stats = this.deriveCombatStats(progression);
    return {
      id: progression.playerId,
      name: 'Arena Challenger',
      stats,
      weapon: this.derivePlayerWeapon(progression),
      isPlayer: true,
    };
  }

  private buildOpponentCombatant(opponent: ArenaOpponent): Combatant {
    return {
      id: opponent.id,
      name: opponent.name,
      stats: { ...opponent.stats },
      weapon: opponent.weapon,
      isPlayer: false,
    };
  }

  private deriveCombatStats(progression: PlayerProgression): CombatStats {
    const { derivedStats, baseStats, level } = progression;
    const speedBase = baseStats.dexterity * 0.7 + baseStats.wisdom * 0.5;
    return {
      health: Math.max(derivedStats.health, 80),
      maxHealth: Math.max(derivedStats.health, 80),
      attack: Math.max(Math.floor(derivedStats.attackPower), 10 + level * 2),
      defense: Math.max(
        Math.floor(derivedStats.defensePower / 1.4),
        8 + level * 1.5
      ),
      speed: Math.max(Math.floor(speedBase / 2) + level, 10),
    };
  }

  private derivePlayerWeapon(progression: PlayerProgression): Weapon {
    const baseDamage = 10 + Math.floor(progression.level * 1.8);
    const multiplier = 1 + progression.level * 0.04;
    return {
      id: 'arena-challenger-blade',
      name: 'Arena Challenger Blade',
      baseDamage,
      multiplier: Number(multiplier.toFixed(2)),
    };
  }

  private scaleOpponentStats(
    playerStats: CombatStats,
    level: number,
    modifier: number
  ): CombatStats {
    const scalar = 1 + modifier * 0.6;
    const levelBonus = Math.max(level, 1);

    const health = Math.max(
      90,
      Math.round(playerStats.maxHealth * scalar + levelBonus * 6)
    );
    const attack = Math.max(
      14,
      Math.round(playerStats.attack * (0.9 + modifier * 0.5) + levelBonus * 2)
    );
    const defense = Math.max(
      10,
      Math.round(playerStats.defense * (0.9 + modifier * 0.4) + levelBonus * 1.6)
    );
    const speed = Math.max(
      9,
      Math.round(playerStats.speed * (0.95 + modifier * 0.3) + levelBonus)
    );

    return {
      health,
      maxHealth: health,
      attack,
      defense,
      speed,
    };
  }

  private createOpponentWeapon(level: number, modifier: number): Weapon {
    const baseDamage = Math.round(9 + level * 1.7 + modifier * 5);
    const multiplier = Number((1 + level * 0.035 + modifier * 0.05).toFixed(2));
    return {
      id: `arena-weapon-${level}`,
      name: 'Arena Forged Weapon',
      baseDamage,
      multiplier,
    };
  }

  private generateSeed(): number {
    return Math.abs(Math.floor(this.rng() * 1_000_000));
  }

  private randomModifier(): number {
    const raw = this.rng() * 0.2 - 0.1;
    return Math.round(raw * 1000) / 1000;
  }

  private generateOpponentName(level: number, modifier: number): string {
    const descriptors = modifier >= 0 ? ['Fierce', 'Swift', 'Resolute'] : ['Wary', 'Measured', 'Calm'];
    const titles = ['Gladiator', 'Duelist', 'Contender', 'Veteran'];
    const descriptor = descriptors[Math.floor(this.rng() * descriptors.length)];
    const title = titles[Math.floor(this.rng() * titles.length)];
    return `${descriptor} ${title} Lv.${level}`;
  }

  private calculateRewards(
    opponent: ArenaOpponent,
    outcome: 'win' | 'loss'
  ): CombatRewards {
    const baseExperience = Math.round(160 + opponent.level * 25);
    const baseGold = Math.round(60 + opponent.level * 12);
    const victoryItem = `arena-token-${Math.max(1, Math.ceil(opponent.level / 4))}`;

    if (outcome === 'win') {
      return {
        experience: baseExperience,
        gold: baseGold,
        items: [victoryItem],
      };
    }

    return {
      experience: Math.max(20, Math.round(baseExperience * 0.25)),
      gold: Math.max(10, Math.round(baseGold * 0.25)),
      items: [],
    };
  }
}
