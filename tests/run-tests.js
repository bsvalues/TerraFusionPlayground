// Test Runner
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for console output
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Test files to run
const testFiles = [
  'api-tests.js',
  'ui-tests.js',
  'test-mcp.js'
];

// Function to run a test file and return a promise
function runTest(testFile) {
  return new Promise((resolve) => {
    const testPath = path.join(__dirname, testFile);
    console.log(`${COLORS.cyan}Running test file: ${testFile}${COLORS.reset}\n`);
    
    const testProcess = spawn('node', [testPath]);
    
    testProcess.stdout.on('data', (data) => {
      process.stdout.write(data.toString());
    });
    
    testProcess.stderr.on('data', (data) => {
      process.stderr.write(`${COLORS.red}${data.toString()}${COLORS.reset}`);
    });
    
    testProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`\n${COLORS.green}✅ Test file passed: ${testFile}${COLORS.reset}\n`);
        resolve(true);
      } else {
        console.log(`\n${COLORS.red}❌ Test file failed: ${testFile}${COLORS.reset}\n`);
        resolve(false);
      }
    });
  });
}

// Run all test files
async function runAllTests() {
  console.log(`\n${COLORS.yellow}==================================${COLORS.reset}`);
  console.log(`${COLORS.yellow}Starting test suite${COLORS.reset}`);
  console.log(`${COLORS.yellow}==================================${COLORS.reset}\n`);
  
  let passed = 0;
  const total = testFiles.length;
  
  for (const testFile of testFiles) {
    const testPassed = await runTest(testFile);
    if (testPassed) passed++;
  }
  
  console.log(`${COLORS.yellow}==================================${COLORS.reset}`);
  console.log(`${COLORS.yellow}Test suite completed: ${passed}/${total} test files passed${COLORS.reset}`);
  console.log(`${COLORS.yellow}==================================${COLORS.reset}\n`);
  
  // Exit with appropriate code
  process.exit(passed === total ? 0 : 1);
}

// Start running the tests
runAllTests();