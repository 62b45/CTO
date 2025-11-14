import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../lib/api';

type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

interface InventoryItem {
  itemId: string;
  name: string;
  rarity: ItemRarity;
  value: number;
  quantity: number;
  professionAffinity?: string;
}

const PLAYER_ID = 'player-1';
const RARITIES: ItemRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

interface InventoryResponse {
  playerId: string;
  inventory: {
    coins: number;
    gems: number;
    items: InventoryItem[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  };
}

export function InventoryPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [selectedRarity, setSelectedRarity] = useState<ItemRarity | 'all'>('all');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const { data: inventoryData, isLoading } = useQuery({
    queryKey: ['inventory', PLAYER_ID, page, selectedRarity],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      if (selectedRarity !== 'all') {
        params.append('rarity', selectedRarity);
      }
      const response = await fetchApi<InventoryResponse>(
        `/players/${PLAYER_ID}/inventory?${params}`
      );
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch inventory');
      }
      return response.data;
    },
    refetchInterval: 5000,
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
      common: 'bg-gray-100 dark:bg-gray-800',
      uncommon: 'bg-green-50 dark:bg-green-900',
      rare: 'bg-blue-50 dark:bg-blue-900',
      epic: 'bg-purple-50 dark:bg-purple-900',
      legendary: 'bg-yellow-50 dark:bg-yellow-900',
    };
    return colors[rarity];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            Loading inventory...
          </p>
        </div>
      </div>
    );
  }

  const inventory = inventoryData?.inventory;
  const items = inventory?.items || [];
  const pagination = inventory?.pagination;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">
          Inventory
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Manage your items, equipment, and resources.
        </p>
      </header>

      {/* Currency Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg bg-yellow-50 p-4 dark:bg-yellow-900/20">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Coins
          </p>
          <p className="mt-1 text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {inventory?.coins.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg bg-purple-50 p-4 dark:bg-purple-900/20">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Gems
          </p>
          <p className="mt-1 text-2xl font-bold text-purple-600 dark:text-purple-400">
            {inventory?.gems.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Total Items
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
            {pagination?.total}
          </p>
        </div>
        <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Rarity Filter
          </p>
          <p className="mt-1 text-sm font-semibold text-blue-600 dark:text-blue-400">
            {selectedRarity === 'all' ? 'All' : selectedRarity}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(['all', ...RARITIES] as const).map(rarity => (
          <button
            key={rarity}
            onClick={() => {
              setSelectedRarity(rarity);
              setPage(1);
            }}
            className={`rounded-full px-4 py-2 font-medium transition-colors ${
              selectedRarity === rarity
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {rarity === 'all' ? 'All Items' : rarity.charAt(0).toUpperCase() + rarity.slice(1)}
          </button>
        ))}
      </div>

      {/* Items Grid */}
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-800">
            <p className="text-gray-600 dark:text-gray-400">
              No items found in this category.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map(item => (
              <button
                key={item.itemId}
                onClick={() => setSelectedItem(item)}
                className={`rounded-lg p-4 text-left transition-all hover:shadow-lg ${getRarityBgColor(item.rarity)} border-l-4 ${
                  {
                    common: 'border-l-gray-600',
                    uncommon: 'border-l-green-600',
                    rare: 'border-l-blue-600',
                    epic: 'border-l-purple-600',
                    legendary: 'border-l-yellow-600',
                  }[item.rarity]
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                      {item.name}
                    </h3>
                    <p className={`text-sm font-medium ${getRarityColor(item.rarity)}`}>
                      {item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white bg-opacity-50 px-3 py-1 text-right dark:bg-opacity-20">
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      ×{item.quantity}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="rounded bg-gray-200 px-4 py-2 disabled:opacity-50 dark:bg-gray-700"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {page} of {pagination.totalPages} ({pagination.total} items)
          </span>
          <button
            onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
            disabled={page === pagination.totalPages}
            className="rounded bg-gray-200 px-4 py-2 disabled:opacity-50 dark:bg-gray-700"
          >
            Next
          </button>
        </div>
      )}

      {/* Item Detail Modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="max-w-md rounded-lg bg-white p-6 dark:bg-gray-800"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {selectedItem.name}
                </h2>
                <p
                  className={`text-sm font-medium ${getRarityColor(selectedItem.rarity)}`}
                >
                  {selectedItem.rarity.toUpperCase()}
                </p>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 border-t border-gray-200 pt-4 dark:border-gray-700">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Quantity:</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {selectedItem.quantity}
                </span>
              </div>
              {selectedItem.professionAffinity && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Profession:
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {selectedItem.professionAffinity}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Value:</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {selectedItem.value} coins
                </span>
              </div>
            </div>

            <button
              onClick={() => setSelectedItem(null)}
              className="mt-6 w-full rounded-lg bg-primary-600 px-4 py-2 font-semibold text-white hover:bg-primary-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
