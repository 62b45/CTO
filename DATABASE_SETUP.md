# RPG Game Database Setup

This document describes the database schema and setup for the single-player RPG game.

## Overview

- **Database**: SQLite
- **ORM**: Prisma v5.8.0
- **Location**: `apps/backend/prisma/`
- **Migration**: Initial migration created (`20251114152326_init`)
- **Seeded**: Yes (81 total records across 11 models)

## Schema Summary

### Core Models

| Model | Count | Description |
|-------|-------|-------------|
| Player | 1 | Main player profile with stats, inventory, and progression |
| ItemDefinition | 31 | Item templates across all types and rarities |
| Mob | 20 | Regular enemies (4 per area) |
| Boss | 10 | Boss encounters (2 per area) |
| Dungeon | 5 | Multi-floor dungeons (1 per area) |
| Quest | 12 | Quest templates |
| Lootbox | 3 | Purchasable loot boxes |
| InventoryItem | 2 | Player inventory relational tracking |
| Cooldown | 0 | Action cooldown tracking |
| ProfessionProgress | 0 | Player profession levels |
| EventState | 0 | Active world events |

### Data Distribution

#### Items by Type
- Weapons: 6 (Common to Legendary)
- Armor: 6 (Common to Legendary)
- Accessories: 5 (Common to Legendary)
- Consumables: 4 (Health potions and buff elixirs)
- Materials: 10 (Crafting and upgrade materials)

#### Items by Rarity
- Common: 10 items
- Uncommon: 6 items
- Rare: 7 items
- Epic: 5 items
- Legendary: 5 items

#### Mobs by Area
- Greenwood (Lvl 1-10): Forest Wolf, Goblin Scout, Wild Boar, Giant Spider
- Ashen Waste (Lvl 10-20): Fire Imp, Lava Golem, Ash Wraith, Magma Serpent
- Crystal Depths (Lvl 20-30): Crystal Golem, Cave Troll, Gem Beetle, Underground Drake
- Storm Peaks (Lvl 30-40): Storm Elemental, Thunder Bird, Mountain Giant, Frost Wyvern
- Void Rift (Lvl 40-50+): Void Stalker, Shadow Demon, Void Colossus, Rift Horror

#### Bosses by Area
- Greenwood: Goblin King, Ancient Treant
- Ashen Waste: Inferno Lord, Volcanic Dragon
- Crystal Depths: Crystal Guardian, Abyssal Leviathan
- Storm Peaks: Tempest Titan, Sky Sovereign
- Void Rift: Void Emperor, Eternal Nightmare

## Default Player

The seed script creates one default player:
- Name: Hero
- Level: 1 (0 XP)
- Coins: 100
- Gems: 10
- HP: 100/100
- ATK: 10, DEF: 10
- Area: Greenwood
- Starting Items: 5x Health Potion, 1x Iron Sword

## Key Features

### JSON Fields
All complex data is stored as stringified JSON in TEXT fields:
- Player: `equipped`, `inventory`, `professions`, `cooldowns`, `progress`
- Mob: `drops` (loot table with itemId, weight, minQty, maxQty)
- Boss: `phases` (multi-phase encounters), `drops`
- Dungeon: `floors` (mobIds, lootTable), `unlockReq`
- Quest: `requirements`, `rewards`
- Lootbox: `dropTable` (weighted random loot)
- EventState: `modifiers`
- ItemDefinition: `bonuses`

### Enums (String-based)
Since SQLite doesn't support native enums, these are stored as TEXT:
- ItemType: WEAPON, ARMOR, ACCESSORY, CONSUMABLE, MATERIAL
- ItemRarity: COMMON, UNCOMMON, RARE, EPIC, LEGENDARY
- Area: GREENWOOD, ASHEN_WASTE, CRYSTAL_DEPTHS, STORM_PEAKS, VOID_RIFT
- Profession: WORKER, CRAFTER, ENCHANTER, MERCHANT, LOOTBOXER
- EventType: WORLD_BOSS, FESTIVAL, DOUBLE_LOOT, RIFT_INVASION, TRIALS

## Usage

### Running Migrations
```bash
cd apps/backend
pnpm db:migrate
```

### Seeding Database
```bash
cd apps/backend
pnpm db:seed
```

### Generating Prisma Client
```bash
cd apps/backend
pnpm db:generate
```

### Opening Prisma Studio
```bash
cd apps/backend
pnpm db:studio
```

## Type Exports

All Prisma-generated types are exported through `packages/shared`:
- `Player`, `ItemDefinition`, `Mob`, `Boss`, `Dungeon`, etc.
- Enums: `ItemType`, `ItemRarityEnum`, `Area`, `Profession`, `EventType`

Import from shared package:
```typescript
import { Player, ItemDefinition, ItemType, Area } from '@shared';
```

## Notes

- Database file (`dev.db`) is gitignored
- SQLite doesn't support `createMany` well - seed script uses individual `create` calls
- All timestamps are ISO-8601 strings (SQLite DATETIME)
- Foreign keys are enabled with CASCADE deletes where appropriate
