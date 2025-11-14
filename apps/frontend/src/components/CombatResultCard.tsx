import { useMemo } from 'react';
import { CombatLogViewer, SerializedCombatLogEntry } from './CombatLogViewer';

export interface SerializedCombatResult {
  winner: string;
  loser: string;
  turns: number;
  rewards: {
    experience: number;
    gold: number;
    items: string[];
  };
  logs: SerializedCombatLogEntry[];
}

interface CombatResultCardProps {
  result: SerializedCombatResult;
  perspectiveId?: string;
  title?: string;
  className?: string;
  showLogs?: boolean;
}

function outcomeFromPerspective(result: SerializedCombatResult, perspectiveId?: string) {
  if (!perspectiveId) {
    return result.winner ? `Winner: ${result.winner}` : 'Combat Result';
  }
  const isVictory = result.winner === perspectiveId;
  return isVictory ? 'Victory' : 'Defeat';
}

function outcomeVariant(result: SerializedCombatResult, perspectiveId?: string) {
  if (!perspectiveId) {
    return 'neutral';
  }
  return result.winner === perspectiveId ? 'victory' : 'defeat';
}

export function CombatResultCard({
  result,
  perspectiveId,
  title,
  className,
  showLogs = true,
}: CombatResultCardProps) {
  const variant = outcomeVariant(result, perspectiveId);
  const headline = outcomeFromPerspective(result, perspectiveId);

  const highlightClasses = useMemo(() => {
    switch (variant) {
      case 'victory':
        return 'border-emerald-300 bg-gradient-to-br from-emerald-500/10 to-emerald-500/0';
      case 'defeat':
        return 'border-rose-300 bg-gradient-to-br from-rose-500/10 to-rose-500/0';
      default:
        return 'border-primary-200 bg-gradient-to-br from-primary-500/8 to-primary-500/0';
    }
  }, [variant]);

  const rewardBadges = [
    {
      label: '+XP',
      value: result.rewards.experience.toLocaleString(),
      color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200',
      hidden: result.rewards.experience <= 0,
    },
    {
      label: '+Gold',
      value: result.rewards.gold.toLocaleString(),
      color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
      hidden: result.rewards.gold <= 0,
    },
    {
      label: 'Loot',
      value: result.rewards.items.length > 0 ? result.rewards.items.join(', ') : 'None',
      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
      hidden: false,
    },
  ];

  return (
    <section
      className={`animate-scale-in overflow-hidden rounded-xl border shadow-sm transition-shadow hover:shadow-lg dark:border-gray-700 dark:bg-gray-900 ${highlightClasses} ${className ?? ''}`}
    >
      <div className="border-b border-white/40 bg-white/60 px-5 py-4 backdrop-blur dark:border-gray-700/60 dark:bg-gray-900/70">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {title && (
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {title}
              </p>
            )}
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {headline}
            </h3>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
            <span className="rounded-full bg-gray-100 px-3 py-1 font-medium dark:bg-gray-800">
              Turns: {result.turns}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4 px-5 py-4">
        <div className="flex flex-wrap gap-2">
          {rewardBadges
            .filter(badge => !badge.hidden)
            .map(badge => (
              <span
                key={badge.label}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${badge.color}`}
              >
                {badge.label}: {badge.value}
              </span>
            ))}
        </div>

        {showLogs && (
          <CombatLogViewer
            logs={result.logs}
            emptyMessage="No actions were recorded for this combat encounter."
          />
        )}
      </div>
    </section>
  );
}
