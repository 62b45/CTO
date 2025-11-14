import { Routes, Route } from 'react-router-dom';
import { RootLayout } from './layouts/RootLayout';
import { HomePage } from './pages/Home';
import { DashboardPage } from './pages/Dashboard';
import { AboutPage } from './pages/About';
import { SettingsPage } from './pages/Settings';
import { InventoryPage } from './pages/Inventory';
import { CraftingPage } from './pages/Crafting';
import { DungeonsPage } from './pages/Dungeons';
import { ArenaPage } from './pages/Arena';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<RootLayout />}>
        <Route index element={<HomePage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="crafting" element={<CraftingPage />} />
        <Route path="dungeons" element={<DungeonsPage />} />
        <Route path="arena" element={<ArenaPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
