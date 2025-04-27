/**
 * Connection Manager Test Runner
 * 
 * This script runs the tests for the ConnectionManager using the custom Jest configuration
 */

console.log('Running ConnectionManager tests...');

import { execSync } from 'child_process';

try {
  // Run Jest with our custom configuration
  execSync('npx jest --config tests/connection-manager.config.js', { stdio: 'inherit' });
  console.log('Tests completed successfully');
} catch (error) {
  console.error('Tests failed with error:', error.message);
  process.exit(1);
}