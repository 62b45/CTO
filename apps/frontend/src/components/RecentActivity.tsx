interface ActivityEntry {
  action: string;
  timestamp: string;
  data: {
    result?: {
      summary?: string;
      experience?: number;
      rewards?: string[];
    };
  };
}

interface RecentActivityProps {
  activity: ActivityEntry[];
}

export function RecentActivity({ activity }: RecentActivityProps) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
      <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
        Recent Activity
      </h2>

      {activity.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            No recent activity to display.
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-2">
            Execute actions to see them here.
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {activity.map((entry, index) => (
            <ActivityCard key={`${entry.timestamp}-${index}`} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}

interface ActivityCardProps {
  entry: ActivityEntry;
}

function ActivityCard({ entry }: ActivityCardProps) {
  const timestamp = new Date(entry.timestamp);
  const timeAgo = formatTimeAgo(timestamp);
  const result = entry.data.result;

  const actionLabels: Record<string, string> = {
    hunt: '🏹 Hunt',
    adventure: '🗺️ Adventure',
    gather_herbs: '🌿 Gather Herbs',
    gather_ore: '⛏️ Gather Ore',
    gather_wood: '🪓 Gather Wood',
    craft: '🔨 Craft',
    lootbox: '📦 Lootbox',
    quest: '📜 Quest',
    dungeon: '🏰 Dungeon',
    heal: '💚 Heal',
    arena: '⚔️ Arena',
  };

  const actionLabel = actionLabels[entry.action] || entry.action;

  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {actionLabel}
        </h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {timeAgo}
        </span>
      </div>

      {result?.summary && (
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
          {result.summary}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {result?.experience && result.experience > 0 && (
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded">
            +{result.experience} XP
          </span>
        )}

        {result?.rewards && result.rewards.length > 0 && (
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">
            {result.rewards.length} reward
            {result.rewards.length > 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'just now';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  return `${diffDays}d ago`;
}
