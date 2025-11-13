-- CreateTable
CREATE TABLE "players" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "experience" INTEGER NOT NULL DEFAULT 0,
    "health" INTEGER NOT NULL DEFAULT 100,
    "mana" INTEGER NOT NULL DEFAULT 50,
    "currency" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "item_definitions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "sellValue" INTEGER NOT NULL DEFAULT 1,
    "buyValue" INTEGER NOT NULL DEFAULT 1,
    "maxStackSize" INTEGER NOT NULL DEFAULT 1,
    "imageUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "itemDefinitionId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "acquiredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "inventory_items_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "inventory_items_itemDefinitionId_fkey" FOREIGN KEY ("itemDefinitionId") REFERENCES "item_definitions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "mobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "mobType" TEXT NOT NULL DEFAULT 'COMMON',
    "level" INTEGER NOT NULL,
    "health" INTEGER NOT NULL,
    "mana" INTEGER NOT NULL,
    "attackPower" INTEGER NOT NULL,
    "defensePower" INTEGER NOT NULL,
    "experienceReward" INTEGER NOT NULL,
    "currencyReward" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "bosses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mobId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "phaseCount" INTEGER NOT NULL DEFAULT 1,
    "specialAbility" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "bosses_mobId_fkey" FOREIGN KEY ("mobId") REFERENCES "mobs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "dungeons" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'NORMAL',
    "minimumLevel" INTEGER NOT NULL DEFAULT 1,
    "recommendedLevel" INTEGER NOT NULL DEFAULT 5,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "dungeon_floors" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dungeonId" TEXT NOT NULL,
    "floorNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "dungeon_floors_dungeonId_fkey" FOREIGN KEY ("dungeonId") REFERENCES "dungeons" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "dungeon_floor_mobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dungeonFloorId" TEXT NOT NULL,
    "mobId" TEXT NOT NULL,
    "spawnWeight" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "dungeon_floor_mobs_dungeonFloorId_fkey" FOREIGN KEY ("dungeonFloorId") REFERENCES "dungeon_floors" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "dungeon_floor_mobs_mobId_fkey" FOREIGN KEY ("mobId") REFERENCES "mobs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "quests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "questDefinitionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "targetProgress" INTEGER NOT NULL DEFAULT 1,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "quests_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "quests_questDefinitionId_fkey" FOREIGN KEY ("questDefinitionId") REFERENCES "quest_definitions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "quest_definitions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "minimumLevel" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "quest_rewards" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "questDefinitionId" TEXT NOT NULL,
    "rewardType" TEXT NOT NULL,
    "itemDefinitionId" TEXT,
    "amount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "quest_rewards_questDefinitionId_fkey" FOREIGN KEY ("questDefinitionId") REFERENCES "quest_definitions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "quest_rewards_itemDefinitionId_fkey" FOREIGN KEY ("itemDefinitionId") REFERENCES "item_definitions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "lootboxes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mobId" TEXT NOT NULL,
    "rarity" TEXT NOT NULL DEFAULT 'COMMON',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "lootboxes_mobId_fkey" FOREIGN KEY ("mobId") REFERENCES "mobs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "lootbox_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lootboxId" TEXT NOT NULL,
    "itemDefinitionId" TEXT NOT NULL,
    "dropChance" INTEGER NOT NULL DEFAULT 100,
    "minQuantity" INTEGER NOT NULL DEFAULT 1,
    "maxQuantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "lootbox_items_lootboxId_fkey" FOREIGN KEY ("lootboxId") REFERENCES "lootboxes" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "lootbox_items_itemDefinitionId_fkey" FOREIGN KEY ("itemDefinitionId") REFERENCES "item_definitions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "cooldowns" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "cooldowns_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "profession_progresses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "professionType" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "experience" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "profession_progresses_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "event_states" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "event_states_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "dungeon_progresses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "dungeonId" TEXT NOT NULL,
    "highestFloor" INTEGER NOT NULL DEFAULT 0,
    "timesCompleted" INTEGER NOT NULL DEFAULT 0,
    "bestTime" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "dungeon_progresses_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "dungeon_progresses_dungeonId_fkey" FOREIGN KEY ("dungeonId") REFERENCES "dungeons" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "players_userId_key" ON "players"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "item_definitions_name_key" ON "item_definitions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_playerId_itemDefinitionId_key" ON "inventory_items"("playerId", "itemDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "bosses_mobId_key" ON "bosses"("mobId");

-- CreateIndex
CREATE UNIQUE INDEX "dungeons_name_key" ON "dungeons"("name");

-- CreateIndex
CREATE UNIQUE INDEX "dungeon_floors_dungeonId_floorNumber_key" ON "dungeon_floors"("dungeonId", "floorNumber");

-- CreateIndex
CREATE UNIQUE INDEX "quests_playerId_questDefinitionId_key" ON "quests"("playerId", "questDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "quest_definitions_name_key" ON "quest_definitions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "lootboxes_mobId_key" ON "lootboxes"("mobId");

-- CreateIndex
CREATE UNIQUE INDEX "cooldowns_playerId_action_key" ON "cooldowns"("playerId", "action");

-- CreateIndex
CREATE UNIQUE INDEX "profession_progresses_playerId_professionType_key" ON "profession_progresses"("playerId", "professionType");

-- CreateIndex
CREATE UNIQUE INDEX "event_states_playerId_eventKey_key" ON "event_states"("playerId", "eventKey");

-- CreateIndex
CREATE UNIQUE INDEX "dungeon_progresses_playerId_dungeonId_key" ON "dungeon_progresses"("playerId", "dungeonId");
