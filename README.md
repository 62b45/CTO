# Monorepo

A pnpm workspace monorepo with TypeScript, containing frontend, backend, and shared packages.

## Structure

```
.
├── apps/
│   ├── frontend/     # Frontend application (React)
│   └── backend/      # Backend application (Node.js)
├── packages/
│   └── shared/       # Shared utilities and types
├── package.json      # Root package.json with workspace configuration
├── tsconfig.json     # Base TypeScript configuration
├── jest.config.js    # Jest testing configuration
├── jest.setup.node.js # Jest setup for Node.js environment
├── jest.setup.dom.js  # Jest setup for DOM environment
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

### Testing

This monorepo uses Jest for comprehensive testing across all packages:

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage reports
pnpm test:coverage

# Run specific test suites
pnpm --filter backend test
pnpm --filter frontend test
pnpm --filter shared test
```

#### Test Structure

- **Backend Tests**: Located in `apps/backend/src/__tests__/`
  - Service unit tests
  - API endpoint tests
  - Integration tests
  - Simulation tests (100k action validation)

- **Frontend Tests**: Located in `apps/frontend/src/__tests__/`
  - Component tests with React Testing Library
  - Hook tests
  - Integration tests

- **Shared Tests**: Located in `packages/shared/src/__tests__/`
  - Utility function tests
  - Type validation tests
  - Shared test utilities

#### Simulation Testing

The backend includes comprehensive simulation tests that execute 100k+ game actions to validate:

- XP progression balance
- Stat growth scaling
- Combat distribution fairness
- Lootbox probability accuracy
- Cooldown enforcement
- Profession bonus calculations

Run simulations separately:
```bash
pnpm --filter backend test -- simulation
```

#### Test Utilities

Shared test utilities are available in `packages/shared/src/__tests__/testUtils.ts`:

- `TestDataFactory`: Create consistent test data
- `StatisticalAnalyzer`: Analyze test results and distributions
- `BalanceValidator`: Validate game balance metrics
- `PerformanceTester`: Measure execution performance
- `MockDataGenerator`: Generate realistic mock data

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

## Docker Deployment

### Prerequisites

- Docker (v20.10+)
- Docker Compose (v1.29+)

### Quick Start

Start the full stack with a single command:

```bash
docker compose up
```

This will:
1. Build multi-stage images for frontend and backend
2. Start both services with a bridge network
3. Create a persistent volume for SQLite database and JSON files
4. Make the application accessible at `http://localhost`

### Production Build

```bash
# Build images
docker compose build

# Run services
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

### Accessing the Application

- **Frontend**: http://localhost (on port 80)
- **Backend API**: http://localhost:3001
- **API via Frontend**: http://localhost/api/* (proxied through nginx)

### Data Persistence

Both SQLite database (`dev.db`) and JSON data files are stored in a named Docker volume (`game-data`), ensuring data persists across container restarts:

```bash
# Volume location on host
docker volume inspect game-data
```

#### Data Files Stored

- `dev.db` - SQLite database (Prisma ORM)
- `cooldowns.json` - Action cooldown tracking
- `progression.json` - Player progression data
- `professions.json` - Player profession levels
- `inventory.json` - Inventory items tracking
- `dungeons.json` - Dungeon run history
- `arena.json` - Arena battle records

### Environment Variables

Docker services use the following environment variables (configured in `docker-compose.yml`):

**Backend**:
- `NODE_ENV=production` - Environment mode
- `PORT=3001` - Backend port
- `DATABASE_URL=file:/app/data/dev.db` - SQLite database path
- `*_DB_PATH` - JSON file storage paths for legacy data
- `LOG_LEVEL=info` - Logging level

**Frontend**:
- Built with production dependencies only
- API URL automatically configured to proxy through nginx

### Architecture

The deployment uses a multi-stage Docker build:

1. **Backend Builder**: Compiles TypeScript and generates Prisma client
2. **Frontend Builder**: Builds React app with Vite
3. **Backend Runtime**: Node.js runtime with production dependencies
4. **Frontend Runtime**: Nginx web server serving static assets and proxying API requests

### Health Checks

Both services include health checks:

```bash
# Check backend health
curl http://localhost:3001/health

# Check frontend health
curl http://localhost/health
```

Services are automatically restarted if health checks fail.

### Development vs Production

**Development** (local machine):
```bash
pnpm install
pnpm dev
```

**Production** (Docker):
```bash
docker compose up
```

Key differences:
- Docker uses compiled/built artifacts, not source files
- Persistent volumes replace local file system
- Nginx reverse proxy instead of Vite dev server
- Production optimizations enabled

### Troubleshooting

**Check service status:**
```bash
docker compose ps
```

**View service logs:**
```bash
docker compose logs backend
docker compose logs frontend
```

**Restart services:**
```bash
docker compose restart
```

**Reset everything (including data):**
```bash
docker compose down -v
docker compose up
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

This is configured in root `tsconfig.json` and should be inherited by all workspace packages.

## Continuous Integration

Tests are configured to run in CI environments:

- All tests must pass before merging
- Coverage reports are generated and uploaded
- Simulation tests validate game balance
- Performance thresholds are enforced

### CI Test Execution

In CI, tests run with the following configuration:

```bash
# Install dependencies
pnpm install --frozen-lockfile

# Run type checking
pnpm type-check

# Run linting
pnpm lint

# Run all tests with coverage
pnpm test:coverage

# Run simulation tests for balance validation
pnpm --filter backend test -- simulation
```

## Test Coverage

Coverage reports are generated in `coverage/` directory:

- `coverage/lcov-report/` - HTML coverage report
- `coverage/lcov.info` - LCOV format for CI integration
- `coverage/junit.xml` - JUnit XML for test result reporting

### Coverage Thresholds

Minimum coverage thresholds are enforced:
- Statements: 80%
- Branches: 75%
- Functions: 80%
- Lines: 80%

## Game Balance Validation

The simulation test suite ensures game balance through statistical analysis:

### XP Progression
- Validates XP curve formula: `floor(100 * level^1.5)`
- Ensures reasonable time-to-max-level (100-1000 hours)
- Tests stat point allocation and scaling

### Combat Balance
- Validates win rates (30-70% acceptable range)
- Tests damage distribution variance
- Ensures combat duration balance (3-20 rounds average)

### Lootbox Probabilities
- Validates rarity distribution (70/20/8/1.5/0.5%)
- Tests pity system (guarantee at 40 opens)
- Ensures value balance across rarities

### Cooldown Enforcement
- Validates cooldown duration accuracy
- Tests concurrent action prevention
- Ensures multi-player isolation

### Profession Bonuses
- Tests bonus calculation (6% per level)
- Validates profession-action mapping
- Ensures balanced progression across professions