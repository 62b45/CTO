const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Clear existing data
  await prisma.dungeonProgress.deleteMany();
  await prisma.eventState.deleteMany();
  await prisma.professionProgress.deleteMany();
  await prisma.cooldown.deleteMany();
  await prisma.lootboxItem.deleteMany();
  await prisma.lootbox.deleteMany();
  await prisma.quest.deleteMany();
  await prisma.questReward.deleteMany();
  await prisma.questDefinition.deleteMany();
  await prisma.dungeonFloorMob.deleteMany();
  await prisma.dungeonFloor.deleteMany();
  await prisma.dungeon.deleteMany();
  await prisma.boss.deleteMany();
  await prisma.mob.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.itemDefinition.deleteMany();
  await prisma.player.deleteMany();

  // Create Item Definitions
  console.log('Creating item definitions...');

  const ironSword = await prisma.itemDefinition.create({
    data: {
      name: 'Iron Sword',
      description: 'A basic iron sword for beginners',
      type: 'WEAPON',
      rarity: 'COMMON',
      sellValue: 50,
      buyValue: 100,
      maxStackSize: 1,
    },
  });

  const steelArmor = await prisma.itemDefinition.create({
    data: {
      name: 'Steel Armor',
      description: 'Sturdy steel plate armor',
      type: 'ARMOR',
      rarity: 'UNCOMMON',
      sellValue: 150,
      buyValue: 300,
      maxStackSize: 1,
    },
  });

  const healthPotion = await prisma.itemDefinition.create({
    data: {
      name: 'Health Potion',
      description: 'Restores 50 health',
      type: 'CONSUMABLE',
      rarity: 'COMMON',
      sellValue: 10,
      buyValue: 25,
      maxStackSize: 99,
    },
  });

  const manaPotion = await prisma.itemDefinition.create({
    data: {
      name: 'Mana Potion',
      description: 'Restores 50 mana',
      type: 'CONSUMABLE',
      rarity: 'COMMON',
      sellValue: 10,
      buyValue: 25,
      maxStackSize: 99,
    },
  });

  const rawFish = await prisma.itemDefinition.create({
    data: {
      name: 'Raw Fish',
      description: 'Fresh fish from the river',
      type: 'INGREDIENT',
      rarity: 'COMMON',
      sellValue: 5,
      buyValue: 10,
      maxStackSize: 99,
    },
  });

  const cookedFish = await prisma.itemDefinition.create({
    data: {
      name: 'Cooked Fish',
      description: 'A delicious cooked fish that restores health',
      type: 'CONSUMABLE',
      rarity: 'UNCOMMON',
      sellValue: 20,
      buyValue: 40,
      maxStackSize: 99,
    },
  });

  const ironOre = await prisma.itemDefinition.create({
    data: {
      name: 'Iron Ore',
      description: 'Raw iron ore for crafting',
      type: 'INGREDIENT',
      rarity: 'COMMON',
      sellValue: 15,
      buyValue: 30,
      maxStackSize: 99,
    },
  });

  const goldCoin = await prisma.itemDefinition.create({
    data: {
      name: 'Gold Coin',
      description: 'Currency used in trade',
      type: 'CONSUMABLE',
      rarity: 'COMMON',
      sellValue: 1,
      buyValue: 1,
      maxStackSize: 9999,
    },
  });

  const epicSword = await prisma.itemDefinition.create({
    data: {
      name: 'Legendary Blade',
      description: 'A legendary sword forged by master smiths',
      type: 'WEAPON',
      rarity: 'LEGENDARY',
      sellValue: 5000,
      buyValue: 10000,
      maxStackSize: 1,
    },
  });

  // Create Mobs
  console.log('Creating mobs...');

  const goblin = await prisma.mob.create({
    data: {
      name: 'Goblin',
      mobType: 'COMMON',
      level: 1,
      health: 15,
      mana: 0,
      attackPower: 3,
      defensePower: 1,
      experienceReward: 10,
      currencyReward: 5,
    },
  });

  const orc = await prisma.mob.create({
    data: {
      name: 'Orc',
      mobType: 'COMMON',
      level: 3,
      health: 30,
      mana: 5,
      attackPower: 5,
      defensePower: 2,
      experienceReward: 25,
      currencyReward: 15,
    },
  });

  const goblinChief = await prisma.mob.create({
    data: {
      name: 'Goblin Chief',
      mobType: 'ELITE',
      level: 2,
      health: 40,
      mana: 10,
      attackPower: 6,
      defensePower: 3,
      experienceReward: 50,
      currencyReward: 30,
    },
  });

  const dragonBoss = await prisma.mob.create({
    data: {
      name: 'Ancient Dragon',
      mobType: 'BOSS',
      level: 10,
      health: 200,
      mana: 100,
      attackPower: 25,
      defensePower: 15,
      experienceReward: 500,
      currencyReward: 1000,
    },
  });

  // Create Boss
  console.log('Creating bosses...');

  const dragonBossRecord = await prisma.boss.create({
    data: {
      mobId: dragonBoss.id,
      name: 'Ancient Dragon',
      description: 'The legendary dragon that guards the treasure',
      phaseCount: 3,
      specialAbility: 'Fire Breath',
    },
  });

  // Create Dungeons
  console.log('Creating dungeons...');

  const goblinCave = await prisma.dungeon.create({
    data: {
      name: 'Goblin Cave',
      description: 'A damp cave filled with goblins',
      difficulty: 'EASY',
      minimumLevel: 1,
      recommendedLevel: 2,
    },
  });

  const dragonLair = await prisma.dungeon.create({
    data: {
      name: 'Dragon Lair',
      description: 'The treacherous lair of the Ancient Dragon',
      difficulty: 'NIGHTMARE',
      minimumLevel: 8,
      recommendedLevel: 10,
    },
  });

  // Create Dungeon Floors
  console.log('Creating dungeon floors...');

  const goblinCaveFloor1 = await prisma.dungeonFloor.create({
    data: {
      dungeonId: goblinCave.id,
      floorNumber: 1,
      name: 'Entrance',
      description: 'The main entrance to the cave',
    },
  });

  const goblinCaveFloor2 = await prisma.dungeonFloor.create({
    data: {
      dungeonId: goblinCave.id,
      floorNumber: 2,
      name: 'Deep Chambers',
      description: 'Deeper chambers with stronger enemies',
    },
  });

  const dragonLairFloor1 = await prisma.dungeonFloor.create({
    data: {
      dungeonId: dragonLair.id,
      floorNumber: 1,
      name: 'Approach',
      description: 'The path leading to the dragon',
    },
  });

  const dragonLairFloor2 = await prisma.dungeonFloor.create({
    data: {
      dungeonId: dragonLair.id,
      floorNumber: 2,
      name: 'Throne Room',
      description: 'The dragon sits upon its throne',
    },
  });

  // Create Dungeon Floor Mobs
  console.log('Creating dungeon floor mobs...');

  await prisma.dungeonFloorMob.create({
    data: {
      dungeonFloorId: goblinCaveFloor1.id,
      mobId: goblin.id,
      spawnWeight: 3,
    },
  });

  await prisma.dungeonFloorMob.create({
    data: {
      dungeonFloorId: goblinCaveFloor2.id,
      mobId: orc.id,
      spawnWeight: 2,
    },
  });

  await prisma.dungeonFloorMob.create({
    data: {
      dungeonFloorId: goblinCaveFloor2.id,
      mobId: goblinChief.id,
      spawnWeight: 1,
    },
  });

  await prisma.dungeonFloorMob.create({
    data: {
      dungeonFloorId: dragonLairFloor1.id,
      mobId: orc.id,
      spawnWeight: 2,
    },
  });

  await prisma.dungeonFloorMob.create({
    data: {
      dungeonFloorId: dragonLairFloor2.id,
      mobId: dragonBoss.id,
      spawnWeight: 1,
    },
  });

  // Create Lootboxes
  console.log('Creating lootboxes...');

  const goblinLoot = await prisma.lootbox.create({
    data: {
      mobId: goblin.id,
      rarity: 'COMMON',
    },
  });

  const orcLoot = await prisma.lootbox.create({
    data: {
      mobId: orc.id,
      rarity: 'UNCOMMON',
    },
  });

  const dragonLoot = await prisma.lootbox.create({
    data: {
      mobId: dragonBoss.id,
      rarity: 'LEGENDARY',
    },
  });

  // Create Lootbox Items
  console.log('Creating lootbox items...');

  await prisma.lootboxItem.create({
    data: {
      lootboxId: goblinLoot.id,
      itemDefinitionId: goldCoin.id,
      dropChance: 100,
      minQuantity: 1,
      maxQuantity: 5,
    },
  });

  await prisma.lootboxItem.create({
    data: {
      lootboxId: goblinLoot.id,
      itemDefinitionId: healthPotion.id,
      dropChance: 30,
      minQuantity: 1,
      maxQuantity: 1,
    },
  });

  await prisma.lootboxItem.create({
    data: {
      lootboxId: orcLoot.id,
      itemDefinitionId: ironOre.id,
      dropChance: 50,
      minQuantity: 1,
      maxQuantity: 3,
    },
  });

  await prisma.lootboxItem.create({
    data: {
      lootboxId: orcLoot.id,
      itemDefinitionId: manaPotion.id,
      dropChance: 40,
      minQuantity: 1,
      maxQuantity: 2,
    },
  });

  await prisma.lootboxItem.create({
    data: {
      lootboxId: dragonLoot.id,
      itemDefinitionId: epicSword.id,
      dropChance: 100,
      minQuantity: 1,
      maxQuantity: 1,
    },
  });

  await prisma.lootboxItem.create({
    data: {
      lootboxId: dragonLoot.id,
      itemDefinitionId: goldCoin.id,
      dropChance: 100,
      minQuantity: 100,
      maxQuantity: 500,
    },
  });

  // Create Quest Definitions
  console.log('Creating quest definitions...');

  const killGoblinsQuest = await prisma.questDefinition.create({
    data: {
      name: 'Defeat the Goblins',
      description:
        'The village is being attacked by goblins. Defeat 5 of them.',
      minimumLevel: 1,
    },
  });

  const collectFishQuest = await prisma.questDefinition.create({
    data: {
      name: 'Fish for Dinner',
      description: 'Collect 10 raw fish from the river for the village feast.',
      minimumLevel: 1,
    },
  });

  const defeatDragonQuest = await prisma.questDefinition.create({
    data: {
      name: 'Slay the Dragon',
      description:
        'The kingdom is in peril. Defeat the Ancient Dragon in its lair.',
      minimumLevel: 8,
    },
  });

  // Create Quest Rewards
  console.log('Creating quest rewards...');

  await prisma.questReward.create({
    data: {
      questDefinitionId: killGoblinsQuest.id,
      rewardType: 'EXPERIENCE',
      amount: 100,
    },
  });

  await prisma.questReward.create({
    data: {
      questDefinitionId: killGoblinsQuest.id,
      rewardType: 'ITEM',
      itemDefinitionId: ironSword.id,
      amount: 1,
    },
  });

  await prisma.questReward.create({
    data: {
      questDefinitionId: collectFishQuest.id,
      rewardType: 'EXPERIENCE',
      amount: 50,
    },
  });

  await prisma.questReward.create({
    data: {
      questDefinitionId: collectFishQuest.id,
      rewardType: 'ITEM',
      itemDefinitionId: cookedFish.id,
      amount: 5,
    },
  });

  await prisma.questReward.create({
    data: {
      questDefinitionId: defeatDragonQuest.id,
      rewardType: 'EXPERIENCE',
      amount: 1000,
    },
  });

  await prisma.questReward.create({
    data: {
      questDefinitionId: defeatDragonQuest.id,
      rewardType: 'ITEM',
      itemDefinitionId: epicSword.id,
      amount: 1,
    },
  });

  // Create a sample player
  console.log('Creating sample player...');

  const player = await prisma.player.create({
    data: {
      userId: 'player_1',
      name: 'Hero',
      level: 1,
      experience: 0,
      health: 100,
      mana: 50,
      currency: 100,
    },
  });

  // Add inventory items to player
  console.log('Adding inventory items to player...');

  await prisma.inventoryItem.create({
    data: {
      playerId: player.id,
      itemDefinitionId: ironSword.id,
      quantity: 1,
    },
  });

  await prisma.inventoryItem.create({
    data: {
      playerId: player.id,
      itemDefinitionId: healthPotion.id,
      quantity: 5,
    },
  });

  await prisma.inventoryItem.create({
    data: {
      playerId: player.id,
      itemDefinitionId: manaPotion.id,
      quantity: 3,
    },
  });

  // Add profession progress to player
  console.log('Adding profession progress to player...');

  await prisma.professionProgress.create({
    data: {
      playerId: player.id,
      professionType: 'FISHING',
      level: 1,
      experience: 0,
    },
  });

  await prisma.professionProgress.create({
    data: {
      playerId: player.id,
      professionType: 'COOKING',
      level: 1,
      experience: 0,
    },
  });

  // Add quests to player
  console.log('Adding quests to player...');

  await prisma.quest.create({
    data: {
      playerId: player.id,
      questDefinitionId: killGoblinsQuest.id,
      status: 'IN_PROGRESS',
      progress: 2,
      targetProgress: 5,
    },
  });

  await prisma.quest.create({
    data: {
      playerId: player.id,
      questDefinitionId: collectFishQuest.id,
      status: 'AVAILABLE',
      progress: 0,
      targetProgress: 10,
    },
  });

  // Add dungeon progress
  console.log('Adding dungeon progress to player...');

  await prisma.dungeonProgress.create({
    data: {
      playerId: player.id,
      dungeonId: goblinCave.id,
      highestFloor: 2,
      timesCompleted: 1,
      bestTime: 300,
    },
  });

  console.log('Database seed completed successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
