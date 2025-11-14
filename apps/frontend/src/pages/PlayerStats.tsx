interface PlayerStatsProps {
  player?: {
    level: number;
    currentXp: number;
    totalXpEarned: number;
    nextLevelXp: number;
    progressToNextLevel: number;
    baseStats: {
      strength: number;
      dexterity: number;
      constitution: number;
      intelligence: number;
      wisdom: number;
      charisma: number;
    };
    derivedStats: {
      health: number;
      maxHealth: number;
      mana: number;
      maxMana: number;
      attack: number;
      defense: number;
      critChance: number;
      dodgeChance: number;
    };
  };
}

export function PlayerStats({ player }: PlayerStatsProps) {
  if (!player) {
    return null;
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
      <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
        Character Stats
      </h2>

      <div className="space-y-6">
        {/* Level and XP Progress */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Level {player.level}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {player.currentXp} / {player.nextLevelXp} XP
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-primary-500 to-primary-600 h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${player.progressToNextLevel}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {player.progressToNextLevel.toFixed(1)}% to next level
          </p>
        </div>

        {/* Base Stats */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Base Stats
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <StatItem
              label="Strength"
              value={player.baseStats.strength}
              icon="💪"
            />
            <StatItem
              label="Dexterity"
              value={player.baseStats.dexterity}
              icon="🎯"
            />
            <StatItem
              label="Constitution"
              value={player.baseStats.constitution}
              icon="❤️"
            />
            <StatItem
              label="Intelligence"
              value={player.baseStats.intelligence}
              icon="🧠"
            />
            <StatItem
              label="Wisdom"
              value={player.baseStats.wisdom}
              icon="🔮"
            />
            <StatItem
              label="Charisma"
              value={player.baseStats.charisma}
              icon="✨"
            />
          </div>
        </div>

        {/* Derived Stats */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Combat Stats
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <StatItem
              label="Health"
              value={`${player.derivedStats.health}/${player.derivedStats.maxHealth}`}
            />
            <StatItem
              label="Mana"
              value={`${player.derivedStats.mana}/${player.derivedStats.maxMana}`}
            />
            <StatItem label="Attack" value={player.derivedStats.attack} />
            <StatItem label="Defense" value={player.derivedStats.defense} />
            <StatItem
              label="Crit Chance"
              value={`${(player.derivedStats.critChance * 100).toFixed(1)}%`}
            />
            <StatItem
              label="Dodge Chance"
              value={`${(player.derivedStats.dodgeChance * 100).toFixed(1)}%`}
            />
          </div>
        </div>

        {/* Total XP */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Total XP Earned:{' '}
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {player.totalXpEarned.toLocaleString()}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

interface StatItemProps {
  label: string;
  value: string | number;
  icon?: string;
}

function StatItem({ label, value, icon }: StatItemProps) {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-md">
      <span className="text-sm text-gray-600 dark:text-gray-400">
        {icon && <span className="mr-1">{icon}</span>}
        {label}
      </span>
      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        {value}
      </span>
    </div>
  );
}
