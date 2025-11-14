import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper function to create JSON strings
const json = (obj: any) => JSON.stringify(obj);

// Helper for bulk creates in SQLite (which doesn't support createMany well)
async function bulkCreate<T>(
  model: any,
  data: any[],
  name: string
): Promise<T[]> {
  console.log(`Creating ${data.length} ${name}...`);
  const results: T[] = [];
  for (const item of data) {
    const result = await model.create({ data: item });
    results.push(result);
  }
  console.log(`✓ Created ${results.length} ${name}`);
  return results;
}

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data (in reverse order of dependencies)
  await prisma.inventoryItem.deleteMany();
  await prisma.cooldown.deleteMany();
  await prisma.professionProgress.deleteMany();
  await prisma.dungeon.deleteMany();
  await prisma.boss.deleteMany();
  await prisma.mob.deleteMany();
  await prisma.quest.deleteMany();
  await prisma.lootbox.deleteMany();
  await prisma.eventState.deleteMany();
  await prisma.player.deleteMany();
  await prisma.itemDefinition.deleteMany();

  console.log('✓ Cleared existing data');

  // ==================== ITEM DEFINITIONS ====================
  const itemDefinitions = [
    // WEAPONS
    { name: 'Rusty Sword', type: 'WEAPON', rarity: 'COMMON', power: 5, bonuses: json({ atk: 5 }), durability: 50, level_req: 1, buy_value: 10, sell_value: 5, drop_weight: 100 },
    { name: 'Iron Sword', type: 'WEAPON', rarity: 'COMMON', power: 12, bonuses: json({ atk: 12 }), durability: 100, level_req: 5, buy_value: 50, sell_value: 25, drop_weight: 80 },
    { name: 'Steel Blade', type: 'WEAPON', rarity: 'UNCOMMON', power: 20, bonuses: json({ atk: 20, crit: 5 }), durability: 150, level_req: 10, buy_value: 150, sell_value: 75, drop_weight: 50 },
    { name: 'Blazing Greatsword', type: 'WEAPON', rarity: 'RARE', power: 35, bonuses: json({ atk: 35, crit: 10, fire_dmg: 15 }), durability: 200, level_req: 20, buy_value: 500, sell_value: 250, drop_weight: 20 },
    { name: 'Shadowfang', type: 'WEAPON', rarity: 'EPIC', power: 55, bonuses: json({ atk: 55, crit: 20, lifesteal: 10 }), durability: 300, level_req: 30, buy_value: 1500, sell_value: 750, drop_weight: 10 },
    { name: 'Voidreaver', type: 'WEAPON', rarity: 'LEGENDARY', power: 80, bonuses: json({ atk: 80, crit: 30, void_dmg: 25, lifesteal: 15 }), durability: 500, level_req: 50, buy_value: 5000, sell_value: 2500, drop_weight: 5 },
    
    // ARMOR
    { name: 'Leather Vest', type: 'ARMOR', rarity: 'COMMON', power: 3, bonuses: json({ def: 3 }), durability: 40, level_req: 1, buy_value: 8, sell_value: 4, drop_weight: 100 },
    { name: 'Iron Chestplate', type: 'ARMOR', rarity: 'COMMON', power: 10, bonuses: json({ def: 10 }), durability: 80, level_req: 5, buy_value: 40, sell_value: 20, drop_weight: 80 },
    { name: 'Steel Armor', type: 'ARMOR', rarity: 'UNCOMMON', power: 18, bonuses: json({ def: 18, hp_bonus: 50 }), durability: 120, level_req: 10, buy_value: 120, sell_value: 60, drop_weight: 50 },
    { name: 'Crystal Plate', type: 'ARMOR', rarity: 'RARE', power: 30, bonuses: json({ def: 30, hp_bonus: 100, resistance: 10 }), durability: 180, level_req: 20, buy_value: 400, sell_value: 200, drop_weight: 20 },
    { name: 'Dragonscale Mail', type: 'ARMOR', rarity: 'EPIC', power: 48, bonuses: json({ def: 48, hp_bonus: 200, resistance: 20, regen: 5 }), durability: 250, level_req: 30, buy_value: 1200, sell_value: 600, drop_weight: 10 },
    { name: 'Titanforged Aegis', type: 'ARMOR', rarity: 'LEGENDARY', power: 70, bonuses: json({ def: 70, hp_bonus: 350, resistance: 35, regen: 10, reflect: 5 }), durability: 400, level_req: 50, buy_value: 4000, sell_value: 2000, drop_weight: 5 },
    
    // ACCESSORIES
    { name: 'Bronze Ring', type: 'ACCESSORY', rarity: 'COMMON', power: 2, bonuses: json({ atk: 2, def: 2 }), level_req: 1, buy_value: 15, sell_value: 7, drop_weight: 60 },
    { name: 'Silver Amulet', type: 'ACCESSORY', rarity: 'UNCOMMON', power: 8, bonuses: json({ atk: 5, def: 5, hp_bonus: 30 }), level_req: 10, buy_value: 100, sell_value: 50, drop_weight: 40 },
    { name: 'Ruby Pendant', type: 'ACCESSORY', rarity: 'RARE', power: 15, bonuses: json({ atk: 15, crit: 8, fire_dmg: 10 }), level_req: 20, buy_value: 350, sell_value: 175, drop_weight: 25 },
    { name: 'Ethereal Band', type: 'ACCESSORY', rarity: 'EPIC', power: 25, bonuses: json({ atk: 15, def: 15, hp_bonus: 150, mp_bonus: 100 }), level_req: 30, buy_value: 1000, sell_value: 500, drop_weight: 12 },
    { name: 'Crown of the Void', type: 'ACCESSORY', rarity: 'LEGENDARY', power: 40, bonuses: json({ atk: 25, def: 25, hp_bonus: 250, all_dmg: 20, cooldown_reduction: 15 }), level_req: 50, buy_value: 3500, sell_value: 1750, drop_weight: 8 },
    
    // CONSUMABLES
    { name: 'Health Potion', type: 'CONSUMABLE', rarity: 'COMMON', power: 50, bonuses: json({ heal: 50 }), level_req: 1, buy_value: 5, sell_value: 2, drop_weight: 150 },
    { name: 'Greater Health Potion', type: 'CONSUMABLE', rarity: 'UNCOMMON', power: 150, bonuses: json({ heal: 150 }), level_req: 10, buy_value: 20, sell_value: 10, drop_weight: 100 },
    { name: 'Elixir of Strength', type: 'CONSUMABLE', rarity: 'RARE', power: 0, bonuses: json({ atk_buff: 25, duration: 300 }), level_req: 15, buy_value: 100, sell_value: 50, drop_weight: 30 },
    { name: 'Elixir of Defense', type: 'CONSUMABLE', rarity: 'RARE', power: 0, bonuses: json({ def_buff: 25, duration: 300 }), level_req: 15, buy_value: 100, sell_value: 50, drop_weight: 30 },
    
    // MATERIALS
    { name: 'Iron Ore', type: 'MATERIAL', rarity: 'COMMON', power: 0, bonuses: json({}), level_req: 1, buy_value: 3, sell_value: 1, drop_weight: 200 },
    { name: 'Steel Ingot', type: 'MATERIAL', rarity: 'UNCOMMON', power: 0, bonuses: json({}), level_req: 5, buy_value: 15, sell_value: 7, drop_weight: 120 },
    { name: 'Mithril Ore', type: 'MATERIAL', rarity: 'RARE', power: 0, bonuses: json({}), level_req: 15, buy_value: 50, sell_value: 25, drop_weight: 60 },
    { name: 'Adamantite', type: 'MATERIAL', rarity: 'EPIC', power: 0, bonuses: json({}), level_req: 25, buy_value: 150, sell_value: 75, drop_weight: 30 },
    { name: 'Void Crystal', type: 'MATERIAL', rarity: 'LEGENDARY', power: 0, bonuses: json({}), level_req: 40, buy_value: 500, sell_value: 250, drop_weight: 10 },
    { name: 'Leather Scrap', type: 'MATERIAL', rarity: 'COMMON', power: 0, bonuses: json({}), level_req: 1, buy_value: 2, sell_value: 1, drop_weight: 180 },
    { name: 'Dragon Scale', type: 'MATERIAL', rarity: 'EPIC', power: 0, bonuses: json({}), level_req: 30, buy_value: 200, sell_value: 100, drop_weight: 25 },
    { name: 'Magic Essence', type: 'MATERIAL', rarity: 'RARE', power: 0, bonuses: json({}), level_req: 20, buy_value: 80, sell_value: 40, drop_weight: 50 },
    { name: 'Ancient Rune', type: 'MATERIAL', rarity: 'LEGENDARY', power: 0, bonuses: json({}), level_req: 45, buy_value: 800, sell_value: 400, drop_weight: 8 },
    { name: 'Gemstone', type: 'MATERIAL', rarity: 'UNCOMMON', power: 0, bonuses: json({}), level_req: 10, buy_value: 25, sell_value: 12, drop_weight: 80 },
  ];

  await bulkCreate(prisma.itemDefinition, itemDefinitions, 'item definitions');

  // Get created items for referencing in drops
  const items = await prisma.itemDefinition.findMany();
  const ironOre = items.find((i) => i.name === 'Iron Ore');
  const leatherScrap = items.find((i) => i.name === 'Leather Scrap');
  const steelIngot = items.find((i) => i.name === 'Steel Ingot');
  const healthPotion = items.find((i) => i.name === 'Health Potion');
  const ironSword = items.find((i) => i.name === 'Iron Sword');
  const steelBlade = items.find((i) => i.name === 'Steel Blade');
  const mithrilOre = items.find((i) => i.name === 'Mithril Ore');
  const magicEssence = items.find((i) => i.name === 'Magic Essence');
  const adamantite = items.find((i) => i.name === 'Adamantite');
  const dragonScale = items.find((i) => i.name === 'Dragon Scale');
  const voidCrystal = items.find((i) => i.name === 'Void Crystal');
  const ancientRune = items.find((i) => i.name === 'Ancient Rune');

  // ==================== MOBS ====================
  const mobDefinitions = [
    // GREENWOOD (Level 1-10)
    { name: 'Forest Wolf', area: 'GREENWOOD', hp: 30, atk: 5, def: 2, xp: 10, coins: 5, drops: json([{ itemId: leatherScrap?.id, weight: 80, minQty: 1, maxQty: 3 }, { itemId: healthPotion?.id, weight: 30, minQty: 1, maxQty: 1 }]) },
    { name: 'Goblin Scout', area: 'GREENWOOD', hp: 40, atk: 7, def: 3, xp: 15, coins: 8, drops: json([{ itemId: ironOre?.id, weight: 60, minQty: 1, maxQty: 2 }, { itemId: healthPotion?.id, weight: 40, minQty: 1, maxQty: 2 }]) },
    { name: 'Wild Boar', area: 'GREENWOOD', hp: 50, atk: 6, def: 4, xp: 12, coins: 6, drops: json([{ itemId: leatherScrap?.id, weight: 90, minQty: 2, maxQty: 4 }]) },
    { name: 'Giant Spider', area: 'GREENWOOD', hp: 45, atk: 8, def: 2, xp: 18, coins: 10, drops: json([{ itemId: leatherScrap?.id, weight: 50, minQty: 1, maxQty: 2 }, { itemId: ironOre?.id, weight: 30, minQty: 1, maxQty: 1 }]) },
    
    // ASHEN_WASTE (Level 10-20)
    { name: 'Fire Imp', area: 'ASHEN_WASTE', hp: 80, atk: 15, def: 8, xp: 40, coins: 20, drops: json([{ itemId: steelIngot?.id, weight: 70, minQty: 1, maxQty: 2 }, { itemId: magicEssence?.id, weight: 40, minQty: 1, maxQty: 1 }]) },
    { name: 'Lava Golem', area: 'ASHEN_WASTE', hp: 120, atk: 18, def: 15, xp: 50, coins: 25, drops: json([{ itemId: steelIngot?.id, weight: 80, minQty: 2, maxQty: 4 }, { itemId: ironSword?.id, weight: 20, minQty: 1, maxQty: 1 }]) },
    { name: 'Ash Wraith', area: 'ASHEN_WASTE', hp: 90, atk: 20, def: 6, xp: 45, coins: 22, drops: json([{ itemId: magicEssence?.id, weight: 60, minQty: 1, maxQty: 2 }, { itemId: healthPotion?.id, weight: 50, minQty: 2, maxQty: 3 }]) },
    { name: 'Magma Serpent', area: 'ASHEN_WASTE', hp: 110, atk: 22, def: 10, xp: 55, coins: 28, drops: json([{ itemId: dragonScale?.id, weight: 30, minQty: 1, maxQty: 1 }, { itemId: steelIngot?.id, weight: 70, minQty: 1, maxQty: 3 }]) },
    
    // CRYSTAL_DEPTHS (Level 20-30)
    { name: 'Crystal Golem', area: 'CRYSTAL_DEPTHS', hp: 200, atk: 30, def: 25, xp: 100, coins: 50, drops: json([{ itemId: mithrilOre?.id, weight: 80, minQty: 2, maxQty: 4 }, { itemId: magicEssence?.id, weight: 60, minQty: 1, maxQty: 2 }]) },
    { name: 'Cave Troll', area: 'CRYSTAL_DEPTHS', hp: 250, atk: 35, def: 20, xp: 110, coins: 55, drops: json([{ itemId: adamantite?.id, weight: 40, minQty: 1, maxQty: 2 }, { itemId: steelBlade?.id, weight: 25, minQty: 1, maxQty: 1 }]) },
    { name: 'Gem Beetle', area: 'CRYSTAL_DEPTHS', hp: 180, atk: 28, def: 30, xp: 95, coins: 60, drops: json([{ itemId: mithrilOre?.id, weight: 90, minQty: 3, maxQty: 5 }]) },
    { name: 'Underground Drake', area: 'CRYSTAL_DEPTHS', hp: 280, atk: 40, def: 28, xp: 130, coins: 70, drops: json([{ itemId: dragonScale?.id, weight: 60, minQty: 2, maxQty: 3 }, { itemId: adamantite?.id, weight: 50, minQty: 1, maxQty: 2 }]) },
    
    // STORM_PEAKS (Level 30-40)
    { name: 'Storm Elemental', area: 'STORM_PEAKS', hp: 350, atk: 50, def: 35, xp: 180, coins: 90, drops: json([{ itemId: adamantite?.id, weight: 70, minQty: 2, maxQty: 4 }, { itemId: magicEssence?.id, weight: 80, minQty: 2, maxQty: 4 }]) },
    { name: 'Thunder Bird', area: 'STORM_PEAKS', hp: 320, atk: 55, def: 30, xp: 170, coins: 85, drops: json([{ itemId: ancientRune?.id, weight: 30, minQty: 1, maxQty: 1 }, { itemId: magicEssence?.id, weight: 70, minQty: 2, maxQty: 3 }]) },
    { name: 'Mountain Giant', area: 'STORM_PEAKS', hp: 450, atk: 60, def: 45, xp: 200, coins: 100, drops: json([{ itemId: adamantite?.id, weight: 80, minQty: 3, maxQty: 5 }, { itemId: dragonScale?.id, weight: 40, minQty: 1, maxQty: 2 }]) },
    { name: 'Frost Wyvern', area: 'STORM_PEAKS', hp: 400, atk: 58, def: 40, xp: 190, coins: 95, drops: json([{ itemId: dragonScale?.id, weight: 70, minQty: 2, maxQty: 4 }, { itemId: voidCrystal?.id, weight: 20, minQty: 1, maxQty: 1 }]) },
    
    // VOID_RIFT (Level 40-50+)
    { name: 'Void Stalker', area: 'VOID_RIFT', hp: 600, atk: 80, def: 60, xp: 300, coins: 150, drops: json([{ itemId: voidCrystal?.id, weight: 60, minQty: 1, maxQty: 2 }, { itemId: ancientRune?.id, weight: 50, minQty: 1, maxQty: 2 }]) },
    { name: 'Shadow Demon', area: 'VOID_RIFT', hp: 550, atk: 85, def: 55, xp: 280, coins: 140, drops: json([{ itemId: voidCrystal?.id, weight: 70, minQty: 2, maxQty: 3 }, { itemId: magicEssence?.id, weight: 80, minQty: 3, maxQty: 5 }]) },
    { name: 'Void Colossus', area: 'VOID_RIFT', hp: 800, atk: 90, def: 70, xp: 350, coins: 180, drops: json([{ itemId: voidCrystal?.id, weight: 80, minQty: 2, maxQty: 4 }, { itemId: adamantite?.id, weight: 90, minQty: 4, maxQty: 6 }]) },
    { name: 'Rift Horror', area: 'VOID_RIFT', hp: 700, atk: 95, def: 65, xp: 320, coins: 160, drops: json([{ itemId: ancientRune?.id, weight: 60, minQty: 1, maxQty: 3 }, { itemId: voidCrystal?.id, weight: 75, minQty: 2, maxQty: 3 }]) },
  ];

  await bulkCreate(prisma.mob, mobDefinitions, 'mob templates');

  const mobs = await prisma.mob.findMany();
  const goblinScout = mobs.find((m) => m.name === 'Goblin Scout');
  const lavaGolem = mobs.find((m) => m.name === 'Lava Golem');
  const crystalGolem = mobs.find((m) => m.name === 'Crystal Golem');
  const stormElemental = mobs.find((m) => m.name === 'Storm Elemental');
  const voidStalker = mobs.find((m) => m.name === 'Void Stalker');

  // ==================== BOSSES ====================
  const bossDefinitions = [
    { name: 'Goblin King', area: 'GREENWOOD', hp: 500, atk: 25, def: 15, mobId: goblinScout?.id, phases: json([{ phase: 1, hp_threshold: 100, abilities: ['Sword Slash', 'War Cry'] }, { phase: 2, hp_threshold: 50, abilities: ['Berserker Rage', 'Ground Slam'] }]), drops: json([{ itemId: ironSword?.id, weight: 100, minQty: 1, maxQty: 1 }, { itemId: steelIngot?.id, weight: 80, minQty: 5, maxQty: 10 }, { itemId: healthPotion?.id, weight: 90, minQty: 3, maxQty: 5 }]) },
    { name: 'Ancient Treant', area: 'GREENWOOD', hp: 800, atk: 30, def: 25, phases: json([{ phase: 1, hp_threshold: 100, abilities: ['Root Grasp', 'Thorn Burst'] }, { phase: 2, hp_threshold: 60, abilities: ['Nature\'s Wrath', 'Vine Whip'] }, { phase: 3, hp_threshold: 30, abilities: ['Forest Fury', 'Regeneration'] }]), drops: json([{ itemId: steelBlade?.id, weight: 80, minQty: 1, maxQty: 1 }, { itemId: leatherScrap?.id, weight: 100, minQty: 10, maxQty: 15 }, { itemId: magicEssence?.id, weight: 60, minQty: 2, maxQty: 4 }]) },
    { name: 'Inferno Lord', area: 'ASHEN_WASTE', hp: 1500, atk: 50, def: 35, mobId: lavaGolem?.id, phases: json([{ phase: 1, hp_threshold: 100, abilities: ['Fireball', 'Flame Wave'] }, { phase: 2, hp_threshold: 60, abilities: ['Meteor Strike', 'Magma Pool'] }, { phase: 3, hp_threshold: 20, abilities: ['Inferno Nova', 'Flame Shield'] }]), drops: json([{ itemId: steelBlade?.id, weight: 100, minQty: 1, maxQty: 1 }, { itemId: magicEssence?.id, weight: 90, minQty: 5, maxQty: 8 }, { itemId: adamantite?.id, weight: 50, minQty: 2, maxQty: 4 }]) },
    { name: 'Volcanic Dragon', area: 'ASHEN_WASTE', hp: 2000, atk: 60, def: 40, phases: json([{ phase: 1, hp_threshold: 100, abilities: ['Fire Breath', 'Wing Buffet'] }, { phase: 2, hp_threshold: 50, abilities: ['Lava Geyser', 'Tail Sweep', 'Flight'] }, { phase: 3, hp_threshold: 25, abilities: ['Magma Storm', 'Dragon\'s Fury'] }]), drops: json([{ itemId: dragonScale?.id, weight: 100, minQty: 10, maxQty: 15 }, { itemId: adamantite?.id, weight: 80, minQty: 5, maxQty: 8 }, { itemId: voidCrystal?.id, weight: 40, minQty: 1, maxQty: 2 }]) },
    { name: 'Crystal Guardian', area: 'CRYSTAL_DEPTHS', hp: 2500, atk: 70, def: 60, mobId: crystalGolem?.id, phases: json([{ phase: 1, hp_threshold: 100, abilities: ['Crystal Shard', 'Barrier'] }, { phase: 2, hp_threshold: 60, abilities: ['Prism Ray', 'Crystal Explosion'] }, { phase: 3, hp_threshold: 30, abilities: ['Refraction Storm', 'Diamond Skin'] }]), drops: json([{ itemId: mithrilOre?.id, weight: 100, minQty: 10, maxQty: 15 }, { itemId: magicEssence?.id, weight: 100, minQty: 8, maxQty: 12 }, { itemId: ancientRune?.id, weight: 50, minQty: 1, maxQty: 3 }]) },
    { name: 'Abyssal Leviathan', area: 'CRYSTAL_DEPTHS', hp: 3000, atk: 75, def: 55, phases: json([{ phase: 1, hp_threshold: 100, abilities: ['Tidal Wave', 'Water Jet'] }, { phase: 2, hp_threshold: 50, abilities: ['Whirlpool', 'Crushing Depths'] }, { phase: 3, hp_threshold: 25, abilities: ['Tsunami', 'Abyssal Fury'] }]), drops: json([{ itemId: adamantite?.id, weight: 100, minQty: 8, maxQty: 12 }, { itemId: dragonScale?.id, weight: 80, minQty: 6, maxQty: 10 }, { itemId: voidCrystal?.id, weight: 60, minQty: 2, maxQty: 4 }]) },
    { name: 'Tempest Titan', area: 'STORM_PEAKS', hp: 4000, atk: 90, def: 70, mobId: stormElemental?.id, phases: json([{ phase: 1, hp_threshold: 100, abilities: ['Lightning Bolt', 'Thunder Clap'] }, { phase: 2, hp_threshold: 60, abilities: ['Chain Lightning', 'Storm Shield'] }, { phase: 3, hp_threshold: 30, abilities: ['Tempest Fury', 'Lightning Storm'] }]), drops: json([{ itemId: ancientRune?.id, weight: 100, minQty: 3, maxQty: 6 }, { itemId: voidCrystal?.id, weight: 80, minQty: 3, maxQty: 5 }, { itemId: magicEssence?.id, weight: 100, minQty: 10, maxQty: 15 }]) },
    { name: 'Sky Sovereign', area: 'STORM_PEAKS', hp: 4500, atk: 95, def: 75, phases: json([{ phase: 1, hp_threshold: 100, abilities: ['Wind Blade', 'Gust'] }, { phase: 2, hp_threshold: 60, abilities: ['Tornado', 'Aerial Strike'] }, { phase: 3, hp_threshold: 30, abilities: ['Hurricane', 'Sky\'s Wrath'] }]), drops: json([{ itemId: voidCrystal?.id, weight: 100, minQty: 5, maxQty: 8 }, { itemId: ancientRune?.id, weight: 90, minQty: 4, maxQty: 7 }, { itemId: adamantite?.id, weight: 100, minQty: 10, maxQty: 15 }]) },
    { name: 'Void Emperor', area: 'VOID_RIFT', hp: 8000, atk: 120, def: 100, mobId: voidStalker?.id, phases: json([{ phase: 1, hp_threshold: 100, abilities: ['Void Bolt', 'Shadow Strike'] }, { phase: 2, hp_threshold: 70, abilities: ['Darkness Veil', 'Void Rend'] }, { phase: 3, hp_threshold: 40, abilities: ['Reality Tear', 'Void Corruption'] }, { phase: 4, hp_threshold: 15, abilities: ['Oblivion', 'End of All'] }]), drops: json([{ itemId: voidCrystal?.id, weight: 100, minQty: 10, maxQty: 20 }, { itemId: ancientRune?.id, weight: 100, minQty: 8, maxQty: 15 }, { itemId: dragonScale?.id, weight: 100, minQty: 10, maxQty: 15 }]) },
    { name: 'Eternal Nightmare', area: 'VOID_RIFT', hp: 10000, atk: 150, def: 120, phases: json([{ phase: 1, hp_threshold: 100, abilities: ['Fear', 'Nightmare Touch'] }, { phase: 2, hp_threshold: 75, abilities: ['Terror Wave', 'Dark Dream'] }, { phase: 3, hp_threshold: 50, abilities: ['Void Consumption', 'Reality Break'] }, { phase: 4, hp_threshold: 25, abilities: ['Eternal Darkness', 'Final Nightmare'] }]), drops: json([{ itemId: voidCrystal?.id, weight: 100, minQty: 15, maxQty: 25 }, { itemId: ancientRune?.id, weight: 100, minQty: 10, maxQty: 20 }, { itemId: adamantite?.id, weight: 100, minQty: 15, maxQty: 25 }]) },
  ];

  await bulkCreate(prisma.boss, bossDefinitions, 'boss encounters');

  const bosses = await prisma.boss.findMany();
  const goblinKing = bosses.find((b) => b.name === 'Goblin King');
  const ancientTreant = bosses.find((b) => b.name === 'Ancient Treant');
  const infernoLord = bosses.find((b) => b.name === 'Inferno Lord');
  const crystalGuardian = bosses.find((b) => b.name === 'Crystal Guardian');
  const tempestTitan = bosses.find((b) => b.name === 'Tempest Titan');

  const greenwoodMobs = mobs.filter((m) => m.area === 'GREENWOOD');
  const ashenWasteMobs = mobs.filter((m) => m.area === 'ASHEN_WASTE');
  const crystalDepthsMobs = mobs.filter((m) => m.area === 'CRYSTAL_DEPTHS');
  const stormPeaksMobs = mobs.filter((m) => m.area === 'STORM_PEAKS');

  // ==================== DUNGEONS ====================
  const dungeonDefinitions = [
    { name: 'Goblin Stronghold', area: 'GREENWOOD', bossId: goblinKing?.id, unlockReq: json({ level: 5 }), floors: json([{ floor: 1, mobIds: greenwoodMobs.slice(0, 2).map((m) => m.id), lootTable: [{ itemId: ironOre?.id, weight: 80, minQty: 2, maxQty: 5 }, { itemId: healthPotion?.id, weight: 60, minQty: 1, maxQty: 3 }] }, { floor: 2, mobIds: greenwoodMobs.slice(1, 3).map((m) => m.id), lootTable: [{ itemId: steelIngot?.id, weight: 60, minQty: 1, maxQty: 3 }, { itemId: leatherScrap?.id, weight: 80, minQty: 3, maxQty: 6 }] }, { floor: 3, mobIds: greenwoodMobs.map((m) => m.id), lootTable: [{ itemId: ironSword?.id, weight: 40, minQty: 1, maxQty: 1 }, { itemId: steelIngot?.id, weight: 70, minQty: 2, maxQty: 4 }] }]) },
    { name: 'Ancient Grove', area: 'GREENWOOD', bossId: ancientTreant?.id, unlockReq: json({ level: 8 }), floors: json([{ floor: 1, mobIds: greenwoodMobs.slice(0, 3).map((m) => m.id), lootTable: [{ itemId: leatherScrap?.id, weight: 90, minQty: 3, maxQty: 7 }, { itemId: magicEssence?.id, weight: 30, minQty: 1, maxQty: 2 }] }, { floor: 2, mobIds: greenwoodMobs.map((m) => m.id), lootTable: [{ itemId: steelBlade?.id, weight: 30, minQty: 1, maxQty: 1 }, { itemId: magicEssence?.id, weight: 50, minQty: 1, maxQty: 3 }] }]) },
    { name: 'Volcano Depths', area: 'ASHEN_WASTE', bossId: infernoLord?.id, unlockReq: json({ level: 15 }), floors: json([{ floor: 1, mobIds: ashenWasteMobs.slice(0, 2).map((m) => m.id), lootTable: [{ itemId: steelIngot?.id, weight: 80, minQty: 3, maxQty: 6 }, { itemId: magicEssence?.id, weight: 60, minQty: 1, maxQty: 3 }] }, { floor: 2, mobIds: ashenWasteMobs.slice(1, 3).map((m) => m.id), lootTable: [{ itemId: mithrilOre?.id, weight: 60, minQty: 1, maxQty: 3 }, { itemId: magicEssence?.id, weight: 70, minQty: 2, maxQty: 4 }] }, { floor: 3, mobIds: ashenWasteMobs.map((m) => m.id), lootTable: [{ itemId: adamantite?.id, weight: 40, minQty: 1, maxQty: 2 }, { itemId: steelBlade?.id, weight: 50, minQty: 1, maxQty: 1 }] }]) },
    { name: 'Crystal Caverns', area: 'CRYSTAL_DEPTHS', bossId: crystalGuardian?.id, unlockReq: json({ level: 25 }), floors: json([{ floor: 1, mobIds: crystalDepthsMobs.slice(0, 2).map((m) => m.id), lootTable: [{ itemId: mithrilOre?.id, weight: 80, minQty: 3, maxQty: 6 }, { itemId: magicEssence?.id, weight: 70, minQty: 2, maxQty: 4 }] }, { floor: 2, mobIds: crystalDepthsMobs.slice(1, 3).map((m) => m.id), lootTable: [{ itemId: adamantite?.id, weight: 70, minQty: 2, maxQty: 4 }, { itemId: dragonScale?.id, weight: 50, minQty: 1, maxQty: 3 }] }, { floor: 3, mobIds: crystalDepthsMobs.map((m) => m.id), lootTable: [{ itemId: voidCrystal?.id, weight: 40, minQty: 1, maxQty: 2 }, { itemId: ancientRune?.id, weight: 30, minQty: 1, maxQty: 2 }] }]) },
    { name: 'Stormlords Peak', area: 'STORM_PEAKS', bossId: tempestTitan?.id, unlockReq: json({ level: 35 }), floors: json([{ floor: 1, mobIds: stormPeaksMobs.slice(0, 2).map((m) => m.id), lootTable: [{ itemId: adamantite?.id, weight: 80, minQty: 4, maxQty: 7 }, { itemId: magicEssence?.id, weight: 80, minQty: 3, maxQty: 6 }] }, { floor: 2, mobIds: stormPeaksMobs.slice(1, 3).map((m) => m.id), lootTable: [{ itemId: voidCrystal?.id, weight: 60, minQty: 1, maxQty: 3 }, { itemId: ancientRune?.id, weight: 50, minQty: 1, maxQty: 3 }] }, { floor: 3, mobIds: stormPeaksMobs.map((m) => m.id), lootTable: [{ itemId: voidCrystal?.id, weight: 70, minQty: 2, maxQty: 4 }, { itemId: ancientRune?.id, weight: 60, minQty: 2, maxQty: 4 }] }]) },
  ];

  await bulkCreate(prisma.dungeon, dungeonDefinitions, 'dungeons');

  // ==================== QUESTS ====================
  const questDefinitions = [
    { name: 'First Steps', description: 'Defeat 5 Forest Wolves to prove your worth', requirements: json({ mob: 'Forest Wolf', count: 5 }), rewards: json({ xp: 50, coins: 25, items: [{ itemId: healthPotion?.id, quantity: 3 }] }) },
    { name: 'Goblin Menace', description: 'Clear out the Goblin Scout camp', requirements: json({ mob: 'Goblin Scout', count: 10 }), rewards: json({ xp: 100, coins: 50, items: [{ itemId: ironSword?.id, quantity: 1 }] }) },
    { name: 'Material Gathering', description: 'Collect 20 Iron Ore for the blacksmith', requirements: json({ item: ironOre?.id, count: 20 }), rewards: json({ xp: 80, coins: 40, items: [{ itemId: steelIngot?.id, quantity: 5 }] }) },
    { name: 'Spider Infestation', description: 'Eliminate 15 Giant Spiders', requirements: json({ mob: 'Giant Spider', count: 15 }), rewards: json({ xp: 150, coins: 75 }) },
    { name: 'Into the Fire', description: 'Venture into the Ashen Waste and defeat 8 Fire Imps', requirements: json({ mob: 'Fire Imp', count: 8 }), rewards: json({ xp: 200, coins: 100, items: [{ itemId: steelBlade?.id, quantity: 1 }] }) },
    { name: 'Lava Mining', description: 'Collect 15 Steel Ingots from the Ashen Waste', requirements: json({ item: steelIngot?.id, count: 15 }), rewards: json({ xp: 180, coins: 90, items: [{ itemId: mithrilOre?.id, quantity: 3 }] }) },
    { name: 'Wraith Hunter', description: 'Defeat 10 Ash Wraiths', requirements: json({ mob: 'Ash Wraith', count: 10 }), rewards: json({ xp: 250, coins: 125 }) },
    { name: 'Crystal Harvest', description: 'Gather 20 Mithril Ore from the Crystal Depths', requirements: json({ item: mithrilOre?.id, count: 20 }), rewards: json({ xp: 400, coins: 200, items: [{ itemId: adamantite?.id, quantity: 5 }] }) },
    { name: 'Storm Preparations', description: 'Collect 10 Adamantite to prepare for the Storm Peaks', requirements: json({ item: adamantite?.id, count: 10 }), rewards: json({ xp: 600, coins: 300, items: [{ itemId: voidCrystal?.id, quantity: 2 }] }) },
    { name: 'The Void Beckons', description: 'Defeat 5 Void Stalkers in the Void Rift', requirements: json({ mob: 'Void Stalker', count: 5 }), rewards: json({ xp: 1000, coins: 500, items: [{ itemId: ancientRune?.id, quantity: 3 }] }) },
    { name: 'Boss Slayer I', description: 'Defeat the Goblin King', requirements: json({ boss: 'Goblin King', count: 1 }), rewards: json({ xp: 500, coins: 250 }) },
    { name: 'Boss Slayer II', description: 'Defeat the Inferno Lord', requirements: json({ boss: 'Inferno Lord', count: 1 }), rewards: json({ xp: 1000, coins: 500 }) },
  ];

  await bulkCreate(prisma.quest, questDefinitions, 'quest templates');

  // ==================== LOOTBOXES ====================
  const lootboxDefinitions = [
    { name: 'Wooden Crate', cost: 50, rarity: 'COMMON', pityThreshold: 20, dropTable: json([{ itemId: healthPotion?.id, weight: 100, minQty: 2, maxQty: 5 }, { itemId: ironOre?.id, weight: 80, minQty: 5, maxQty: 10 }, { itemId: leatherScrap?.id, weight: 80, minQty: 5, maxQty: 10 }, { itemId: ironSword?.id, weight: 30, minQty: 1, maxQty: 1 }]) },
    { name: 'Silver Chest', cost: 200, rarity: 'UNCOMMON', pityThreshold: 15, dropTable: json([{ itemId: steelIngot?.id, weight: 90, minQty: 5, maxQty: 10 }, { itemId: magicEssence?.id, weight: 70, minQty: 2, maxQty: 5 }, { itemId: steelBlade?.id, weight: 50, minQty: 1, maxQty: 1 }, { itemId: mithrilOre?.id, weight: 40, minQty: 1, maxQty: 3 }]) },
    { name: 'Golden Vault', cost: 1000, rarity: 'RARE', pityThreshold: 10, dropTable: json([{ itemId: adamantite?.id, weight: 80, minQty: 3, maxQty: 8 }, { itemId: dragonScale?.id, weight: 70, minQty: 2, maxQty: 5 }, { itemId: voidCrystal?.id, weight: 50, minQty: 1, maxQty: 3 }, { itemId: ancientRune?.id, weight: 40, minQty: 1, maxQty: 2 }]) },
  ];

  await bulkCreate(prisma.lootbox, lootboxDefinitions, 'lootbox definitions');

  // ==================== DEFAULT PLAYER ====================
  console.log('Creating default player...');

  const player = await prisma.player.create({
    data: {
      name: 'Hero',
      level: 1,
      xp: 0,
      coins: 100,
      gems: 10,
      atk_base: 10,
      def_base: 10,
      hp_max: 100,
      hp_current: 100,
      equipped: json({ weapon: null, armor: null, accessory: null }),
      inventory: json([]),
      professions: json({
        WORKER: { level: 1, xp: 0 },
        CRAFTER: { level: 1, xp: 0 },
        ENCHANTER: { level: 1, xp: 0 },
        MERCHANT: { level: 1, xp: 0 },
        LOOTBOXER: { level: 1, xp: 0 },
      }),
      cooldowns: json({}),
      area: 'GREENWOOD',
      progress: json({ quests_completed: [], dungeons_cleared: [], bosses_defeated: [] }),
    },
  });

  console.log(`✓ Created default player: ${player.name} (${player.id})`);

  // Add some starter items to player inventory
  if (healthPotion && ironSword) {
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
        itemDefinitionId: ironSword.id,
        quantity: 1,
      },
    });
    console.log(`✓ Added starter items to player inventory`);
  }

  console.log('\n✅ Database seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
