import type { ProfessionType } from '@shared';

interface ProfessionProgressBarProps {
  profession: ProfessionType;
  level: number;
  currentXp: number;
  nextLevelXp: number;
}

const PROFESSION_COLORS: Record<ProfessionType, string> = {
  worker: 'bg-orange-500',
  crafter: 'bg-blue-500',
  enchanter: 'bg-purple-500',
  merchant: 'bg-green-500',
  lootboxer: 'bg-red-500',
};

const PROFESSION_BG_COLORS: Record<ProfessionType, string> = {
  worker: 'bg-orange-50 dark:bg-orange-900/20',
  crafter: 'bg-blue-50 dark:bg-blue-900/20',
  enchanter: 'bg-purple-50 dark:bg-purple-900/20',
  merchant: 'bg-green-50 dark:bg-green-900/20',
  lootboxer: 'bg-red-50 dark:bg-red-900/20',
};

export function ProfessionProgressBar({
  profession,
  level,
  currentXp,
  nextLevelXp,
}: ProfessionProgressBarProps) {
  const progress = nextLevelXp > 0 ? (currentXp / nextLevelXp) * 100 : 0;

  return (
    <div
      className={`rounded-lg p-4 ${PROFESSION_BG_COLORS[profession]}`}
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold capitalize text-gray-900 dark:text-gray-100">
          {profession}
        </h3>
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
          Level {level}
        </span>
      </div>
      <div className="mb-1 flex justify-between text-xs text-gray-600 dark:text-gray-400">
        <span>{currentXp} XP</span>
        <span>{nextLevelXp} XP</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-300 dark:bg-gray-700">
        <div
          className={`h-full ${PROFESSION_COLORS[profession]} transition-all duration-300`}
          style={{ width: `${Math.min(progress, 100)}%` }}
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${profession} profession progress`}
        />
      </div>
    </div>
  );
}
