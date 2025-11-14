# Frontend App

Modern React application built with Vite, TypeScript, and Tailwind CSS.

## Features

- ⚛️ React 18 with TypeScript
- ⚡ Vite for fast development and optimized builds
- 🎨 TailwindCSS with custom theme variables
- 🌓 Dark mode support
- 📱 Responsive design primitives
- 🔄 React Router for client-side routing
- 🐻 Zustand for global state management
- 🔍 React Query for server state and data fetching
- 📦 Progressive Web App (PWA) support
- 🔌 Offline capability with service worker
- 🎯 TypeScript path aliases for clean imports

## Getting Started

### Development

```bash
pnpm install
pnpm run dev
```

The app will be available at http://localhost:3000

### Build

```bash
pnpm run build
```

### Preview Production Build

```bash
pnpm run preview
```

## Project Structure

```
src/
├── components/     # Reusable UI components
├── layouts/        # Layout components
├── pages/          # Page components
├── state/          # State management (Zustand stores)
├── lib/            # Utilities and configurations
├── hooks/          # Custom React hooks
└── styles/         # Global styles and CSS
```

## State Management

The app uses Zustand for client state management:

- Theme preferences (light/dark mode)
- Sidebar state
- User information

State is persisted to localStorage automatically.

## API Communication

React Query is configured for:

- Server state management
- Data fetching with caching
- Automatic refetching
- Network error handling

API base URL can be configured via `VITE_API_URL` environment variable.

## PWA Features

The app is configured as a Progressive Web App with:

- Service worker for offline support
- Manifest file for installability
- Asset caching
- API response caching (NetworkFirst strategy)
- Offline fallback page

## Styling

TailwindCSS is configured with:

- Dark mode support via `data-theme` attribute
- Custom CSS variables for theming
- Responsive design utilities
- Custom primary and secondary color palettes

Theme colors are defined in `src/styles/global.css` and can be customized.

## Environment Variables

Create a `.env` file based on `.env.example`:

```
VITE_API_URL=http://localhost:4000
```
