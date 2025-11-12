# Monorepo

A pnpm workspace monorepo with TypeScript, containing frontend, backend, and shared packages.

## Structure

```
.
├── apps/
│   ├── frontend/     # Frontend application
│   └── backend/      # Backend application
├── packages/
│   └── shared/       # Shared utilities and types
├── package.json      # Root package.json with workspace configuration
├── tsconfig.json     # Base TypeScript configuration
├── .eslintrc.js      # ESLint configuration
├── .prettierrc       # Prettier configuration
└── .env.example      # Environment variables template
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- pnpm (v8 or higher)

### Installation

```bash
pnpm install
```

### Development

```bash
# Start all applications in development mode
pnpm dev

# Start specific applications
pnpm --filter frontend dev
pnpm --filter backend dev
```

### Building

```bash
# Build all packages
pnpm build

# Build specific packages
pnpm --filter frontend build
pnpm --filter backend build
```

### Linting and Formatting

```bash
# Run ESLint
pnpm lint

# Fix ESLint issues
pnpm lint:fix

# Format code with Prettier
pnpm format

# Type check all packages
pnpm type-check
```

## Environment Variables

Copy `.env.example` to `.env` and fill in your environment-specific values:

```bash
cp .env.example .env
```

## Workspace Scripts

- `pnpm -r <command>` - Run command in all packages
- `pnpm --filter <package> <command>` - Run command in specific package
- `pnpm --filter "*frontend*" <command>` - Run command in packages matching pattern

## TypeScript Path Aliases

Shared packages can be imported using path aliases:

```typescript
import { sharedUtility } from '@shared/utils';
```

This is configured in the root `tsconfig.json` and should be inherited by all workspace packages.
