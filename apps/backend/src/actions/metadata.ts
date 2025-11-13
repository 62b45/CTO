import { randomInt } from 'crypto';

export type ActionType =
  | 'hunt'
  | 'adventure'
  | 'gather_herbs'
  | 'gather_ore'
  | 'gather_wood'
  | 'craft'
  | 'lootbox'
  | 'quest'
  | 'dungeon'
  | 'heal'
  | 'arena';

export interface ActionMetadata {
  type: ActionType;
  label: string;
  description: string;
  cooldownMs: number;
  category: 'gathering' | 'combat' | 'support' | 'progression' | 'misc';
}

export interface ActionResult {
  summary: string;
  rewards?: string[];
  experience?: number;
}

export type ActionHandler = (playerId: string) => Promise<ActionResult> | ActionResult;

export const ACTION_METADATA: Record<ActionType, ActionMetadata> = {
  hunt: {
    type: 'hunt',
    label: 'Hunt',
    description: 'Track and hunt wild game for resources.',
    cooldownMs: 5 * 60 * 1000,
    category: 'combat',
  },
  adventure: {
    type: 'adventure',
    label: 'Adventure',
    description: 'Embark on a long expedition into unknown lands.',
    cooldownMs: 30 * 60 * 1000,
    category: 'progression',
  },
  gather_herbs: {
    type: 'gather_herbs',
    label: 'Gather Herbs',
    description: 'Search meadows and forests for rare herbs.',
    cooldownMs: 10 * 60 * 1000,
    category: 'gathering',
  },
  gather_ore: {
    type: 'gather_ore',
    label: 'Gather Ore',
    description: 'Mine ore veins for crafting materials.',
    cooldownMs: 12 * 60 * 1000,
    category: 'gathering',
  },
  gather_wood: {
    type: 'gather_wood',
    label: 'Gather Wood',
    description: 'Chop down trees to gather sturdy timber.',
    cooldownMs: 8 * 60 * 1000,
    category: 'gathering',
  },
  craft: {
    type: 'craft',
    label: 'Craft',
    description: 'Spend time at the workshop to craft equipment.',
    cooldownMs: 20 * 60 * 1000,
    category: 'misc',
  },
  lootbox: {
    type: 'lootbox',
    label: 'Open Lootbox',
    description: 'Open a locked chest for random rewards.',
    cooldownMs: 60 * 60 * 1000,
    category: 'misc',
  },
  quest: {
    type: 'quest',
    label: 'Quest',
    description: 'Complete a narrative quest for faction reputation.',
    cooldownMs: 2 * 60 * 60 * 1000,
    category: 'progression',
  },
  dungeon: {
    type: 'dungeon',
    label: 'Dungeon',
    description: 'Delve into a dangerous dungeon for epic loot.',
    cooldownMs: 3 * 60 * 60 * 1000,
    category: 'combat',
  },
  heal: {
    type: 'heal',
    label: 'Heal',
    description: 'Visit the healers to recover vitality.',
    cooldownMs: 15 * 60 * 1000,
    category: 'support',
  },
  arena: {
    type: 'arena',
    label: 'Arena',
    description: 'Fight challengers in the arena.',
    cooldownMs: 45 * 60 * 1000,
    category: 'combat',
  },
};

export const ACTION_TYPES = Object.keys(ACTION_METADATA) as ActionType[];

export function isActionType(value: string): value is ActionType {
  return value in ACTION_METADATA;
}

export function createActionHandlers(): Record<ActionType, ActionHandler> {
  return {
    hunt: () => ({
      summary: 'You tracked a boar through the forest and returned with meat.',
      rewards: ['raw_meat', 'hide'],
      experience: randomInt(25, 60),
    }),
    adventure: () => ({
      summary: 'Your expedition uncovered an ancient ruin rich with lore.',
      rewards: ['ancient_relic'],
      experience: randomInt(120, 200),
    }),
    gather_herbs: () => ({
      summary: 'You picked bundles of aromatic herbs.',
      rewards: ['mint', 'sage'],
      experience: randomInt(15, 30),
    }),
    gather_ore: () => ({
      summary: 'You mined glimmering ore from a cliffside vein.',
      rewards: ['iron_ore', 'coal'],
      experience: randomInt(18, 35),
    }),
    gather_wood: () => ({
      summary: 'You chopped hardwood logs near the river.',
      rewards: ['oak_log', 'pine_log'],
      experience: randomInt(12, 25),
    }),
    craft: () => ({
      summary: 'You crafted a sturdy piece of equipment.',
      rewards: ['crafted_item'],
      experience: randomInt(40, 90),
    }),
    lootbox: () => ({
      summary: 'The lootbox contained a surprise!',
      rewards: ['mysterious_token'],
      experience: randomInt(10, 20),
    }),
    quest: () => ({
      summary: 'You resolved a conflict for a local village.',
      rewards: ['faction_crest'],
      experience: randomInt(200, 250),
    }),
    dungeon: () => ({
      summary: 'You cleared a perilous dungeon and claimed legendary spoils.',
      rewards: ['legendary_weapon'],
      experience: randomInt(250, 320),
    }),
    heal: () => ({
      summary: 'Rested at the sanctuary and restored your vitality.',
      rewards: ['healing_boost'],
      experience: randomInt(5, 15),
    }),
    arena: () => ({
      summary: 'You won a fierce arena battle before roaring crowds.',
      rewards: ['arena_medal'],
      experience: randomInt(150, 220),
    }),
  } satisfies Record<ActionType, ActionHandler>;
}
