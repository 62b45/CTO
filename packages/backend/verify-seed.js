const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Verifying seeded data...\n');

  const playerCount = await prisma.player.count();
  console.log(`✓ Players: ${playerCount}`);

  const itemCount = await prisma.itemDefinition.count();
  console.log(`✓ Item Definitions: ${itemCount}`);

  const mobCount = await prisma.mob.count();
  console.log(`✓ Mobs: ${mobCount}`);

  const dungeonCount = await prisma.dungeon.count();
  console.log(`✓ Dungeons: ${dungeonCount}`);

  const questCount = await prisma.questDefinition.count();
  console.log(`✓ Quest Definitions: ${questCount}`);

  const bossCount = await prisma.boss.count();
  console.log(`✓ Bosses: ${bossCount}`);

  const lootboxCount = await prisma.lootbox.count();
  console.log(`✓ Lootboxes: ${lootboxCount}`);

  const inventoryCount = await prisma.inventoryItem.count();
  console.log(`✓ Inventory Items: ${inventoryCount}`);

  const professionCount = await prisma.professionProgress.count();
  console.log(`✓ Profession Progresses: ${professionCount}`);

  const playerData = await prisma.player.findFirst({
    include: {
      inventory: true,
      professionProgress: true,
      quests: true,
    },
  });

  console.log('\n✓ Sample Player Data:');
  console.log(`  - Name: ${playerData.name}`);
  console.log(`  - Level: ${playerData.level}`);
  console.log(`  - Inventory Items: ${playerData.inventory.length}`);
  console.log(
    `  - Profession Progresses: ${playerData.professionProgress.length}`
  );
  console.log(`  - Quests: ${playerData.quests.length}`);

  console.log('\n✓ All seed data verified successfully!');
}

main()
  .catch(e => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
