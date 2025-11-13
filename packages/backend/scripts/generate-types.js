#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const backendDir = path.join(__dirname, '..');
const sharedDir = path.join(backendDir, '..', 'shared');
const prismaClientDir = path.join(backendDir, 'node_modules', '.prisma', 'client');
const sharedIndexFile = path.join(sharedDir, 'index.ts');

try {
  console.log('Generating Prisma types...');

  // Ensure the shared directory exists
  if (!fs.existsSync(sharedDir)) {
    fs.mkdirSync(sharedDir, { recursive: true });
  }

  // Check if Prisma types exist
  const prismaTypesFile = path.join(prismaClientDir, 'index.d.ts');
  
  if (!fs.existsSync(prismaTypesFile)) {
    console.log('Prisma client types not yet generated. Skipping export.');
    // Create an empty index file if it doesn't exist
    if (!fs.existsSync(sharedIndexFile)) {
      fs.writeFileSync(sharedIndexFile, '// Shared types will be generated here\n');
    }
    process.exit(0);
  }

  // Read the generated Prisma types
  const prismaTypes = fs.readFileSync(prismaTypesFile, 'utf-8');

  // Create a re-export file in the shared package
  const typeExports = `// Re-exported Prisma types from @prisma/client
export * from '@prisma/client';
export type {
  Player,
  ItemDefinition,
  InventoryItem,
  Mob,
  Boss,
  Dungeon,
  DungeonFloor,
  DungeonFloorMob,
  Quest,
  QuestDefinition,
  QuestReward,
  Lootbox,
  LootboxItem,
  Cooldown,
  ProfessionProgress,
  EventState,
  DungeonProgress,
  ProfessionType,
  ItemRarity,
  ItemType,
  MobType,
  QuestStatus,
  QuestRewardType,
  DungeonDifficulty,
} from '@prisma/client';
`;

  fs.writeFileSync(sharedIndexFile, typeExports);
  
  console.log('✓ Types exported to shared package');
  process.exit(0);
} catch (error) {
  console.error('Error generating types:', error);
  process.exit(1);
}
