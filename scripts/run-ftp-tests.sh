#!/bin/bash

# FTP Agent Test Suite
# This script runs various tests to verify FTP agent functionality

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$ROOT_DIR/logs"
TEST_LOG="$LOG_DIR/ftp-test-run.log"
JEST_LOG="$LOG_DIR/ftp-jest-tests.log"

# Create logs directory if it doesn't exist
mkdir -p $LOG_DIR

# Log message with timestamp
log() {
  local level=$1
  local message=$2
  local timestamp=$(date +'%Y-%m-%d %H:%M:%S')
  
  # Format based on log level
  case $level in
    "INFO")
      COLOR="\033[0;36m" # Cyan
      ;;
    "SUCCESS")
      COLOR="\033[0;32m" # Green
      ;;
    "WARNING")
      COLOR="\033[0;33m" # Yellow
      ;;
    "ERROR")
      COLOR="\033[0;31m" # Red
      ;;
    *)
      COLOR="\033[0m" # No color
      ;;
  esac
  
  # Print to console with color
  echo -e "${COLOR}[$timestamp] [$level] $message\033[0m"
  
  # Log to file without color codes
  echo "[$timestamp] [$level] $message" >> $TEST_LOG
}

# Run command and check its return code
run_test() {
  local test_name=$1
  local command=$2
  
  log "INFO" "Running test: $test_name"
  log "INFO" "Command: $command"
  
  # Run the command and capture output
  output=$(eval $command 2>&1)
  exit_code=$?
  
  # Log the output
  echo "$output" >> $TEST_LOG
  
  # Check exit code
  if [ $exit_code -eq 0 ]; then
    log "SUCCESS" "Test '$test_name' passed"
    return 0
  else
    log "ERROR" "Test '$test_name' failed with exit code $exit_code"
    log "ERROR" "Output: $output"
    return 1
  fi
}

# Print banner
print_banner() {
  echo -e "\n\033[1;36m===================================\033[0m"
  echo -e "\033[1;36m    FTP Agent Test Suite Runner    \033[0m"
  echo -e "\033[1;36m===================================\033[0m\n"
}

# Initialize test run
init_test_run() {
  log "INFO" "Starting FTP agent test suite"
  log "INFO" "Logs will be saved to: $TEST_LOG"
  
  # Clear previous log file
  echo "=== FTP AGENT TEST RUN $(date) ===" > $TEST_LOG
}

# Run unit tests with Jest
run_jest_tests() {
  log "INFO" "Running Jest unit tests for FTP agent scheduler"
  
  # Run the Jest tests
  npx jest tests/ftp-agent-scheduler.test.js --verbose > $JEST_LOG 2>&1
  
  if [ $? -eq 0 ]; then
    log "SUCCESS" "Jest unit tests passed successfully"
    return 0
  else
    log "ERROR" "Jest unit tests failed. See $JEST_LOG for details."
    return 1
  fi
}

# Test FTP connection
test_ftp_connection() {
  log "INFO" "Testing FTP server connection"
  run_test "FTP Connection" "node $SCRIPT_DIR/test-ftp-sync.js connect"
}

# Test FTP file listing
test_ftp_listing() {
  log "INFO" "Testing FTP file listing capability"
  # Test listing the root directory
  run_test "FTP Root Directory Listing" "node $SCRIPT_DIR/test-ftp-sync.js list /"
}

# Test FTP status
test_ftp_status() {
  log "INFO" "Testing FTP agent status"
  run_test "FTP Status" "node $SCRIPT_DIR/test-ftp-sync.js status"
}

# Test schedule information
test_schedule_info() {
  log "INFO" "Testing sync schedule information"
  run_test "Schedule Info" "node $SCRIPT_DIR/test-ftp-sync.js info"
}

# Test scheduling configuration
test_scheduling() {
  log "INFO" "Testing sync scheduling configuration"
  
  # Test enabling schedule with 24 hour interval
  run_test "Enable Schedule" "node $SCRIPT_DIR/test-ftp-sync.js schedule --enable --interval=24"
  
  # Test getting schedule info
  run_test "Verify Schedule" "node $SCRIPT_DIR/test-ftp-sync.js info"
  
  # Test disabling schedule
  run_test "Disable Schedule" "node $SCRIPT_DIR/test-ftp-sync.js schedule --disable"
  
  # Verify schedule is disabled
  run_test "Verify Disabled" "node $SCRIPT_DIR/test-ftp-sync.js info"
}

# Test synchronization
test_synchronization() {
  log "INFO" "Testing synchronization functionality"
  
  # Only run if force flag is provided (to avoid unintentional data sync)
  if [ "$FORCE_SYNC" = "true" ]; then
    run_test "Sync Test" "node $SCRIPT_DIR/test-ftp-sync.js sync"
  else
    log "WARNING" "Skipping actual sync test. Use --force to enable."
  fi
}

# Test file download
test_file_download() {
  log "INFO" "Testing file download capability"
  
  # Only run if force flag is provided and a file path is specified
  if [ "$FORCE_SYNC" = "true" ] && [ ! -z "$TEST_FILE" ]; then
    run_test "File Download" "node $SCRIPT_DIR/test-ftp-sync.js download $TEST_FILE"
  else
    log "WARNING" "Skipping file download test. Use --force and --file=/path/to/file to enable."
  fi
}

# Parse command line arguments
parse_args() {
  for arg in "$@"; do
    case $arg in
      --force)
        FORCE_SYNC=true
        ;;
      --file=*)
        TEST_FILE="${arg#*=}"
        ;;
      --quick)
        QUICK_TEST=true
        ;;
      --help)
        show_help
        exit 0
        ;;
    esac
  done
}

# Show help information
show_help() {
  echo "FTP Agent Test Suite"
  echo ""
  echo "Usage: $0 [options]"
  echo ""
  echo "Options:"
  echo "  --force       Enable actual synchronization tests (download/sync)"
  echo "  --file=PATH   Specify a remote file path to test download"
  echo "  --quick       Run only basic tests (skip scheduling tests)"
  echo "  --help        Show this help message"
}

# Main function
main() {
  print_banner
  init_test_run
  parse_args "$@"
  
  # Run Jest unit tests
  run_jest_tests
  
  # Run basic FTP connection tests
  test_ftp_connection
  test_ftp_status
  
  # Skip additional tests if quick mode
  if [ "$QUICK_TEST" = "true" ]; then
    log "INFO" "Running in quick mode, skipping additional tests"
  else
    # Run scheduling tests
    test_schedule_info
    test_scheduling
    
    # Run listing test
    test_ftp_listing
    
    # Run download/sync tests if force flag is provided
    test_synchronization
    test_file_download
  fi
  
  log "SUCCESS" "Test suite completed"
  echo -e "\nTest logs saved to: $TEST_LOG"
  
  if [ -f "$JEST_LOG" ]; then
    echo "Jest test logs saved to: $JEST_LOG"
  fi
}

# Run the main function with all arguments
main "$@"