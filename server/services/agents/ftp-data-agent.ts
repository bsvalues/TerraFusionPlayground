/**
 * FTP Data Agent
 * 
 * This agent provides direct integration with the SpatialEst FTP server
 * for fetching and synchronizing Benton County property data.
 * 
 * The agent leverages the FtpService to access and manage data transfers,
 * with a focus on providing these capabilities through the MCP architecture.
 */

import { BaseAgent, AgentCapability, AgentConfig } from './base-agent';
import { IStorage } from '../../storage';
import { MCPService } from '../mcp';
import { FtpService, FtpImportResult, FtpExportResult } from '../ftp-service';
import { DataImportService } from '../data-import-service';
import { PropertyUseCodesMapper } from '../data-mappers/property-use-codes-mapper';
import { InsertProperty } from '../../../shared/schema';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Interface for retry options
 */
interface RetryOptions {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryableErrors?: string[];
}

/**
 * Utility function for retrying operations with exponential backoff
 * 
 * @param operation - The async operation to retry
 * @param options - Retry configuration options
 * @returns The result of the operation if successful
 * @throws The last error encountered if all retries fail
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  let lastError: Error | null = null;
  let delay = options.initialDelay;
  
  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      // Attempt the operation
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Check if we should retry based on the error message
      if (options.retryableErrors && 
          options.retryableErrors.length > 0 && 
          !options.retryableErrors.some(errMsg => error.message.includes(errMsg))) {
        // Error is not in the list of retryable errors
        throw error;
      }
      
      // Check if we've exhausted our retry attempts
      if (attempt >= options.maxRetries) {
        throw error;
      }
      
      // Wait before the next retry attempt
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Increase delay for next retry using exponential backoff, but cap at maxDelay
      delay = Math.min(delay * options.backoffFactor, options.maxDelay);
    }
  }
  
  // This should never be reached due to the throw in the loop, but TypeScript requires it
  throw lastError || new Error('Operation failed after retries');
}

interface FtpScheduleConfig {
  enabled: boolean;
  intervalHours: number;
  lastRun?: Date;
}

interface FtpDirectoryInfo {
  directories: string[];
  files: {
    name: string;
    size: number;
    date: string;
    path: string;
    isDirectory: boolean;
  }[];
}

interface FtpSearchOptions {
  searchString?: string;
  fileType?: string;
  maxResults?: number;
  recursive?: boolean;
}

/**
 * Agent responsible for SpatialEst FTP integration
 */
export class FtpDataAgent extends BaseAgent {
  private ftpService: FtpService;
  private dataImportService: DataImportService;
  private schedule: FtpScheduleConfig;
  private scheduler: NodeJS.Timeout | null = null;
  
  constructor(
    storage: IStorage,
    mcpService: MCPService
  ) {
    // Define capabilities before passing to super
    const capabilities: AgentCapability[] = [
      {
        name: 'testFtpConnection',
        description: 'Test FTP connection to SpatialEst server',
        parameters: [],
        handler: async (params: any, agent: BaseAgent) => {
          return (agent as FtpDataAgent).testFtpConnection();
        }
      },
      {
        name: 'listFtpDirectories',
        description: 'List directories available on the SpatialEst FTP server',
        parameters: [
          {
            name: 'path',
            type: 'string',
            description: 'Remote directory path',
            required: false
          }
        ],
        handler: async (params: any, agent: BaseAgent) => {
          return (agent as FtpDataAgent).listFtpDirectories(params);
        }
      },
      {
        name: 'searchFtpFiles',
        description: 'Search for files on the SpatialEst FTP server',
        parameters: [
          {
            name: 'options',
            type: 'object',
            description: 'Search options',
            required: true
          }
        ],
        handler: async (params: any, agent: BaseAgent) => {
          return (agent as FtpDataAgent).searchFtpFiles(params);
        }
      },
      {
        name: 'downloadFtpFile',
        description: 'Download a file from the SpatialEst FTP server',
        parameters: [
          {
            name: 'remotePath',
            type: 'string',
            description: 'Path to the file on the FTP server',
            required: true
          },
          {
            name: 'localPath',
            type: 'string',
            description: 'Path where the file should be saved locally',
            required: false
          }
        ],
        handler: async (params: any, agent: BaseAgent) => {
          return (agent as FtpDataAgent).downloadFtpFile(params);
        }
      },
      {
        name: 'uploadFtpFile',
        description: 'Upload a file to the SpatialEst FTP server',
        parameters: [
          {
            name: 'localPath',
            type: 'string',
            description: 'Path to the local file',
            required: true
          },
          {
            name: 'remotePath',
            type: 'string',
            description: 'Path where the file should be saved on the FTP server',
            required: true
          }
        ],
        handler: async (params: any, agent: BaseAgent) => {
          return (agent as FtpDataAgent).uploadFtpFile(params);
        }
      },
      {
        name: 'importFtpProperties',
        description: 'Import property data from the SpatialEst FTP server',
        parameters: [
          {
            name: 'remotePath',
            type: 'string',
            description: 'Path to the CSV file on the FTP server',
            required: true
          }
        ],
        handler: async (params: any, agent: BaseAgent) => {
          return (agent as FtpDataAgent).importFtpProperties(params);
        }
      },
      {
        name: 'stageFtpProperties',
        description: 'Stage property data from the SpatialEst FTP server for review',
        parameters: [
          {
            name: 'remotePath',
            type: 'string',
            description: 'Path to the CSV file on the FTP server',
            required: true
          }
        ],
        handler: async (params: any, agent: BaseAgent) => {
          return (agent as FtpDataAgent).stageFtpProperties(params);
        }
      },
      {
        name: 'scheduleFtpSync',
        description: 'Schedule automatic data synchronization with the SpatialEst FTP server',
        parameters: [
          {
            name: 'enabled',
            type: 'boolean',
            description: 'Enable or disable scheduled sync',
            required: true
          },
          {
            name: 'intervalHours',
            type: 'number',
            description: 'Sync interval in hours',
            required: false
          }
        ],
        handler: async (params: any, agent: BaseAgent) => {
          return (agent as FtpDataAgent).scheduleFtpSync(params);
        }
      },
      {
        name: 'getFtpStatus',
        description: 'Get FTP connection and synchronization status',
        parameters: [],
        handler: async (params: any, agent: BaseAgent) => {
          return (agent as FtpDataAgent).getFtpStatus();
        }
      },
      {
        name: 'importPropertyUseCodes',
        description: 'Import property use codes from a CSV file on the FTP server',
        parameters: [
          {
            name: 'remotePath',
            type: 'string',
            description: 'Path to the property use codes CSV file on the FTP server',
            required: true
          }
        ],
        handler: async (params: any, agent: BaseAgent) => {
          return (agent as FtpDataAgent).importPropertyUseCodes(params);
        }
      }
    ];

    // Create the agent config
    const config: AgentConfig = {
      id: 'ftp_data',
      name: 'ftp_data',
      description: 'SpatialEst FTP Integration Agent',
      permissions: ['ftp.access', 'data.import'],
      capabilities: capabilities
    };
    
    // Call the parent constructor
    super(storage, mcpService, config);
    
    // Initialize services
    this.ftpService = new FtpService(storage);
    this.dataImportService = new DataImportService(storage);
    
    // Setup default schedule configuration
    this.schedule = {
      enabled: false,
      intervalHours: 24 // Default daily sync
    };
  }
  
  /**
   * Initialize the agent
   */
  public async initialize(): Promise<void> {
    await this.baseInitialize();
    
    // Register MCP tools
    await this.registerMCPTools([
      {
        name: 'ftp.testConnection',
        description: 'Test FTP connection to SpatialEst server',
        handler: async () => {
          const result = await this.executeCapability('testFtpConnection', {});
          return result;
        }
      },
      {
        name: 'ftp.listDirectories',
        description: 'List directories available on the SpatialEst FTP server',
        handler: async (params: any) => {
          const { path = '/' } = params;
          const result = await this.executeCapability('listFtpDirectories', { path });
          return result;
        }
      },
      {
        name: 'ftp.searchFiles',
        description: 'Search for files on the SpatialEst FTP server',
        handler: async (params: any) => {
          const { searchString, fileType, maxResults, recursive } = params;
          const options: FtpSearchOptions = {
            searchString,
            fileType,
            maxResults,
            recursive
          };
          const result = await this.executeCapability('searchFtpFiles', { options });
          return result;
        }
      },
      {
        name: 'ftp.downloadFile',
        description: 'Download a file from the SpatialEst FTP server',
        handler: async (params: any) => {
          const { remotePath, localPath } = params;
          if (!remotePath) {
            return { success: false, error: 'Remote file path is required' };
          }
          const result = await this.executeCapability('downloadFtpFile', { remotePath, localPath });
          return result;
        }
      },
      {
        name: 'ftp.uploadFile',
        description: 'Upload a file to the SpatialEst FTP server',
        handler: async (params: any) => {
          const { localPath, remotePath } = params;
          if (!localPath || !remotePath) {
            return { success: false, error: 'Local and remote file paths are required' };
          }
          const result = await this.executeCapability('uploadFtpFile', { localPath, remotePath });
          return result;
        }
      },
      {
        name: 'ftp.importProperties',
        description: 'Import property data from the SpatialEst FTP server',
        handler: async (params: any) => {
          const { remotePath } = params;
          if (!remotePath) {
            return { success: false, error: 'Remote file path is required' };
          }
          const result = await this.executeCapability('importFtpProperties', { remotePath });
          return result;
        }
      },
      {
        name: 'ftp.stageProperties',
        description: 'Stage property data from the SpatialEst FTP server for review',
        handler: async (params: any) => {
          const { remotePath } = params;
          if (!remotePath) {
            return { success: false, error: 'Remote file path is required' };
          }
          const result = await this.executeCapability('stageFtpProperties', { remotePath });
          return result;
        }
      },
      {
        name: 'ftp.scheduleSync',
        description: 'Schedule automatic data synchronization with the SpatialEst FTP server',
        handler: async (params: any) => {
          const { enabled, intervalHours } = params;
          if (typeof enabled !== 'boolean') {
            return { success: false, error: 'Enabled parameter (boolean) is required' };
          }
          const result = await this.executeCapability('scheduleFtpSync', { enabled, intervalHours });
          return result;
        }
      },
      {
        name: 'ftp.getStatus',
        description: 'Get FTP connection and synchronization status',
        handler: async () => {
          const result = await this.executeCapability('getFtpStatus', {});
          return result;
        }
      },
      {
        name: 'ftp.importPropertyUseCodes',
        description: 'Import property use codes from a CSV file on the FTP server',
        handler: async (params: any) => {
          const { remotePath } = params;
          if (!remotePath) {
            return { success: false, error: 'Remote file path is required' };
          }
          const result = await this.executeCapability('importPropertyUseCodes', { remotePath });
          return result;
        }
      }
    ]);
    
    // Log successful initialization
    await this.logActivity('initialization', 'FTP Data Agent initialized successfully');
  }
  
  /**
   * Cleans up resources when the agent is being shut down
   */
  public async shutdown(): Promise<void> {
    if (this.scheduler) {
      clearInterval(this.scheduler);
      this.scheduler = null;
    }
    
    await this.logActivity('shutdown', 'FTP Data Agent shutdown');
  }
  
  /**
   * Test FTP connection to SpatialEst server
   */
  private async testFtpConnection(): Promise<any> {
    try {
      const connected = await this.ftpService.testConnection();
      
      await this.logActivity(
        'ftp_connection_test',
        connected ? 'FTP connection test successful' : 'FTP connection test failed'
      );
      
      return {
        success: true,
        agent: this.config.name,
        capability: 'testFtpConnection',
        result: {
          connected,
          host: 'ftp.spatialest.com',
          message: connected ? 'Successfully connected to SpatialEst FTP server' : 'Failed to connect to SpatialEst FTP server'
        }
      };
    } catch (error: any) {
      await this.logActivity('ftp_connection_error', `FTP connection error: ${error.message}`);
      
      return {
        success: false,
        agent: this.config.name,
        capability: 'testFtpConnection',
        error: `FTP connection error: ${error.message}`
      };
    }
  }
  
  /**
   * List directories available on the SpatialEst FTP server
   */
  private async listFtpDirectories(params: any): Promise<any> {
    try {
      const { path = '/' } = params;
      
      const files = await this.ftpService.listFiles(path);
      
      // Transform the results into a more useful format
      const directories: string[] = [];
      const filesList = [];
      
      for (const file of files) {
        if (file.type === 2) { // Directory
          directories.push(file.name);
        }
        
        filesList.push({
          name: file.name,
          size: file.size,
          date: file.date ? (typeof file.date === 'string' ? file.date : new Date(file.date).toISOString()) : null,
          path: `${path}${path.toString().endsWith('/') ? '' : '/'}${file.name}`,
          isDirectory: file.type === 2
        });
      }
      
      const result: FtpDirectoryInfo = {
        directories,
        files: filesList
      };
      
      await this.logActivity('ftp_list_directories', `Listed FTP directories in ${path}`);
      
      return {
        success: true,
        agent: this.config.name,
        capability: 'listFtpDirectories',
        result
      };
    } catch (error: any) {
      await this.logActivity('ftp_list_error', `FTP listing error: ${error.message}`);
      
      return {
        success: false,
        agent: this.config.name,
        capability: 'listFtpDirectories',
        error: `FTP listing error: ${error.message}`
      };
    }
  }
  
  /**
   * Search for files on the SpatialEst FTP server
   */
  private async searchFtpFiles(params: any): Promise<any> {
    try {
      const { options = {} } = params;
      const { 
        searchString = '',
        fileType = '',
        maxResults = 50,
        recursive = false
      } = options;
      
      // Start search at root directory
      const rootPath = '/';
      
      // Get initial file list
      const allFiles = await this.searchFilesRecursive(rootPath, searchString, fileType, recursive);
      
      // Limit results
      const limitedResults = allFiles.slice(0, maxResults);
      
      await this.logActivity('ftp_search_files', `Searched FTP files with criteria: ${searchString}`);
      
      return {
        success: true,
        agent: this.config.name,
        capability: 'searchFtpFiles',
        result: {
          files: limitedResults,
          total: allFiles.length,
          returned: limitedResults.length,
          searchCriteria: {
            searchString,
            fileType,
            recursive
          }
        }
      };
    } catch (error: any) {
      await this.logActivity('ftp_search_error', `FTP search error: ${error.message}`);
      
      return {
        success: false,
        agent: this.config.name,
        capability: 'searchFtpFiles',
        error: `FTP search error: ${error.message}`
      };
    }
  }
  
  /**
   * Recursive file search helper
   */
  private async searchFilesRecursive(
    currentPath: string,
    searchString: string,
    fileType: string,
    recursive: boolean,
    depth: number = 0,
    maxDepth: number = 3
  ): Promise<any[]> {
    // Prevent excessive recursion
    if (depth > maxDepth) {
      return [];
    }
    
    try {
      const files = await this.ftpService.listFiles(currentPath);
      let results: any[] = [];
      
      for (const file of files) {
        const fullPath = `${currentPath}${currentPath.endsWith('/') ? '' : '/'}${file.name}`;
        
        // Check if file matches search criteria
        const matchesSearch = !searchString || file.name.toLowerCase().includes(searchString.toLowerCase());
        const matchesType = !fileType || (file.type === 1 && file.name.toLowerCase().endsWith(`.${fileType.toLowerCase()}`));
        
        if (file.type === 1 && matchesSearch && matchesType) {
          // File matches criteria
          results.push({
            name: file.name,
            path: fullPath,
            size: file.size,
            date: file.date ? (typeof file.date === 'string' ? file.date : new Date(file.date).toISOString()) : null,
            isDirectory: false
          });
        }
        
        // Recurse into subdirectories if needed
        if (recursive && file.type === 2 && file.name !== '.' && file.name !== '..') {
          const subResults = await this.searchFilesRecursive(
            fullPath,
            searchString,
            fileType,
            recursive,
            depth + 1,
            maxDepth
          );
          results = [...results, ...subResults];
        }
      }
      
      return results;
    } catch (error) {
      console.error(`Error searching directory ${currentPath}:`, error);
      return [];
    }
  }
  
  /**
   * Download a file from the SpatialEst FTP server
   */
  private async downloadFtpFile(params: any): Promise<any> {
    try {
      const { remotePath, localPath: customLocalPath } = params;
      
      if (!remotePath) {
        return {
          success: false,
          agent: this.config.name,
          capability: 'downloadFtpFile',
          error: 'Remote file path is required'
        };
      }
      
      // Determine local path
      const fileName = path.basename(remotePath);
      const defaultLocalDir = path.join(process.cwd(), 'uploads', 'ftp');
      
      // Create default directory if it doesn't exist
      if (!fs.existsSync(defaultLocalDir)) {
        fs.mkdirSync(defaultLocalDir, { recursive: true });
      }
      
      const localPath = customLocalPath || path.join(defaultLocalDir, fileName);
      
      // Configure retry options
      const retryOptions: RetryOptions = {
        maxRetries: 3,
        initialDelay: 1000,  // 1 second
        maxDelay: 10000,     // 10 seconds
        backoffFactor: 2,    // exponential backoff
        retryableErrors: [
          'ETIMEDOUT', 
          'ECONNRESET', 
          'ENOTFOUND',
          'connection closed',
          'timeout',
          'network error',
          'Failed to download file'
        ]
      };
      
      // Download the file with retries
      await withRetry(
        async () => {
          const downloadSuccess = await this.ftpService.downloadFile(remotePath, localPath);
          if (!downloadSuccess) {
            throw new Error(`Failed to download file from ${remotePath}`);
          }
          return downloadSuccess;
        },
        retryOptions
      );
      
      await this.logActivity('ftp_file_download', `Downloaded file from ${remotePath}`);
      
      return {
        success: true,
        agent: this.config.name,
        capability: 'downloadFtpFile',
        result: {
          remotePath,
          localPath,
          fileName,
          downloadTime: new Date().toISOString()
        }
      };
    } catch (error: any) {
      const errorDetails = {
        message: error.message,
        remotePath: params.remotePath,
        timestamp: new Date().toISOString(),
        attemptsMade: error.attemptsMade || 1
      };
      
      await this.logActivity(
        'ftp_download_error', 
        `FTP download error: ${error.message}`,
        { error: errorDetails }
      );
      
      return {
        success: false,
        agent: this.config.name,
        capability: 'downloadFtpFile',
        error: `FTP download error: ${error.message}`,
        details: errorDetails
      };
    }
  }
  
  /**
   * Upload a file to the SpatialEst FTP server
   */
  private async uploadFtpFile(params: any): Promise<any> {
    try {
      const { localPath, remotePath } = params;
      
      if (!localPath || !remotePath) {
        return {
          success: false,
          agent: this.config.name,
          capability: 'uploadFtpFile',
          error: 'Local and remote file paths are required'
        };
      }
      
      // Check if local file exists
      if (!fs.existsSync(localPath)) {
        return {
          success: false,
          agent: this.config.name,
          capability: 'uploadFtpFile',
          error: `Local file does not exist: ${localPath}`
        };
      }
      
      // Configure retry options
      const retryOptions: RetryOptions = {
        maxRetries: 3,
        initialDelay: 1000,  // 1 second
        maxDelay: 10000,     // 10 seconds
        backoffFactor: 2,    // exponential backoff
        retryableErrors: [
          'ETIMEDOUT', 
          'ECONNRESET', 
          'ENOTFOUND',
          'connection closed',
          'timeout',
          'network error',
          'Failed to upload file'
        ]
      };
      
      // Upload the file with retries
      await withRetry(
        async () => {
          const uploadSuccess = await this.ftpService.uploadFile(localPath, remotePath);
          if (!uploadSuccess) {
            throw new Error(`Failed to upload file to ${remotePath}`);
          }
          return uploadSuccess;
        },
        retryOptions
      );
      
      await this.logActivity('ftp_file_upload', `Uploaded file to ${remotePath}`);
      
      return {
        success: true,
        agent: this.config.name,
        capability: 'uploadFtpFile',
        result: {
          localPath,
          remotePath,
          fileName: path.basename(remotePath),
          uploadTime: new Date().toISOString()
        }
      };
    } catch (error: any) {
      const errorDetails = {
        message: error.message,
        localPath: params.localPath,
        remotePath: params.remotePath,
        timestamp: new Date().toISOString(),
        attemptsMade: error.attemptsMade || 1
      };
      
      await this.logActivity(
        'ftp_upload_error',
        `FTP upload error: ${error.message}`,
        { error: errorDetails }
      );
      
      return {
        success: false,
        agent: this.config.name,
        capability: 'uploadFtpFile',
        error: `FTP upload error: ${error.message}`,
        details: errorDetails
      };
    }
  }
  
  /**
   * Import property data from the SpatialEst FTP server
   */
  private async importFtpProperties(params: any): Promise<any> {
    try {
      const { remotePath } = params;
      
      if (!remotePath) {
        return {
          success: false,
          agent: this.config.name,
          capability: 'importFtpProperties',
          error: 'Remote file path is required'
        };
      }
      
      // Import properties directly from FTP
      const importResult = await this.ftpService.importPropertiesFromFtp(remotePath);
      
      await this.logActivity('ftp_properties_import', `Imported properties from ${remotePath}`);
      
      return {
        success: true,
        agent: this.config.name,
        capability: 'importFtpProperties',
        result: {
          remotePath,
          fileName: importResult.filename,
          totalRecords: importResult.importResult.total,
          successfulImports: importResult.importResult.successfulImports,
          failedImports: importResult.importResult.failedImports,
          errors: importResult.importResult.errors,
          importTime: new Date().toISOString()
        }
      };
    } catch (error: any) {
      await this.logActivity('ftp_import_error', `FTP import error: ${error.message}`);
      
      return {
        success: false,
        agent: this.config.name,
        capability: 'importFtpProperties',
        error: `FTP import error: ${error.message}`
      };
    }
  }
  
  /**
   * Stage property data from the SpatialEst FTP server for review
   */
  private async stageFtpProperties(params: any): Promise<any> {
    try {
      const { remotePath } = params;
      
      if (!remotePath) {
        return {
          success: false,
          agent: this.config.name,
          capability: 'stageFtpProperties',
          error: 'Remote file path is required'
        };
      }
      
      // Stage properties from FTP for review
      const stagingResult = await this.ftpService.stagePropertiesFromFtp(remotePath);
      
      await this.logActivity('ftp_properties_staging', `Staged properties from ${remotePath}`);
      
      return {
        success: true,
        agent: this.config.name,
        capability: 'stageFtpProperties',
        result: {
          remotePath,
          fileName: stagingResult.filename,
          stagingResult: stagingResult.stagingResult,
          stagingTime: new Date().toISOString()
        }
      };
    } catch (error: any) {
      await this.logActivity('ftp_staging_error', `FTP staging error: ${error.message}`);
      
      return {
        success: false,
        agent: this.config.name,
        capability: 'stageFtpProperties',
        error: `FTP staging error: ${error.message}`
      };
    }
  }
  
  /**
   * Schedule automatic data synchronization with the SpatialEst FTP server
   */
  private async scheduleFtpSync(params: any): Promise<any> {
    try {
      const { enabled, intervalHours = 24 } = params;
      
      // Update schedule configuration
      this.schedule.enabled = enabled;
      if (intervalHours && typeof intervalHours === 'number' && intervalHours > 0) {
        this.schedule.intervalHours = intervalHours;
      }
      
      // Clear existing scheduler if any
      if (this.scheduler) {
        clearInterval(this.scheduler);
        this.scheduler = null;
      }
      
      // Setup new scheduler if enabled
      if (enabled) {
        const intervalMs = this.schedule.intervalHours * 60 * 60 * 1000;
        this.scheduler = setInterval(() => this.runScheduledSync(), intervalMs);
        
        await this.logActivity(
          'ftp_sync_scheduled', 
          `Scheduled FTP sync every ${this.schedule.intervalHours} hours`
        );
      } else {
        await this.logActivity('ftp_sync_disabled', 'Disabled scheduled FTP sync');
      }
      
      return {
        success: true,
        agent: this.config.name,
        capability: 'scheduleFtpSync',
        result: {
          enabled,
          intervalHours: this.schedule.intervalHours,
          nextSyncTime: this.getNextSyncTime()
        }
      };
    } catch (error: any) {
      await this.logActivity('ftp_schedule_error', `Error scheduling FTP sync: ${error.message}`);
      
      return {
        success: false,
        agent: this.config.name,
        capability: 'scheduleFtpSync',
        error: `Error scheduling FTP sync: ${error.message}`
      };
    }
  }
  
  /**
   * Run scheduled synchronization
   */
  private async runScheduledSync(): Promise<void> {
    try {
      // Test connection first
      const connectionTest = await this.testFtpConnection();
      if (!connectionTest.result.connected) {
        await this.logActivity(
          'ftp_scheduled_sync_error',
          'Scheduled sync failed: Cannot connect to FTP server'
        );
        return;
      }
      
      // Update last run time
      this.schedule.lastRun = new Date();
      
      // Implement automatic sync logic
      await this.logActivity(
        'ftp_scheduled_sync_run',
        'Starting scheduled FTP sync process'
      );
      
      // Step 1: List property data files in the root directory
      const rootListResult = await this.listFtpDirectories({ path: '/' });
      if (!rootListResult.success) {
        await this.logActivity(
          'ftp_scheduled_sync_error',
          `Failed to list files: ${rootListResult.error}`
        );
        return;
      }
      
      // Step 2: Find CSV files that might contain property data
      const propertyDataFiles = rootListResult.result.files.filter(file => {
        // Only process files (not directories)
        if (file.isDirectory) return false;
        
        // Look for CSV files with property-related names
        const lowerName = file.name.toLowerCase();
        return lowerName.endsWith('.csv') && (
          lowerName.includes('property') || 
          lowerName.includes('parcel') || 
          lowerName.includes('assessment') ||
          lowerName.includes('valuation')
        );
      });
      
      if (propertyDataFiles.length === 0) {
        await this.logActivity(
          'ftp_scheduled_sync_complete',
          'No property data files found for sync'
        );
        return;
      }
      
      // Step 3: Process each property file
      const syncResults = {
        totalFiles: propertyDataFiles.length,
        processedFiles: 0,
        successfulImports: 0,
        failedImports: 0,
        totalRecords: 0,
        errors: [] as string[]
      };
      
      for (const file of propertyDataFiles) {
        try {
          await this.logActivity(
            'ftp_file_sync',
            `Processing file: ${file.name}`
          );
          
          // Import the file data
          const importResult = await this.importFtpProperties({ remotePath: file.path });
          syncResults.processedFiles++;
          
          if (importResult.success) {
            syncResults.successfulImports++;
            syncResults.totalRecords += importResult.result.totalRecords || 0;
          } else {
            syncResults.failedImports++;
            syncResults.errors.push(`Failed to import ${file.name}: ${importResult.error}`);
            
            await this.logActivity(
              'ftp_file_sync_error',
              `Error importing ${file.name}: ${importResult.error}`
            );
          }
        } catch (error: any) {
          syncResults.failedImports++;
          syncResults.errors.push(`Error processing ${file.name}: ${error.message}`);
          
          await this.logActivity(
            'ftp_file_sync_error',
            `Error processing ${file.name}: ${error.message}`
          );
        }
      }
      
      // Step 4: Check for property use code files
      const useCodeFiles = rootListResult.result.files.filter(file => {
        if (file.isDirectory) return false;
        
        const lowerName = file.name.toLowerCase();
        return lowerName.endsWith('.csv') && (
          lowerName.includes('usecode') ||
          lowerName.includes('use_code') ||
          lowerName.includes('property_code')
        );
      });
      
      // Process use code files if found
      for (const file of useCodeFiles) {
        try {
          await this.logActivity(
            'ftp_file_sync',
            `Processing use code file: ${file.name}`
          );
          
          const importResult = await this.importPropertyUseCodes({ remotePath: file.path });
          
          if (importResult.success) {
            await this.logActivity(
              'ftp_file_sync_success',
              `Successfully imported use codes from ${file.name}`
            );
          } else {
            syncResults.errors.push(`Failed to import use codes from ${file.name}: ${importResult.error}`);
            
            await this.logActivity(
              'ftp_file_sync_error',
              `Error importing use codes from ${file.name}: ${importResult.error}`
            );
          }
        } catch (error: any) {
          syncResults.errors.push(`Error processing use code file ${file.name}: ${error.message}`);
          
          await this.logActivity(
            'ftp_file_sync_error',
            `Error processing use code file ${file.name}: ${error.message}`
          );
        }
      }
      
      // Step 5: Record sync completion with detailed results
      await this.logActivity(
        'ftp_scheduled_sync_complete',
        `Completed sync of ${syncResults.processedFiles} files. ` +
        `Successful: ${syncResults.successfulImports}, ` +
        `Failed: ${syncResults.failedImports}, ` +
        `Total records: ${syncResults.totalRecords}`,
        {
          syncResults: {
            timestamp: new Date().toISOString(),
            totalFiles: syncResults.totalFiles,
            processedFiles: syncResults.processedFiles,
            successfulImports: syncResults.successfulImports,
            failedImports: syncResults.failedImports,
            totalRecords: syncResults.totalRecords,
            errors: syncResults.errors.length > 0 ? syncResults.errors : undefined
          }
        }
      );
      
    } catch (error: any) {
      const errorDetails = {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        lastSuccessfulSync: this.schedule.lastRun ? this.schedule.lastRun.toISOString() : null,
        syncAttemptCount: this.schedule.lastRun ? 
          Math.floor((Date.now() - this.schedule.lastRun.getTime()) / (this.schedule.intervalHours * 60 * 60 * 1000)) : 0
      };
      
      // Log error with full details for troubleshooting
      await this.logActivity(
        'ftp_scheduled_sync_error',
        `Scheduled sync error: ${error.message}`,
        { error: errorDetails }
      );
      
      // Also log to console for immediate visibility
      console.error('FTP Scheduled Sync Error:', error.message);
      console.error('Error Details:', JSON.stringify(errorDetails, null, 2));
    }
  }
  
  /**
   * Get next sync time based on schedule
   */
  private getNextSyncTime(): string | null {
    if (!this.schedule.enabled || !this.scheduler) {
      return null;
    }
    
    const now = new Date();
    const lastRun = this.schedule.lastRun || now;
    const intervalMs = this.schedule.intervalHours * 60 * 60 * 1000;
    const nextRun = new Date(lastRun.getTime() + intervalMs);
    
    return nextRun.toISOString();
  }
  
  /**
   * Import property use codes from the SpatialEst FTP server
   * This method handles downloading property use codes and mapping them
   * to our system's property schema format
   */
  private async importPropertyUseCodes(params: any): Promise<any> {
    try {
      const { remotePath } = params;
      
      if (!remotePath) {
        return {
          success: false,
          agent: this.config.name,
          capability: 'importPropertyUseCodes',
          error: 'Remote file path is required'
        };
      }
      
      // Step 1: Download the file from FTP
      const downloadResult = await this.downloadFtpFile({ remotePath });
      if (!downloadResult.success) {
        return {
          success: false,
          agent: this.config.name,
          capability: 'importPropertyUseCodes',
          error: `Failed to download property use codes: ${downloadResult.error}`
        };
      }
      
      // Step 2: Use the mapper to transform the data
      const localFilePath = downloadResult.result.localPath;
      const mapper = new PropertyUseCodesMapper();
      
      // Process and map the file
      const mappingResult = await mapper.mapPropertyUseCodes(localFilePath);
      
      // Step 3: Import the mapped data
      const importResult = await this.dataImportService.importPropertyUseCodes(mappingResult.mappedData);
      
      await this.logActivity(
        'property_use_codes_import', 
        `Imported ${importResult.total} property use codes from ${remotePath}`
      );
      
      return {
        success: true,
        agent: this.config.name,
        capability: 'importPropertyUseCodes',
        result: {
          remotePath,
          localFilePath,
          fileName: path.basename(remotePath),
          totalCodes: importResult.total,
          successfulImports: importResult.successfulImports,
          failedImports: importResult.failedImports,
          errors: importResult.errors,
          importTime: new Date().toISOString()
        }
      };
    } catch (error: any) {
      await this.logActivity(
        'property_use_codes_import_error',
        `Error importing property use codes: ${error.message}`
      );
      
      return {
        success: false,
        agent: this.config.name,
        capability: 'importPropertyUseCodes',
        error: `Error importing property use codes: ${error.message}`
      };
    }
  }
  
  /**
   * Get FTP connection and synchronization status
   */
  private async getFtpStatus(): Promise<any> {
    try {
      // Test connection
      const connectionTest = await this.testFtpConnection();
      const connected = connectionTest.result.connected;
      
      // Get recent sync activities to provide more details
      const recentSyncActivities = await this.storage.getActivitiesByType(
        'ftp_scheduled_sync_complete',
        5
      );
      
      // Extract most recent sync results
      let lastSyncResults = null;
      if (recentSyncActivities.length > 0) {
        try {
          const latestActivity = recentSyncActivities[0];
          if (latestActivity.details) {
            const details = typeof latestActivity.details === 'string' 
              ? JSON.parse(latestActivity.details) 
              : latestActivity.details;
              
            // Extract sync statistics from activity details
            if (details && details.syncResults) {
              lastSyncResults = details.syncResults;
            }
          }
        } catch (error) {
          console.error('Error parsing sync activity details:', error);
        }
      }
      
      const status = {
        connected,
        host: 'ftp.spatialest.com',
        scheduleEnabled: this.schedule.enabled,
        scheduleIntervalHours: this.schedule.intervalHours,
        lastSync: this.schedule.lastRun ? this.schedule.lastRun.toISOString() : null,
        nextSync: this.getNextSyncTime(),
        lastSyncResults,
        recentSyncActivities: recentSyncActivities.map(activity => ({
          timestamp: activity.created_at,
          status: activity.status,
          details: activity.details
        })),
        connectionDetails: connected ? {
          secure: true,
          port: 21
        } : null
      };
      
      await this.logActivity('ftp_status_checked', 'FTP status checked');
      
      return {
        success: true,
        agent: this.config.name,
        capability: 'getFtpStatus',
        result: status
      };
    } catch (error: any) {
      await this.logActivity('ftp_status_error', `Error getting FTP status: ${error.message}`);
      
      return {
        success: false,
        agent: this.config.name,
        capability: 'getFtpStatus',
        error: `Error getting FTP status: ${error.message}`
      };
    }
  }
}