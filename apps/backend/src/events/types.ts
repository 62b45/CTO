export type EventType = 'DOUBLE_XP' | 'UNIQUE_MATERIALS' | 'BONUS_COINS' | 'RARE_BOOST';

export interface EventModifiers {
  xpMultiplier?: number;
  coinsMultiplier?: number;
  rareDropBonus?: number;
  materialTypeBoosts?: Record<string, number>;
}

export interface Event {
  id: string;
  type: EventType;
  name: string;
  description: string;
  modifiers: EventModifiers;
  startsAt: Date;
  endsAt: Date;
  active: boolean;
}

export interface EventSchedule {
  upcoming: Event[];
  active: Event[];
  completed: Event[];
}
