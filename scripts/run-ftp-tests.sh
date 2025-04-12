#!/bin/bash

# FTP Agent Test Runner Script
# This script runs the tests for the FTP agent's scheduling functionality

# Check if Jest is installed
if ! which jest >/dev/null; then
  echo "Jest not found, using npx to run tests"
  TEST_CMD="npx jest"
else
  TEST_CMD="jest"
fi

echo "Running FTP Agent tests..."

# Run the FTP agent scheduler tests
$TEST_CMD tests/ftp-agent-scheduler.test.js --verbose

# Check if the manual test script was requested
if [ "$1" == "manual" ]; then
  echo ""
  echo "Running manual FTP sync test script..."
  echo "Checking current FTP status..."
  node scripts/test-ftp-sync.js status
  
  echo ""
  echo "To test other commands, run any of the following:"
  echo "  node scripts/test-ftp-sync.js schedule [hours]"
  echo "  node scripts/test-ftp-sync.js run-once"
  echo "  node scripts/test-ftp-sync.js test-overlap"
  echo "  node scripts/test-ftp-sync.js disable"
fi

echo ""
echo "Testing complete!"