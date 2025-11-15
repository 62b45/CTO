module.exports = {
  preset: 'ts-jest',
  projects: [
    {
      displayName: 'Backend',
      testEnvironment: 'node',
      roots: ['<rootDir>/apps/backend/src', '<rootDir>/packages/shared/src'],
      testMatch: [
        '**/__tests__/**/*.+(ts|tsx|js)',
        '**/*.(test|spec).+(ts|tsx|js)'
      ],
      transform: {
        '^.+\\.(ts|tsx)$': 'ts-jest'
      },
      moduleNameMapping: {
        '^@shared/(.*)$': '<rootDir>/packages/shared/src/$1'
      },
      setupFilesAfterEnv: ['<rootDir>/jest.setup.node.js']
    },
    {
      displayName: 'Frontend',
      testEnvironment: 'jsdom',
      roots: ['<rootDir>/apps/frontend/src'],
      testMatch: [
        '**/__tests__/**/*.+(ts|tsx|js)',
        '**/*.(test|spec).+(ts|tsx|js)'
      ],
      transform: {
        '^.+\\.(ts|tsx)$': 'ts-jest'
      },
      moduleNameMapping: {
        '^@shared/(.*)$': '<rootDir>/packages/shared/src/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
      },
      setupFilesAfterEnv: ['<rootDir>/jest.setup.dom.js'],
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
      transformIgnorePatterns: [
        'node_modules/(?!(.*\\.mjs$|@testing-library|@tanstack))'
      ]
    }
  ],
  collectCoverageFrom: [
    'apps/**/*.{ts,tsx}',
    'packages/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/coverage/**',
    '!jest.config.*',
    '!jest.setup.*',
    '!vite.config.*'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  reporters: [
    'default',
    ['jest-junit', { outputDirectory: 'coverage', outputName: 'junit.xml' }]
  ],
  testTimeout: 30000
};