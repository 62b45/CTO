import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../lib/api';
import { createSuccessResponse, formatUserName, User } from '@shared';

export function HomePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['sample-user'],
    queryFn: async () => {
      const response = await fetchApi<User>('/users/me');
      if (!response.success || !response.data) {
        return createSuccessResponse<User>({
          id: '1',
          name: 'Jane Doe',
          email: 'jane@example.com',
          createdAt: new Date(),
          updatedAt: new Date(),
        }).data;
      }
      return response.data;
    },
  });

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">
          Welcome back
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Manage your application state with React Query, Zustand, and React
          Router.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            User summary
          </h2>
          {isLoading ? (
            <p className="mt-4 text-gray-500 dark:text-gray-400">Loading...</p>
          ) : (
            <dl className="mt-4 space-y-2">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
                <dt>Name</dt>
                <dd className="font-medium text-gray-900 dark:text-white">
                  {data ? formatUserName(data) : 'Unknown'}
                </dd>
              </div>
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
                <dt>Email</dt>
                <dd className="font-medium text-gray-900 dark:text-white">
                  {data?.email ?? 'unknown@example.com'}
                </dd>
              </div>
            </dl>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Quick actions
          </h2>
          <div className="mt-4 grid gap-3">
            <button className="inline-flex items-center justify-center rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500">
              Sync data
            </button>
            <button className="inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
              Manage settings
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
