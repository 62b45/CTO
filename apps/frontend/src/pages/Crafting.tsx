import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../lib/api';
import { RecipeCard } from '../components/RecipeCard';
import { ProfessionProgressBar } from '../components/ProfessionProgressBar';
import type { CraftingRecipe, CraftingResult, ProfessionType } from '@shared';

interface CraftingResponse {
  playerId: string;
  craftingResult: CraftingResult;
  inventory?: {
    coins: number;
    gems: number;
    items: any[];
  };
}

interface RecipesResponse {
  playerId: string;
  recipes: CraftingRecipe[];
}

interface ProfessionData {
  profession: ProfessionType;
  level: number;
  currentXp: number;
  totalXpEarned: number;
  nextLevelXp: number;
  progressToNextLevel: number;
  bonus: number;
  createdAt: string;
  updatedAt: string;
}

interface ProfessionsResponse {
  playerId: string;
  professions: ProfessionData[];
}

interface InventoryItem {
  itemId: string;
  name: string;
  quantity: number;
}

interface InventoryResponse {
  playerId: string;
  inventory: {
    coins: number;
    gems: number;
    items: InventoryItem[];
  };
}

const PLAYER_ID = 'player-1';
const PROFESSIONS: ProfessionType[] = ['crafter', 'enchanter', 'worker'];

export function CraftingPage() {
  const [selectedProfession, setSelectedProfession] = useState<
    ProfessionType | 'all'
  >('all');
  const [craftingFeedback, setCraftingFeedback] = useState<{
    type: 'success' | 'failure';
    message: string;
  } | null>(null);
  const [showCraftConfirm, setShowCraftConfirm] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<CraftingRecipe | null>(null);
  const queryClient = useQueryClient();

  const { data: recipesData, isLoading: recipesLoading } = useQuery({
    queryKey: ['crafting-recipes', PLAYER_ID, selectedProfession],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedProfession !== 'all') {
        params.append('profession', selectedProfession);
      }
      const response = await fetchApi<RecipesResponse>(
        `/players/${PLAYER_ID}/crafting/recipes?${params}`
      );
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch recipes');
      }
      return response.data;
    },
  });

  const { data: professionsData, isLoading: professionsLoading } = useQuery({
    queryKey: ['professions', PLAYER_ID],
    queryFn: async () => {
      const response = await fetchApi<ProfessionsResponse>(
        `/players/${PLAYER_ID}/professions`
      );
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch professions');
      }
      return response.data;
    },
    refetchInterval: 5000,
  });

  const { data: inventoryData } = useQuery({
    queryKey: ['inventory', PLAYER_ID],
    queryFn: async () => {
      const response = await fetchApi<InventoryResponse>(
        `/players/${PLAYER_ID}/inventory?page=1&pageSize=100`
      );
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch inventory');
      }
      return response.data;
    },
    refetchInterval: 5000,
  });

  const craftMutation = useMutation({
    mutationFn: async (recipeId: string) => {
      const response = await fetch(
        `http://localhost:3001/players/${PLAYER_ID}/craft/${recipeId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to craft item');
      }

      return data.data as CraftingResponse;
    },
    onSuccess: data => {
      setCraftingFeedback({
        type: data.craftingResult.success ? 'success' : 'failure',
        message: data.craftingResult.message,
      });
      queryClient.invalidateQueries({ queryKey: ['crafting-recipes'] });
      queryClient.invalidateQueries({ queryKey: ['professions'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setShowCraftConfirm(false);
      setSelectedRecipe(null);
      setTimeout(() => setCraftingFeedback(null), 5000);
    },
    onError: error => {
      setCraftingFeedback({
        type: 'failure',
        message: error instanceof Error ? error.message : 'Crafting failed',
      });
      setTimeout(() => setCraftingFeedback(null), 5000);
    },
  });

  const recipes = useMemo(() => {
    return recipesData?.recipes || [];
  }, [recipesData]);

  const professionsArray = useMemo(() => {
    return professionsData?.professions || [];
  }, [professionsData]);

  const professions = useMemo(() => {
    const map: Record<ProfessionType, ProfessionData> = {} as any;
    professionsArray.forEach(prof => {
      map[prof.profession] = prof;
    });
    return map;
  }, [professionsArray]);

  const inventory = inventoryData?.inventory;

  const canCraftRecipe = (recipe: CraftingRecipe): boolean => {
    if (!inventory) return false;

    for (const material of recipe.materials) {
      const item = inventory.items.find(i => i.itemId === material.itemId);
      if (!item || item.quantity < material.quantity) {
        return false;
      }
    }
    return true;
  };

  const calculateSuccessChance = (recipe: CraftingRecipe): number => {
    const professionLevel = professions[recipe.profession]?.level || 1;
    const baseChance = recipe.baseSuccessChance;
    const professionBonus = (professionLevel - 1) * 0.03;
    return Math.min(0.99, baseChance + professionBonus);
  };

  const getNextLevelXp = (profession: ProfessionType): number => {
    const profData = professions[profession];
    if (!profData) return 0;
    return profData.nextLevelXp;
  };

  const isLoading = recipesLoading || professionsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            Loading crafting data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">
          Crafting
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Craft equipment and items based on your profession level.
        </p>
      </header>

      {/* Feedback Messages */}
      {craftingFeedback && (
        <div
          className={`rounded-lg px-4 py-3 ${
            craftingFeedback.type === 'success'
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
          }`}
          role="alert"
        >
          {craftingFeedback.message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profession Filter */}
          <div>
            <p className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">
              Filter by Profession:
            </p>
            <div className="flex flex-wrap gap-2">
              {(['all', ...PROFESSIONS] as const).map(profession => (
                <button
                  key={profession}
                  onClick={() => setSelectedProfession(profession)}
                  className={`rounded-full px-4 py-2 font-medium transition-colors ${
                    selectedProfession === profession
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                  }`}
                  aria-pressed={selectedProfession === profession}
                >
                  {profession === 'all'
                    ? 'All Professions'
                    : profession.charAt(0).toUpperCase() + profession.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Recipes Grid */}
          <div className="space-y-2">
            {recipes.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-800">
                <p className="text-gray-600 dark:text-gray-400">
                  No recipes available for your current profession level.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {recipes.map(recipe => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    onCraft={() => {
                      setSelectedRecipe(recipe);
                      setShowCraftConfirm(true);
                    }}
                    isLoading={
                      craftMutation.isPending && selectedRecipe?.id === recipe.id
                    }
                    canCraft={canCraftRecipe(recipe)}
                    successChance={calculateSuccessChance(recipe)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Profession Progress Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <div>
            <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
              Professions
            </h2>
            <div className="space-y-3">
              {PROFESSIONS.map(profession => {
                const profData = professions[profession];
                if (!profData) return null;

                return (
                  <ProfessionProgressBar
                    key={profession}
                    profession={profession}
                    level={profData.level}
                    currentXp={profData.currentXp}
                    nextLevelXp={getNextLevelXp(profession)}
                  />
                );
              })}
            </div>
          </div>

          {/* Materials Summary */}
          {selectedRecipe && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-3 font-semibold text-gray-900 dark:text-gray-100">
                Materials Needed
              </h3>
              <div className="space-y-2">
                {selectedRecipe.materials.map((material, idx) => {
                  const hasItem = inventory?.items.find(
                    i => i.itemId === material.itemId
                  );
                  const quantity = hasItem?.quantity || 0;
                  const hasEnough = quantity >= material.quantity;

                  return (
                    <div
                      key={idx}
                      className={`flex justify-between rounded text-sm ${
                        hasEnough
                          ? 'bg-green-100 dark:bg-green-900/20'
                          : 'bg-red-100 dark:bg-red-900/20'
                      } p-2`}
                    >
                      <span className="text-gray-700 dark:text-gray-300">
                        {material.itemName}
                      </span>
                      <span
                        className={`font-semibold ${
                          hasEnough
                            ? 'text-green-700 dark:text-green-300'
                            : 'text-red-700 dark:text-red-300'
                        }`}
                      >
                        {quantity}/{material.quantity}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tips Section */}
      <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100">
          💡 Crafting Tips:
        </h3>
        <ul className="mt-2 space-y-1 text-sm text-blue-800 dark:text-blue-200">
          <li>
            • Success chance: Base chance + 3% per profession level
          </li>
          <li>
            • Failed crafts consume materials but grant 30% of the XP
          </li>
          <li>
            • Successfully craft items to level up your professions
          </li>
          <li>
            • Higher profession levels unlock more advanced recipes
          </li>
        </ul>
      </div>

      {/* Craft Confirmation Modal */}
      {showCraftConfirm && selectedRecipe && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={() => setShowCraftConfirm(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="craft-confirm-title"
        >
          <div
            className="max-w-md rounded-lg bg-white p-6 dark:bg-gray-800"
            onClick={e => e.stopPropagation()}
          >
            <h2
              id="craft-confirm-title"
              className="mb-4 text-xl font-bold text-gray-900 dark:text-gray-100"
            >
              Confirm Crafting
            </h2>

            <div className="mb-4 space-y-3 border-t border-gray-200 pt-4 dark:border-gray-700">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Recipe
                </p>
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {selectedRecipe.name}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Result
                </p>
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {selectedRecipe.resultItemName}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Success Chance
                </p>
                <p className="font-semibold text-green-600 dark:text-green-400">
                  {(calculateSuccessChance(selectedRecipe) * 100).toFixed(1)}%
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Experience Reward
                </p>
                <p className="font-semibold text-blue-600 dark:text-blue-400">
                  +{selectedRecipe.experience} XP
                </p>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => {
                  craftMutation.mutate(selectedRecipe.id);
                }}
                disabled={
                  craftMutation.isPending || !canCraftRecipe(selectedRecipe)
                }
                className={`flex-1 rounded-lg px-4 py-2 font-semibold text-white transition-colors ${
                  canCraftRecipe(selectedRecipe)
                    ? 'bg-primary-600 hover:bg-primary-700'
                    : 'bg-gray-400 cursor-not-allowed'
                } ${craftMutation.isPending ? 'opacity-50' : ''}`}
              >
                {craftMutation.isPending ? 'Crafting...' : 'Craft'}
              </button>
              <button
                onClick={() => setShowCraftConfirm(false)}
                className="flex-1 rounded-lg bg-gray-200 px-4 py-2 font-semibold text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
