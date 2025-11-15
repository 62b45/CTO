# Testing Guide

This document provides comprehensive information about the testing infrastructure and best practices for this monorepo.

## Overview

The monorepo uses Jest as the primary testing framework across all packages, providing consistent testing for both Node.js (backend) and React (frontend) environments.

## Architecture

### Jest Configuration

The root `jest.config.js` defines two separate projects:

1. **Backend Project** (Node.js Environment)
   - Tests backend services and APIs
   - Uses Node.js environment for server-side testing
   - Located in `apps/backend/src/__tests__/` and `packages/shared/src/__tests__/`

2. **Frontend Project** (DOM Environment)
   - Tests React components and user interactions
   - Uses jsdom environment for DOM simulation
   - Located in `apps/frontend/src/__tests__/`

### Setup Files

- `jest.setup.node.js`: Global setup for backend tests
- `jest.setup.dom.js`: Global setup for frontend tests

## Test Categories

### 1. Unit Tests

**Backend Example:**
```typescript
import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { PlayerProgressionService } from '../progression/service';

describe('PlayerProgressionService', () => {
  let service: PlayerProgressionService;

  beforeEach(() => {
    // Setup before each test
    service = new PlayerProgressionService(mockRepository, mockLogger);
  });

  it('should calculate XP thresholds correctly', () => {
    expect(PlayerProgressionService.calculateXpThreshold(5)).toBe(1118);
  });
});
```

**Frontend Example:**
```typescript
import { render, screen, fireEvent } from './utils';
import PlayerStats from '../components/PlayerStats';

describe('PlayerStats Component', () => {
  it('should render player information', async () => {
    render(<PlayerStats playerId="test-player" />);
    
    expect(await screen.findByText('Test Player')).toBeInTheDocument();
  });
});
```

### 2. Integration Tests

Integration tests verify that multiple components work together correctly:

```typescript
describe('Combat Integration', () => {
  it('should integrate combat service with progression', async () => {
    const combatService = new CombatService();
    const progressionService = new PlayerProgressionService(repository);
    
    const result = await combatService.simulateCombat(request);
    await progressionService.addExperience(playerId, result.rewards.experience);
    
    const player = await progressionService.getOrCreatePlayer(playerId);
    expect(player.experience).toBeGreaterThan(0);
  });
});
```

### 3. Simulation Tests

Large-scale simulation tests validate game balance through statistical analysis:

```typescript
describe('Game Balance Simulation (100k Actions)', () => {
  it('should maintain balanced progression over 100k hunt actions', async () => {
    const results = await runSimulation();
    
    expect(results.levelsGained).toBeGreaterThan(0);
    expect(results.levelsGained).toBeLessThan(100);
    expect(results.cooldownViolations).toBe(0);
  });
});
```

## Test Utilities

### Shared Test Utilities

Located in `packages/shared/src/__tests__/testUtils.ts`:

#### TestDataFactory
Creates consistent test data objects:
```typescript
const playerStats = TestDataFactory.createPlayerStats({ level: 5 });
const enemyTemplate = TestDataFactory.createGoblinEnemy();
```

#### StatisticalAnalyzer
Analyzes test results and distributions:
```typescript
const analysis = StatisticalAnalyzer.distributionAnalysis(experienceValues);
expect(analysis.mean).toBeWithinRange(25, 35);
```

#### BalanceValidator
Validates game balance metrics:
```typescript
const balance = BalanceValidator.validateExperienceCurve(levels, xpPerLevel);
expect(balance.isBalanced).toBe(true);
```

#### PerformanceTester
Measures execution performance:
```typescript
const { result, averageTime } = await PerformanceTester.measureExecutionTime(
  () => combatService.simulateCombat(request),
  1000
);
expect(averageTime).toBeLessThan(10); // 10ms threshold
```

### Frontend Test Utilities

Located in `apps/frontend/src/__tests__/utils.tsx`:

```typescript
import { renderWithProviders, screen, fireEvent } from './utils';

// Render with React Query and Router
const { container } = renderWithProviders(<MyComponent />);

// Mock API responses
const mockResponse = createMockApiResponse({ data: 'test' });
global.fetch.mockResolvedValue(mockResponse);
```

## Running Tests

### Basic Commands

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run specific test file
pnpm test PlayerProgressionService

# Run tests matching pattern
pnpm test -- --testNamePattern="should calculate XP"
```

### Package-Specific Testing

```bash
# Backend tests only
pnpm --filter backend test

# Frontend tests only
pnpm --filter frontend test

# Shared package tests only
pnpm --filter shared test
```

### Simulation Testing

```bash
# Run simulation tests
pnpm --filter backend test -- simulation

# Run specific simulation
pnpm --filter backend test -- gameBalanceSimulation
```

## Coverage Reports

Coverage reports are generated in the `coverage/` directory:

### Viewing Reports

```bash
# Generate and open HTML coverage report
pnpm test:coverage
open coverage/lcov-report/index.html
```

### Coverage Thresholds

Minimum coverage thresholds are enforced:
- Statements: 80%
- Branches: 75%
- Functions: 80%
- Lines: 80%

### Coverage Exclusions

The following patterns are excluded from coverage:
- `**/*.d.ts` - Type definition files
- `**/node_modules/**` - Dependencies
- `**/dist/**` - Build outputs
- `**/coverage/**` - Coverage files
- `jest.config.*` - Configuration files
- `**/__tests__/**` - Test files themselves

## Best Practices

### Test Organization

1. **File Structure**: Place tests in `__tests__/` directories alongside source code
2. **Naming**: Use `.test.ts` or `.spec.ts` suffixes
3. **Grouping**: Use `describe` blocks to group related tests
4. **Setup**: Use `beforeEach` for consistent test setup

### Test Writing

1. **AAA Pattern**: Arrange, Act, Assert
```typescript
it('should level up player', async () => {
  // Arrange
  const service = new ProgressionService(repository);
  await service.addExperience(playerId, 500);
  
  // Act
  const result = await service.levelUp(playerId);
  
  // Assert
  expect(result.level).toBe(2);
});
```

2. **Descriptive Names**: Test names should describe what is being tested
3. **One Assertion**: Prefer one assertion per test when possible
4. **Mocking**: Mock external dependencies and side effects

### Backend Testing

1. **Service Tests**: Test business logic in isolation
2. **Repository Tests**: Test data access patterns
3. **API Tests**: Test HTTP endpoints with supertest
4. **Integration Tests**: Test service interactions

### Frontend Testing

1. **Component Tests**: Test component rendering and behavior
2. **Hook Tests**: Test custom hooks in isolation
3. **User Interaction**: Simulate user actions with fireEvent
4. **API Integration**: Mock API calls and test loading states

## Simulation Testing

### Purpose

Simulation tests validate game balance through large-scale automated testing:

- Execute 100k+ game actions
- Analyze statistical distributions
- Validate balance constraints
- Detect regressions

### Key Metrics

#### XP Progression
- Time-to-max-level: 100-1000 hours
- Level growth rate consistency
- Stat point allocation balance

#### Combat Balance
- Win rates: 30-70% acceptable range
- Damage distribution variance
- Combat duration: 3-20 rounds average

#### Lootbox Probabilities
- Rarity distribution: 70/20/8/1.5/0.5%
- Pity system: Guarantee at 40 opens
- Value balance across rarities

#### Cooldown Enforcement
- Duration accuracy: ±5% tolerance
- Concurrent action prevention
- Multi-player isolation

#### Profession Bonuses
- Bonus calculation: 6% per level
- Profession-action mapping
- Balanced progression across professions

### Running Simulations

```bash
# Full simulation suite (100k actions)
pnpm --filter backend test -- simulation

# Quick simulation (10k actions for development)
SIMULATION_ACTIONS=10000 pnpm --filter backend test -- simulation

# Specific simulation test
pnpm --filter backend test -- gameBalanceSimulation
```

## Continuous Integration

### CI Pipeline

Tests run automatically in CI with the following steps:

1. **Dependency Installation**: `pnpm install --frozen-lockfile`
2. **Type Checking**: `pnpm type-check`
3. **Linting**: `pnpm lint`
4. **Testing**: `pnpm test:coverage`
5. **Simulation**: `pnpm --filter backend test -- simulation`

### Quality Gates

- All tests must pass
- Coverage thresholds must be met
- Simulation balance checks must pass
- Performance thresholds must be met

### Artifacts

- Coverage reports uploaded to CI
- Test results in JUnit format
- Simulation metrics summary
- Performance benchmark data

## Troubleshooting

### Common Issues

1. **Import Errors**: Check Jest module mapping in configuration
2. **Timeout Issues**: Increase test timeout with `jest.setTimeout()`
3. **Mock Issues**: Ensure mocks are properly configured
4. **Async Tests**: Use proper async/await patterns

### Debugging

```bash
# Run tests in debug mode
node --inspect-brk node_modules/.bin/jest --runInBand

# Run specific test with verbose output
pnpm test -- --verbose --testNamePattern="specific test"

# Run tests with coverage for specific file
pnpm test -- --coverage --collectCoverageOnlyFrom=src/service.ts
```

### Performance

- Use `--runInBand` for memory-intensive tests
- Limit concurrent workers: `--maxWorkers=4`
- Use selective test execution during development

## Mocking Strategies

### Backend Mocking

```typescript
// Mock repository
const mockRepository = {
  findById: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
};

// Mock external service
jest.mock('../external/api', () => ({
  fetchData: jest.fn().mockResolvedValue({ data: 'mock' }),
}));
```

### Frontend Mocking

```typescript
// Mock React Query
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQuery: jest.fn(),
}));

// Mock API module
jest.mock('../api/player', () => ({
  getPlayerStats: jest.fn(),
}));
```

## Future Enhancements

### Planned Improvements

1. **Visual Testing**: Add screenshot comparison tests
2. **E2E Testing**: Add Playwright for end-to-end testing
3. **Performance Testing**: Enhanced performance benchmarking
4. **Load Testing**: Add load testing simulation
5. **Contract Testing**: API contract testing

### Test Metrics

Track these metrics over time:
- Test execution time
- Coverage percentage
- Test flakiness rate
- Simulation balance metrics
- Performance benchmarks

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest Matchers](https://jestjs.io/docs/using-matchers)
- [Mock Functions](https://jestjs.io/docs/mock-functions)
- [Async Testing](https://jestjs.io/docs/asynchronous)