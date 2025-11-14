import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { useAppStore } from '../state/store';

export function RootLayout() {
  const { sidebarOpen } = useAppStore();

  return (
    <div className="flex flex-col h-full">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-surface p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-10 md:hidden"
          role="presentation"
          onClick={() => useAppStore.getState().toggleSidebar()}
        />
      )}
    </div>
  );
}
