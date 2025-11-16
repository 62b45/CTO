import type { InventoryItem } from '@shared';

type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

interface ItemDetailModalProps {
  item: InventoryItem | null;
  onClose: () => void;
  onEquip?: (itemId: string) => void;
  isEquipping?: boolean;
}

export function ItemDetailModal({
  item,
  onClose,
  onEquip,
  isEquipping = false,
}: ItemDetailModalProps) {
  if (!item) return null;

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="item-detail-title"
    >
      <div
        className={`max-w-md rounded-lg bg-white p-6 dark:bg-gray-800 border-l-4 ${getRarityBorderColor(item.rarity)}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div className="flex-1">
            <h2
              id="item-detail-title"
              className="text-2xl font-bold text-gray-900 dark:text-gray-100"
            >
              {item.name}
            </h2>
            <p
              className={`text-sm font-medium ${getRarityColor(item.rarity)}`}
            >
              {item.rarity.toUpperCase()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <div className={`mb-4 rounded-lg p-3 ${getRarityBgColor(item.rarity)}`}>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Quantity
              </p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                ×{item.quantity}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Value
              </p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {item.value}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3 border-t border-gray-200 pt-4 dark:border-gray-700">
          {item.professionAffinity && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">
                Profession Affinity:
              </span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {item.professionAffinity}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">
              Item ID:
            </span>
            <span className="font-mono text-xs text-gray-900 dark:text-gray-100">
              {item.itemId}
            </span>
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          {onEquip && (
            <button
              onClick={() => {
                onEquip(item.itemId);
              }}
              disabled={isEquipping}
              className="flex-1 rounded-lg bg-primary-600 px-4 py-2 font-semibold text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label={`Equip ${item.name}`}
            >
              {isEquipping ? 'Equipping...' : 'Equip'}
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 rounded-lg bg-gray-200 px-4 py-2 font-semibold text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
