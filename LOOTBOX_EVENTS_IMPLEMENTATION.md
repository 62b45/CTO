# Lootbox and Events System Implementation

## Overview

This document describes the implementation of the lootbox opening pipeline and event rotation scheduler for the game.

## Features Implemented

### 1. Lootbox Opening Pipeline

**Location**: `apps/backend/src/lootbox/`

#### Weighted Rarities (70/20/8/1.5/0.5)
- Common: 70%
- Uncommon: 20%
- Rare: 8%
- Epic: 1.5%
- Legendary: 0.5%

These weights can be customized via the `LootboxConfig` when initializing the service.

#### Pity Counter at 40 Guarantee
- **Pity Threshold**: 40 non-rare drops
- **Guarantee**: At 40 pity counter, the next drop is guaranteed to be Rare or better
- **Reset**: Pity counter resets when a Rare+ drop is obtained
- **Tracking**: Per-player pity counters stored in memory

#### Lootboxer Profession Bonuses
- **Base Bonus**: 6% per level (1 + 0.06 * (level - 1))
- **Effect**: Increases drop rates for Rare, Epic, and Legendary items
- **Calculation**: Profession level is automatically fetched from player professions
- **Example**: Level 5 lootboxer gets 1.24x multiplier to rare+ drops

#### Currency Cost Handling
- Deducts coins from player inventory when opening lootbox
- Validates player has sufficient coins before proceeding
- Throws error if insufficient currency (400 response via API)
- Cost is configurable per lootbox

#### Animation Metadata
- Base animation: 1500ms
- Rare drops: +0ms (1500ms total)
- Epic drops: +500ms (2000ms total)
- Legendary drops: +1000ms (2500ms total)

### 2. Event Rotation Scheduler

**Location**: `apps/backend/src/events/`

#### Default Events Schedule
Four events rotate on a 28-day cycle:

1. **Festival of Experience** (Days 0-7)
   - Type: DOUBLE_XP
   - Modifier: 2x XP multiplier

2. **Rare Materials Week** (Days 7-14)
   - Type: UNIQUE_MATERIALS
   - Modifier: Material-specific boosts (legendary-ore, celestial-dust, phoenix-feather)

3. **Merchant's Fortune** (Days 14-21)
   - Type: BONUS_COINS
   - Modifier: 1.5x coins multiplier

4. **Legendary Hunt** (Days 21-28)
   - Type: RARE_BOOST
   - Modifier: 0.5 rare drop bonus

#### Event States
- **Upcoming**: Events starting in the future
- **Active**: Events currently happening
- **Completed**: Events that have ended

Events are automatically categorized based on current server time.

#### Event Modifiers
- XP multiplier
- Coins multiplier
- Rare drop bonus
- Material type boosts (dictionary of material -> multiplier)

Combined modifiers from multiple active events are multiplied together.

## API Endpoints

### Lootbox Endpoints

#### GET `/lootbox/probabilities/:playerId`
Returns the current drop probabilities for a player, including lootboxer bonuses.

**Response**:
```json
{
  "success": true,
  "data": {
    "playerId": "player-123",
    "probabilities": {
      "common": 69.5,
      "uncommon": 19.9,
      "rare": 7.96,
      "epic": 1.49,
      "legendary": 0.5
    },
    "pityCounter": 5,
    "pityThreshold": 40
  }
}
```

#### POST `/lootbox/open/:playerId`
Opens a lootbox for the player, deducting the cost and returning the drop result.

**Request Body**:
```json
{
  "lootboxId": "lootbox-basic",
  "cost": 100
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "playerId": "player-123",
    "result": {
      "item": {
        "itemId": "mithril-ingot",
        "name": "Mithril Ingot",
        "rarity": "rare",
        "quantity": 2
      },
      "rarity": "rare",
      "isPityDrop": false,
      "pityCounterReset": true,
      "animationDuration": 1500
    }
  }
}
```

### Event Endpoints

#### GET `/events/schedule`
Returns the complete event schedule categorized by status.

**Response**:
```json
{
  "success": true,
  "data": {
    "upcoming": [
      {
        "id": "event-3",
        "type": "BONUS_COINS",
        "name": "Merchant's Fortune",
        "description": "Earn 50% more coins",
        "startsAt": "2023-01-15T00:00:00.000Z",
        "endsAt": "2023-01-22T00:00:00.000Z"
      }
    ],
    "active": [
      {
        "id": "event-1",
        "type": "DOUBLE_XP",
        "name": "Festival of Experience",
        "description": "Earn double XP from all actions",
        "modifiers": {
          "xpMultiplier": 2
        },
        "startsAt": "2023-01-01T00:00:00.000Z",
        "endsAt": "2023-01-08T00:00:00.000Z"
      }
    ],
    "completed": []
  }
}
```

#### GET `/events/active`
Returns currently active events and their combined modifiers.

**Response**:
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "event-1",
        "type": "DOUBLE_XP",
        "name": "Festival of Experience",
        "description": "Earn double XP from all actions",
        "startsAt": "2023-01-01T00:00:00.000Z",
        "endsAt": "2023-01-08T00:00:00.000Z"
      }
    ],
    "combinedModifiers": {
      "xpMultiplier": 2,
      "coinsMultiplier": 1,
      "rareDropBonus": 0,
      "materialTypeBoosts": {}
    }
  }
}
```

#### GET `/events/next`
Returns the next upcoming event.

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "event-2",
    "type": "UNIQUE_MATERIALS",
    "name": "Rare Materials Week",
    "description": "Unique materials spawn more frequently",
    "startsAt": "2023-01-08T00:00:00.000Z",
    "endsAt": "2023-01-15T00:00:00.000Z"
  }
}
```

## Test Coverage

### Lootbox Service Tests (15 tests)
- ✅ Default weights initialization
- ✅ Probability calculations
- ✅ Lootboxer profession bonuses at various levels
- ✅ Pity counter mechanics
- ✅ Lootbox opening with currency deduction
- ✅ Error handling for insufficient coins
- ✅ Valid rarity distribution
- ✅ Animation duration based on rarity
- ✅ Pity guarantee at threshold
- ✅ Pity counter reset
- ✅ Distribution verification (100 opens)

### Lootbox Endpoints Tests (13 tests)
- ✅ GET probabilities endpoint
- ✅ POST open lootbox endpoint
- ✅ Item details in response
- ✅ Animation duration
- ✅ Pity information
- ✅ Error handling (missing fields)
- ✅ Error handling (insufficient funds)
- ✅ Currency deduction
- ✅ Multiple opens from same player
- ✅ Legendary animation duration

### Event Service Tests (27 tests)
- ✅ Event initialization
- ✅ Event properties validation
- ✅ Event schedule categorization
- ✅ Event sorting
- ✅ Active events detection
- ✅ Next event selection
- ✅ Active modifiers combination
- ✅ Modifier application
- ✅ Event creation and deletion
- ✅ Event retrieval by ID
- ✅ Event type support
- ✅ Event rotation

### Event Endpoints Tests (18 tests)
- ✅ GET schedule endpoint
- ✅ GET active events endpoint
- ✅ GET next event endpoint
- ✅ Event details in responses
- ✅ Modifiers in active events
- ✅ Event sorting in schedule
- ✅ Event type validation
- ✅ Modifier structure validation
- ✅ Event rotation simulation

**Total Tests**: 73 tests, all passing

## Implementation Details

### LootboxService
- **File**: `apps/backend/src/lootbox/service.ts`
- **Dependencies**: ProfessionService, EconomyService
- **Key Methods**:
  - `getPlayerWeights()`: Returns weighted rarities with profession bonuses
  - `getProbabilities()`: Returns normalized probabilities
  - `openLootbox()`: Main method to open a lootbox
  - `selectRarity()`: Weighted random selection with pity guarantee
  - `getPityCounter()`: Get current pity counter for player

### EventService
- **File**: `apps/backend/src/events/service.ts`
- **Dependencies**: None
- **Key Methods**:
  - `getSchedule()`: Get upcoming/active/completed events
  - `getActiveEvents()`: Get currently active events
  - `getNextEvent()`: Get next upcoming event
  - `getActiveModifiers()`: Get combined modifiers from active events
  - `applyEventModifiers()`: Apply modifiers to values
  - `createEvent()`: Create new event
  - `deleteEvent()`: Delete event

### API Integration
- **File**: `apps/backend/src/http/app.ts`
- **File**: `apps/backend/src/index.ts`
- Integration points:
  - LootboxService is instantiated in `buildServer()`
  - EventService is instantiated in `buildServer()`
  - Both services are passed to `createApp()` function
  - Endpoints are registered conditionally when services are available

## Usage Example

```typescript
// Initialize services
const professionService = new ProfessionService(repo);
const economyService = new EconomyService(invRepo, professionService);
const lootboxService = new LootboxService(professionService, economyService);
const eventService = new EventService();

// Create app with services
const app = createApp({
  service,
  lootboxService,
  eventService,
  // ... other services
});

// Client opens a lootbox
const response = await fetch('/lootbox/open/player-123', {
  method: 'POST',
  body: JSON.stringify({ lootboxId: 'lootbox-basic', cost: 100 })
});

// Check current event schedule
const events = await fetch('/events/schedule').then(r => r.json());
```

## Acceptance Criteria Met

✅ **Probability distribution verified via tests**
- 15 lootbox service tests verify weighted distribution
- 100+ sample opens show statistical accuracy
- Probability endpoints return correct values

✅ **Pity resets correctly**
- Pity counter increments on non-rare drops
- Resets on rare+ drops
- Guaranteed rare+ at 40 threshold
- 5 specific tests verify pity mechanics

✅ **Events rotate and influence rewards as configured**
- 4 default events rotate on 28-day cycle
- Events properly categorized (upcoming/active/completed)
- Modifiers combine correctly for multiple active events
- 18 endpoint tests verify event functionality

## File Structure

```
apps/backend/src/
├── lootbox/
│   ├── types.ts         # TypeScript types for lootbox system
│   └── service.ts       # LootboxService implementation
├── events/
│   ├── types.ts         # TypeScript types for events system
│   └── service.ts       # EventService implementation
├── http/
│   └── app.ts           # API endpoints (modified)
├── index.ts             # Server initialization (modified)
└── __tests__/
    ├── lootboxService.test.ts      # 15 tests
    ├── lootboxEndpoints.test.ts    # 13 tests
    ├── eventService.test.ts        # 27 tests
    └── eventEndpoints.test.ts      # 18 tests
```

## Performance Considerations

- Pity counters stored in memory (Map): O(1) access
- Event schedule computed on-demand: O(n) where n ≤ 4
- Probability calculations use simple multiplication: O(5) rarities
- No database queries required for lootbox/event operations

## Future Enhancements

1. Persist pity counters to database
2. Persist event schedule to database
3. Add event creation UI in admin panel
4. Support for special lootbox types (guaranteed drops, etc.)
5. Seasonal events that override default rotation
6. Event notification system for upcoming events
7. Event analytics and tracking
8. Lootbox history/statistics per player
