import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppProviders } from './components/AppProviders';
import { App } from './App';
import './styles/global.css';
import { registerSW } from 'virtual:pwa-register';

const updateSW = registerSW({
  onNeedRefresh() {
    updateSW(true);
  },
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </React.StrictMode>
);
