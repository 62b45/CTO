import type { ActionType } from '../actions/metadata';

export class CooldownActiveError extends Error {
  constructor(
    public readonly action: ActionType,
    public readonly remainingMs: number,
    public readonly availableAt: number,
  ) {
    super(
      `Action "${action}" is on cooldown for another ${Math.max(0, Math.ceil(remainingMs / 1000))} seconds`,
    );
    this.name = 'CooldownActiveError';
  }
}
