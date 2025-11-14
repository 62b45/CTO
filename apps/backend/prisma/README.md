# Prisma Database Setup

This directory contains the Prisma database schema, migrations, and seed script for the single-player RPG game.

## Database: SQLite

The project uses SQLite for simplicity and portability. The database file (`dev.db`) is created in this directory.

## Schema Overview

The schema includes the following core models:

### Core Game Models
- **Player**: Main player profile with stats, inventory, professions, and progress
- **ItemDefinition**: All item templates (weapons, armor, accessories, consumables, materials)
- **Mob**: Regular enemy templates with loot tables
- **Boss**: Boss encounters with multiple phases and special drops
- **Dungeon**: Multi-floor dungeons with mob compositions and loot tables
- **Quest**: Quest templates with requirements and rewards
- **Lootbox**: Purchasable loot boxes with weighted drop tables

### Supporting Models
- **InventoryItem**: Player inventory (relational tracking)
- **Cooldown**: Action cooldown tracking
- **ProfessionProgress**: Player profession levels and XP
- **EventState**: Active world events

### Enums (String-based in SQLite)
- **ItemType**: WEAPON, ARMOR, ACCESSORY, CONSUMABLE, MATERIAL
- **ItemRarity**: COMMON, UNCOMMON, RARE, EPIC, LEGENDARY
- **Area**: GREENWOOD, ASHEN_WASTE, CRYSTAL_DEPTHS, STORM_PEAKS, VOID_RIFT
- **Profession**: WORKER, CRAFTER, ENCHANTER, MERCHANT, LOOTBOXER
- **EventType**: WORLD_BOSS, FESTIVAL, DOUBLE_LOOT, RIFT_INVASION, TRIALS

## Commands

### Generate Prisma Client
```bash
pnpm db:generate
```

### Create New Migration
```bash
pnpm db:migrate
```

### Run Seed Script
```bash
pnpm db:seed
```

### Open Prisma Studio (Database GUI)
```bash
pnpm db:studio
```

## Seed Data

The seed script populates the database with:
- **31 Item Definitions**: Full range of weapons, armor, accessories, consumables, and materials across all rarities
- **20 Mob Templates**: 4 mobs per area (Greenwood, Ashen Waste, Crystal Depths, Storm Peaks, Void Rift)
- **10 Boss Encounters**: 2 bosses per area with multi-phase mechanics
- **5 Dungeons**: One per area with multi-floor structures
- **12 Quest Templates**: Various quest types (mob kills, item collection, boss encounters)
- **3 Lootbox Definitions**: Common, Uncommon, and Rare loot boxes
- **1 Default Player**: Starting profile with starter items

## Notes

- SQLite doesn't support native enums or JSON types, so these are stored as TEXT fields
- JSON fields are stringified and need to be parsed in application code
- The `createMany` operation doesn't work well with SQLite, so the seed script uses individual `create` calls
- Database file (dev.db) is gitignored
