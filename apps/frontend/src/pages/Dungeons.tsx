import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  Combatant,
  DungeonDefinition,
  DungeonFloor,
  DungeonReward,
} from '@shared';
import { API_BASE_URL, fetchApi } from '../lib/api';
import { CombatResultCard, SerializedCombatResult } from '../components/CombatResultCard';

const PLAYER_ID = 'player-1';

interface SerializedDungeonRunState {
  dungeonId: string;
  status: 'in_progress' | 'completed';
  currentFloor: number;
  currentBossPhase: number | null;
  floorsCleared: number[];
  accumulatedRewards: {
    experience: number;
    gold: number;
    items: string[];
  };
  startedAt: string | null;
  updatedAt: string | null;
  lastOutcome: 'win' | 'loss' | null;
}

interface SerializedDungeonProgress {
  dungeonId: string;
  highestFloorReached: number;
  timesCompleted: number;
  lastCompletedAt: string | null;
  lastResetAt: string | null;
  activeRun: SerializedDungeonRunState | null;
}

interface DungeonSummary {
  definition: DungeonDefinition;
  progress: SerializedDungeonProgress;
  unlocked: boolean;
}

interface DungeonListResponse {
  success: boolean;
  data: DungeonSummary[];
}

interface EnterDungeonPayload {
  run: SerializedDungeonRunState | null;
  progress: SerializedDungeonProgress | null;
}

interface EnterDungeonResponse {
  success: boolean;
  data: EnterDungeonPayload;
  message?: string;
}

interface EnterFloorPayload {
  floor: DungeonFloor;
  run: SerializedDungeonRunState | null;
  playerCombatant: Combatant;
}

interface EnterFloorResponse {
  success: boolean;
  data: EnterFloorPayload;
  message?: string;
}

interface ResolveFloorPayload {
  outcome: 'win' | 'loss';
  floor: number;
  rewardsEarned: {
    experience: number;
    gold: number;
    items: string[];
  };
  accumulatedRewards: {
    experience: number;
    gold: number;
    items: string[];
  };
  drops: string[];
  nextFloor: number | null;
  bossPhase: number | null;
  completed: boolean;
  run: SerializedDungeonRunState | null;
  combats: SerializedCombatResult[];
}

interface ResolveFloorResponse {
  success: boolean;
  data: ResolveFloorPayload;
  message?: string;
}

type EncounterPreview = EnterFloorPayload & { capturedAt: string };
type TrackedResolution = ResolveFloorPayload & { resolvedAt: string };

type FloorState = 'cleared' | 'current' | 'upcoming' | 'locked';

export function DungeonsPage() {
  const queryClient = useQueryClient();
  const [selectedDungeonId, setSelectedDungeonId] = useState<string | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [encounterPreview, setEncounterPreview] = useState<EncounterPreview | null>(null);
  const [recentResolutions, setRecentResolutions] = useState<TrackedResolution[]>([]);
  const [lastResolution, setLastResolution] = useState<TrackedResolution | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    if (encounterPreview && encounterPreview.floor.floor !== selectedFloor) {
      setEncounterPreview(null);
    }
  }, [selectedFloor, encounterPreview]);

  const {
    data: dungeonSummaries,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['dungeons', PLAYER_ID],
    queryFn: async () => {
      const response = await fetchApi<DungeonListResponse>(
        `/players/${PLAYER_ID}/dungeons`
      );
      if (!response.success || !response.data?.success) {
        throw new Error(response.error || response.data?.message || 'Failed to load dungeons');
      }
      return response.data.data;
    },
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (dungeonSummaries && dungeonSummaries.length > 0 && !selectedDungeonId) {
      setSelectedDungeonId(dungeonSummaries[0].definition.id);
    }
  }, [dungeonSummaries, selectedDungeonId]);

  const selectedDungeon = useMemo(() => {
    return dungeonSummaries?.find(
      summary => summary.definition.id === selectedDungeonId
    ) ?? null;
  }, [dungeonSummaries, selectedDungeonId]);

  useEffect(() => {
    if (selectedDungeon) {
      const activeRun = selectedDungeon.progress.activeRun;
      const defaultFloor = activeRun
        ? activeRun.currentFloor
        : Math.min(
            Math.max(selectedDungeon.progress.highestFloorReached + 1, 1),
            selectedDungeon.definition.floors.length
          );
      setSelectedFloor(defaultFloor);
      setEncounterPreview(null);
      setLastResolution(null);
      setRecentResolutions([]);
    }
  }, [selectedDungeonId, selectedDungeon]);

  const enterDungeonMutation = useMutation({
    mutationFn: async ({ dungeonId, reset }: { dungeonId: string; reset: boolean }) => {
      const response = await fetch(
        `${API_BASE_URL}/players/${PLAYER_ID}/dungeons/${dungeonId}/enter`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reset }),
        }
      );
      const data: EnterDungeonResponse = await safeParseJson(response);
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'Unable to enter dungeon.');
      }
      return data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dungeons', PLAYER_ID] });
      setEncounterPreview(null);
      setLastResolution(null);
      const message = variables.reset
        ? 'Started a fresh dungeon run.'
        : 'Resumed your current dungeon run.';
      setFeedbackMessage(message);
    },
    onError: err => {
      setFeedbackMessage(getErrorMessage(err));
    },
  });

  const enterFloorMutation = useMutation({
    mutationFn: async ({ dungeonId, floor }: { dungeonId: string; floor: number }) => {
      const response = await fetch(
        `${API_BASE_URL}/players/${PLAYER_ID}/dungeons/${dungeonId}/floors/${floor}/enter`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      const data: EnterFloorResponse = await safeParseJson(response);
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'Unable to enter this floor.');
      }
      return data.data;
    },
    onSuccess: data => {
      setEncounterPreview({ ...data, capturedAt: new Date().toISOString() });
      setFeedbackMessage('Encounter preview ready.');
    },
    onError: err => {
      setFeedbackMessage(getErrorMessage(err));
    },
  });

  const resolveFloorMutation = useMutation({
    mutationFn: async ({ dungeonId, floor }: { dungeonId: string; floor: number }) => {
      const response = await fetch(
        `${API_BASE_URL}/players/${PLAYER_ID}/dungeons/${dungeonId}/floors/${floor}/resolve`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      const data: ResolveFloorResponse = await safeParseJson(response);
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'Failed to resolve encounter.');
      }
      return data.data;
    },
    onSuccess: result => {
      const tracked: TrackedResolution = {
        ...result,
        resolvedAt: new Date().toISOString(),
      };
      setLastResolution(tracked);
      setRecentResolutions(prev => [tracked, ...prev].slice(0, 5));
      setEncounterPreview(null);
      setFeedbackMessage(
        result.outcome === 'win'
          ? `Cleared floor ${result.floor}${result.completed ? ' and completed the dungeon!' : ' successfully.'}`
          : `You were defeated on floor ${result.floor}.`
      );
      queryClient.invalidateQueries({ queryKey: ['dungeons', PLAYER_ID] });
      if (result.nextFloor) {
        setSelectedFloor(result.nextFloor);
      }
    },
    onError: err => {
      setFeedbackMessage(getErrorMessage(err));
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading dungeons...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
        {(error as Error)?.message || 'Unable to load dungeon data.'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">Dungeons</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Track your current expeditions, review floor rewards, and relive combat logs from each encounter.
        </p>
      </header>

      {feedbackMessage && (
        <div className="animate-fade-in-up rounded-lg border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-800 dark:border-primary-900/40 dark:bg-primary-900/20 dark:text-primary-200">
          {feedbackMessage}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-4">
        <aside className="space-y-4 lg:col-span-1">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Dungeon List
          </h2>
          <div className="space-y-3">
            {dungeonSummaries?.map(summary => {
              const isActive = summary.definition.id === selectedDungeonId;
              return (
                <button
                  key={summary.definition.id}
                  type="button"
                  onClick={() => setSelectedDungeonId(summary.definition.id)}
                  className={`w-full rounded-lg border px-4 py-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-900 ${
                    isActive
                      ? 'border-primary-400 bg-primary-100/60 text-primary-800 shadow-sm dark:border-primary-500/60 dark:bg-primary-900/20 dark:text-primary-100'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-primary-200 dark:text-gray-200'
                  } ${summary.unlocked ? '' : 'opacity-70'}`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold">
                      {summary.definition.name}
                    </h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        summary.unlocked
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200'
                          : 'bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                      }`}
                    >
                      {summary.unlocked ? 'Unlocked' : 'Locked'}
                    </span>
                  </div>
                  <p className="mt-2 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Floors: {summary.definition.floors.length}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-300">
                    <span className="rounded-full bg-gray-100 px-2 py-1 dark:bg-gray-800">
                      Highest Floor: {summary.progress.highestFloorReached || 0}
                    </span>
                    <span className="rounded-full bg-gray-100 px-2 py-1 dark:bg-gray-800">
                      Completed: {summary.progress.timesCompleted}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="space-y-6 lg:col-span-3">
          {!selectedDungeon && (
            <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
              Select a dungeon on the left to inspect its floors and run history.
            </div>
          )}

          {selectedDungeon && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {selectedDungeon.definition.name}
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {selectedDungeon.definition.area.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <span className="rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary-700 dark:bg-primary-900/30 dark:text-primary-200">
                      {selectedDungeon.definition.floors.length} Floors
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-gray-600 dark:text-gray-300">
                    <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Highest Floor
                      </p>
                      <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {selectedDungeon.progress.highestFloorReached || 0}
                      </p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Clears
                      </p>
                      <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {selectedDungeon.progress.timesCompleted}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>Last Completed: {formatDate(selectedDungeon.progress.lastCompletedAt)}</span>
                    <span>Last Reset: {formatDate(selectedDungeon.progress.lastResetAt)}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Run Controls
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    Manage your current run or start fresh from floor one.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        enterDungeonMutation.mutate({
                          dungeonId: selectedDungeon.definition.id,
                          reset: false,
                        })
                      }
                      disabled={enterDungeonMutation.isPending}
                      className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
                    >
                      {enterDungeonMutation.isPending
                        ? 'Syncing run...'
                        : selectedDungeon.progress.activeRun?.status === 'in_progress'
                          ? 'Continue Run'
                          : 'Resume Run'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        enterDungeonMutation.mutate({
                          dungeonId: selectedDungeon.definition.id,
                          reset: true,
                        })
                      }
                      disabled={enterDungeonMutation.isPending}
                      className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200"
                    >
                      {enterDungeonMutation.isPending ? 'Resetting...' : 'Start New Run'}
                    </button>
                  </div>

                  {selectedDungeon.progress.activeRun && (
                    <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                      <p className="font-semibold text-gray-800 dark:text-gray-100">
                        Active Run
                      </p>
                      <p>Current Floor: {selectedDungeon.progress.activeRun.currentFloor}</p>
                      <p>
                        Accumulated Rewards: {selectedDungeon.progress.activeRun.accumulatedRewards.experience} XP • {selectedDungeon.progress.activeRun.accumulatedRewards.gold} Gold
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Floor Progression
                  </h3>
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Tap a floor to inspect rewards
                  </p>
                </div>

                <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
                  {selectedDungeon.definition.floors.map(floor => {
                    const state = getFloorState(floor.floor, selectedDungeon.progress);
                    const isSelected = floor.floor === selectedFloor;
                    const className = floorStateClass(state, isSelected, floor.type);
                    return (
                      <button
                        key={floor.floor}
                        type="button"
                        onClick={() => {
                          if (state === 'locked') {
                            return;
                          }
                          setSelectedFloor(floor.floor);
                        }}
                        disabled={state === 'locked'}
                        className={className}
                      >
                        <span className="text-2xl">
                          {floor.type === 'boss' ? '👑' : floor.floor}
                        </span>
                        <span className="text-xs font-semibold uppercase tracking-wide">
                          {floor.type === 'boss' ? `Boss ${floor.floor}` : `Floor ${floor.floor}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedFloor && (
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                  {renderFloorDetails({
                    dungeon: selectedDungeon,
                    floorNumber: selectedFloor,
                    encounterPreview,
                    onPreview: () =>
                      enterFloorMutation.mutate({
                        dungeonId: selectedDungeon.definition.id,
                        floor: selectedFloor,
                      }),
                    onResolve: () =>
                      resolveFloorMutation.mutate({
                        dungeonId: selectedDungeon.definition.id,
                        floor: selectedFloor,
                      }),
                    isPreviewing: enterFloorMutation.isPending,
                    isResolving: resolveFloorMutation.isPending,
                  })}
                </div>
              )}

              {lastResolution && (
                <div className="space-y-4 rounded-xl border border-primary-200 bg-white p-5 shadow-sm dark:border-primary-900/40 dark:bg-gray-900">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Latest Encounter
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Floor {lastResolution.floor} • {lastResolution.outcome === 'win' ? 'Victory' : 'Defeat'} • {formatDate(lastResolution.resolvedAt)}
                      </p>
                    </div>
                    <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                      <p>
                        Rewards Earned: {lastResolution.rewardsEarned.experience} XP • {lastResolution.rewardsEarned.gold} Gold
                      </p>
                      {lastResolution.drops.length > 0 && (
                        <p>Loot: {lastResolution.drops.join(', ')}</p>
                      )}
                    </div>
                  </div>

                  {lastResolution.combats.map((combat, index) => (
                    <CombatResultCard
                      key={`${combat.winner}-${combat.loser}-${index}`}
                      result={combat}
                      perspectiveId={PLAYER_ID}
                      title={
                        lastResolution.combats.length > 1
                          ? `Phase ${index + 1}`
                          : 'Encounter Log'
                      }
                    />
                  ))}
                </div>
              )}

              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Run Summary Logs
                </h3>
                {recentResolutions.length === 0 ? (
                  <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                    Resolve a floor to populate the run summary timeline.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {recentResolutions.map(resolution => (
                      <div
                        key={`${resolution.floor}-${resolution.resolvedAt}`}
                        className="animate-fade-in-up rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">
                            Floor {resolution.floor}
                          </span>
                          <span className={
                            resolution.outcome === 'win'
                              ? 'text-emerald-600 dark:text-emerald-300'
                              : 'text-rose-600 dark:text-rose-300'
                          }>
                            {resolution.outcome === 'win' ? 'Victory' : 'Defeat'}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>{formatDate(resolution.resolvedAt)}</span>
                          <span>
                            +{resolution.rewardsEarned.experience} XP
                          </span>
                          <span>
                            +{resolution.rewardsEarned.gold} Gold
                          </span>
                          {resolution.drops.length > 0 && (
                            <span>Loot: {resolution.drops.join(', ')}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function renderFloorDetails({
  dungeon,
  floorNumber,
  encounterPreview,
  onPreview,
  onResolve,
  isPreviewing,
  isResolving,
}: {
  dungeon: DungeonSummary;
  floorNumber: number;
  encounterPreview: EncounterPreview | null;
  onPreview: () => void;
  onResolve: () => void;
  isPreviewing: boolean;
  isResolving: boolean;
}) {
  const floor = dungeon.definition.floors.find(f => f.floor === floorNumber);
  if (!floor) {
    return <p className="text-sm text-gray-600 dark:text-gray-300">Could not locate floor details.</p>;
  }

  const activeRun = dungeon.progress.activeRun;
  const canPreview = activeRun?.status === 'in_progress' && activeRun.currentFloor === floorNumber;
  const canResolve = canPreview && !isResolving;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {floor.name}
          </h3>
          {floor.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{floor.description}</p>
          )}
        </div>
        <div className="flex items-start gap-2 text-xs">
          <span className="rounded-full bg-gray-100 px-3 py-1 font-semibold uppercase tracking-wide text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            {floor.type === 'boss' ? 'Boss Encounter' : 'Combat Encounter'}
          </span>
          {floor.type === 'boss' && floor.boss && (
            <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
              {floor.boss.phases.length} Phase{floor.boss.phases.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-200">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Rewards Preview
          </h4>
          {renderRewards(floor.rewards)}
          {floor.type === 'boss' && floor.boss?.rewards && (
            <div className="mt-3 rounded-lg bg-amber-100/60 p-3 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
              <p className="font-semibold">Boss Completion Bonus</p>
              {renderRewards(floor.boss.rewards)}
            </div>
          )}
        </div>

        <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-200">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Encounter Status
          </h4>
          {activeRun ? (
            <>
              <p className="mt-2">
                Floors cleared this run: {activeRun.floorsCleared.length}
              </p>
              <p>
                Accumulated Rewards: {activeRun.accumulatedRewards.experience} XP • {activeRun.accumulatedRewards.gold} Gold
              </p>
              <p>
                Current Floor: {activeRun.currentFloor}
              </p>
            </>
          ) : (
            <p className="mt-2">Start a run to engage this floor.</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onPreview}
          disabled={!canPreview || isPreviewing}
          className="rounded-lg bg-secondary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-secondary-700 disabled:opacity-50"
        >
          {isPreviewing ? 'Preparing Encounter...' : 'Preview Current Floor'}
        </button>
        <button
          type="button"
          onClick={onResolve}
          disabled={!canResolve}
          className="rounded-lg border border-primary-300 bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-700 transition-colors hover:bg-primary-100 disabled:opacity-50 dark:border-primary-900/40 dark:bg-primary-900/20 dark:text-primary-200"
        >
          {isResolving ? 'Resolving...' : 'Resolve Encounter'}
        </button>
      </div>

      {encounterPreview && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Encounter Preview ({formatDate(encounterPreview.capturedAt)})
          </h4>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg bg-primary-50 p-3 text-sm text-primary-900 dark:bg-primary-900/20 dark:text-primary-100">
              <p className="text-xs uppercase tracking-wide">Player</p>
              <p className="text-lg font-semibold">{encounterPreview.playerCombatant.name}</p>
              <p>HP: {encounterPreview.playerCombatant.stats.health}</p>
              <p>ATK: {encounterPreview.playerCombatant.stats.attack}</p>
              <p>DEF: {encounterPreview.playerCombatant.stats.defense}</p>
              <p>Speed: {encounterPreview.playerCombatant.stats.speed}</p>
            </div>
            {renderEnemyPreview(floor)}
          </div>
        </div>
      )}
    </div>
  );
}

function renderEnemyPreview(floor: DungeonFloor) {
  if (floor.type === 'boss' && floor.boss) {
    const phases = floor.boss.phases;
    return (
      <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-900 dark:bg-rose-900/20 dark:text-rose-100">
        <p className="text-xs uppercase tracking-wide">Boss Preview</p>
        <p className="text-lg font-semibold">{floor.boss.name}</p>
        <div className="mt-2 space-y-2">
          {phases.map(phase => (
            <div key={phase.phase} className="rounded border border-rose-200/60 bg-white/60 p-2 dark:border-rose-900/40 dark:bg-rose-900/10">
              <p className="text-xs font-semibold uppercase tracking-wide">
                Phase {phase.phase}
              </p>
              {phase.description && <p className="text-xs text-rose-700 dark:text-rose-200">{phase.description}</p>}
              <p className="text-xs text-rose-700 dark:text-rose-200">
                HP: {phase.enemy.stats.health} • ATK: {phase.enemy.stats.attack} • DEF: {phase.enemy.stats.defense}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (floor.enemy) {
    return (
      <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-900 dark:bg-rose-900/20 dark:text-rose-100">
        <p className="text-xs uppercase tracking-wide">Enemy Preview</p>
        <p className="text-lg font-semibold">{floor.enemy.name}</p>
        <p>HP: {floor.enemy.stats.health}</p>
        <p>ATK: {floor.enemy.stats.attack}</p>
        <p>DEF: {floor.enemy.stats.defense}</p>
        <p>Speed: {floor.enemy.stats.speed}</p>
      </div>
    );
  }

  return null;
}

function renderRewards(reward: DungeonReward) {
  return (
    <ul className="mt-2 space-y-1 text-sm">
      <li>Experience: {reward.experience}</li>
      <li>Gold: {reward.gold}</li>
      <li>
        Loot: {reward.items && reward.items.length > 0 ? reward.items.join(', ') : 'None'}
      </li>
    </ul>
  );
}

async function safeParseJson<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    return {} as T;
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred.';
}

function formatDate(value: string | null) {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleString();
}

function getFloorState(floorNumber: number, progress: SerializedDungeonProgress): FloorState {
  const activeRun = progress.activeRun;
  if (activeRun) {
    if (activeRun.floorsCleared.includes(floorNumber) || activeRun.currentFloor > floorNumber) {
      return 'cleared';
    }
    if (activeRun.currentFloor === floorNumber) {
      return 'current';
    }
    return 'upcoming';
  }

  if (floorNumber <= progress.highestFloorReached) {
    return 'cleared';
  }

  const nextTarget = Math.max(progress.highestFloorReached + 1, 1);
  if (floorNumber === nextTarget) {
    return 'current';
  }
  if (floorNumber === nextTarget + 1) {
    return 'upcoming';
  }
  return 'locked';
}

function floorStateClass(state: FloorState, selected: boolean, type: DungeonFloor['type']) {
  const base = 'min-w-[120px] flex flex-col items-center gap-1 rounded-lg border px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary-500';
  const bossAccent = type === 'boss' ? ' shadow-[0_0_0_1px_rgba(250,204,21,0.3)]' : '';
  const selectedRing = selected ? ' ring-2 ring-primary-300 dark:ring-primary-500/60' : '';

  switch (state) {
    case 'cleared':
      return `${base} bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-200${bossAccent}${selectedRing}`;
    case 'current':
      return `${base} bg-primary-50 text-primary-700 border-primary-400 dark:bg-primary-900/30 dark:text-primary-100${bossAccent}${selectedRing} ${selected ? 'scale-[1.03]' : ''}`;
    case 'upcoming':
      return `${base} bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-300${bossAccent}${selectedRing}`;
    case 'locked':
    default:
      return `${base} cursor-not-allowed border-dashed border-gray-300 bg-gray-100/60 text-gray-400 opacity-60 dark:border-gray-600 dark:bg-gray-800/60 dark:text-gray-500${bossAccent}`;
  }
}
