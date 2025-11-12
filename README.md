# Game Backend - Prisma SQLite Schema with Seed Data

This is a monorepo containing a game backend with Prisma ORM using SQLite as the database.

## Structure

- `packages/backend` - The backend package with Prisma models and migrations
- `packages/shared` - Shared types package for type definitions used across backend and frontend

## Setup

### Install Dependencies

```bash
pnpm install
pnpm approve-builds
```

### Database Migration

To run database migrations:

```bash
pnpm prisma migrate dev
```

### Database Seeding

To seed the database with starter data:

```bash
cd packages/backend
pnpm exec node prisma/seed.js
```

## Models

The schema includes the following models:

- **Player**: Player profile with stats and progression
- **ItemDefinition**: Defines available items
- **InventoryItem**: Player's inventory items
- **Mob**: Enemies and creatures
- **Boss**: Special boss entities linked to mobs
- **Dungeon**: Dungeon areas
- **DungeonFloor**: Individual floors within dungeons
- **DungeonFloorMob**: Spawn configuration for mobs on floors
- **Quest**: Player quest progress
- **QuestDefinition**: Quest definitions and rewards
- **QuestReward**: Rewards for completing quests
- **Lootbox**: Loot tables for mobs
- **LootboxItem**: Items that can drop from lootboxes
- **Cooldown**: Action cooldowns for players
- **ProfessionProgress**: Profession/skill progression
- **EventState**: Temporary event states
- **DungeonProgress**: Player's progress in dungeons

## Types

Shared types are defined in `packages/shared/index.ts` and include enums for:

- ProfessionType
- ItemRarity
- ItemType
- MobType
- QuestStatus
- QuestRewardType
- DungeonDifficulty

## Database

The database is SQLite and is located at `packages/backend/dev.db` for development.

Note: SQLite doesn't support native enums in Prisma, so enum values are stored as strings in the database.
