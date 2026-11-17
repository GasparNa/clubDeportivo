/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: __dirname,
  testMatch: ['**/*.db-spec.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.db.json' }],
  },
  globalSetup: '<rootDir>/global-setup.js',
  maxWorkers: 1,
  testTimeout: 30000,
};
