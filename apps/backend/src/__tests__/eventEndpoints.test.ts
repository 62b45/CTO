import { describe, it, expect, beforeEach, vi } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../http/app';
import { ActionCooldownService } from '../cooldowns/service';
import { FileCooldownRepository } from '../storage/cooldownRepository';
import { EventService } from '../events/service';
import path from 'path';

const noopLogger = {
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
};

describe('Event Endpoints', () => {
  let app: ReturnType<typeof createApp>;
  let eventService: EventService;
  let clockNow: number;

  beforeEach(() => {
    clockNow = Date.UTC(2023, 0, 1, 12, 0, 0);
    eventService = new EventService(noopLogger, () => clockNow);

    const cooldownRepo = new FileCooldownRepository(
      path.join(__dirname, '../../../data/test-cooldowns.json')
    );
    const service = new ActionCooldownService(cooldownRepo);

    app = createApp({
      service,
      eventService,
      logger: noopLogger,
    });
  });

  describe('GET /events/schedule', () => {
    it('returns event schedule', async () => {
      const res = await request(app)
        .get('/events/schedule')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.upcoming).toBeInstanceOf(Array);
      expect(res.body.data.active).toBeInstanceOf(Array);
      expect(res.body.data.completed).toBeInstanceOf(Array);
    });

    it('includes event details in upcoming', async () => {
      const res = await request(app)
        .get('/events/schedule')
        .expect(200);

      const upcoming = res.body.data.upcoming;
      if (upcoming.length > 0) {
        const event = upcoming[0];
        expect(event.id).toBeDefined();
        expect(event.type).toBeDefined();
        expect(event.name).toBeDefined();
        expect(event.description).toBeDefined();
        expect(event.startsAt).toBeDefined();
        expect(event.endsAt).toBeDefined();
      }
    });

    it('includes modifiers in active events', async () => {
      const res = await request(app)
        .get('/events/schedule')
        .expect(200);

      const active = res.body.data.active;
      if (active.length > 0) {
        const event = active[0];
        expect(event.modifiers).toBeDefined();
      }
    });

    it('does not include modifiers in upcoming events', async () => {
      const res = await request(app)
        .get('/events/schedule')
        .expect(200);

      const upcoming = res.body.data.upcoming;
      if (upcoming.length > 0) {
        const event = upcoming[0];
        expect(event.modifiers).toBeUndefined();
      }
    });

    it('upcoming events are sorted by start date', async () => {
      const res = await request(app)
        .get('/events/schedule')
        .expect(200);

      const upcoming = res.body.data.upcoming;
      if (upcoming.length > 1) {
        for (let i = 0; i < upcoming.length - 1; i++) {
          const current = new Date(upcoming[i].startsAt).getTime();
          const next = new Date(upcoming[i + 1].startsAt).getTime();
          expect(current).toBeLessThanOrEqual(next);
        }
      }
    });

    it('completed events include basic info', async () => {
      const res = await request(app)
        .get('/events/schedule')
        .expect(200);

      const completed = res.body.data.completed;
      if (completed.length > 0) {
        const event = completed[0];
        expect(event.id).toBeDefined();
        expect(event.type).toBeDefined();
        expect(event.name).toBeDefined();
        expect(event.endsAt).toBeDefined();
      }
    });
  });

  describe('GET /events/active', () => {
    it('returns active events', async () => {
      const res = await request(app)
        .get('/events/active')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.events).toBeInstanceOf(Array);
      expect(res.body.data.combinedModifiers).toBeDefined();
    });

    it('includes combined modifiers', async () => {
      const res = await request(app)
        .get('/events/active')
        .expect(200);

      const modifiers = res.body.data.combinedModifiers;
      expect(modifiers.xpMultiplier).toBeGreaterThanOrEqual(1);
      expect(modifiers.coinsMultiplier).toBeGreaterThanOrEqual(1);
      expect(modifiers.rareDropBonus).toBeGreaterThanOrEqual(0);
      expect(modifiers.materialTypeBoosts).toBeDefined();
    });

    it('active events have correct time windows', async () => {
      const res = await request(app)
        .get('/events/active')
        .expect(200);

      const now = new Date(clockNow).getTime();
      const events = res.body.data.events;

      for (const event of events) {
        const startTime = new Date(event.startsAt).getTime();
        const endTime = new Date(event.endsAt).getTime();
        
        expect(startTime).toBeLessThanOrEqual(now);
        expect(endTime).toBeGreaterThan(now);
      }
    });

    it('active events include event details', async () => {
      const res = await request(app)
        .get('/events/active')
        .expect(200);

      const events = res.body.data.events;
      if (events.length > 0) {
        const event = events[0];
        expect(event.id).toBeDefined();
        expect(event.type).toBeDefined();
        expect(event.name).toBeDefined();
        expect(event.description).toBeDefined();
      }
    });

    it('returns events array', () => {
      return request(app)
        .get('/events/active')
        .expect(200)
        .then(res => {
          expect(res.body.data.events).toBeInstanceOf(Array);
          expect(res.body.data.combinedModifiers).toBeDefined();
        });
    });
  });

  describe('GET /events/next', () => {
    it('returns next event', async () => {
      const res = await request(app)
        .get('/events/next')
        .expect(200);

      expect(res.body.success).toBe(true);
      if (res.body.data) {
        expect(res.body.data.id).toBeDefined();
        expect(res.body.data.type).toBeDefined();
        expect(res.body.data.name).toBeDefined();
        expect(res.body.data.description).toBeDefined();
        expect(res.body.data.startsAt).toBeDefined();
        expect(res.body.data.endsAt).toBeDefined();
      }
    });

    it('returns event or null structure', async () => {
      const res = await request(app)
        .get('/events/next')
        .expect(200);

      expect(res.body.success).toBe(true);
      // Response data should be either an event object or null
      if (res.body.data) {
        expect(res.body.data).toHaveProperty('id');
        expect(res.body.data).toHaveProperty('type');
      }
    });

    it('next event is earliest upcoming event', async () => {
      const res = await request(app)
        .get('/events/next')
        .expect(200);

      if (res.body.data) {
        const scheduleRes = await request(app)
          .get('/events/schedule')
          .expect(200);

        const upcoming = scheduleRes.body.data.upcoming;
        if (upcoming.length > 0) {
          const earliestUpcoming = upcoming[0];
          expect(res.body.data.id).toBe(earliestUpcoming.id);
        }
      }
    });

    it('next event start time is in future', async () => {
      const res = await request(app)
        .get('/events/next')
        .expect(200);

      if (res.body.data) {
        const startTime = new Date(res.body.data.startsAt).getTime();
        expect(startTime).toBeGreaterThan(clockNow);
      }
    });
  });

  describe('Event types and modifiers', () => {
    it('returns correct event types', async () => {
      const res = await request(app)
        .get('/events/schedule')
        .expect(200);

      const allEvents = [
        ...res.body.data.upcoming,
        ...res.body.data.active,
        ...res.body.data.completed,
      ];

      const validTypes = ['DOUBLE_XP', 'UNIQUE_MATERIALS', 'BONUS_COINS', 'RARE_BOOST'];
      for (const event of allEvents) {
        expect(validTypes).toContain(event.type);
      }
    });

    it('active event modifiers are properly structured', async () => {
      const res = await request(app)
        .get('/events/active')
        .expect(200);

      const modifiers = res.body.data.combinedModifiers;

      // Verify all expected properties exist
      expect(Object.prototype.hasOwnProperty.call(modifiers, 'xpMultiplier')).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(modifiers, 'coinsMultiplier')).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(modifiers, 'rareDropBonus')).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(modifiers, 'materialTypeBoosts')).toBe(true);
    });
  });

  describe('Event rotation', () => {
    it('event schedule updates as time progresses', async () => {
      // Get initial schedule
      const initialRes = await request(app)
        .get('/events/schedule')
        .expect(200);

      const initialUpcoming = initialRes.body.data.upcoming;
      const initialActive = initialRes.body.data.active;

      // Create service with advanced time
      const advancedEventService = new EventService(noopLogger, () =>
        clockNow + 86400000 * 7 // 7 days later
      );

      const advancedApp = createApp({
        service: new ActionCooldownService(
          new FileCooldownRepository(
            path.join(__dirname, '../../../data/test-cooldowns.json')
          )
        ),
        eventService: advancedEventService,
        logger: noopLogger,
      });

      const advancedRes = await request(advancedApp)
        .get('/events/schedule')
        .expect(200);

      const advancedUpcoming = advancedRes.body.data.upcoming;
      const advancedActive = advancedRes.body.data.active;

      // Schedule should be different
      expect(JSON.stringify(advancedUpcoming)).not.toBe(JSON.stringify(initialUpcoming));
    });
  });
});
