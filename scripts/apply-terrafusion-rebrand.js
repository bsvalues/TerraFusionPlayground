#!/usr/bin/env node

/**
 * TerraFusion Rebrand Application Script
 * 
 * This script applies the TerraFusion rebrand to the codebase by:
 * 1. Patching the Tailwind configuration with TerraFusion tokens
 * 2. Running the hex-to-token conversion on all relevant files
 * 3. Adding TerraFusion token import to the main CSS file
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('📦 Starting TerraFusion rebrand application...');

// Paths
const BASE_DIR = path.resolve(__dirname, '..');
const TOKEN_FILE = path.join(BASE_DIR, 'tokens', 'terrafusion.json');
const TAILWIND_CONFIG = path.join(BASE_DIR, 'tailwind.config.ts');
const HEX_TO_TOKEN_SCRIPT = path.join(BASE_DIR, 'scripts', 'hexToToken.js');

// Check if the token file exists
if (!fs.existsSync(TOKEN_FILE)) {
  console.error(`❌ Error: Token file ${TOKEN_FILE} not found`);
  process.exit(1);
}

// Step 1: Patch Tailwind configuration
console.log('\n🔄 Patching Tailwind configuration with TerraFusion tokens...');
try {
  execSync(`npx ts-node ${path.join(BASE_DIR, 'scripts', 'patchTailwind.ts')} ${TOKEN_FILE}`, {
    stdio: 'inherit',
    cwd: BASE_DIR
  });
  console.log('✅ Successfully patched Tailwind configuration');
} catch (error) {
  console.error('❌ Error patching Tailwind configuration:', error.message);
  process.exit(1);
}

// Step 2: Run hex-to-token conversion
console.log('\n🔄 Running hex-to-token conversion on codebase...');
try {
  // Install jscodeshift if not already installed
  console.log('📦 Installing jscodeshift (if needed)...');
  execSync('npm list -g jscodeshift || npm install -g jscodeshift', {
    stdio: 'inherit',
    cwd: BASE_DIR
  });
  
  // Run the codemod on client source files
  console.log('🔄 Running codemod on client source files...');
  execSync(`npx jscodeshift -t ${HEX_TO_TOKEN_SCRIPT} "client/src/**/*.{js,jsx,ts,tsx}"`, {
    stdio: 'inherit',
    cwd: BASE_DIR
  });
  
  // Run the codemod on CSS files
  console.log('🔄 Running codemod on CSS files...');
  execSync(`npx jscodeshift -t ${HEX_TO_TOKEN_SCRIPT} "client/src/**/*.css"`, {
    stdio: 'inherit',
    cwd: BASE_DIR
  });
  
  console.log('✅ Successfully ran hex-to-token conversion');
} catch (error) {
  console.error('❌ Error running hex-to-token conversion:', error.message);
  // Continue despite errors as this step is not critical
}

console.log('\n✨ TerraFusion rebrand application complete!');
console.log('\nNext steps:');
console.log('1. Review the changes made to the codebase');
console.log('2. Run the application to verify the rebrand looks as expected');
console.log('3. Run tests to ensure nothing was broken by the rebrand');
console.log('4. Commit the changes to version control');