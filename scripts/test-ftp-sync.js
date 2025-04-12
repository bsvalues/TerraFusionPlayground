/**
 * Manual Test Script for FTP Data Agent Synchronization
 * 
 * This script helps verify that the enhanced FTP data synchronization features
 * work as expected in a live environment. It provides a command-line interface
 * to test various scheduling scenarios.
 * 
 * Usage:
 * node scripts/test-ftp-sync.js [command]
 * 
 * Commands:
 *   test-connection    - Test FTP server connection
 *   schedule [hours]   - Schedule recurring sync with specified interval hours
 *   disable            - Disable scheduled sync
 *   run-once           - Trigger a one-time synchronization
 *   status             - View current FTP and sync status
 *   test-overlap       - Simulate overlapping sync scenarios
 */

require('dotenv').config();
const { FtpDataAgent } = require('../server/services/agents/ftp-data-agent');
const { FtpService } = require('../server/services/ftp-service');
const { DataImportService } = require('../server/services/data-import-service');
const { MCPService } = require('../server/services/mcp-service');
const { PgStorage, MemStorage } = require('../server/storage');

// Determine which storage to use based on environment
async function createStorage() {
  if (process.env.DATABASE_URL) {
    console.log('Using PostgreSQL storage');
    return new PgStorage();
  } else {
    console.log('Using in-memory storage');
    return new MemStorage();
  }
}

// Initialize services
async function initializeServices() {
  const storage = await createStorage();
  const ftpService = new FtpService();
  const dataImportService = new DataImportService(storage);
  const mcpService = new MCPService(storage);
  
  // Initialize the FTP agent
  const ftpAgent = new FtpDataAgent(storage, mcpService, ftpService, dataImportService);
  await ftpAgent.initialize();
  
  return { storage, ftpAgent };
}

// Format the output of agent responses for better readability
function formatAgentResponse(response) {
  if (!response) return 'No response received';
  
  // Clone the response to avoid modifying the original
  const formatted = JSON.parse(JSON.stringify(response));
  
  // Hide some verbose fields for better readability
  if (formatted.result && formatted.result.recentActivity) {
    formatted.result.recentActivity = '[Activity data hidden for brevity]';
  }
  
  return JSON.stringify(formatted, null, 2);
}

// Main function to run the requested command
async function run() {
  try {
    const command = process.argv[2] || 'help';
    const { storage, ftpAgent } = await initializeServices();
    
    console.log(`Executing command: ${command}`);
    
    switch (command) {
      case 'test-connection':
        // Test connection to FTP server
        const connectionResult = await ftpAgent.testFtpConnection();
        console.log('\nFTP Connection Test Results:');
        console.log(formatAgentResponse(connectionResult));
        break;
        
      case 'schedule':
        // Schedule recurring sync with provided interval
        const hours = parseInt(process.argv[3]) || 24;
        const scheduleResult = await ftpAgent.scheduleFtpSync({ 
          enabled: true, 
          intervalHours: hours 
        });
        console.log(`\nScheduled FTP sync every ${hours} hours:`);
        console.log(formatAgentResponse(scheduleResult));
        
        // Also show the human-readable schedule info
        const scheduleInfo = ftpAgent.getSyncScheduleInfo();
        console.log('\nHuman-readable Schedule Information:');
        console.log(JSON.stringify(scheduleInfo, null, 2));
        break;
        
      case 'disable':
        // Disable scheduled sync
        const disableResult = await ftpAgent.scheduleFtpSync({ enabled: false });
        console.log('\nDisabled FTP sync schedule:');
        console.log(formatAgentResponse(disableResult));
        break;
        
      case 'run-once':
        // Run a one-time sync
        console.log('\nTriggering one-time sync...');
        const runOnceResult = await ftpAgent.scheduleFtpSync({ runOnce: true });
        console.log('One-time sync request result:');
        console.log(formatAgentResponse(runOnceResult));
        
        // Keep the process alive for a bit to allow the sync to run
        console.log('\nWaiting for sync to complete (30 seconds)...');
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        // Check status after the sync
        const statusAfterSync = await ftpAgent.getFtpStatus();
        console.log('\nStatus after one-time sync:');
        console.log(formatAgentResponse(statusAfterSync));
        break;
        
      case 'status':
        // Get current FTP and sync status
        const statusResult = await ftpAgent.getFtpStatus();
        console.log('\nCurrent FTP Status:');
        console.log(formatAgentResponse(statusResult));
        break;
        
      case 'test-overlap':
        // Simulate overlapping sync scenarios
        console.log('\nTesting overlap prevention...');
        
        // Schedule with 1 hour interval
        await ftpAgent.scheduleFtpSync({ 
          enabled: true, 
          intervalHours: 1 
        });
        
        // Simulate starting a sync
        console.log('Starting first sync...');
        ftpAgent.schedule.lastRun = new Date();
        
        // Prevent the real scheduled sync from running in test
        const originalRun = ftpAgent.runScheduledSync;
        ftpAgent.runScheduledSync = async () => {
          console.log('Mock sync running...');
          // Simulate a long-running sync by delaying
          await new Promise(resolve => setTimeout(resolve, 5000));
          console.log('Mock sync completed!');
          return true;
        };
        
        // Try to trigger an immediate sync while one is "running"
        console.log('Attempting to trigger second sync while first is running...');
        await ftpAgent.scheduleFtpSync({ runOnce: true });
        
        // Wait for the simulated sync to complete
        await new Promise(resolve => setTimeout(resolve, 6000));
        
        // Restore the original function
        ftpAgent.runScheduledSync = originalRun;
        
        // Verify the status
        const overlapStatus = await ftpAgent.getFtpStatus();
        console.log('\nStatus after overlap test:');
        console.log(formatAgentResponse(overlapStatus));
        break;
        
      case 'help':
      default:
        console.log(`
Available commands:
  test-connection    - Test FTP server connection
  schedule [hours]   - Schedule recurring sync with specified interval hours
  disable            - Disable scheduled sync
  run-once           - Trigger a one-time synchronization
  status             - View current FTP and sync status
  test-overlap       - Simulate overlapping sync scenarios
        `);
    }
    
    console.log('\nTest completed. Shutting down...');
    await ftpAgent.shutdown();
    process.exit(0);
  } catch (error) {
    console.error('Error executing test script:', error);
    process.exit(1);
  }
}

// Run the script
run();