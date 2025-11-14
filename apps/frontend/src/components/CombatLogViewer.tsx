import type { CombatAction } from '@shared';

export interface SerializedCombatLogEntry {
  turn: number;
  timestamp: string;
  action: CombatAction;
  description: string;
  remainingHealth: Record<string, number>;
}

interface CombatLogViewerProps {
  logs: SerializedCombatLogEntry[];
  className?: string;
  emptyMessage?: string;
}

function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function CombatLogViewer({ logs, className, emptyMessage }: CombatLogViewerProps) {
  if (!logs || logs.length === 0) {
    return (
      <div
        className={`rounded-lg border border-dashed border-gray-300 bg-white p-4 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 ${className ?? ''}`}
      >
        {emptyMessage ?? 'No combat log entries yet. Resolve encounters to see the action unfold.'}
      </div>
    );
  }

  const sortedLogs = [...logs].sort((a, b) => {
    if (a.turn !== b.turn) {
      return a.turn - b.turn;
    }
    const aTime = new Date(a.timestamp).getTime();
    const bTime = new Date(b.timestamp).getTime();
    return aTime - bTime;
  });

  return (
    <div className={`space-y-3 ${className ?? ''}`}>
      {sortedLogs.map((log, index) => (
        <div
          key={`${log.turn}-${log.timestamp}-${index}`}
          className="animate-fade-in-up rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
        >
          <div className="mb-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span className="font-semibold text-primary-600 dark:text-primary-300">
              Turn {log.turn}
            </span>
            <span>{formatTimestamp(log.timestamp)}</span>
          </div>

          <p className="text-sm text-gray-700 dark:text-gray-200">{log.description}</p>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-primary-100 px-2 py-1 font-semibold uppercase tracking-wide text-primary-700 dark:bg-primary-900/40 dark:text-primary-200">
              {log.action.type}
            </span>
            {typeof log.action.damage === 'number' && (
              <span className="rounded-full bg-red-100 px-2 py-1 font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
                −{Math.round(log.action.damage)} HP
              </span>
            )}
            {typeof log.action.roll === 'number' && (
              <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                Roll: {log.action.roll.toFixed(1)}
              </span>
            )}
            {typeof log.action.variance === 'number' && (
              <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                Variance: {log.action.variance.toFixed(2)}
              </span>
            )}
          </div>

          {Object.keys(log.remainingHealth).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {Object.entries(log.remainingHealth).map(([entityId, hp]) => (
                <span
                  key={`${entityId}-${hp}`}
                  className="rounded bg-gray-100 px-2 py-1 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                >
                  {entityId}: <span className="font-semibold text-gray-700 dark:text-gray-100">{hp}</span> HP
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
