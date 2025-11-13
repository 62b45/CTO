// Test that shared types compile and can be imported correctly
import {
  Player,
  ItemDefinition,
  Quest,
  Mob,
  Dungeon,
  ProfessionType,
  ItemRarity,
  ItemType,
  MobType,
  QuestStatus,
  QuestRewardType,
  DungeonDifficulty,
} from './index';

// Test enum types
const profession: ProfessionType = ProfessionType.FISHING;
const rarity: ItemRarity = ItemRarity.LEGENDARY;
const itemType: ItemType = ItemType.WEAPON;
const mobType: MobType = MobType.BOSS;
const questStatus: QuestStatus = QuestStatus.IN_PROGRESS;
const rewardType: QuestRewardType = QuestRewardType.EXPERIENCE;
const difficulty: DungeonDifficulty = DungeonDifficulty.HARD;

// Test that Prisma types work
type PlayerType = Player;
type ItemDefType = ItemDefinition;
type QuestType = Quest;
type MobType = Mob;
type DungeonType = Dungeon;

console.log('✓ All types imported successfully');
console.log('✓ Enums working correctly');
console.log(`✓ Sample profession: ${profession}`);
console.log(`✓ Sample rarity: ${rarity}`);
