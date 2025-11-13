import { ChangeEvent } from 'react';
import { useAppStore } from '../state/store';

export function SettingsPage() {
  const { theme, user, setUser, clearUser } = useAppStore();

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    const nextUser = {
      id: user?.id ?? '1',
      name: name === 'name' ? value : user?.name ?? '',
      email: name === 'email' ? value : user?.email ?? '',
    };
    setUser(nextUser);
  };

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">
          Settings
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Configure your preferences and account details.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Theme Preferences
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Current theme: <span className="font-semibold">{theme}</span>
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Toggle theme using the button in the navigation bar.
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Profile
          </h2>
          <form
            className="mt-4 space-y-4"
            onSubmit={(event) => event.preventDefault()}
          >
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
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
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
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="jane@example.com"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={clearUser}
                className="rounded-md border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
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
    </section>
  );
}
