import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '../state/store';

const navigation = [
  { name: 'Dashboard', to: '/' },
  { name: 'About', to: '/about' },
  { name: 'Settings', to: '/settings' },
];

export function Sidebar() {
  const location = useLocation();
  const { sidebarOpen } = useAppStore();

  return (
    <aside
      className={`${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } transform transition-transform duration-200 ease-in-out w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 h-full fixed md:static md:translate-x-0 md:shadow-none z-20`}
    >
      <div className="p-4">
        <nav className="space-y-1">
          {navigation.map(item => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.name}
                to={item.to}
                className={`block px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-700/40 dark:text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
