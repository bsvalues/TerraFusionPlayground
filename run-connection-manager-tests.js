/**
 * Connection Manager Test Runner
 * 
 * This script runs the tests for the WebSocket Connection Manager
 */

const { exec } = require('child_process');

// Run Jest with the specific test file
const runTests = () => {
  console.log('Running Connection Manager tests...');
  
  const command = 'npx jest tests/connection-manager-refactor.test.js --verbose';
  
  const childProcess = exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Test execution error: ${error}`);
      return;
    }
    
    console.log(stdout);
    
    if (stderr) {
      console.error(`Test stderr: ${stderr}`);
    }
  });
  
  childProcess.on('exit', code => {
    console.log(`Tests completed with exit code: ${code}`);
  });
};

// Run the tests
runTests();