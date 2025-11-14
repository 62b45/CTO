import type { Event, EventModifiers, EventType, EventSchedule } from './types';

type Logger = Pick<Console, 'info' | 'warn' | 'error'>;

export interface EventServiceConfig {
  enableAutoRotation?: boolean;
}

// In-memory event storage (would be database in production)
const events = new Map<string, Event>();
let eventIdCounter = 0;

const DEFAULT_EVENTS: Array<{
  type: EventType;
  name: string;
  description: string;
  modifiers: EventModifiers;
  offsetDays: number;
  durationDays: number;
}> = [
  {
    type: 'DOUBLE_XP',
    name: 'Festival of Experience',
    description: 'Earn double XP from all actions',
    modifiers: { xpMultiplier: 2 },
    offsetDays: 0,
    durationDays: 7,
  },
  {
    type: 'UNIQUE_MATERIALS',
    name: 'Rare Materials Week',
    description: 'Unique materials spawn more frequently',
    modifiers: {
      materialTypeBoosts: {
        'legendary-ore': 2,
        'celestial-dust': 2,
        'phoenix-feather': 1.5,
      },
    },
    offsetDays: 7,
    durationDays: 7,
  },
  {
    type: 'BONUS_COINS',
    name: 'Merchant\'s Fortune',
    description: 'Earn 50% more coins',
    modifiers: { coinsMultiplier: 1.5 },
    offsetDays: 14,
    durationDays: 7,
  },
  {
    type: 'RARE_BOOST',
    name: 'Legendary Hunt',
    description: 'Rare drops are more common',
    modifiers: { rareDropBonus: 0.5 },
    offsetDays: 21,
    durationDays: 7,
  },
];

export class EventService {
  constructor(
    private readonly logger: Logger = console,
    private readonly clock: () => number = () => Date.now(),
    private readonly config: EventServiceConfig = {}
  ) {
    this.initializeDefaultEvents();
  }

  private initializeDefaultEvents(): void {
    const now = new Date(this.clock());
    const baseTime = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    for (const eventConfig of DEFAULT_EVENTS) {
      const startsAt = new Date(baseTime);
      startsAt.setDate(startsAt.getDate() + eventConfig.offsetDays);

      const endsAt = new Date(startsAt);
      endsAt.setDate(endsAt.getDate() + eventConfig.durationDays);

      const event: Event = {
        id: `event-${++eventIdCounter}`,
        type: eventConfig.type,
        name: eventConfig.name,
        description: eventConfig.description,
        modifiers: eventConfig.modifiers,
        startsAt,
        endsAt,
        active: startsAt <= now && now < endsAt,
      };

      events.set(event.id, event);
    }
  }

  /**
   * Get the current schedule of events
   */
  getSchedule(): EventSchedule {
    const now = new Date(this.clock());
    const eventArray = Array.from(events.values());

    const upcoming: Event[] = [];
    const active: Event[] = [];
    const completed: Event[] = [];

    for (const event of eventArray) {
      if (event.endsAt <= now) {
        completed.push(event);
      } else if (event.startsAt <= now && now < event.endsAt) {
        active.push(event);
      } else {
        upcoming.push(event);
      }
    }

    // Sort by date
    upcoming.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
    completed.sort((a, b) => b.endsAt.getTime() - a.endsAt.getTime());

    return { upcoming, active, completed };
  }

  /**
   * Get all active events
   */
  getActiveEvents(): Event[] {
    return this.getSchedule().active;
  }

  /**
   * Get the next upcoming event
   */
  getNextEvent(): Event | null {
    const schedule = this.getSchedule();
    const nextEvent = schedule.upcoming.length > 0 ? schedule.upcoming[0] : null;
    return nextEvent ?? null;
  }

  /**
   * Get combined modifiers from all active events
   */
  getActiveModifiers(): EventModifiers {
    const activeEvents = this.getActiveEvents();
    const combined: EventModifiers = {
      xpMultiplier: 1,
      coinsMultiplier: 1,
      rareDropBonus: 0,
      materialTypeBoosts: {},
    };

    for (const event of activeEvents) {
      if (event.modifiers.xpMultiplier) {
        combined.xpMultiplier! *= event.modifiers.xpMultiplier;
      }
      if (event.modifiers.coinsMultiplier) {
        combined.coinsMultiplier! *= event.modifiers.coinsMultiplier;
      }
      if (event.modifiers.rareDropBonus) {
        combined.rareDropBonus! += event.modifiers.rareDropBonus;
      }
      if (event.modifiers.materialTypeBoosts) {
        for (const [material, boost] of Object.entries(
          event.modifiers.materialTypeBoosts
        )) {
          if (!combined.materialTypeBoosts![material]) {
            combined.materialTypeBoosts![material] = 1;
          }
          combined.materialTypeBoosts![material] *= boost;
        }
      }
    }

    return combined;
  }

  /**
   * Apply event modifiers to a reward value
   */
  applyEventModifiers(
    value: number,
    modifierType: 'xp' | 'coins' | 'rareDrop'
  ): number {
    const modifiers = this.getActiveModifiers();

    if (modifierType === 'xp' && modifiers.xpMultiplier) {
      return Math.floor(value * modifiers.xpMultiplier);
    }

    if (modifierType === 'coins' && modifiers.coinsMultiplier) {
      return Math.floor(value * modifiers.coinsMultiplier);
    }

    if (modifierType === 'rareDrop' && modifiers.rareDropBonus) {
      return value + modifiers.rareDropBonus;
    }

    return value;
  }

  /**
   * Create a new event
   */
  createEvent(
    type: EventType,
    name: string,
    description: string,
    modifiers: EventModifiers,
    startsAt: Date,
    endsAt: Date
  ): Event {
    const event: Event = {
      id: `event-${++eventIdCounter}`,
      type,
      name,
      description,
      modifiers,
      startsAt,
      endsAt,
      active: false,
    };

    events.set(event.id, event);
    this.logger.info(`Created event: ${event.name} (${event.id})`);

    return event;
  }

  /**
   * Delete an event
   */
  deleteEvent(eventId: string): boolean {
    const deleted = events.delete(eventId);
    if (deleted) {
      this.logger.info(`Deleted event: ${eventId}`);
    }
    return deleted;
  }

  /**
   * Get event by ID
   */
  getEvent(eventId: string): Event | null {
    const event = events.get(eventId);
    return event ?? null;
  }

  /**
   * Clear all events (for testing)
   */
  clearAllEvents(): void {
    events.clear();
    eventIdCounter = 0;
  }

  /**
   * Get all events (for testing)
   */
  getAllEvents(): Event[] {
    return Array.from(events.values());
  }
}
