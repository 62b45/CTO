import { useState, useEffect } from 'react';

interface CooldownData {
  action: string;
  metadata: {
    type: string;
    label: string;
    description: string;
    cooldownMs: number;
    category: string;
  };
  cooldown: {
    lastTriggeredAt: string;
    availableAt: string;
    remainingMs: number;
  } | null;
  isActive: boolean;
}

interface CooldownGridProps {
  cooldowns: CooldownData[];
  onActionTrigger: (action: string) => void;
  isTriggering: boolean;
  error?: string;
}

export function CooldownGrid({
  cooldowns,
  onActionTrigger,
  isTriggering,
  error,
}: CooldownGridProps) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Actions
        </h2>
        {error && (
          <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cooldowns.map(cooldown => (
          <CooldownCard
            key={cooldown.action}
            cooldown={cooldown}
            onTrigger={() => onActionTrigger(cooldown.action)}
            disabled={isTriggering || cooldown.isActive}
          />
        ))}
      </div>
    </div>
  );
}

interface CooldownCardProps {
  cooldown: CooldownData;
  onTrigger: () => void;
  disabled: boolean;
}

function CooldownCard({ cooldown, onTrigger, disabled }: CooldownCardProps) {
  const [remainingMs, setRemainingMs] = useState(
    cooldown.cooldown?.remainingMs || 0
  );
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    setRemainingMs(cooldown.cooldown?.remainingMs || 0);
  }, [cooldown.cooldown?.remainingMs]);

  useEffect(() => {
    if (remainingMs <= 0) return;

    const interval = setInterval(() => {
      setRemainingMs(prev => Math.max(0, prev - 100));
    }, 100);

    return () => clearInterval(interval);
  }, [remainingMs]);

  const handleTrigger = () => {
    onTrigger();
    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), 1000);
  };

  const isOnCooldown = remainingMs > 0;
  const progress = cooldown.cooldown
    ? ((cooldown.metadata.cooldownMs - remainingMs) /
        cooldown.metadata.cooldownMs) *
      100
    : 100;

  const categoryColors = {
    gathering: 'bg-green-500',
    combat: 'bg-red-500',
    support: 'bg-blue-500',
    progression: 'bg-purple-500',
    misc: 'bg-gray-500',
  };

  const categoryColor =
    categoryColors[cooldown.metadata.category as keyof typeof categoryColors] ||
    categoryColors.misc;

  return (
    <div
      className={`relative overflow-hidden rounded-lg border p-4 transition-all duration-300 ${
        isSuccess
          ? 'border-green-500 bg-green-50 dark:bg-green-900/20 scale-105'
          : isOnCooldown
            ? 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md'
      }`}
    >
      {/* Progress bar at the bottom */}
      {isOnCooldown && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700">
          <div
            className={`h-full ${categoryColor} transition-all duration-100 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {cooldown.metadata.label}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {cooldown.metadata.description}
          </p>
        </div>
        <span
          className={`ml-2 px-2 py-1 text-xs rounded-full ${categoryColor} text-white`}
        >
          {cooldown.metadata.category}
        </span>
      </div>

      {isOnCooldown && (
        <div className="mb-3">
          <p className="text-sm font-mono text-gray-700 dark:text-gray-300">
            {formatTime(remainingMs)}
          </p>
        </div>
      )}

      <button
        onClick={handleTrigger}
        disabled={disabled}
        className={`w-full px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${
          isSuccess
            ? 'bg-green-600 text-white'
            : disabled
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              : 'bg-primary-600 text-white hover:bg-primary-700 active:scale-95'
        }`}
      >
        {isSuccess
          ? '✓ Success!'
          : isOnCooldown
            ? 'On Cooldown'
            : 'Execute Action'}
      </button>
    </div>
  );
}

function formatTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}
