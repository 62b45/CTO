import type { EquippedItem } from '@shared';

interface EquipmentPreviewProps {
  equipped: Record<string, EquippedItem | null>;
  onUnequip: (slot: string) => void;
  totalBonuses: Record<string, number>;
}

export function EquipmentPreview({
  equipped,
  onUnequip,
  totalBonuses,
}: EquipmentPreviewProps) {
  const slots = ['WEAPON', 'ARMOR', 'ACCESSORY_1', 'ACCESSORY_2', 'ACCESSORY_3'];

  const calculateStats = () => {
    const baseStats = {
      ATK: 10,
      DEF: 5,
      HP: 100,
    };

    return {
      ATK: baseStats.ATK + (totalBonuses.ATK || 0),
      DEF: baseStats.DEF + (totalBonuses.DEF || 0),
      HP: baseStats.HP + (totalBonuses.HP || 0),
    };
  };

  const stats = calculateStats();

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
        Equipment & Stats
      </h2>

      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
            Attack Power
          </p>
          <p className="mt-2 text-2xl font-bold text-red-600 dark:text-red-400">
            {stats.ATK}
          </p>
        </div>
        <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
            Defense Power
          </p>
          <p className="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-400">
            {stats.DEF}
          </p>
        </div>
        <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
            Hit Points
          </p>
          <p className="mt-2 text-2xl font-bold text-green-600 dark:text-green-400">
            {stats.HP}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {slots.map(slot => (
          <div
            key={slot}
            className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-700"
          >
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {slot.replace(/_/g, ' ')}
              </p>
              {equipped[slot] ? (
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {equipped[slot]?.name}
                </p>
              ) : (
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Empty
                </p>
              )}
            </div>
            {equipped[slot] && (
              <button
                onClick={() => onUnequip(slot)}
                className="rounded bg-red-500 px-3 py-1 text-sm font-medium text-white hover:bg-red-600"
                aria-label={`Unequip from ${slot}`}
              >
                Unequip
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
