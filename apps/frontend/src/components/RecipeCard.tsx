import type { CraftingRecipe } from '@shared';

interface RecipeCardProps {
  recipe: CraftingRecipe;
  onCraft: (recipeId: string) => void;
  isLoading?: boolean;
  canCraft: boolean;
  successChance: number;
}

export function RecipeCard({
  recipe,
  onCraft,
  isLoading = false,
  canCraft,
  successChance,
}: RecipeCardProps) {
  const getSuccessChanceColor = (chance: number) => {
    if (chance >= 0.8) return 'text-green-600 dark:text-green-400';
    if (chance >= 0.6) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div
      className="rounded-lg border border-gray-200 bg-white p-4 transition-all hover:shadow-lg dark:border-gray-700 dark:bg-gray-800"
      role="article"
      aria-label={`Crafting recipe: ${recipe.name}`}
    >
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {recipe.name}
        </h3>
        <p className="text-sm capitalize text-primary-600 dark:text-primary-400">
          {recipe.profession}
        </p>
      </div>

      <div className="mb-4 rounded-lg bg-primary-50 p-3 dark:bg-primary-900/20">
        <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
          Result
        </p>
        <p className="font-semibold text-gray-900 dark:text-gray-100">
          {recipe.resultItemName}
        </p>
      </div>

      <div className="mb-4">
        <p className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">
          Materials Required:
        </p>
        <div className="space-y-1">
          {recipe.materials.map((material, idx) => (
            <div
              key={idx}
              className="flex justify-between text-sm text-gray-700 dark:text-gray-300"
            >
              <span>{material.itemName}</span>
              <span className="font-semibold">×{material.quantity}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-4 border-t border-gray-200 pt-3 dark:border-gray-700">
        <div className="mb-3 flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            Success Chance:
          </span>
          <span className={`font-semibold ${getSuccessChanceColor(successChance)}`}>
            {(successChance * 100).toFixed(1)}%
          </span>
        </div>
        <div className="mb-3 flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            Experience Reward:
          </span>
          <span className="font-semibold text-blue-600 dark:text-blue-400">
            +{recipe.experience} XP
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            Min Level:
          </span>
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {recipe.minLevel}
          </span>
        </div>
      </div>

      <button
        onClick={() => onCraft(recipe.id)}
        disabled={isLoading || !canCraft}
        className={`w-full rounded-lg px-4 py-2 font-semibold text-white transition-colors ${
          canCraft
            ? 'bg-primary-600 hover:bg-primary-700'
            : 'bg-gray-400 cursor-not-allowed'
        } ${isLoading ? 'opacity-50' : ''}`}
        aria-label={`Craft ${recipe.resultItemName}`}
        title={!canCraft ? 'Insufficient materials or level' : undefined}
      >
        {isLoading ? 'Crafting...' : 'Craft'}
      </button>
    </div>
  );
}
