import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../lib/api';
import { ItemDetailModal } from '../components/ItemDetailModal';
import { EquipmentPreview } from '../components/EquipmentPreview';
import type { InventoryItem, EquippedItem } from '@shared';

type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
type ItemType = 'weapon' | 'armor' | 'accessory' | 'material' | 'consumable';

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

interface EquipmentResponse {
  playerId: string;
  equipped: Record<string, EquippedItem | null>;
  totalBonuses: Record<string, number>;
}

const PLAYER_ID = 'player-1';
const RARITIES: ItemRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
const ITEM_TYPES: ItemType[] = ['weapon', 'armor', 'accessory', 'material', 'consumable'];

const ITEM_TYPE_MAP: Record<ItemType, string[]> = {
  weapon: ['sword', 'axe', 'bow', 'staff', 'weapon'],
  armor: ['armor', 'plate', 'leather', 'robe'],
  accessory: ['ring', 'amulet', 'pendant', 'accessory'],
  material: ['ore', 'ingot', 'essence', 'stone', 'material', 'scrap', 'gemstone'],
  consumable: ['potion', 'scroll', 'herb'],
};

function getItemType(itemName: string): ItemType {
  const lowerName = itemName.toLowerCase();
  for (const [type, keywords] of Object.entries(ITEM_TYPE_MAP)) {
    if (keywords.some(keyword => lowerName.includes(keyword))) {
      return type as ItemType;
    }
  }
  return 'material';
}

export function InventoryPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [selectedRarity, setSelectedRarity] = useState<ItemRarity | 'all'>('all');
  const [selectedType, setSelectedType] = useState<ItemType | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [equipmentError, setEquipmentError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: inventoryData, isLoading: inventoryLoading } = useQuery({
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

  const { data: equipmentData, isLoading: equipmentLoading } = useQuery({
    queryKey: ['equipment', PLAYER_ID],
    queryFn: async () => {
      const response = await fetchApi<EquipmentResponse>(
        `/players/${PLAYER_ID}/equipment`
      );
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch equipment');
      }
      return response.data;
    },
    refetchInterval: 5000,
  });

  const equipMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const response = await fetch(
        `http://localhost:3001/players/${PLAYER_ID}/equip/${itemId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slot: 'WEAPON' }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to equip item');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      setSelectedItem(null);
      setEquipmentError(null);
    },
    onError: (error: Error) => {
      setEquipmentError(error.message);
    },
  });

  const unequipMutation = useMutation({
    mutationFn: async (slot: string) => {
      const response = await fetch(
        `http://localhost:3001/players/${PLAYER_ID}/unequip/${slot}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to unequip item');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      setEquipmentError(null);
    },
    onError: (error: Error) => {
      setEquipmentError(error.message);
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
      common: 'bg-gray-100 dark:bg-gray-800',
      uncommon: 'bg-green-50 dark:bg-green-900',
      rare: 'bg-blue-50 dark:bg-blue-900',
      epic: 'bg-purple-50 dark:bg-purple-900',
      legendary: 'bg-yellow-50 dark:bg-yellow-900',
    };
    return colors[rarity];
  };

  const getRarityBorderColor = (rarity: ItemRarity) => {
    const colors: Record<ItemRarity, string> = {
      common: 'border-l-gray-600',
      uncommon: 'border-l-green-600',
      rare: 'border-l-blue-600',
      epic: 'border-l-purple-600',
      legendary: 'border-l-yellow-600',
    };
    return colors[rarity];
  };

  const inventory = inventoryData?.inventory;
  const items = useMemo(() => {
    let filtered = inventory?.items || [];

    if (selectedRarity !== 'all') {
      filtered = filtered.filter(item => item.rarity === selectedRarity);
    }

    if (selectedType !== 'all') {
      filtered = filtered.filter(item => getItemType(item.name) === selectedType);
    }

    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [inventory?.items, selectedRarity, selectedType, searchTerm]);

  const pagination = inventory?.pagination;
  const isLoading = inventoryLoading || equipmentLoading;

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

      {/* Error Message */}
      {equipmentError && (
        <div className="rounded-lg bg-red-100 p-4 text-red-800 dark:bg-red-900/30 dark:text-red-300">
          {equipmentError}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Inventory */}
        <div className="lg:col-span-2 space-y-6">
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
                Unique Items
              </p>
              <p className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">
                {items.length}
              </p>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-gray-200 px-4 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                aria-label="Search items"
              />
            </div>

            {/* Rarity Filter */}
            <div>
              <p className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                Filter by Rarity:
              </p>
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
                    aria-pressed={selectedRarity === rarity}
                  >
                    {rarity === 'all'
                      ? 'All Rarities'
                      : rarity.charAt(0).toUpperCase() + rarity.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Type Filter */}
            <div>
              <p className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                Filter by Type:
              </p>
              <div className="flex flex-wrap gap-2">
                {(['all', ...ITEM_TYPES] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => {
                      setSelectedType(type);
                      setPage(1);
                    }}
                    className={`rounded-full px-4 py-2 font-medium transition-colors ${
                      selectedType === type
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                    }`}
                    aria-pressed={selectedType === type}
                  >
                    {type === 'all'
                      ? 'All Types'
                      : type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Items Grid */}
          <div className="space-y-2">
            {items.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-800">
                <p className="text-gray-600 dark:text-gray-400">
                  {searchTerm || selectedType !== 'all' || selectedRarity !== 'all'
                    ? 'No items match your filters.'
                    : 'No items in inventory.'}
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map(item => (
                  <button
                    key={item.itemId}
                    onClick={() => setSelectedItem(item)}
                    className={`rounded-lg p-4 text-left transition-all hover:shadow-lg border-l-4 ${getRarityBgColor(item.rarity)} ${getRarityBorderColor(item.rarity)}`}
                    aria-label={`View ${item.name} details`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          {item.name}
                        </h3>
                        <p
                          className={`text-sm font-medium ${getRarityColor(item.rarity)}`}
                        >
                          {item.rarity.charAt(0).toUpperCase() +
                            item.rarity.slice(1)}
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
                className="rounded bg-gray-200 px-4 py-2 disabled:opacity-50 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                aria-label="Previous page"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Page {page} of {pagination.totalPages} ({pagination.total} items)
              </span>
              <button
                onClick={() =>
                  setPage(Math.min(pagination.totalPages, page + 1))
                }
                disabled={page === pagination.totalPages}
                className="rounded bg-gray-200 px-4 py-2 disabled:opacity-50 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                aria-label="Next page"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Equipment Preview Sidebar */}
        <div className="lg:col-span-1">
          {equipmentData && (
            <EquipmentPreview
              equipped={equipmentData.equipped}
              onUnequip={(slot) => unequipMutation.mutate(slot)}
              totalBonuses={equipmentData.totalBonuses}
            />
          )}
        </div>
      </div>

      {/* Item Detail Modal */}
      <ItemDetailModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onEquip={(itemId) => equipMutation.mutate(itemId)}
        isEquipping={equipMutation.isPending}
      />
    </div>
  );
}
