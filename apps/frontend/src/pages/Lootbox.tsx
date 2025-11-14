import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi, API_BASE_URL } from '../lib/api';
import { useAppStore } from '../state/store';
import { Modal } from '../components/Modal';

const PLAYER_ID = 'player-1';
const LOOTBOX_COST = 100;

const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;

type ItemRarity = (typeof RARITY_ORDER)[number];

interface LootboxItem {
  itemId: string;
  name: string;
  rarity: ItemRarity;
  quantity: number;
}

interface LootboxResult {
  item: LootboxItem;
  rarity: ItemRarity;
  isPityDrop: boolean;
  pityCounterReset: boolean;
  animationDuration: number;
}

interface LootboxProbabilities {
  common: number;
  uncommon: number;
  rare: number;
  epic: number;
  legendary: number;
}

interface ProbabilitiesData {
  playerId: string;
  probabilities: LootboxProbabilities;
  pityCounter: number;
  pityThreshold: number;
}

interface InventoryOverview {
  coins: number;
  gems: number;
}

export function LootboxPage() {
  const queryClient = useQueryClient();
  const { settings } = useAppStore();
  const [isOpening, setIsOpening] = useState(false);
  const [lastResult, setLastResult] = useState<LootboxResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const animationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  const { data: probData, isLoading: probLoading } = useQuery({
    queryKey: ['lootbox-probabilities', PLAYER_ID],
    queryFn: async () => {
      const response = await fetchApi<ProbabilitiesData>(
        `/lootbox/probabilities/${PLAYER_ID}`
      );
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch probabilities');
      }
      return response.data;
    },
    refetchInterval: 5000,
  });

  const { data: inventoryData } = useQuery({
    queryKey: ['inventory-overview', PLAYER_ID],
    queryFn: async () => {
      const response = await fetchApi<{ inventory: InventoryOverview }>(
        `/players/${PLAYER_ID}/inventory?page=1&pageSize=1`
      );
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch inventory');
      }
      return response.data.inventory;
    },
    refetchInterval: 5000,
  });

  const openLootboxMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_BASE_URL}/lootbox/open/${PLAYER_ID}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lootboxId: 'standard-lootbox',
          cost: LOOTBOX_COST,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to open lootbox');
      }

      return data.data.result as LootboxResult;
    },
    onMutate: () => {
      setShowResult(false);
      setIsOpening(true);
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    },
    onSuccess: result => {
      setLastResult(result);
      const delay = settings.visualEffects ? result.animationDuration : 0;

      const finish = () => {
        setIsOpening(false);
        setShowResult(true);
        queryClient.invalidateQueries({ queryKey: ['lootbox-probabilities', PLAYER_ID] });
        queryClient.invalidateQueries({ queryKey: ['inventory-overview', PLAYER_ID] });
      };

      if (delay > 0) {
        animationTimeoutRef.current = setTimeout(finish, delay);
      } else {
        finish();
      }
    },
    onError: () => {
      setIsOpening(false);
    },
  });

  const getRarityColor = (rarity: ItemRarity) => {
    const colors: Record<ItemRarity, string> = {
      common: 'text-gray-600 dark:text-gray-400',
      uncommon: 'text-green-600 dark:text-green-400',
      rare: 'text-blue-600 dark:text-blue-400',
      epic: 'text-purple-600 dark:text-purple-400',
      legendary: 'text-yellow-600 dark:text-yellow-400',
    };
    return colors[rarity];
  };

  const getRarityBgColor = (rarity: ItemRarity) => {
    const colors: Record<ItemRarity, string> = {
      common: 'bg-gray-100 dark:bg-gray-800 border-gray-600',
      uncommon: 'bg-green-50 dark:bg-green-900 border-green-600',
      rare: 'bg-blue-50 dark:bg-blue-900 border-blue-600',
      epic: 'bg-purple-50 dark:bg-purple-900 border-purple-600',
      legendary: 'bg-yellow-50 dark:bg-yellow-900 border-yellow-600',
    };
    return colors[rarity];
  };

  const getRarityBarColor = (rarity: ItemRarity) => {
    const colors: Record<ItemRarity, string> = {
      common: 'from-gray-400 to-gray-500',
      uncommon: 'from-green-400 to-green-500',
      rare: 'from-blue-400 to-blue-600',
      epic: 'from-purple-400 to-purple-600',
      legendary: 'from-yellow-400 to-orange-500',
    };
    return colors[rarity];
  };

  const handleOpenLootbox = () => {
    if (!inventoryData || inventoryData.coins < LOOTBOX_COST || openLootboxMutation.isPending) {
      return;
    }
    openLootboxMutation.mutate();
  };

  const closeResultModal = () => {
    setShowResult(false);
    setLastResult(null);
  };

  const pityProgress = probData
    ? (probData.pityCounter / probData.pityThreshold) * 100
    : 0;
  const isAtPityThreshold = probData && probData.pityCounter >= probData.pityThreshold;

  if (probLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading lootbox...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">Lootbox</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Open lootboxes to earn rare items and materials.
        </p>
      </header>

      <div className="rounded-lg bg-yellow-50 p-4 dark:bg-yellow-900/20">
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Available Coins</p>
        <p className="mt-1 text-2xl font-bold text-yellow-600 dark:text-yellow-400">
          {inventoryData?.coins.toLocaleString() ?? '0'}
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Pity Tracker</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Opens since last rare+ drop:{' '}
          <span className="font-bold">{probData?.pityCounter ?? 0}</span> /{' '}
          {probData?.pityThreshold ?? 40}
        </p>
        <div className="mt-4">
          <div
            className="relative h-6 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
            role="progressbar"
            aria-valuenow={probData?.pityCounter ?? 0}
            aria-valuemin={0}
            aria-valuemax={probData?.pityThreshold ?? 40}
            aria-label="Pity counter progress"
          >
            <div
              className={`h-full transition-all duration-300 ${
                isAtPityThreshold
                  ? 'bg-gradient-to-r from-purple-500 to-yellow-500'
                  : 'bg-gradient-to-r from-blue-500 to-purple-500'
              }`}
              style={{ width: `${Math.min(pityProgress, 100)}%` }}
            />
          </div>
          {isAtPityThreshold && (
            <p className="mt-2 text-sm font-bold text-purple-600 dark:text-purple-400">
              🎉 Guaranteed rare or better on next open!
            </p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Drop Rates</h2>
        <div className="mt-4 space-y-3">
          {probData &&
            RARITY_ORDER.map(rarity => (
              <div key={rarity} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className={`font-medium capitalize ${getRarityColor(rarity)}`}>
                    {rarity}
                  </span>
                  <span className="text-sm text-gray-900 dark:text-gray-100">
                    {probData.probabilities[rarity].toFixed(2)}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                  <div
                    className={`h-full bg-gradient-to-r ${getRarityBarColor(rarity)}`}
                    style={{ width: `${probData.probabilities[rarity]}%` }}
                    aria-hidden="true"
                  />
                </div>
              </div>
            ))}
        </div>
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          Rates improve with Lootboxer profession level.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
        {isOpening ? (
          <div className="space-y-4" aria-live="polite">
            <div
              className={`mx-auto h-32 w-32 rounded-lg ${
                settings.visualEffects
                  ? 'animate-pulse bg-gradient-to-r from-purple-500 via-pink-500 to-yellow-500'
                  : 'bg-gray-500'
              }`}
              role="status"
              aria-label="Opening lootbox"
            />
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">Opening Lootbox...</p>
          </div>
        ) : (
          <div>
            <div className="mx-auto mb-6 h-32 w-32 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Standard Lootbox</h3>
            <p className="mt-2 text-gray-600 dark:text-gray-300">Cost: {LOOTBOX_COST} coins</p>
            <button
              onClick={handleOpenLootbox}
              disabled={
                openLootboxMutation.isPending ||
                !inventoryData ||
                inventoryData.coins < LOOTBOX_COST
              }
              className="mt-6 rounded-lg bg-primary-600 px-8 py-3 font-semibold text-white shadow-sm hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              {!inventoryData || inventoryData.coins < LOOTBOX_COST
                ? 'Insufficient Coins'
                : 'Open Lootbox'}
            </button>
            {openLootboxMutation.isError && (
              <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
                Error: {openLootboxMutation.error?.message}
              </p>
            )}
          </div>
        )}
      </div>

      {showResult && lastResult && (
        <Modal isOpen={showResult} onClose={closeResultModal} title="Lootbox Rewards">
          <div className={`rounded-lg border-l-4 p-4 ${getRarityBgColor(lastResult.rarity)}`}>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {lastResult.item.name}
              </h2>
              <p className={`mt-2 text-lg font-bold uppercase ${getRarityColor(lastResult.rarity)}`}>
                {lastResult.rarity}
              </p>
              {lastResult.isPityDrop && (
                <p className="mt-2 text-sm font-bold text-purple-600 dark:text-purple-400">
                  🎉 Pity Drop!
                </p>
              )}
            </div>

            <div className="mt-4 space-y-3 border-t border-gray-200 pt-4 dark:border-gray-700">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Quantity:</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  ×{lastResult.item.quantity}
                </span>
              </div>
              {lastResult.pityCounterReset && (
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  Pity counter has been reset.
                </p>
              )}
            </div>

            <button
              onClick={closeResultModal}
              className="mt-6 w-full rounded-lg bg-primary-600 px-4 py-2 font-semibold text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              Collect
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
