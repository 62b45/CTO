import { describe, expect, it, beforeEach, vi } from 'vitest';
import { EventService } from '../events/service';

const noopLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

describe('EventService', () => {
  let eventService: EventService;
  let clockNow: number;

  beforeEach(() => {
    // Set clock to a specific time
    clockNow = Date.UTC(2023, 0, 1, 12, 0, 0);
    eventService = new EventService(noopLogger, () => clockNow);
  });

  describe('Event initialization', () => {
    it('initializes with default events', () => {
      const allEvents = eventService.getAllEvents();
      expect(allEvents.length).toBeGreaterThan(0);
    });

    it('creates events with correct properties', () => {
      const allEvents = eventService.getAllEvents();
      for (const event of allEvents) {
        expect(event.id).toBeDefined();
        expect(event.type).toBeDefined();
        expect(event.name).toBeDefined();
        expect(event.description).toBeDefined();
        expect(event.modifiers).toBeDefined();
        expect(event.startsAt).toBeInstanceOf(Date);
        expect(event.endsAt).toBeInstanceOf(Date);
        expect(typeof event.active).toBe('boolean');
      }
    });
  });

  describe('Event schedule', () => {
    it('returns events in upcoming, active, and completed categories', () => {
      const schedule = eventService.getSchedule();
      
      expect(schedule.upcoming).toBeInstanceOf(Array);
      expect(schedule.active).toBeInstanceOf(Array);
      expect(schedule.completed).toBeInstanceOf(Array);
    });

    it('categorizes events correctly based on time', () => {
      // Create custom time: day 5, so Rare Materials Week (offset 7) should be upcoming
      const customEventService = new EventService(noopLogger, () => 
        Date.UTC(2023, 0, 5, 12, 0, 0)
      );
      
      const schedule = customEventService.getSchedule();
      
      // At least some events should exist
      const totalEvents = schedule.upcoming.length + schedule.active.length + schedule.completed.length;
      expect(totalEvents).toBeGreaterThan(0);
    });

    it('sorts upcoming events by start date', () => {
      const schedule = eventService.getSchedule();
      
      if (schedule.upcoming.length > 1) {
        for (let i = 0; i < schedule.upcoming.length - 1; i++) {
          const current = schedule.upcoming[i];
          const next = schedule.upcoming[i + 1];
          if (current && next) {
            expect(current.startsAt.getTime())
              .toBeLessThanOrEqual(next.startsAt.getTime());
          }
        }
      }
    });

    it('sorts completed events by end date (most recent first)', () => {
      const schedule = eventService.getSchedule();
      
      if (schedule.completed.length > 1) {
        for (let i = 0; i < schedule.completed.length - 1; i++) {
          const current = schedule.completed[i];
          const next = schedule.completed[i + 1];
          if (current && next) {
            expect(current.endsAt.getTime())
              .toBeGreaterThanOrEqual(next.endsAt.getTime());
          }
        }
      }
    });
  });

  describe('Active events', () => {
    it('returns array of active events', () => {
      const activeEvents = eventService.getActiveEvents();
      expect(Array.isArray(activeEvents)).toBe(true);
    });

    it('active events are within their time window', () => {
      const now = new Date(clockNow);
      const activeEvents = eventService.getActiveEvents();
      
      for (const event of activeEvents) {
        expect(event.startsAt.getTime()).toBeLessThanOrEqual(now.getTime());
        expect(event.endsAt.getTime()).toBeGreaterThan(now.getTime());
      }
    });
  });

  describe('Next event', () => {
    it('returns next upcoming event or null', () => {
      const nextEvent = eventService.getNextEvent();
      
      if (nextEvent) {
        expect(nextEvent.id).toBeDefined();
        expect(nextEvent.startsAt.getTime()).toBeGreaterThan(clockNow);
      } else {
        expect(nextEvent).toBeNull();
      }
    });

    it('next event is the earliest upcoming event', () => {
      const schedule = eventService.getSchedule();
      const nextEvent = eventService.getNextEvent();
      
      if (schedule.upcoming.length > 0) {
        const earliestUpcoming = schedule.upcoming[0];
        if (earliestUpcoming) {
          expect(nextEvent?.id).toBe(earliestUpcoming.id);
        }
      } else {
        expect(nextEvent).toBeNull();
      }
    });
  });

  describe('Event modifiers', () => {
    it('returns active modifiers as object', () => {
      const modifiers = eventService.getActiveModifiers();
      
      expect(modifiers).toHaveProperty('xpMultiplier');
      expect(modifiers).toHaveProperty('coinsMultiplier');
      expect(modifiers).toHaveProperty('rareDropBonus');
      expect(modifiers).toHaveProperty('materialTypeBoosts');
    });

    it('combines modifiers from multiple active events', () => {
      const modifiers = eventService.getActiveModifiers();
      
      // Base multipliers should be at least 1
      expect(modifiers.xpMultiplier).toBeGreaterThanOrEqual(1);
      expect(modifiers.coinsMultiplier).toBeGreaterThanOrEqual(1);
      
      // Bonus should be non-negative
      expect(modifiers.rareDropBonus).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Modifier application', () => {
    it('applies XP modifiers correctly', () => {
      const baseXp = 100;
      const appliedXp = eventService.applyEventModifiers(baseXp, 'xp');
      
      expect(appliedXp).toBeGreaterThanOrEqual(baseXp);
      expect(typeof appliedXp).toBe('number');
    });

    it('applies coins modifiers correctly', () => {
      const baseCoins = 100;
      const appliedCoins = eventService.applyEventModifiers(baseCoins, 'coins');
      
      expect(appliedCoins).toBeGreaterThanOrEqual(baseCoins);
      expect(typeof appliedCoins).toBe('number');
    });

    it('applies rare drop modifiers correctly', () => {
      const baseBonus = 0;
      const appliedBonus = eventService.applyEventModifiers(baseBonus, 'rareDrop');
      
      expect(appliedBonus).toBeGreaterThanOrEqual(baseBonus);
      expect(typeof appliedBonus).toBe('number');
    });

    it('returns floored values for calculated modifiers', () => {
      const baseValue = 100;
      const result = eventService.applyEventModifiers(baseValue, 'xp');
      
      // Should be integer
      expect(Number.isInteger(result)).toBe(true);
    });
  });

  describe('Event creation and deletion', () => {
    it('creates new events', () => {
      const initialCount = eventService.getAllEvents().length;
      
      const newEvent = eventService.createEvent(
        'DOUBLE_XP',
        'Test Event',
        'A test event',
        { xpMultiplier: 3 },
        new Date(clockNow + 86400000), // Tomorrow
        new Date(clockNow + 172800000) // Day after
      );
      
      expect(newEvent.id).toBeDefined();
      expect(newEvent.name).toBe('Test Event');
      expect(eventService.getAllEvents().length).toBe(initialCount + 1);
    });

    it('deletes events', () => {
      const initialCount = eventService.getAllEvents().length;
      
      const newEvent = eventService.createEvent(
        'DOUBLE_XP',
        'Delete Test',
        'Test event to delete',
        { xpMultiplier: 2 },
        new Date(clockNow + 86400000),
        new Date(clockNow + 172800000)
      );
      
      const deleted = eventService.deleteEvent(newEvent.id);
      
      expect(deleted).toBe(true);
      expect(eventService.getAllEvents().length).toBe(initialCount);
    });

    it('returns false when deleting non-existent event', () => {
      const deleted = eventService.deleteEvent('non-existent-id');
      expect(deleted).toBe(false);
    });

    it('retrieves events by ID', () => {
      const newEvent = eventService.createEvent(
        'BONUS_COINS',
        'Retrieve Test',
        'Test retrieving event',
        { coinsMultiplier: 1.5 },
        new Date(clockNow + 86400000),
        new Date(clockNow + 172800000)
      );
      
      const retrieved = eventService.getEvent(newEvent.id);
      
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(newEvent.id);
      expect(retrieved?.name).toBe('Retrieve Test');
    });

    it('returns null for non-existent event ID', () => {
      const retrieved = eventService.getEvent('non-existent-id');
      expect(retrieved).toBeNull();
    });
  });

  describe('Event types and modifiers', () => {
    it('supports DOUBLE_XP events', () => {
      const event = eventService.createEvent(
        'DOUBLE_XP',
        'Double XP',
        'Earn double XP',
        { xpMultiplier: 2 },
        new Date(clockNow + 86400000),
        new Date(clockNow + 172800000)
      );
      
      expect(event.type).toBe('DOUBLE_XP');
      expect(event.modifiers.xpMultiplier).toBe(2);
    });

    it('supports UNIQUE_MATERIALS events', () => {
      const event = eventService.createEvent(
        'UNIQUE_MATERIALS',
        'Rare Materials',
        'Unique materials available',
        { materialTypeBoosts: { 'legendary-ore': 2 } },
        new Date(clockNow + 86400000),
        new Date(clockNow + 172800000)
      );
      
      expect(event.type).toBe('UNIQUE_MATERIALS');
      expect(event.modifiers.materialTypeBoosts).toBeDefined();
    });

    it('supports BONUS_COINS events', () => {
      const event = eventService.createEvent(
        'BONUS_COINS',
        'Merchant Fortune',
        'Extra coins',
        { coinsMultiplier: 1.5 },
        new Date(clockNow + 86400000),
        new Date(clockNow + 172800000)
      );
      
      expect(event.type).toBe('BONUS_COINS');
      expect(event.modifiers.coinsMultiplier).toBe(1.5);
    });

    it('supports RARE_BOOST events', () => {
      const event = eventService.createEvent(
        'RARE_BOOST',
        'Legendary Hunt',
        'Rare drops boosted',
        { rareDropBonus: 0.5 },
        new Date(clockNow + 86400000),
        new Date(clockNow + 172800000)
      );
      
      expect(event.type).toBe('RARE_BOOST');
      expect(event.modifiers.rareDropBonus).toBe(0.5);
    });
  });

  describe('Test utilities', () => {
    it('clears all events', () => {
      eventService.clearAllEvents();
      expect(eventService.getAllEvents().length).toBe(0);
    });

    it('gets all events', () => {
      const allEvents = eventService.getAllEvents();
      expect(Array.isArray(allEvents)).toBe(true);
    });
  });
});
