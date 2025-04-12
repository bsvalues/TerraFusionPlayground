/**
 * Benton County FTP Data Synchronization Script
 * 
 * This script provides a command-line interface for running the FTP data agent
 * synchronization tasks. It can be invoked manually or scheduled via a cron job.
 * 
 * Usage:
 *   npx tsx scripts/synchronize-benton-county-ftp.ts [--force] [--silent] [--path=/remote/path]
 * 
 * Options:
 *   --force    Force synchronization even if another sync job is in progress
 *   --silent   Run in silent mode without console output
 *   --path     Specify a particular remote path to synchronize (default: all)
 * 
 * Examples:
 *   # Synchronize all data
 *   npx tsx scripts/synchronize-benton-county-ftp.ts
 * 
 *   # Synchronize only property valuation data
 *   npx tsx scripts/synchronize-benton-county-ftp.ts --path=/valuations
 * 
 *   # Force synchronization (for cron recovery)
 *   npx tsx scripts/synchronize-benton-county-ftp.ts --force
 */

import { AgentSystem } from '../server/services/agent-system';
import { MemStorage } from '../server/storage';
import { FtpService } from '../server/services/ftp-service';
import { DataImportService } from '../server/services/data-import-service';
import { LogLevel, Logger } from '../server/utils/logger';
import path from 'path';
import fs from 'fs';

// Parse command-line arguments
const args = process.argv.slice(2);
const options = {
  force: args.includes('--force'),
  silent: args.includes('--silent'),
  path: args.find(arg => arg.startsWith('--path='))?.split('=')[1] || '/',
  logFile: args.find(arg => arg.startsWith('--log='))?.split('=')[1] || 'logs/ftp-sync.log'
};

// Ensure log directory exists
const logDir = path.dirname(options.logFile);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Configure logger
const logger = new Logger({
  level: options.silent ? LogLevel.ERROR : LogLevel.INFO,
  filePath: options.logFile
});

// Display startup banner
if (!options.silent) {
  console.log('==================================================');
  console.log('Benton County FTP Data Synchronization');
  console.log('==================================================');
  console.log(`Date: ${new Date().toISOString()}`);
  console.log(`Options: ${JSON.stringify(options, null, 2)}`);
  console.log('--------------------------------------------------');
}

async function main() {
  try {
    logger.info('Initializing services...');
    const storage = new MemStorage();
    const ftpService = new FtpService();
    const dataImportService = new DataImportService(storage);
    
    logger.info('Creating agent system...');
    const agentSystem = new AgentSystem(storage);
    await agentSystem.initialize();
    
    logger.info(`Starting synchronization of path: ${options.path}`);
    const ftpAgent = agentSystem.getAgentById('ftp-data-agent');
    
    if (!ftpAgent) {
      throw new Error('FTP Data Agent not found in agent system');
    }
    
    // Run the synchronization
    const syncResult = await ftpAgent.handleRequest({
      action: 'synchronizeFtpData',
      parameters: {
        path: options.path,
        force: options.force
      }
    });
    
    if (syncResult.success) {
      logger.info('Synchronization completed successfully');
      logger.info(`Files processed: ${syncResult.result.filesProcessed}`);
      logger.info(`Records imported: ${syncResult.result.recordsImported}`);
      
      if (!options.silent) {
        console.log('\nSynchronization completed successfully');
        console.log(`Files processed: ${syncResult.result.filesProcessed}`);
        console.log(`Records imported: ${syncResult.result.recordsImported}`);
      }
    } else {
      logger.error(`Synchronization failed: ${syncResult.error}`);
      if (!options.silent) {
        console.error(`\nSynchronization failed: ${syncResult.error}`);
      }
      process.exit(1);
    }
  } catch (error) {
    logger.error('Fatal error during synchronization:', error);
    if (!options.silent) {
      console.error('Fatal error during synchronization:');
      console.error(error);
    }
    process.exit(1);
  }
}

main().catch(error => {
  logger.error('Unhandled exception:', error);
  if (!options.silent) {
    console.error('Unhandled exception:');
    console.error(error);
  }
  process.exit(1);
}).finally(() => {
  if (!options.silent) {
    console.log('\nSynchronization process completed');
    console.log('==================================================');
  }
});