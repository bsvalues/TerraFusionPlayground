/**
 * FTP Agent Test Script
 * 
 * This script provides a command-line interface for testing the FTP data agent directly.
 * It can be used to verify connection, sync data, check status, and more.
 * 
 * Usage:
 *   node scripts/test-ftp-sync.js <command> [options]
 * 
 * Commands:
 *   connect               Test connection to FTP server
 *   status                Get current FTP status
 *   info                  Get schedule information
 *   sync [path]           Synchronize data from path (or all if not specified)
 *   list <path>           List files in directory
 *   download <path>       Download a specific file
 *   schedule <options>    Configure synchronization schedule
 * 
 * Options for schedule:
 *   --enable              Enable scheduled synchronization
 *   --disable             Disable scheduled synchronization
 *   --interval=X          Set interval in hours (1-168)
 *   --once                Run once immediately
 * 
 * Examples:
 *   node scripts/test-ftp-sync.js connect
 *   node scripts/test-ftp-sync.js sync /valuations
 *   node scripts/test-ftp-sync.js schedule --enable --interval=12
 *   node scripts/test-ftp-sync.js schedule --once
 */

const { AgentSystem } = require('../server/services/agent-system');
const { MemStorage } = require('../server/storage');
const path = require('path');
const fs = require('fs');

// Create output directories if they don't exist
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Configuration
const LOG_DIR = path.join(__dirname, '../logs');
const DOWNLOADS_DIR = path.join(__dirname, '../downloads');
ensureDirectoryExists(LOG_DIR);
ensureDirectoryExists(DOWNLOADS_DIR);

// Helper function to log to console and file
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  // Log to console with color
  const colors = {
    info: '\x1b[36m%s\x1b[0m',     // Cyan
    success: '\x1b[32m%s\x1b[0m',  // Green
    warn: '\x1b[33m%s\x1b[0m',     // Yellow
    error: '\x1b[31m%s\x1b[0m'     // Red
  };
  
  console.log(colors[level] || colors.info, formattedMessage);
  
  // Log to file
  const logFile = path.join(LOG_DIR, 'ftp-test.log');
  fs.appendFileSync(logFile, formattedMessage + '\n');
}

// Format JSON output nicely
function formatJson(obj) {
  return JSON.stringify(obj, null, 2);
}

// FTP Agent Command Handler
class FtpAgentTester {
  constructor() {
    this.storage = new MemStorage();
    this.agentSystem = new AgentSystem(this.storage);
  }
  
  async initialize() {
    log('Initializing agent system...', 'info');
    await this.agentSystem.initialize();
    this.ftpAgent = this.agentSystem.getAgent('ftp-data-agent');
    
    if (!this.ftpAgent) {
      log('FTP Agent not found in the agent system', 'error');
      process.exit(1);
    }
    
    log('FTP Agent initialized successfully', 'success');
  }
  
  async testConnection() {
    log('Testing connection to FTP server...', 'info');
    const result = await this.ftpAgent.handleRequest({
      action: 'testFtpConnection',
      parameters: {}
    });
    
    if (result.success) {
      log('Successfully connected to FTP server', 'success');
      log(`Server details: ${result.result.server}`, 'info');
      log(`Feature support: ${formatJson(result.result.features)}`, 'info');
    } else {
      log(`Connection failed: ${result.error}`, 'error');
    }
    
    return result;
  }
  
  async getStatus() {
    log('Fetching FTP agent status...', 'info');
    const result = await this.ftpAgent.handleRequest({
      action: 'getFtpStatus',
      parameters: {}
    });
    
    if (result.success) {
      log('Status retrieved successfully', 'success');
      log(`Connection: ${result.result.connection.connected ? 'Connected' : 'Disconnected'}`, 'info');
      log(`Last sync: ${result.result.lastSync || 'Never'}`, 'info');
      log(`Next sync: ${result.result.schedule.nextSyncFormatted || 'Not scheduled'}`, 'info');
      log(`Success rate: ${result.result.syncStats.successRate}%`, 'info');
      log(`Settings: ${formatJson(result.result.settings)}`, 'info');
    } else {
      log(`Failed to get status: ${result.error}`, 'error');
    }
    
    return result;
  }
  
  async getScheduleInfo() {
    log('Fetching schedule information...', 'info');
    const result = await this.ftpAgent.handleRequest({
      action: 'getSyncScheduleInfo',
      parameters: {}
    });
    
    if (result.success) {
      log('Schedule info retrieved successfully', 'success');
      log(`Current schedule: ${result.result.scheduleDescription}`, 'info');
      log(`Next sync: ${result.result.nextRunDescription}`, 'info');
      log(`Status: ${result.result.status}`, 'info');
    } else {
      log(`Failed to get schedule info: ${result.error}`, 'error');
    }
    
    return result;
  }
  
  async synchronizeData(remotePath) {
    const path = remotePath || '';
    log(`Synchronizing data from ${path || 'root directory'}...`, 'info');
    
    const result = await this.ftpAgent.handleRequest({
      action: 'synchronizeFtpData',
      parameters: { path, force: true }
    });
    
    if (result.success) {
      log('Synchronization completed successfully', 'success');
      log(`Files processed: ${result.result.filesProcessed}`, 'info');
      log(`Files downloaded: ${result.result.filesDownloaded}`, 'info');
      log(`Bytes transferred: ${result.result.bytesTransferred}`, 'info');
      log(`Duration: ${result.result.duration}ms`, 'info');
    } else {
      log(`Synchronization failed: ${result.error}`, 'error');
    }
    
    return result;
  }
  
  async listFiles(remotePath) {
    if (!remotePath) {
      log('Path is required for listing files', 'error');
      return { success: false, error: 'Path is required' };
    }
    
    log(`Listing files in ${remotePath}...`, 'info');
    const result = await this.ftpAgent.handleRequest({
      action: 'listFtpFiles',
      parameters: { path: remotePath }
    });
    
    if (result.success) {
      log(`Found ${result.result.files.length} files in ${remotePath}`, 'success');
      result.result.files.forEach(file => {
        const type = file.isDirectory ? 'DIR' : 'FILE';
        const size = file.isDirectory ? '--' : `${file.size} bytes`;
        const modified = new Date(file.modifiedAt).toLocaleString();
        log(`[${type}] ${file.name} (${size}) - Last modified: ${modified}`, 'info');
      });
    } else {
      log(`Failed to list files: ${result.error}`, 'error');
    }
    
    return result;
  }
  
  async downloadFile(remotePath) {
    if (!remotePath) {
      log('Remote path is required for downloading file', 'error');
      return { success: false, error: 'Remote path is required' };
    }
    
    const filename = path.basename(remotePath);
    const localPath = path.join(DOWNLOADS_DIR, filename);
    
    log(`Downloading ${remotePath} to ${localPath}...`, 'info');
    const result = await this.ftpAgent.handleRequest({
      action: 'downloadFtpFile',
      parameters: { remotePath, localPath }
    });
    
    if (result.success) {
      log(`File downloaded successfully to ${localPath}`, 'success');
      log(`File size: ${result.result.size} bytes`, 'info');
      log(`Duration: ${result.result.duration}ms`, 'info');
    } else {
      log(`Download failed: ${result.error}`, 'error');
    }
    
    return result;
  }
  
  async configureSchedule(options) {
    const parameters = {};
    
    if (options.enable) {
      parameters.enabled = true;
    } else if (options.disable) {
      parameters.enabled = false;
    }
    
    if (options.interval) {
      parameters.intervalHours = parseInt(options.interval, 10);
    }
    
    if (options.once) {
      parameters.runOnce = true;
    }
    
    log(`Configuring schedule with options: ${formatJson(parameters)}`, 'info');
    const result = await this.ftpAgent.handleRequest({
      action: 'scheduleFtpSync',
      parameters
    });
    
    if (result.success) {
      log('Schedule configured successfully', 'success');
      log(`Schedule status: ${result.result.enabled ? 'Enabled' : 'Disabled'}`, 'info');
      log(`Next sync: ${result.result.nextSyncFormatted || 'Not scheduled'}`, 'info');
    } else {
      log(`Failed to configure schedule: ${result.error}`, 'error');
    }
    
    return result;
  }
}

// Main function to parse command line args and run commands
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command) {
    log('No command specified. Use one of: connect, status, info, sync, list, download, schedule', 'error');
    process.exit(1);
  }
  
  try {
    const tester = new FtpAgentTester();
    await tester.initialize();
    
    let result;
    
    switch (command) {
      case 'connect':
        result = await tester.testConnection();
        break;
        
      case 'status':
        result = await tester.getStatus();
        break;
        
      case 'info':
        result = await tester.getScheduleInfo();
        break;
        
      case 'sync':
        const syncPath = args[1];
        result = await tester.synchronizeData(syncPath);
        break;
        
      case 'list':
        const listPath = args[1];
        result = await tester.listFiles(listPath);
        break;
        
      case 'download':
        const downloadPath = args[1];
        result = await tester.downloadFile(downloadPath);
        break;
        
      case 'schedule':
        const scheduleOptions = {
          enable: args.includes('--enable'),
          disable: args.includes('--disable'),
          once: args.includes('--once')
        };
        
        const intervalArg = args.find(arg => arg.startsWith('--interval='));
        if (intervalArg) {
          scheduleOptions.interval = intervalArg.split('=')[1];
        }
        
        result = await tester.configureSchedule(scheduleOptions);
        break;
        
      default:
        log(`Unknown command: ${command}`, 'error');
        log('Available commands: connect, status, info, sync, list, download, schedule', 'error');
        process.exit(1);
    }
    
    // Save result to log file
    const resultLogFile = path.join(LOG_DIR, `ftp-test-${command}-result.json`);
    fs.writeFileSync(resultLogFile, formatJson(result));
    log(`Detailed result saved to ${resultLogFile}`, 'info');
    
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    log(`Unhandled error: ${error.message}`, 'error');
    log(error.stack, 'error');
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  log(`Fatal error: ${error.message}`, 'error');
  process.exit(1);
});