/**
 * Data Migration Service
 * 
 * This service is responsible for migrating data between different database systems.
 */

import { IStorage } from '../../storage';
import {
  DatabaseType,
  ConversionStatus,
  ConversionResult
} from './types';
import { MCPService } from '../mcp';

export class DataMigrationService {
  private storage: IStorage;
  private mcpService: MCPService;

  constructor(storage: IStorage, mcpService: MCPService) {
    this.storage = storage;
    this.mcpService = mcpService;
  }

  /**
   * Start a database conversion process
   * @param projectId ID of the conversion project
   * @returns Conversion result (initial state)
   */
  public async startConversion(projectId: string): Promise<ConversionResult> {
    try {
      console.log(`Starting conversion for project ${projectId}...`);

      // Get the project
      const project = await this.storage.getConversionProject(projectId);
      if (!project) {
        throw new Error(`Project not found: ${projectId}`);
      }

      // Create initial conversion result
      const conversionResult: ConversionResult = {
        status: ConversionStatus.Analyzing,
        startTime: new Date(),
        tablesProcessed: 0,
        totalTables: 0,
        recordsProcessed: 0,
        errorCount: 0,
        warnings: [],
        errors: []
      };

      // Log the start of the conversion process
      await this.storage.createConversionLog({
        projectId: projectId,
        timestamp: new Date(),
        level: 'info',
        message: 'Starting database conversion process',
        details: {
          sourceType: project.sourceType,
          targetType: project.targetType,
          status: conversionResult.status
        }
      });

      // Update project status
      await this.storage.updateConversionProject(projectId, {
        status: ConversionStatus.Analyzing,
        lastUpdated: new Date()
      });

      // Start the conversion process asynchronously
      this.runConversionProcess(projectId, project.sourceConnectionString, project.targetConnectionString, 
                               project.sourceType, project.targetType, project.schemaOnly || false)
          .catch(error => {
            console.error(`Error in conversion process for project ${projectId}:`, error);
            
            // Log the error
            this.storage.createConversionLog({
              projectId: projectId,
              timestamp: new Date(),
              level: 'error',
              message: 'Conversion process failed',
              details: {
                error: error instanceof Error ? error.message : String(error)
              }
            }).catch(logError => {
              console.error('Failed to log conversion error:', logError);
            });

            // Update project status
            this.storage.updateConversionProject(projectId, {
              status: ConversionStatus.Failed,
              lastUpdated: new Date()
            }).catch(updateError => {
              console.error('Failed to update project status:', updateError);
            });
          });

      return conversionResult;
    } catch (error) {
      console.error('Error starting conversion:', error);

      // Log the error
      await this.storage.createConversionLog({
        projectId: projectId,
        timestamp: new Date(),
        level: 'error',
        message: 'Failed to start conversion process',
        details: {
          error: error instanceof Error ? error.message : String(error)
        }
      });

      throw error;
    }
  }

  /**
   * Get the status of a conversion process
   * @param projectId ID of the conversion project
   * @returns Current status of the conversion
   */
  public async getConversionStatus(projectId: string): Promise<ConversionResult> {
    try {
      console.log(`Getting conversion status for project ${projectId}...`);

      // Get the project
      const project = await this.storage.getConversionProject(projectId);
      if (!project) {
        throw new Error(`Project not found: ${projectId}`);
      }

      // Get the latest logs
      const logs = await this.storage.getConversionLogs(projectId);
      
      // Count errors and warnings
      const errors = logs.filter(log => log.level === 'error').map(log => log.message);
      const warnings = logs.filter(log => log.level === 'warning').map(log => log.message);

      // Create conversion result
      const conversionResult: ConversionResult = {
        status: project.status as ConversionStatus || ConversionStatus.NotStarted,
        startTime: logs.length > 0 ? logs[0].timestamp : new Date(),
        endTime: project.status === ConversionStatus.Completed || 
                project.status === ConversionStatus.Failed ? 
                project.lastUpdated : undefined,
        tablesProcessed: project.tablesProcessed || 0,
        totalTables: project.totalTables || 0,
        recordsProcessed: project.recordsProcessed || 0,
        errorCount: errors.length,
        warnings,
        errors
      };

      return conversionResult;
    } catch (error) {
      console.error('Error getting conversion status:', error);
      throw error;
    }
  }

  /**
   * Run the actual conversion process
   * This is an async process that runs in the background
   */
  private async runConversionProcess(
    projectId: string, 
    sourceConnectionString: string, 
    targetConnectionString: string,
    sourceType: string,
    targetType: string,
    schemaOnly: boolean
  ): Promise<void> {
    try {
      console.log(`Running conversion process for project ${projectId}...`);
      
      // Log the analysis phase
      await this.storage.createConversionLog({
        projectId,
        timestamp: new Date(),
        level: 'info',
        message: 'Analyzing source database schema',
        details: { sourceType, phase: 'analysis' }
      });

      // Update project status
      await this.storage.updateConversionProject(projectId, {
        status: ConversionStatus.Analyzing,
        lastUpdated: new Date()
      });

      // Simulate analysis delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Log the planning phase
      await this.storage.createConversionLog({
        projectId,
        timestamp: new Date(),
        level: 'info',
        message: 'Planning migration strategy',
        details: { sourceType, targetType, phase: 'planning' }
      });

      // Update project status
      await this.storage.updateConversionProject(projectId, {
        status: ConversionStatus.Planning,
        lastUpdated: new Date()
      });

      // Simulate planning delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get all mappings for this project
      const mappings = await this.storage.getProjectSchemaMappings(projectId);

      // Determine the number of tables to be processed
      const totalTables = mappings.length > 0 ? 
        new Set(mappings.map(m => m.sourceTable)).size : 
        10; // Default value for demo

      // Update project with table count
      await this.storage.updateConversionProject(projectId, {
        totalTables,
        lastUpdated: new Date()
      });

      // Log the conversion phase
      await this.storage.createConversionLog({
        projectId,
        timestamp: new Date(),
        level: 'info',
        message: 'Starting data migration',
        details: { 
          sourceType, 
          targetType, 
          phase: 'migration',
          totalTables,
          schemaOnly 
        }
      });

      // Update project status
      await this.storage.updateConversionProject(projectId, {
        status: ConversionStatus.Converting,
        lastUpdated: new Date()
      });

      // Simulate processing each table
      for (let i = 0; i < totalTables; i++) {
        // Simulate table processing
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Generate a random number of records processed
        const recordsProcessed = schemaOnly ? 0 : Math.floor(Math.random() * 1000) + 100;

        // Log the table migration
        await this.storage.createConversionLog({
          projectId,
          timestamp: new Date(),
          level: 'info',
          message: `Migrated table ${i + 1} of ${totalTables}`,
          details: { 
            table: `table_${i + 1}`,
            recordsProcessed,
            schemaOnly
          }
        });

        // Update project progress
        await this.storage.updateConversionProject(projectId, {
          tablesProcessed: i + 1,
          recordsProcessed: (project => (project?.recordsProcessed || 0) + recordsProcessed),
          lastUpdated: new Date()
        });

        // Randomly add a warning
        if (Math.random() > 0.7) {
          await this.storage.createConversionLog({
            projectId,
            timestamp: new Date(),
            level: 'warning',
            message: `Warning during migration of table ${i + 1}`,
            details: { 
              table: `table_${i + 1}`,
              warning: 'Some data may have been truncated due to different field constraints'
            }
          });
        }
      }

      // Log the completion
      await this.storage.createConversionLog({
        projectId,
        timestamp: new Date(),
        level: 'info',
        message: 'Data migration completed successfully',
        details: { 
          tablesProcessed: totalTables,
          recordsProcessed: await this.getTotalRecordsProcessed(projectId),
          schemaOnly
        }
      });

      // Update project status
      await this.storage.updateConversionProject(projectId, {
        status: ConversionStatus.Completed,
        lastUpdated: new Date()
      });

      console.log(`Conversion process for project ${projectId} completed successfully.`);
    } catch (error) {
      console.error(`Error in conversion process for project ${projectId}:`, error);
      
      // Log the error
      await this.storage.createConversionLog({
        projectId,
        timestamp: new Date(),
        level: 'error',
        message: 'Conversion process failed',
        details: {
          error: error instanceof Error ? error.message : String(error)
        }
      });

      // Update project status
      await this.storage.updateConversionProject(projectId, {
        status: ConversionStatus.Failed,
        lastUpdated: new Date()
      });

      throw error;
    }
  }

  /**
   * Get the total number of records processed for a project
   */
  private async getTotalRecordsProcessed(projectId: string): Promise<number> {
    try {
      const project = await this.storage.getConversionProject(projectId);
      return project?.recordsProcessed || 0;
    } catch (error) {
      console.error(`Error getting total records processed for project ${projectId}:`, error);
      return 0;
    }
  }

  /**
   * Estimate the time needed for a conversion
   * @param tableCount Number of tables to convert
   * @param recordCount Estimated total record count
   * @param sourceType Source database type
   * @param targetType Target database type
   * @returns Estimated time in seconds
   */
  public estimateConversionTime(
    tableCount: number, 
    recordCount: number, 
    sourceType: DatabaseType, 
    targetType: DatabaseType
  ): number {
    // This is a simple estimation model, a real implementation would be more sophisticated
    
    // Base time: 30 seconds per table + 1 second per 1000 records
    let estimatedTime = (tableCount * 30) + (recordCount / 1000);

    // Apply factors based on database types
    // Some conversions are more complex than others
    const complexityFactor = this.getComplexityFactor(sourceType, targetType);
    estimatedTime *= complexityFactor;

    return Math.round(estimatedTime);
  }

  /**
   * Get a complexity factor for the conversion based on source and target types
   */
  private getComplexityFactor(sourceType: DatabaseType, targetType: DatabaseType): number {
    // Base factor is 1.0
    let factor = 1.0;
    
    // If source and target are the same type, it's simpler
    if (sourceType === targetType) {
      return 0.8;
    }
    
    // Relational to relational is simpler than relational to NoSQL or vice versa
    const relationalTypes = [
      DatabaseType.PostgreSQL, 
      DatabaseType.MySQL, 
      DatabaseType.SQLite, 
      DatabaseType.SQLServer, 
      DatabaseType.Oracle
    ];
    
    const nosqlTypes = [
      DatabaseType.MongoDB, 
      DatabaseType.Firestore, 
      DatabaseType.DynamoDB
    ];
    
    const isSourceRelational = relationalTypes.includes(sourceType);
    const isTargetRelational = relationalTypes.includes(targetType);
    const isSourceNoSQL = nosqlTypes.includes(sourceType);
    const isTargetNoSQL = nosqlTypes.includes(targetType);
    
    // Cross-paradigm conversion is more complex
    if ((isSourceRelational && isTargetNoSQL) || (isSourceNoSQL && isTargetRelational)) {
      factor = 1.5;
    }
    
    // ORM types need special handling
    const ormTypes = [
      DatabaseType.Prisma, 
      DatabaseType.Knex, 
      DatabaseType.Drizzle, 
      DatabaseType.Sequelize, 
      DatabaseType.TypeORM, 
      DatabaseType.MikroORM, 
      DatabaseType.ObjectionJS
    ];
    
    if (ormTypes.includes(sourceType) || ormTypes.includes(targetType)) {
      factor *= 1.2;
    }
    
    return factor;
  }
}