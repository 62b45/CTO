import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../lib/api';

type ProfessionType = 'worker' | 'crafter' | 'enchanter' | 'merchant' | 'lootboxer';

interface CraftingRecipe {
  id: string;
  name: string;
  resultItemId: string;
  resultItemName: string;
  profession: ProfessionType;
  minLevel: number;
  materials: Array<{
    itemId: string;
    itemName: string;
    quantity: number;
  }>;
  baseSuccessChance: number;
  experience: number;
}

interface CraftingResult {
  success: boolean;
  itemId: string;
  itemName: string;
  experienceGained: number;
  professionLevelUp?: number;
  message: string;
}

const PLAYER_ID = 'player-1';
const PROFESSIONS: ProfessionType[] = ['crafter', 'enchanter', 'worker'];

interface RecipesResponse {
  playerId: string;
  recipes: CraftingRecipe[];
}

interface CraftingResponse {
  playerId: string;
  craftingResult: CraftingResult;
  inventory?: {
    coins: number;
    gems: number;
    items: any[];
  };
}

export function CraftingPage() {
  const [selectedProfession, setSelectedProfession] = useState<
    ProfessionType | 'all'
  >('all');
  const [selectedRecipe, setSelectedRecipe] = useState<CraftingRecipe | null>(null);
  const [craftingFeedback, setCraftingFeedback] = useState<{
    type: 'success' | 'failure';
    message: string;
  } | null>(null);
  const queryClient = useQueryClient();

  const { data: recipesData, isLoading } = useQuery({
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
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            Loading recipes...
          </p>
        </div>
      </div>
    );
  }

  const recipes = recipesData?.recipes || [];

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
        >
          {craftingFeedback.message}
        </div>
      )}

      {/* Profession Filter */}
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
          >
            {profession === 'all' ? 'All Professions' : profession}
          </button>
        ))}
      </div>

      {/* Recipes Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {recipes.length === 0 ? (
          <div className="col-span-full rounded-lg border border-gray-200 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-800">
            <p className="text-gray-600 dark:text-gray-400">
              No recipes available for your current profession level.
            </p>
          </div>
        ) : (
          recipes.map(recipe => (
            <div
              key={recipe.id}
              className="rounded-lg border border-gray-200 bg-white p-4 transition-all hover:shadow-lg dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {recipe.name}
                </h3>
                <p className="text-sm text-primary-600 dark:text-primary-400">
                  {recipe.profession.charAt(0).toUpperCase() + recipe.profession.slice(1)}
                </p>
              </div>

              {/* Result Item */}
              <div className="mb-4 rounded-lg bg-primary-50 p-3 dark:bg-primary-900/20">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Result
                </p>
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {recipe.resultItemName}
                </p>
              </div>

              {/* Materials */}
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

              {/* Success Chance and XP */}
              <div className="mb-4 border-t border-gray-200 pt-3 dark:border-gray-700">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    Success Chance:
                  </span>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    {(recipe.baseSuccessChance * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="mt-2 flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    Experience:
                  </span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    +{recipe.experience} XP
                  </span>
                </div>
              </div>

              {/* Level Requirement */}
              <div className="mb-4 flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  Min Level:
                </span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {recipe.minLevel}
                </span>
              </div>

              <button
                onClick={() => {
                  setSelectedRecipe(recipe);
                  craftMutation.mutate(recipe.id);
                }}
                disabled={craftMutation.isPending && selectedRecipe?.id === recipe.id}
                className="w-full rounded-lg bg-primary-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
              >
                {craftMutation.isPending && selectedRecipe?.id === recipe.id
                  ? 'Crafting...'
                  : 'Craft'}
              </button>
            </div>
          ))
        )}
      </div>

      {/* Tips Section */}
      <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100">
          💡 Crafting Tips:
        </h3>
        <ul className="mt-2 space-y-1 text-sm text-blue-800 dark:text-blue-200">
          <li>• Higher profession levels increase success chance</li>
          <li>• Failed crafts still grant XP but consume materials</li>
          <li>• More complex recipes require higher profession levels</li>
          <li>• Gain XP even on failed attempts to level up faster</li>
        </ul>
      </div>
    </div>
  );
}
