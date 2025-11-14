import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../lib/api';
import { PlayerStats } from './PlayerStats';
import { CooldownGrid } from '../components/CooldownGrid';
import { RecentActivity } from '../components/RecentActivity';

const PLAYER_ID = 'player-1';

export function DashboardPage() {
  const queryClient = useQueryClient();

  const { data: progressionData, isLoading: progressionLoading } = useQuery({
    queryKey: ['progression', PLAYER_ID],
    queryFn: async () => {
      const response = await fetchApi<any>(`/players/${PLAYER_ID}/progression`);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch progression');
      }
      return response.data.data;
    },
    refetchInterval: 30000,
  });

  const { data: cooldownsData, isLoading: cooldownsLoading } = useQuery({
    queryKey: ['cooldowns', PLAYER_ID],
    queryFn: async () => {
      const response = await fetchApi<any>(`/players/${PLAYER_ID}/cooldowns`);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch cooldowns');
      }
      return response.data.data;
    },
    refetchInterval: 1000,
  });

  const { data: activityData } = useQuery({
    queryKey: ['activity', PLAYER_ID],
    queryFn: async () => {
      const response = await fetchApi<any>(
        `/players/${PLAYER_ID}/activity?limit=10`
      );
      if (!response.success || !response.data) {
        return { activity: [] };
      }
      return response.data.data;
    },
    refetchInterval: 5000,
  });

  const triggerActionMutation = useMutation({
    mutationFn: async (action: string) => {
      const response = await fetch(
        `http://localhost:3001/players/${PLAYER_ID}/actions/${action}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to trigger action');
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cooldowns', PLAYER_ID] });
      queryClient.invalidateQueries({ queryKey: ['progression', PLAYER_ID] });
      queryClient.invalidateQueries({ queryKey: ['activity', PLAYER_ID] });
    },
  });

  const isLoading = progressionLoading || cooldownsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">
          Dashboard
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          View your character stats, manage cooldowns, and track your progress.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <PlayerStats player={progressionData?.player} />
          <CooldownGrid
            cooldowns={cooldownsData?.cooldowns || []}
            onActionTrigger={action => triggerActionMutation.mutate(action)}
            isTriggering={triggerActionMutation.isPending}
            error={triggerActionMutation.error?.message}
          />
        </div>

        <div className="space-y-6">
          <RecentActivity activity={activityData?.activity || []} />
        </div>
      </div>
    </div>
  );
}
