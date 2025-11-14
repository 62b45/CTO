-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "gems" INTEGER NOT NULL DEFAULT 0,
    "atk_base" INTEGER NOT NULL DEFAULT 10,
    "def_base" INTEGER NOT NULL DEFAULT 10,
    "hp_max" INTEGER NOT NULL DEFAULT 100,
    "hp_current" INTEGER NOT NULL DEFAULT 100,
    "equipped" TEXT NOT NULL DEFAULT '{}',
    "inventory" TEXT NOT NULL DEFAULT '[]',
    "professions" TEXT NOT NULL DEFAULT '{}',
    "cooldowns" TEXT NOT NULL DEFAULT '{}',
    "area" TEXT NOT NULL DEFAULT 'GREENWOOD',
    "progress" TEXT NOT NULL DEFAULT '{}',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ItemDefinition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "rarity" TEXT NOT NULL DEFAULT 'COMMON',
    "power" INTEGER NOT NULL DEFAULT 0,
    "bonuses" TEXT NOT NULL DEFAULT '{}',
    "durability" INTEGER,
    "level_req" INTEGER NOT NULL DEFAULT 1,
    "buy_value" INTEGER NOT NULL DEFAULT 0,
    "sell_value" INTEGER NOT NULL DEFAULT 0,
    "drop_weight" INTEGER NOT NULL DEFAULT 1
);

-- CreateTable
CREATE TABLE "Mob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "hp" INTEGER NOT NULL,
    "atk" INTEGER NOT NULL,
    "def" INTEGER NOT NULL,
    "xp" INTEGER NOT NULL,
    "coins" INTEGER NOT NULL,
    "drops" TEXT NOT NULL DEFAULT '[]',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Boss" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "hp" INTEGER NOT NULL,
    "atk" INTEGER NOT NULL,
    "def" INTEGER NOT NULL,
    "phases" TEXT NOT NULL DEFAULT '[]',
    "drops" TEXT NOT NULL DEFAULT '[]',
    "mobId" TEXT,
    CONSTRAINT "Boss_mobId_fkey" FOREIGN KEY ("mobId") REFERENCES "Mob" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Dungeon" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "floors" TEXT NOT NULL DEFAULT '[]',
    "bossId" TEXT,
    "unlockReq" TEXT NOT NULL DEFAULT '{}',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "Dungeon_bossId_fkey" FOREIGN KEY ("bossId") REFERENCES "Boss" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Quest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requirements" TEXT NOT NULL DEFAULT '{}',
    "rewards" TEXT NOT NULL DEFAULT '{}',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Lootbox" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "cost" INTEGER NOT NULL DEFAULT 0,
    "dropTable" TEXT NOT NULL DEFAULT '[]',
    "rarity" TEXT NOT NULL DEFAULT 'COMMON',
    "pityThreshold" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Cooldown" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "lastUsedAt" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "Cooldown_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProfessionProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "profession" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "ProfessionProgress_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "type" TEXT NOT NULL,
    "modifiers" TEXT NOT NULL DEFAULT '{}',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" DATETIME
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "itemDefinitionId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "InventoryItem_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InventoryItem_itemDefinitionId_fkey" FOREIGN KEY ("itemDefinitionId") REFERENCES "ItemDefinition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ItemDefinition_name_key" ON "ItemDefinition"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Dungeon_name_key" ON "Dungeon"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Lootbox_name_key" ON "Lootbox"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Cooldown_playerId_action_key" ON "Cooldown"("playerId", "action");

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionProgress_playerId_profession_key" ON "ProfessionProgress"("playerId", "profession");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_playerId_itemDefinitionId_key" ON "InventoryItem"("playerId", "itemDefinitionId");
