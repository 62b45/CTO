import request from 'supertest';
import { describe, expect, it, vi, beforeEach, afterEach } from '@jest/globals';
import { ACTION_METADATA } from '../actions/metadata';
import { ActionCooldownService } from '../cooldowns/service';
import { createApp } from '../http/app';
import { InMemoryCooldownRepository } from '../storage/inMemoryCooldownRepository';

const noopLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe('ActionCooldownService', () => {
  let clockNow: number;
  let service: ActionCooldownService;

  beforeEach(() => {
    clockNow = Date.UTC(2023, 0, 1, 0, 0, 0);
    const repository = new InMemoryCooldownRepository();
    service = new ActionCooldownService(repository, noopLogger, () => clockNow);
  });

  it('allows triggering an action and persists the cooldown', async () => {
    const result = await service.trigger({
      playerId: 'player-1',
      action: 'hunt',
      handler: () => ({ summary: 'Hunted successfully.' }),
    });

    expect(result.availableAt).toBe(clockNow + ACTION_METADATA.hunt.cooldownMs);

    const snapshot = await service.getCooldown('player-1', 'hunt');
    expect(snapshot).not.toBeNull();
    expect(snapshot?.remainingMs).toBe(ACTION_METADATA.hunt.cooldownMs);
  });

  it('rejects attempts made before cooldown expiry with remaining time', async () => {
    await service.trigger({
      playerId: 'player-2',
      action: 'arena',
      handler: () => ({ summary: 'Victory in the arena.' }),
    });

    await expect(
      service.trigger({
        playerId: 'player-2',
        action: 'arena',
        handler: () => ({ summary: 'Another arena attempt.' }),
      })
    ).rejects.toMatchObject({
      name: 'CooldownActiveError',
      remainingMs: ACTION_METADATA.arena.cooldownMs,
    });
  });

  it('allows re-triggering after cooldown expires', async () => {
    await service.trigger({
      playerId: 'player-3',
      action: 'heal',
      handler: () => ({ summary: 'Healing completed.' }),
    });

    clockNow += ACTION_METADATA.heal.cooldownMs + 1;

    await expect(
      service.trigger({
        playerId: 'player-3',
        action: 'heal',
        handler: () => ({ summary: 'Healing again.' }),
      })
    ).resolves.toMatchObject({
      playerId: 'player-3',
      action: 'heal',
    });
  });
});

describe('Action cooldown HTTP endpoints', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(Date.UTC(2023, 0, 1, 0, 0, 0)));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('returns 429 with remaining cooldown when triggered too soon', async () => {
    const repository = new InMemoryCooldownRepository();
    const service = new ActionCooldownService(repository, noopLogger, () =>
      Date.now()
    );
    const app = createApp({
      service,
      handlers: {
        hunt: () => ({ summary: 'Hunt outcome.' }),
      },
    });

    const agent = request(app);

    await agent.post('/players/player-10/actions/hunt').expect(200);

    const response = await agent
      .post('/players/player-10/actions/hunt')
      .expect(429);
    expect(response.body.success).toBe(false);
    expect(response.body.cooldown.remainingMs).toBe(
      ACTION_METADATA.hunt.cooldownMs
    );
    expect(response.body.cooldown.availableAt).toBeDefined();
  });

  it('exposes current cooldown information via GET endpoint', async () => {
    const repository = new InMemoryCooldownRepository();
    const service = new ActionCooldownService(repository, noopLogger, () =>
      Date.now()
    );
    const app = createApp({ service });

    const agent = request(app);
    await agent.post('/players/player-11/actions/heal').expect(200);

    const cooldownResponse = await agent
      .get('/players/player-11/actions/heal/cooldown')
      .expect(200);

    expect(cooldownResponse.body.success).toBe(true);
    expect(cooldownResponse.body.data.cooldown.remainingMs).toBe(
      ACTION_METADATA.heal.cooldownMs
    );
  });
});
