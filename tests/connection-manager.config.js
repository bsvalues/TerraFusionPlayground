/**
 * Jest configuration for ConnectionManager tests
 * 
 * Configures Jest to handle ES modules and mock browser APIs
 */

export default {
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!.*\\.mjs$)'
  ],
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['js', 'mjs', 'cjs', 'jsx', 'ts', 'tsx', 'json', 'node'],
  extensionsToTreatAsEsm: ['.mjs'],  // Removed '.js' to avoid the validation error
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFiles: ['<rootDir>/tests/setup-jest-dom.js'],
  testMatch: ['**/tests/connection-manager-esm.test.js'],
  verbose: true
};