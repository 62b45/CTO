import { ChangeEvent, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAppStore } from '../state/store';
import { API_BASE_URL } from '../lib/api';
import { AdminPanel } from '../components/AdminPanel';

const PLAYER_ID = 'player-1';

export function SettingsPage() {
  const { theme, user, settings, setUser, clearUser, setSetting } = useAppStore();
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(settings.adminApiKey);
  const [exportData, setExportData] = useState('');
  const [importData, setImportData] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    const nextUser = {
      id: user?.id ?? '1',
      name: name === 'name' ? value : user?.name ?? '',
      email: name === 'email' ? value : user?.email ?? '',
    };
    setUser(nextUser);
  };

  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_BASE_URL}/players/${PLAYER_ID}/export`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to export save');
      }

      return result.data;
    },
    onSuccess: data => {
      setExportData(JSON.stringify(data, null, 2));
      setStatusMessage('Save exported successfully!');
      setTimeout(() => setStatusMessage(''), 3000);
    },
    onError: error => {
      setStatusMessage(`Export failed: ${(error as Error).message}`);
      setTimeout(() => setStatusMessage(''), 3000);
    },
  });

  const importMutation = useMutation({
    mutationFn: async (data: unknown) => {
      const response = await fetch(`${API_BASE_URL}/players/${PLAYER_ID}/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ state: data, overwrite: true }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to import save');
      }

      return result;
    },
    onSuccess: () => {
      setStatusMessage('Save imported successfully!');
      setImportData('');
      setTimeout(() => setStatusMessage(''), 3000);
    },
    onError: error => {
      setStatusMessage(`Import failed: ${(error as Error).message}`);
      setTimeout(() => setStatusMessage(''), 3000);
    },
  });

  const handleExport = () => {
    exportMutation.mutate();
  };

  const handleImport = () => {
    try {
      const parsed = JSON.parse(importData);
      importMutation.mutate(parsed);
    } catch (error) {
      setStatusMessage('Invalid JSON format');
      setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  const handleCopyExport = async () => {
    if (!exportData) return;
    try {
      await navigator.clipboard.writeText(exportData);
      setStatusMessage('Copied to clipboard!');
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (error) {
      setStatusMessage('Failed to copy to clipboard');
      setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  const handleSaveApiKey = () => {
    setSetting('adminApiKey', apiKeyInput);
    setStatusMessage('Admin API key saved');
    setTimeout(() => setStatusMessage(''), 3000);
  };

  const toggleAdminPanel = () => {
    if (!showAdminPanel && !settings.adminApiKey) {
      setStatusMessage('Please enter and save an admin API key first');
      setTimeout(() => setStatusMessage(''), 3000);
      return;
    }
    setShowAdminPanel(!showAdminPanel);
  };

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Configure your preferences and account details.
        </p>
      </header>

      {statusMessage && (
        <div
          className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-300"
          role="status"
          aria-live="polite"
        >
          {statusMessage}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Theme Preferences</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Current theme: <span className="font-semibold">{theme}</span>
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Toggle theme using the button in the navigation bar.
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Profile</h2>
          <form className="mt-4 space-y-4" onSubmit={event => event.preventDefault()}>
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Name
              </label>
              <input
                id="name"
                name="name"
                value={user?.name ?? ''}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                placeholder="Jane Doe"
              />
            </div>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={user?.email ?? ''}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                placeholder="jane@example.com"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={clearUser}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Clear
              </button>
              <button
                type="submit"
                className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Audio &amp; Visual Settings
        </h2>
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="audio-enabled" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Enable Audio
            </label>
            <input
              id="audio-enabled"
              type="checkbox"
              checked={settings.audioEnabled}
              onChange={event => setSetting('audioEnabled', event.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              aria-describedby="audio-enabled-description"
            />
          </div>
          <p id="audio-enabled-description" className="text-xs text-gray-500 dark:text-gray-400">
            Enable or disable sound effects and music.
          </p>

          <div className="mt-4 flex items-center justify-between">
            <label htmlFor="visual-effects" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Enable Visual Effects
            </label>
            <input
              id="visual-effects"
              type="checkbox"
              checked={settings.visualEffects}
              onChange={event => setSetting('visualEffects', event.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              aria-describedby="visual-effects-description"
            />
          </div>
          <p id="visual-effects-description" className="text-xs text-gray-500 dark:text-gray-400">
            Enable or disable animations and effects.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Save Management
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Export your game save to back it up or import a previously saved state.
        </p>
        <div className="mt-4 space-y-4">
          <div>
            <button
              onClick={handleExport}
              disabled={exportMutation.isPending}
              className="inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:opacity-50"
            >
              {exportMutation.isPending ? 'Exporting…' : 'Export Save'}
            </button>
          </div>

          {exportData && (
            <div>
              <label htmlFor="export-data" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Exported Data
              </label>
              <textarea
                id="export-data"
                value={exportData}
                readOnly
                rows={6}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-800 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                aria-label="Exported save data"
              />
              <button
                onClick={handleCopyExport}
                className="mt-2 inline-flex items-center rounded-md border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Copy to Clipboard
              </button>
            </div>
          )}

          <div className="mt-4">
            <label htmlFor="import-data" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Import Save Data
            </label>
            <textarea
              id="import-data"
              value={importData}
              onChange={event => setImportData(event.target.value)}
              rows={6}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              placeholder="Paste exported save data here"
              aria-label="Paste save data to import"
            />
            <button
              onClick={handleImport}
              disabled={importMutation.isPending || !importData}
              className="mt-2 inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {importMutation.isPending ? 'Importing…' : 'Import Save'}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Admin Debug Access
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Enter an admin API key to access debug tools and admin functions.
        </p>
        <div className="mt-4 space-y-3">
          <div>
            <label htmlFor="api-key" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Admin API Key
            </label>
            <input
              id="api-key"
              type="password"
              value={apiKeyInput}
              onChange={event => setApiKeyInput(event.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              placeholder="Enter admin API key"
            />
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleSaveApiKey}
              className="inline-flex items-center rounded-md bg-gray-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500"
            >
              Save API Key
            </button>
            <button
              onClick={toggleAdminPanel}
              className="inline-flex items-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              {showAdminPanel ? 'Hide Admin Panel' : 'Show Admin Panel'}
            </button>
          </div>
        </div>
      </div>

      {showAdminPanel && settings.adminApiKey && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-6 shadow-sm dark:border-orange-900 dark:bg-orange-900/20">
          <AdminPanel apiKey={settings.adminApiKey} />
        </div>
      )}
    </section>
  );
}
