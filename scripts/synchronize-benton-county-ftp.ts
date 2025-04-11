#!/usr/bin/env tsx
/**
 * Benton County FTP Synchronization Script
 * 
 * This script uses the FTP Data Agent to connect to the Benton County FTP server
 * at ftp.spatialest.com, discover new property data files, and import them.
 * 
 * It also checks for pending staged imports and can commit them if needed.
 */
import { MemStorage } from '../server/storage';
import { FtpService } from '../server/services/ftp-service';
import { DataImportService } from '../server/services/data-import-service';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

// Calculate __dirname in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Create temporary directory for working files
const TEMP_DIR = path.join(__dirname, '..', 'uploads', 'temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Create log directory
const LOG_DIR = path.join(__dirname, '..', 'logs', 'ftp-sync');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Initialize storage and services
const storage = new MemStorage();
const ftpService = new FtpService(storage);
const dataImportService = new DataImportService(storage);

// Logging utility
const logFile = path.join(LOG_DIR, `ftp-sync-${new Date().toISOString().replace(/:/g, '-')}.log`);
const logger = {
  log: (message) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    fs.appendFileSync(logFile, logMessage + '\n');
  },
  error: (message, error) => {
    const timestamp = new Date().toISOString();
    const errorStack = error && error.stack ? `\n${error.stack}` : '';
    const logMessage = `[${timestamp}] ERROR: ${message}${errorStack}`;
    console.error(logMessage);
    fs.appendFileSync(logFile, logMessage + '\n');
  }
};

// Function to test FTP connection
async function testFtpConnection(): Promise<boolean> {
  logger.log('Testing connection to Benton County FTP server...');
  try {
    const connected = await ftpService.testConnection();
    
    if (!connected) {
      throw new Error('Failed to connect to FTP server. Check credentials and try again.');
    }
    
    logger.log('Successfully connected to FTP server.');
    return true;
  } catch (error) {
    logger.error('FTP connection test failed', error);
    return false;
  }
}

interface FtpFile {
  name: string;
  type: number;
  size: number;
  date?: string | Date;
}

interface ImportResult {
  importResult: {
    total: number;
    successfulImports: number;
    failedImports: number;
    errors?: string[];
  };
  filename: string;
}

// Function to search for property data files
async function searchPropertyDataFiles(): Promise<FtpFile[]> {
  logger.log('Searching for property data files on the FTP server...');
  try {
    // Start with the root directory
    const files = await ftpService.listFiles('/');
    
    // Filter for CSV files with property data
    const propertyDataFiles = files.filter(file => 
      file.type === 1 && // File (not directory)
      (file.name.toLowerCase().includes('property') || 
       file.name.toLowerCase().includes('parcel') ||
       file.name.toLowerCase().includes('assessment') ||
       file.name.toLowerCase().includes('tax')) &&
      file.name.toLowerCase().endsWith('.csv')
    );
    
    logger.log(`Found ${propertyDataFiles.length} potential property data files.`);
    
    // Sort by date (newest first)
    propertyDataFiles.sort((a, b) => {
      if (a.date && b.date) {
        return b.date.getTime() - a.date.getTime();
      }
      return 0;
    });
    
    return propertyDataFiles;
  } catch (error) {
    logger.error('Error searching for property data files', error);
    return [];
  }
}

// Function to download and import a file
async function downloadAndImportFile(file: FtpFile): Promise<boolean> {
  const remotePath = `/${file.name}`;
  const localPath = path.join(TEMP_DIR, file.name);
  
  logger.log(`Downloading ${file.name}...`);
  try {
    const downloadSuccess = await ftpService.downloadFile(remotePath, localPath);
    
    if (!downloadSuccess) {
      throw new Error(`Failed to download file from ${remotePath}`);
    }
    
    logger.log(`Successfully downloaded ${file.name}.`);
    
    // Import the file
    logger.log(`Importing data from ${file.name}...`);
    const importResult = await ftpService.importPropertiesFromFtp(remotePath);
    
    logger.log(`Import completed. Processed ${importResult.importResult.total} properties.`);
    logger.log(`Successfully imported: ${importResult.importResult.successfulImports}, Failed: ${importResult.importResult.failedImports}`);
    
    if (importResult.importResult.errors && importResult.importResult.errors.length > 0) {
      logger.log('Import errors:');
      importResult.importResult.errors.forEach(error => {
        logger.log(`- ${error}`);
      });
    }
    
    // Create a detailed log file
    const importLogPath = path.join(LOG_DIR, `import-${file.name}-${new Date().toISOString().replace(/:/g, '-')}.json`);
    const logData = {
      file: file.name,
      importTime: new Date().toISOString(),
      totalRecords: importResult.importResult.total,
      successfulImports: importResult.importResult.successfulImports,
      failedImports: importResult.importResult.failedImports,
      errors: importResult.importResult.errors
    };
    
    fs.writeFileSync(importLogPath, JSON.stringify(logData, null, 2));
    logger.log(`Detailed import log saved to ${importLogPath}`);
    
    // Clean up local file
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
      logger.log(`Deleted temporary file ${localPath}`);
    }
    
    return true;
  } catch (error) {
    logger.error(`Error processing file ${file.name}`, error);
    
    // Clean up local file if it exists
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
      logger.log(`Deleted temporary file ${localPath}`);
    }
    
    return false;
  }
}

// Main function
async function synchronizeFtpData() {
  logger.log('Starting Benton County FTP data synchronization...');
  
  try {
    // Test connection
    const connected = await testFtpConnection();
    if (!connected) {
      return false;
    }
    
    // Search for property data files
    const files = await searchPropertyDataFiles();
    if (files.length === 0) {
      logger.log('No property data files found. Nothing to import.');
      return true;
    }
    
    // Get the most recent file
    const latestFile = files[0];
    logger.log(`Selected ${latestFile.name} for import (most recent).`);
    
    // Process the file
    const importSuccess = await downloadAndImportFile(latestFile);
    
    if (importSuccess) {
      logger.log('FTP synchronization completed successfully.');
      return true;
    } else {
      logger.log('FTP synchronization completed with errors.');
      return false;
    }
  } catch (error) {
    logger.error('Error during FTP synchronization', error);
    return false;
  }
}

// Run the sync process
synchronizeFtpData()
  .then(success => {
    logger.log(`FTP synchronization ${success ? 'succeeded' : 'failed'}.`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    logger.error('Unexpected error during execution', error);
    process.exit(1);
  });