// Integration tests (*.int-spec.ts): the built server against a real Postgres
// (see src/test/integration/global-setup.ts).
// Unit tests (*.spec.ts) are configured in package.json and need no database.
/** @type {import('jest').Config} */
module.exports = {
  rootDir: './',
  moduleFileExtensions: ['js', 'json', 'ts', 'tsx'],
  testRegex: '\\.int-spec\\.ts$',
  transform: { '^.+\\.(t|j)sx?$': 'ts-jest' },
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  testEnvironment: 'node',
  globalSetup: '<rootDir>/src/test/integration/global-setup.ts',
  globalTeardown: '<rootDir>/src/test/integration/global-teardown.ts',
  setupFiles: ['<rootDir>/src/test/integration/setup-env.ts'],
  // Test files share one database, so they must not run in parallel.
  maxWorkers: 1,
  testTimeout: 30000,
};
