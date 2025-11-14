import type {
  ActionHandler,
  ActionMetadata,
  ActionResult,
  ActionType,
} from '../actions/metadata';
import { ACTION_METADATA } from '../actions/metadata';
import type {
  CooldownRepository,
  CooldownEntry,
} from '../storage/cooldownRepository';
import { CooldownActiveError } from './errors';

export interface TriggerPayload {
  playerId: string;
  action: ActionType;
  handler?: ActionHandler;
}

export interface TriggerOutcome {
  playerId: string;
  action: ActionType;
  triggeredAt: number;
  availableAt: number;
  metadata: ActionMetadata;
  result: ActionResult;
}

export interface CooldownSnapshot {
  lastTriggeredAt: number;
  availableAt: number;
  remainingMs: number;
}

type Clock = () => number;

type Logger = Pick<Console, 'info' | 'warn' | 'error'>;

export class ActionCooldownService {
  constructor(
    private readonly repository: CooldownRepository,
    private readonly logger: Logger = console,
    private readonly clock: Clock = () => Date.now()
  ) {}

  async getCooldown(
    playerId: string,
    action: ActionType
  ): Promise<CooldownSnapshot | null> {
    const entry = await this.repository.get(playerId, action);
    if (!entry) {
      return null;
    }

    const now = this.clock();
    return {
      lastTriggeredAt: entry.lastTriggeredAt,
      availableAt: entry.availableAt,
      remainingMs: Math.max(0, entry.availableAt - now),
    };
  }

  async trigger({
    playerId,
    action,
    handler,
  }: TriggerPayload): Promise<TriggerOutcome> {
    const metadata = ACTION_METADATA[action];
    const now = this.clock();

    const entry = await this.repository.get(playerId, action);
    if (entry && entry.availableAt > now) {
      const remainingMs = entry.availableAt - now;
      this.logger.warn(
        `Rejected action %s for player %s. Remaining cooldown: %d ms`,
        action,
        playerId,
        remainingMs
      );
      throw new CooldownActiveError(action, remainingMs, entry.availableAt);
    }

    const handlerToUse: ActionHandler =
      handler ?? (() => ({ summary: 'Action executed.' }));
    const result = await handlerToUse(playerId);

    const availableAt = now + metadata.cooldownMs;
    const cooldownEntry: CooldownEntry = {
      action,
      availableAt,
      lastTriggeredAt: now,
    };

    await this.repository.set(playerId, action, cooldownEntry);

    this.logger.info(
      `Action %s executed for player %s. Cooldown until %d (ms)`,
      action,
      playerId,
      availableAt
    );

    return {
      playerId,
      action,
      triggeredAt: now,
      availableAt,
      metadata,
      result,
    };
  }
}
