/**
 * Connection Manager Test Runner
 * 
 * This script runs the tests for the ConnectionManager using the custom Jest configuration
 */

console.log('Running ConnectionManager tests...');

const { execSync } = require('child_process');

try {
  // Run Jest with our custom configuration
  execSync('npx jest --config tests/connection-manager.config.cjs', { stdio: 'inherit' });
  console.log('Tests completed successfully');
} catch (error) {
  console.error('Tests failed with error:', error.message);
  process.exit(1);
}