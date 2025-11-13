export function AboutPage() {
  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">
          About
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Learn more about this application and its features
        </p>
      </header>

      <div className="prose dark:prose-invert max-w-none">
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
          <h2 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-4">
            Technology Stack
          </h2>
          <ul className="space-y-3 text-gray-700 dark:text-gray-300">
            <li className="flex items-start">
              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary-100 text-primary-600 dark:bg-primary-600/20 dark:text-primary-400 mr-3 flex-shrink-0">
                ✓
              </span>
              <div>
                <strong>React 18</strong> - Modern React with hooks and concurrent features
              </div>
            </li>
            <li className="flex items-start">
              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary-100 text-primary-600 dark:bg-primary-600/20 dark:text-primary-400 mr-3 flex-shrink-0">
                ✓
              </span>
              <div>
                <strong>TypeScript</strong> - Type-safe development experience
              </div>
            </li>
            <li className="flex items-start">
              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary-100 text-primary-600 dark:bg-primary-600/20 dark:text-primary-400 mr-3 flex-shrink-0">
                ✓
              </span>
              <div>
                <strong>Vite</strong> - Lightning-fast build tool and dev server
              </div>
            </li>
            <li className="flex items-start">
              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary-100 text-primary-600 dark:bg-primary-600/20 dark:text-primary-400 mr-3 flex-shrink-0">
                ✓
              </span>
              <div>
                <strong>TailwindCSS</strong> - Utility-first CSS framework with custom theme
              </div>
            </li>
            <li className="flex items-start">
              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary-100 text-primary-600 dark:bg-primary-600/20 dark:text-primary-400 mr-3 flex-shrink-0">
                ✓
              </span>
              <div>
                <strong>React Router</strong> - Client-side routing
              </div>
            </li>
            <li className="flex items-start">
              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary-100 text-primary-600 dark:bg-primary-600/20 dark:text-primary-400 mr-3 flex-shrink-0">
                ✓
              </span>
              <div>
                <strong>Zustand</strong> - Lightweight state management
              </div>
            </li>
            <li className="flex items-start">
              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary-100 text-primary-600 dark:bg-primary-600/20 dark:text-primary-400 mr-3 flex-shrink-0">
                ✓
              </span>
              <div>
                <strong>React Query</strong> - Server state and data fetching
              </div>
            </li>
            <li className="flex items-start">
              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary-100 text-primary-600 dark:bg-primary-600/20 dark:text-primary-400 mr-3 flex-shrink-0">
                ✓
              </span>
              <div>
                <strong>PWA Support</strong> - Offline capability and installable app
              </div>
            </li>
          </ul>
        </div>

        <div className="mt-6 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
          <h2 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-4">
            Features
          </h2>
          <ul className="space-y-2 text-gray-700 dark:text-gray-300">
            <li>✨ Responsive design primitives</li>
            <li>🎨 Dark mode support with theme toggle</li>
            <li>🔄 Persistent state management</li>
            <li>📱 Progressive Web App capabilities</li>
            <li>⚡ Optimized build and development experience</li>
            <li>🌐 Offline caching with service worker</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
