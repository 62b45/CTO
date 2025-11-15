// Jest setup file for Node.js environment (backend testing)

// Set up test timeout for long-running simulations
jest.setTimeout(30000);

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  // Uncomment to ignore specific console methods during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Global test utilities
global.testUtils = {
  // Helper to create mock clock
  createMockClock: (startTime = Date.UTC(2023, 0, 1, 0, 0, 0)) => {
    let currentTime = startTime;
    return {
      now: () => currentTime,
      advance: (ms) => { currentTime += ms; },
      setTime: (time) => { currentTime = time; }
    };
  },

  // Helper to create mock logger
  createMockLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),

  // Helper to create mock repositories
  createMockRepository: () => {
    const data = new Map();
    return {
      findById: jest.fn(async (id) => data.get(id) || null),
      save: jest.fn(async (item) => {
        data.set(item.id, item);
        return item;
      }),
      delete: jest.fn(async (id) => {
        const existed = data.has(id);
        data.delete(id);
        return existed;
      }),
      findAll: jest.fn(async () => Array.from(data.values())),
      clear: jest.fn(() => data.clear()),
    };
  }
};