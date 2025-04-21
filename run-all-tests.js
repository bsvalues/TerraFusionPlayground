/**
 * Master Test Runner
 * 
 * This script runs all the test scripts and provides a summary of results.
 */

const { spawn } = require('child_process');
const path = require('path');

// List of test scripts to run
const testScripts = [
  'test-frontend-errors.js',
  'test-agent-functionality.js',
  'test-database-integrity.js',
  'test-llm-integration.js',
  'test-gis-functionality.js'
];

// Helper function to run a test script
function runTestScript(scriptPath) {
  return new Promise((resolve, reject) => {
    console.log(`\n============================================`);
    console.log(`RUNNING TEST: ${path.basename(scriptPath)}`);
    console.log(`============================================\n`);
    
    const testProcess = spawn('node', [scriptPath], {
      stdio: 'inherit',
      env: process.env
    });
    
    testProcess.on('close', (code) => {
      const success = code === 0;
      console.log(`\n${path.basename(scriptPath)} completed with status: ${success ? 'SUCCESS' : 'FAILURE'}`);
      resolve({ script: path.basename(scriptPath), success });
    });
    
    testProcess.on('error', (error) => {
      console.error(`Error executing ${scriptPath}:`, error);
      resolve({ script: path.basename(scriptPath), success: false, error: error.message });
    });
  });
}

// Run all tests and collect results
async function runAllTests() {
  console.log('===== STARTING COMPREHENSIVE SYSTEM TESTS =====\n');
  
  const startTime = Date.now();
  const results = [];
  
  for (const script of testScripts) {
    try {
      const result = await runTestScript(script);
      results.push(result);
    } catch (error) {
      console.error(`Unexpected error running ${script}:`, error);
      results.push({ script, success: false, error: error.message });
    }
  }
  
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  
  // Print test summary
  console.log('\n===== TEST RESULTS SUMMARY =====');
  console.log(`Total Tests: ${results.length}`);
  console.log(`Passed: ${results.filter(r => r.success).length}`);
  console.log(`Failed: ${results.filter(r => !r.success).length}`);
  console.log(`Time Taken: ${duration.toFixed(2)} seconds`);
  console.log('\nDetailed Results:');
  
  results.forEach(result => {
    console.log(`${result.script}: ${result.success ? 'PASSED' : 'FAILED'}${result.error ? ` (${result.error})` : ''}`);
  });
  
  // Check for any node/puppeteer dependencies
  try {
    require('puppeteer');
    console.log('\nPuppeteer is available for frontend testing');
  } catch (error) {
    console.warn('\nPuppeteer is not installed. Frontend tests may fail.');
    console.warn('Run: npm install puppeteer');
  }
  
  try {
    require('node-fetch');
    console.log('node-fetch is available for API testing');
  } catch (error) {
    console.warn('node-fetch is not installed. API tests may fail.');
    console.warn('Run: npm install node-fetch@2');
  }
  
  console.log('\n===== SYSTEM TESTS COMPLETED =====');
}

// Execute all tests
runAllTests().catch(error => {
  console.error('Unhandled error in test runner:', error);
  process.exit(1);
});