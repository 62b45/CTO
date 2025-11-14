import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ArenaOpponent,
} from '@shared';
import { API_BASE_URL, fetchApi } from '../lib/api';
import { CombatResultCard, SerializedCombatResult } from '../components/CombatResultCard';

const PLAYER_ID = 'player-1';

interface SerializedCombatRewards {
  experience: number;
  gold: number;
  items: string[];
}

interface SerializedArenaMatchRecord {
  matchId: string;
  playerId: string;
  opponent: ArenaOpponent;
  outcome: 'win' | 'loss';
  turns: number;
  rewards: SerializedCombatRewards;
  timestamp: string;
  logs: SerializedCombatResult['logs'];
}

interface PlayerArenaStateSerialized {
  playerId: string;
  rating: number;
  wins: number;
  losses: number;
  streak: number;
  bestStreak: number;
  createdAt: string;
  updatedAt: string;
  history: SerializedArenaMatchRecord[];
}

interface ArenaStateResponse {
  success: boolean;
  data: PlayerArenaStateSerialized;
  message?: string;
}

interface LeaderboardResponse {
  success: boolean;
  data: PlayerArenaStateSerialized[];
  message?: string;
}

interface OpponentResponse {
  success: boolean;
  data: ArenaOpponent;
  message?: string;
}

interface ArenaChallengePayload {
  outcome: 'win' | 'loss';
  opponent: ArenaOpponent;
  combat: SerializedCombatResult;
  rewards: SerializedCombatRewards;
  match: SerializedArenaMatchRecord;
  state: PlayerArenaStateSerialized;
}

interface ArenaChallengeResponse {
  success: boolean;
  data: ArenaChallengePayload;
  message?: string;
}

type ArenaChallengeSnapshot = ArenaChallengePayload & { resolvedAt: string };

export function ArenaPage() {
  const queryClient = useQueryClient();
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [lastChallenge, setLastChallenge] = useState<ArenaChallengeSnapshot | null>(null);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);

  const {
    data: arenaState,
    isLoading: isArenaLoading,
    isError: arenaError,
    error: arenaErrorObj,
  } = useQuery({
    queryKey: ['arena-state', PLAYER_ID],
    queryFn: async () => {
      const response = await fetchApi<ArenaStateResponse>(`/players/${PLAYER_ID}/arena`);
      if (!response.success || !response.data?.success) {
        throw new Error(response.error || response.data?.message || 'Unable to fetch arena state.');
      }
      return response.data.data;
    },
    refetchInterval: 30000,
  });

  const {
    data: opponent,
    isFetching: isFetchingOpponent,
    refetch: refetchOpponent,
  } = useQuery({
    queryKey: ['arena-opponent', PLAYER_ID],
    queryFn: async () => {
      const response = await fetchApi<OpponentResponse>(
        `/players/${PLAYER_ID}/arena/opponent`
      );
      if (!response.success || !response.data?.success) {
        throw new Error(response.error || response.data?.message || 'Unable to generate opponent.');
      }
      return response.data.data;
    },
    refetchOnWindowFocus: false,
  });

  const { data: leaderboard } = useQuery({
    queryKey: ['arena-leaderboard'],
    queryFn: async () => {
      const response = await fetchApi<LeaderboardResponse>(`/arena/leaderboard?limit=10`);
      if (!response.success || !response.data?.success) {
        throw new Error(response.error || response.data?.message || 'Unable to load leaderboard.');
      }
      return response.data.data;
    },
    staleTime: 60000,
  });

  const challengeMutation = useMutation({
    mutationFn: async (selectedOpponent: ArenaOpponent | null) => {
      if (!selectedOpponent) {
        throw new Error('No opponent available for a duel.');
      }
      const response = await fetch(
        `${API_BASE_URL}/players/${PLAYER_ID}/arena/challenge`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ opponent: selectedOpponent }),
        }
      );
      const data: ArenaChallengeResponse = await safeParseJson(response);
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'Arena duel failed to resolve.');
      }
      return data.data;
    },
    onSuccess: data => {
      setLastChallenge({ ...data, resolvedAt: new Date().toISOString() });
      setFeedbackMessage(
        data.outcome === 'win' ? 'Victory! Your rating has been updated.' : 'Defeat. Recover and challenge again.'
      );
      setExpandedMatchId(data.match.matchId);
      queryClient.invalidateQueries({ queryKey: ['arena-state', PLAYER_ID] });
      queryClient.invalidateQueries({ queryKey: ['arena-leaderboard'] });
      refetchOpponent();
    },
    onError: err => {
      setFeedbackMessage(getErrorMessage(err));
    },
  });

  const victoryRate = useMemo(() => {
    if (!arenaState) return 0;
    const total = arenaState.wins + arenaState.losses;
    if (total === 0) return 0;
    return Math.round((arenaState.wins / total) * 100);
  }, [arenaState]);

  if (isArenaLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading arena data...</p>
        </div>
      </div>
    );
  }

  if (arenaError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
        {(arenaErrorObj as Error)?.message || 'Unable to load arena state.'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">Arena</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Face procedurally scaled opponents, review combat logs, and climb the competitive rankings.
        </p>
      </header>

      {feedbackMessage && (
        <div className="animate-fade-in-up rounded-lg border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-800 dark:border-primary-900/40 dark:bg-primary-900/20 dark:text-primary-200">
          {feedbackMessage}
        </div>
      )}

      {arenaState && (
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="space-y-6 lg:col-span-2">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Rank Overview
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Rating updated at {formatDate(arenaState.updatedAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 text-sm">
                  <span className="rounded-lg bg-primary-100 px-4 py-2 font-semibold text-primary-800 dark:bg-primary-900/30 dark:text-primary-200">
                    Rating: {arenaState.rating}
                  </span>
                  <span className="rounded-lg bg-emerald-100 px-4 py-2 font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
                    {arenaState.wins} Wins
                  </span>
                  <span className="rounded-lg bg-rose-100 px-4 py-2 font-semibold text-rose-700 dark:bg-rose-900/30 dark:text-rose-200">
                    {arenaState.losses} Losses
                  </span>
                  <span className="rounded-lg bg-blue-100 px-4 py-2 font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
                    Win Rate: {victoryRate}%
                  </span>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <StatChip label="Current Streak" value={arenaState.streak} highlight>
                  Best streak: {arenaState.bestStreak}
                </StatChip>
                <StatChip label="Match History" value={arenaState.history.length}>
                  Last duel: {arenaState.history[0] ? formatDate(arenaState.history[0].timestamp) : '—'}
                </StatChip>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Opponent Lineup
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Opponents adapt to your rating and progression. Review their stats before engaging.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => refetchOpponent()}
                  className="rounded-lg border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-700 transition-colors hover:bg-primary-100 dark:border-primary-900/40 dark:bg-primary-900/20 dark:text-primary-200"
                  disabled={isFetchingOpponent}
                >
                  {isFetchingOpponent ? 'Refreshing...' : 'Refresh Opponent'}
                </button>
              </div>

              {opponent ? (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg bg-purple-50 p-4 text-sm text-purple-900 dark:bg-purple-900/20 dark:text-purple-100">
                    <p className="text-xs uppercase tracking-wide">Designation</p>
                    <p className="text-xl font-semibold">{opponent.name}</p>
                    <p className="mt-1 text-sm">Level {opponent.level}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <span className="rounded bg-white/70 px-2 py-1 dark:bg-purple-900/30">
                        HP: {opponent.stats.maxHealth}
                      </span>
                      <span className="rounded bg-white/70 px-2 py-1 dark:bg-purple-900/30">
                        ATK: {opponent.stats.attack}
                      </span>
                      <span className="rounded bg-white/70 px-2 py-1 dark:bg-purple-900/30">
                        DEF: {opponent.stats.defense}
                      </span>
                      <span className="rounded bg-white/70 px-2 py-1 dark:bg-purple-900/30">
                        SPD: {opponent.stats.speed}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Scaling Insights
                    </p>
                    <ul className="mt-2 space-y-2 text-sm">
                      <li>
                        Modifier: <strong>{formatPercentage(opponent.modifier)}</strong> difficulty adjustment
                      </li>
                      <li>
                        Weapon: {opponent.weapon.name} (Base Damage {opponent.weapon.baseDamage}, ×{opponent.weapon.multiplier})
                      </li>
                      <li>
                        Derived power score: {Math.round(calculatePowerScore(opponent))}
                      </li>
                      <li>
                        Seed: #{opponent.seed} (affects combat variance)
                      </li>
                    </ul>
                    <button
                      type="button"
                      onClick={() => challengeMutation.mutate(opponent ?? null)}
                      disabled={challengeMutation.isPending || !opponent}
                      className="mt-4 w-full rounded-lg bg-secondary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-secondary-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {challengeMutation.isPending ? 'Resolving Duel...' : 'Initiate Duel'}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                  Generating opponent details...
                </p>
              )}
            </div>

            {lastChallenge && (
              <div className="space-y-4 rounded-xl border border-primary-200 bg-white p-5 shadow-sm dark:border-primary-900/40 dark:bg-gray-900">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Latest Duel Outcome
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(lastChallenge.resolvedAt)} • Opponent: {lastChallenge.opponent.name}
                    </p>
                  </div>
                  <div className={`rounded-full px-4 py-1 text-sm font-semibold ${
                    lastChallenge.outcome === 'win'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200'
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200'
                  }`}>
                    {lastChallenge.outcome === 'win' ? 'Victory' : 'Defeat'}
                  </div>
                </div>

                <CombatResultCard
                  result={lastChallenge.combat}
                  perspectiveId={PLAYER_ID}
                  title="Combat Log"
                />
              </div>
            )}

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Ranking History
                </h2>
                <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {arenaState.history.length} recorded matches
                </span>
              </div>

              {arenaState.history.length === 0 ? (
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                  Duels you complete will populate this history.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {arenaState.history.map(match => {
                    const isExpanded = expandedMatchId === match.matchId;
                    const combatResult = toCombatResult(match);
                    return (
                      <div
                        key={match.matchId}
                        className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 shadow-sm transition-colors hover:border-primary-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {match.opponent.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDate(match.timestamp)} • {match.turns} turns
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              match.outcome === 'win'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200'
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200'
                            }`}>
                              {match.outcome === 'win' ? 'Victory' : 'Defeat'}
                            </span>
                            <button
                              type="button"
                              onClick={() => setExpandedMatchId(isExpanded ? null : match.matchId)}
                              className="rounded border border-primary-200 px-3 py-1 text-xs font-semibold text-primary-700 transition-colors hover:bg-primary-50 dark:border-primary-900/40 dark:text-primary-200"
                            >
                              {isExpanded ? 'Hide Logs' : 'View Logs'}
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="mt-3">
                            <CombatResultCard
                              result={combatResult}
                              perspectiveId={PLAYER_ID}
                              title="Battle Playback"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Leaderboard
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Top challengers across the realm.
              </p>
              <div className="mt-4 space-y-3">
                {leaderboard?.map((entry, index) => (
                  <div
                    key={entry.playerId}
                    className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  >
                    <div>
                      <p className="font-semibold">
                        #{index + 1} • {entry.playerId}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Wins: {entry.wins} • Streak: {entry.bestStreak}
                      </p>
                    </div>
                    <span className="rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-800 dark:bg-primary-900/30 dark:text-primary-200">
                      {entry.rating}
                    </span>
                  </div>
                ))}
                {!leaderboard && (
                  <p className="text-sm text-gray-600 dark:text-gray-300">Leaderboard data unavailable.</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Duel Strategy Tips
              </h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-gray-600 dark:text-gray-300">
                <li>Opponent modifiers adjust both stats and rewards—watch for large positive shifts.</li>
                <li>Maintaining win streaks yields rating bonuses; avoid unnecessary risks.</li>
                <li>Review combat logs to understand ability rolls and variance swings.</li>
              </ul>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function formatDate(value: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

function formatPercentage(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function calculatePowerScore(opponent: ArenaOpponent) {
  const statScore = opponent.stats.attack * 1.5 + opponent.stats.defense * 1.2 + opponent.stats.speed;
  const healthScore = opponent.stats.maxHealth / 5;
  const modifierBonus = 1 + opponent.modifier * 2;
  return (statScore + healthScore) * modifierBonus;
}

function toCombatResult(match: SerializedArenaMatchRecord): SerializedCombatResult {
  return {
    winner: match.outcome === 'win' ? PLAYER_ID : match.opponent.id,
    loser: match.outcome === 'win' ? match.opponent.id : PLAYER_ID,
    turns: match.turns,
    rewards: match.rewards,
    logs: match.logs,
  };
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

interface StatChipProps {
  label: string;
  value: number | string;
  children?: React.ReactNode;
  highlight?: boolean;
}

function StatChip({ label, value, children, highlight = false }: StatChipProps) {
  return (
    <div
      className={`rounded-lg border px-4 py-3 text-sm shadow-sm dark:border-gray-700 ${
        highlight
          ? 'border-primary-200 bg-primary-50 text-primary-800 dark:border-primary-900/40 dark:bg-primary-900/20 dark:text-primary-100'
          : 'border-gray-200 bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-200'
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">{value}</p>
      {children && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{children}</p>}
    </div>
  );
}
