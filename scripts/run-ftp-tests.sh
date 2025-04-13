#!/bin/bash

# FTP Tests Runner Script
# This script runs all FTP-related tests in the correct order

# Set text formatting options
BOLD="\033[1m"
RED="\033[31m"
GREEN="\033[32m"
YELLOW="\033[33m"
BLUE="\033[34m"
RESET="\033[0m"

# Track overall success
TESTS_PASSED=0
TESTS_FAILED=0
TOTAL_TESTS=0

print_header() {
  echo -e "\n${BOLD}${BLUE}==========================================${RESET}"
  echo -e "${BOLD}${BLUE} $1 ${RESET}"
  echo -e "${BOLD}${BLUE}==========================================${RESET}\n"
}

print_subheader() {
  echo -e "\n${BOLD}${YELLOW}>>> $1 ${RESET}"
}

print_success() {
  echo -e "${GREEN}✓ $1${RESET}"
  TESTS_PASSED=$((TESTS_PASSED + 1))
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

print_failure() {
  echo -e "${RED}✗ $1${RESET}"
  TESTS_FAILED=$((TESTS_FAILED + 1))
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

run_test() {
  TEST_NAME=$1
  TEST_CMD=$2
  
  print_subheader "Running $TEST_NAME"
  echo "Command: $TEST_CMD"
  
  # Run the test and capture exit code
  eval $TEST_CMD
  EXIT_CODE=$?
  
  if [ $EXIT_CODE -eq 0 ]; then
    print_success "$TEST_NAME completed successfully"
    return 0
  else
    print_failure "$TEST_NAME failed with exit code $EXIT_CODE"
    return 1
  fi
}

# Ensure the server isn't running
print_header "FTP TESTS"

# Step 1: Check if the required directories exist
print_subheader "Checking required directories"
if [ ! -d "./downloads" ]; then
  mkdir -p ./downloads
  echo "Created downloads directory"
fi

if [ ! -d "./downloads/test-data" ]; then
  mkdir -p ./downloads/test-data
  echo "Created test-data directory"
fi

if [ ! -d "./logs" ]; then
  mkdir -p ./logs
  echo "Created logs directory"
fi
print_success "Directory checks passed"

# Step 2: Test FTP connection and small sync 
run_test "FTP Connection Test" "node scripts/test-ftp-sync.js --test-connection"

# Step 3: Test FTP directory structure
run_test "FTP Directory Structure Test" "node scripts/test-ftp-sync.js --test-directories"

# Step 4: Test FTP data processor configurations
run_test "FTP Data Processor Configurations Test" "node scripts/test-ftp-data-processor.js --test-configs"

# Step 5: Test FTP data processor field mappings
run_test "FTP Data Processor Field Mappings Test" "node scripts/test-ftp-data-processor.js --test-mappings"

# Step 6: Test FTP data processor parsing
run_test "FTP Data Processor Parsing Test" "node scripts/test-ftp-data-processor.js --test-parsing"

# Step 7: Test FTP synchronization scheduler
run_test "FTP Synchronization Scheduler Test" "node scripts/setup-ftp-cron.js --test"

# Step 8: Test lock mechanism on scheduler
run_test "FTP Lock Mechanism Test" "node tests/ftp-agent-scheduler.test.js"

# Print summary
print_header "TEST SUMMARY"
echo -e "Total tests: ${BOLD}$TOTAL_TESTS${RESET}"
echo -e "Tests passed: ${BOLD}${GREEN}$TESTS_PASSED${RESET}"
if [ $TESTS_FAILED -gt 0 ]; then
  echo -e "Tests failed: ${BOLD}${RED}$TESTS_FAILED${RESET}"
  exit 1
else
  echo -e "${BOLD}${GREEN}All tests passed successfully!${RESET}"
  exit 0
fi