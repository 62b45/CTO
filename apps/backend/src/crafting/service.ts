import type {
  CraftingRecipe,
  CraftingResult,
  ProfessionType,
} from '@shared';
import type { ProfessionService } from '../professions/service';
import type { EconomyService } from '../economy/service';
import type { InventoryRepository } from '../storage/inventoryRepository';

type Logger = Pick<Console, 'info' | 'warn' | 'error'>;

export class CraftingService {
  private recipes: Map<string, CraftingRecipe> = new Map();

  constructor(
    private readonly professionService: ProfessionService,
    private readonly economyService: EconomyService,
    private readonly inventoryRepository: InventoryRepository,
    private readonly logger: Logger = console
  ) {
    this.initializeRecipes();
  }

  private initializeRecipes(): void {
    // Crafter recipes
    const crafterRecipes: CraftingRecipe[] = [
      {
        id: 'recipe-iron-sword',
        name: 'Craft Iron Sword',
        resultItemId: 'iron-sword',
        resultItemName: 'Iron Sword',
        profession: 'crafter',
        minLevel: 1,
        materials: [
          { itemId: 'iron-ore', itemName: 'Iron Ore', quantity: 3 },
          { itemId: 'leather-scrap', itemName: 'Leather Scrap', quantity: 1 },
        ],
        baseSuccessChance: 0.8,
        experience: 25,
      },
      {
        id: 'recipe-steel-blade',
        name: 'Craft Steel Blade',
        resultItemId: 'steel-blade',
        resultItemName: 'Steel Blade',
        profession: 'crafter',
        minLevel: 5,
        materials: [
          { itemId: 'steel-ingot', itemName: 'Steel Ingot', quantity: 2 },
          { itemId: 'iron-ore', itemName: 'Iron Ore', quantity: 2 },
        ],
        baseSuccessChance: 0.7,
        experience: 50,
      },
      {
        id: 'recipe-steel-armor',
        name: 'Craft Steel Armor',
        resultItemId: 'steel-armor',
        resultItemName: 'Steel Armor',
        profession: 'crafter',
        minLevel: 5,
        materials: [
          { itemId: 'steel-ingot', itemName: 'Steel Ingot', quantity: 3 },
          { itemId: 'leather-scrap', itemName: 'Leather Scrap', quantity: 3 },
        ],
        baseSuccessChance: 0.75,
        experience: 40,
      },
      {
        id: 'recipe-crystal-plate',
        name: 'Craft Crystal Plate',
        resultItemId: 'crystal-plate',
        resultItemName: 'Crystal Plate',
        profession: 'crafter',
        minLevel: 12,
        materials: [
          { itemId: 'mithril-ore', itemName: 'Mithril Ore', quantity: 2 },
          { itemId: 'gemstone', itemName: 'Gemstone', quantity: 2 },
        ],
        baseSuccessChance: 0.65,
        experience: 75,
      },
    ];

    // Enchanter recipes
    const enchanterRecipes: CraftingRecipe[] = [
      {
        id: 'recipe-enchant-weapon',
        name: 'Enchant Weapon',
        resultItemId: 'enchanted-weapon',
        resultItemName: 'Enchanted Weapon',
        profession: 'enchanter',
        minLevel: 3,
        materials: [
          { itemId: 'magic-essence', itemName: 'Magic Essence', quantity: 1 },
        ],
        baseSuccessChance: 0.6,
        experience: 35,
      },
      {
        id: 'recipe-craft-amulet',
        name: 'Craft Silver Amulet',
        resultItemId: 'silver-amulet',
        resultItemName: 'Silver Amulet',
        profession: 'enchanter',
        minLevel: 5,
        materials: [
          { itemId: 'magic-essence', itemName: 'Magic Essence', quantity: 2 },
          { itemId: 'gemstone', itemName: 'Gemstone', quantity: 1 },
        ],
        baseSuccessChance: 0.65,
        experience: 50,
      },
    ];

    // Worker recipes (refining materials)
    const workerRecipes: CraftingRecipe[] = [
      {
        id: 'recipe-refine-steel',
        name: 'Refine Steel Ingot',
        resultItemId: 'steel-ingot',
        resultItemName: 'Steel Ingot',
        profession: 'worker',
        minLevel: 2,
        materials: [
          { itemId: 'iron-ore', itemName: 'Iron Ore', quantity: 2 },
        ],
        baseSuccessChance: 0.85,
        experience: 20,
      },
    ];

    const allRecipes = [
      ...crafterRecipes,
      ...enchanterRecipes,
      ...workerRecipes,
    ];

    allRecipes.forEach(recipe => {
      this.recipes.set(recipe.id, recipe);
    });

    this.logger.info(`Initialized ${allRecipes.length} crafting recipes`);
  }

  async getRecipes(
    playerId: string,
    profession?: ProfessionType
  ): Promise<CraftingRecipe[]> {
    const professions =
      await this.professionService.getOrCreateProfessions(playerId);

    const recipes = Array.from(this.recipes.values()).filter(recipe => {
      const profLevel =
        professions.professions[recipe.profession].level;
      const meetsLevel = profLevel >= recipe.minLevel;
      const matchesProfession = !profession || recipe.profession === profession;
      return meetsLevel && matchesProfession;
    });

    return recipes;
  }

  async craft(
    playerId: string,
    recipeId: string
  ): Promise<CraftingResult> {
    const recipe = this.recipes.get(recipeId);
    if (!recipe) {
      throw new Error(`Recipe not found: ${recipeId}`);
    }

    const professions =
      await this.professionService.getOrCreateProfessions(playerId);
    const profession = professions.professions[recipe.profession];

    if (profession.level < recipe.minLevel) {
      throw new Error(
        `Insufficient ${recipe.profession} level. Need: ${recipe.minLevel}, Have: ${profession.level}`
      );
    }

    const inventory = await this.economyService.getOrCreateInventory(
      playerId
    );

    // Check materials
    for (const material of recipe.materials) {
      const item = inventory.items.find((i: any) => i.itemId === material.itemId);
      if (!item || item.quantity < material.quantity) {
        const have = item?.quantity ?? 0;
        throw new Error(
          `Insufficient ${material.itemName}. Need: ${material.quantity}, Have: ${have}`
        );
      }
    }

    // Calculate success chance with profession bonus
    const professionBonus = (profession.level - 1) * 0.03;
    const successChance = Math.min(0.99, recipe.baseSuccessChance + professionBonus);
    const rolled = Math.random();
    const success = rolled < successChance;

    if (success) {
      // Remove materials
      for (const material of recipe.materials) {
        const item = inventory.items.find((i: any) => i.itemId === material.itemId);
        if (item) {
          item.quantity -= material.quantity;
          if (item.quantity === 0) {
            inventory.items = inventory.items.filter(
              (i: any) => i.itemId !== material.itemId
            );
          }
        }
      }

      // Add crafted item
      const resultItem = inventory.items.find(
        (i: any) => i.itemId === recipe.resultItemId
      );
      if (resultItem) {
        resultItem.quantity += 1;
      } else {
        inventory.items.push({
          itemId: recipe.resultItemId,
          name: recipe.resultItemName,
          rarity: 'common',
          value: 0,
          quantity: 1,
        });
      }

      // Add profession XP
      const newXp = profession.currentXp + recipe.experience;
      const xpPerLevel = 100;
      const levelUp = Math.floor(newXp / xpPerLevel) > profession.level - 1;

      if (levelUp) {
        profession.level = Math.floor(newXp / xpPerLevel) + 1;
        profession.totalXpEarned += recipe.experience;
        profession.currentXp = newXp % xpPerLevel;
      } else {
        profession.currentXp = newXp;
        profession.totalXpEarned += recipe.experience;
      }

      await this.economyService.updateInventory(playerId, inventory);
      await this.professionService.updateProfession(
        playerId,
        recipe.profession,
        profession
      );

      this.logger.info(
        `Player ${playerId} successfully crafted ${recipe.resultItemName}`
      );

      return {
        success: true,
        itemId: recipe.resultItemId,
        itemName: recipe.resultItemName,
        experienceGained: recipe.experience,
        professionLevelUp: levelUp ? profession.level : undefined,
        message: `Successfully crafted ${recipe.resultItemName}!`,
      };
    } else {
      // Remove materials on failure
      for (const material of recipe.materials) {
        const item = inventory.items.find((i: any) => i.itemId === material.itemId);
        if (item) {
          item.quantity -= material.quantity;
          if (item.quantity === 0) {
            inventory.items = inventory.items.filter(
              (i: any) => i.itemId !== material.itemId
            );
          }
        }
      }

      // Add small XP even on failure
      const failureXp = Math.floor(recipe.experience * 0.3);
      profession.currentXp += failureXp;
      profession.totalXpEarned += failureXp;

      await this.economyService.updateInventory(playerId, inventory);
      await this.professionService.updateProfession(
        playerId,
        recipe.profession,
        profession
      );

      this.logger.info(
        `Player ${playerId} failed to craft ${recipe.resultItemName}`
      );

      return {
        success: false,
        itemId: '',
        itemName: '',
        experienceGained: failureXp,
        message: `Crafting failed! Lost materials but gained ${failureXp} XP.`,
      };
    }
  }
}
