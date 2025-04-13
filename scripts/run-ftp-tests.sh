#!/bin/bash

# Run FTP Tests Script
# This script runs all the FTP-related tests to ensure the FTP functionality is working properly

echo "=== Running FTP Service and Agent Tests ==="

# Test FTP synchronization
echo -e "\n>>> Testing FTP synchronization..."
node scripts/test-ftp-sync.js

# Test FTP data processor 
echo -e "\n>>> Testing FTP data processor..."
node scripts/test-ftp-data-processor.js

echo -e "\n=== All FTP tests completed ==="