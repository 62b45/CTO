import { useState, FormEvent } from 'react';
import { API_BASE_URL, fetchApi } from '../lib/api';

interface AdminPanelProps {
  apiKey: string;
}

interface StatusMessage {
  type: 'success' | 'error';
  message: string;
}

interface ResourceFormState {
  coins: string;
  gems: string;
}

export function AdminPanel({ apiKey }: AdminPanelProps) {
  const [playerId, setPlayerId] = useState('player-1');
  const [playerState, setPlayerState] = useState('');
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [resourceForm, setResourceForm] = useState<ResourceFormState>({ coins: '', gems: '' });
  const [cooldownAction, setCooldownAction] = useState('');
  const [isFetchingState, setIsFetchingState] = useState(false);
  const [isAdjustingResources, setIsAdjustingResources] = useState(false);
  const [isResettingCooldowns, setIsResettingCooldowns] = useState(false);

  const setStatusMessage = (next: StatusMessage | null) => {
    setStatus(next);
  };

  const adminRequest = async <T,>(endpoint: string, init?: RequestInit): Promise<T> => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'x-admin-api-key': apiKey,
        'x-admin-user': 'Debug Panel',
        ...(init?.headers ?? {}),
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error((data as { message?: string }).message ?? 'Admin request failed');
    }

    return data as T;
  };

  const handleFetchState = async () => {
    setIsFetchingState(true);
    setStatusMessage(null);
    try {
      const response = await fetchApi<any>(`/players/${playerId}/export`);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch player state');
      }
      setPlayerState(JSON.stringify(response.data, null, 2));
      setStatusMessage({ type: 'success', message: 'Player state fetched successfully.' });
    } catch (error) {
      setStatusMessage({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to fetch player state',
      });
    } finally {
      setIsFetchingState(false);
    }
  };

  const handleAdjustResources = async (event: FormEvent) => {
    event.preventDefault();
    if (!resourceForm.coins && !resourceForm.gems) {
      setStatusMessage({ type: 'error', message: 'Enter at least one value to adjust.' });
      return;
    }

    const payload: { coins?: number; gems?: number } = {};
    if (resourceForm.coins) {
      payload.coins = Number(resourceForm.coins);
    }
    if (resourceForm.gems) {
      payload.gems = Number(resourceForm.gems);
    }

    setIsAdjustingResources(true);
    setStatusMessage(null);

    try {
      await adminRequest<{ success: boolean; message: string }>(
        `/admin/players/${playerId}/resources`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );
      setStatusMessage({ type: 'success', message: 'Resources adjusted successfully.' });
      setResourceForm({ coins: '', gems: '' });
    } catch (error) {
      setStatusMessage({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to adjust resources',
      });
    } finally {
      setIsAdjustingResources(false);
    }
  };

  const handleResetCooldowns = async (event: FormEvent) => {
    event.preventDefault();
    setIsResettingCooldowns(true);
    setStatusMessage(null);

    try {
      await adminRequest<{ success: boolean; message: string }>(
        `/admin/players/${playerId}/cooldowns/reset`,
        {
          method: 'POST',
          body: JSON.stringify({ action: cooldownAction || undefined }),
        }
      );
      setStatusMessage({ type: 'success', message: 'Cooldowns reset successfully.' });
      setCooldownAction('');
    } catch (error) {
      setStatusMessage({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to reset cooldowns',
      });
    } finally {
      setIsResettingCooldowns(false);
    }
  };

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Admin Debug Panel</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Inspect player state and trigger authorized admin actions.
        </p>
      </header>

      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <label htmlFor="admin-player-id" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Player ID
        </label>
        <input
          id="admin-player-id"
          value={playerId}
          onChange={event => setPlayerId(event.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        />
        <button
          type="button"
          onClick={handleFetchState}
          disabled={isFetchingState}
          className="mt-3 inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:opacity-50"
        >
          {isFetchingState ? 'Fetching…' : 'Fetch Player State'}
        </button>
        {playerState && (
          <div className="mt-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Player State Snapshot
            </label>
            <textarea
              readOnly
              value={playerState}
              rows={10}
              className="mt-1 block w-full resize-y rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
        )}
      </div>

      <form
        onSubmit={handleAdjustResources}
        className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
      >
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Adjust Resources</h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          Leave a field blank to keep that resource unchanged.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="admin-coins" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Coins
            </label>
            <input
              id="admin-coins"
              type="number"
              value={resourceForm.coins}
              onChange={event => setResourceForm(state => ({ ...state, coins: event.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              placeholder="e.g. 500"
            />
          </div>
          <div>
            <label htmlFor="admin-gems" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Gems
            </label>
            <input
              id="admin-gems"
              type="number"
              value={resourceForm.gems}
              onChange={event => setResourceForm(state => ({ ...state, gems: event.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              placeholder="e.g. 25"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={isAdjustingResources}
          className="mt-4 inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:opacity-50"
        >
          {isAdjustingResources ? 'Applying…' : 'Apply Changes'}
        </button>
      </form>

      <form
        onSubmit={handleResetCooldowns}
        className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
      >
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Reset Cooldowns</h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          Provide an action name to reset a specific cooldown or leave blank to reset all.
        </p>
        <label htmlFor="admin-cooldown-action" className="sr-only">
          Action name
        </label>
        <input
          id="admin-cooldown-action"
          value={cooldownAction}
          onChange={event => setCooldownAction(event.target.value)}
          className="mt-3 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          placeholder="Action name (optional)"
        />
        <button
          type="submit"
          disabled={isResettingCooldowns}
          className="mt-3 inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:opacity-50"
        >
          {isResettingCooldowns ? 'Resetting…' : 'Reset Cooldowns'}
        </button>
      </form>

      {status && (
        <div
          className={`rounded-md border px-4 py-3 text-sm ${
            status.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-300'
              : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300'
          }`}
          role="status"
          aria-live="polite"
        >
          {status.message}
        </div>
      )}
    </section>
  );
}
