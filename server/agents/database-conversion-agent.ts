/**
 * Database Conversion Agent
 * 
 * This agent specializes in analyzing, converting, and migrating
 * databases from various sources into the TaxI_AI platform format.
 */

import { BaseAgent } from './base-agent';
import { IStorage } from '../storage';
import { MCPService } from '../services/mcp-service';
import { LLMService } from '../services/llm-service';
import { DatabaseConversionService } from '../services/database-conversion';
import {
  DatabaseConnectionConfig,
  SchemaAnalysisResult,
  MigrationPlan,
  MigrationOptions,
  MigrationResult,
  CompatibilityLayerResult,
  ValidationResult,
  ConversionProject,
  DatabaseType
} from '../services/database-conversion/types';

/**
 * Agent that specializes in database conversion operations
 */
export class DatabaseConversionAgent extends BaseAgent {
  private databaseConversionService: DatabaseConversionService;
  private llmService: LLMService;

  constructor(
    storage: IStorage,
    mcpService: MCPService,
    databaseConversionService: DatabaseConversionService,
    llmService: LLMService
  ) {
    super('database-conversion-agent', 'Database Conversion Agent', storage, mcpService);
    
    this.databaseConversionService = databaseConversionService;
    this.llmService = llmService;
    
    this.registerCapabilities();
  }

  /**
   * Register agent capabilities with the MCP service
   */
  private registerCapabilities() {
    this.registerCapability('analyzeSourceDatabase', this.analyzeSourceDatabase.bind(this));
    this.registerCapability('generateMigrationPlan', this.generateMigrationPlan.bind(this));
    this.registerCapability('executeMigration', this.executeMigration.bind(this));
    this.registerCapability('createCompatibilityLayer', this.createCompatibilityLayer.bind(this));
    this.registerCapability('validateMigration', this.validateMigration.bind(this));
    this.registerCapability('detectDatabaseType', this.detectDatabaseType.bind(this));
    this.registerCapability('createConversionProject', this.createConversionProject.bind(this));
    this.registerCapability('getConversionProjects', this.getConversionProjects.bind(this));
    this.registerCapability('getConversionProject', this.getConversionProject.bind(this));
    this.registerCapability('updateMigrationPlan', this.updateMigrationPlan.bind(this));
    this.registerCapability('generateMigrationScript', this.generateMigrationScript.bind(this));
    this.registerCapability('estimateMigrationComplexity', this.estimateMigrationComplexity.bind(this));
    this.registerCapability('explainMigrationPlan', this.explainMigrationPlan.bind(this));
    this.registerCapability('generateSchemaInsights', this.generateSchemaInsights.bind(this));
  }
  
  /**
   * Detect the type of a database from connection information
   */
  async detectDatabaseType(connectionConfig: DatabaseConnectionConfig): Promise<DatabaseType> {
    try {
      return await this.databaseConversionService.detectDatabaseType(connectionConfig);
    } catch (error) {
      this.logError('Error detecting database type', error);
      throw error;
    }
  }
  
  /**
   * Create a new conversion project
   */
  async createConversionProject(
    name: string,
    description: string,
    sourceConfig: DatabaseConnectionConfig,
    targetConfig: DatabaseConnectionConfig
  ): Promise<ConversionProject> {
    try {
      return await this.databaseConversionService.createConversionProject(
        name,
        description,
        sourceConfig,
        targetConfig
      );
    } catch (error) {
      this.logError('Error creating conversion project', error);
      throw error;
    }
  }
  
  /**
   * Get all conversion projects
   */
  async getConversionProjects(): Promise<ConversionProject[]> {
    try {
      return await this.databaseConversionService.getConversionProjects();
    } catch (error) {
      this.logError('Error getting conversion projects', error);
      throw error;
    }
  }
  
  /**
   * Get a specific conversion project
   */
  async getConversionProject(id: string): Promise<ConversionProject | undefined> {
    try {
      return await this.databaseConversionService.getConversionProject(id);
    } catch (error) {
      this.logError(`Error getting conversion project ${id}`, error);
      throw error;
    }
  }

  /**
   * Analyze a source database and create a schema map
   */
  async analyzeSourceDatabase(
    projectIdOrConfig: string | DatabaseConnectionConfig
  ): Promise<SchemaAnalysisResult> {
    try {
      return await this.databaseConversionService.analyzeDatabase(projectIdOrConfig);
    } catch (error) {
      this.logError('Error analyzing source database', error);
      throw error;
    }
  }

  /**
   * Generate a comprehensive migration plan
   */
  async generateMigrationPlan(
    projectId: string,
    customInstructions?: string
  ): Promise<MigrationPlan> {
    try {
      return await this.databaseConversionService.generateMigrationPlan(projectId, customInstructions);
    } catch (error) {
      this.logError(`Error generating migration plan for project ${projectId}`, error);
      throw error;
    }
  }
  
  /**
   * Update an existing migration plan
   */
  async updateMigrationPlan(
    projectId: string,
    updates: Partial<MigrationPlan>
  ): Promise<MigrationPlan> {
    try {
      return await this.databaseConversionService.updateMigrationPlan(projectId, updates);
    } catch (error) {
      this.logError(`Error updating migration plan for project ${projectId}`, error);
      throw error;
    }
  }
  
  /**
   * Generate migration SQL script
   */
  async generateMigrationScript(projectId: string): Promise<string> {
    try {
      return await this.databaseConversionService.generateMigrationScript(projectId);
    } catch (error) {
      this.logError(`Error generating migration script for project ${projectId}`, error);
      throw error;
    }
  }
  
  /**
   * Estimate the complexity and time required for a migration
   */
  async estimateMigrationComplexity(projectId: string): Promise<{
    complexity: 'simple' | 'moderate' | 'complex' | 'very_complex';
    estimatedTime: string;
    riskFactors: string[];
    recommendedApproach: string;
  }> {
    try {
      return await this.databaseConversionService.estimateMigrationComplexity(projectId);
    } catch (error) {
      this.logError(`Error estimating migration complexity for project ${projectId}`, error);
      throw error;
    }
  }

  /**
   * Execute the database migration
   */
  async executeMigration(
    projectId: string,
    options?: MigrationOptions
  ): Promise<MigrationResult> {
    try {
      return await this.databaseConversionService.executeMigration(projectId, options);
    } catch (error) {
      this.logError(`Error executing migration for project ${projectId}`, error);
      throw error;
    }
  }

  /**
   * Create compatibility layer for legacy applications
   */
  async createCompatibilityLayer(
    projectId: string
  ): Promise<CompatibilityLayerResult> {
    try {
      return await this.databaseConversionService.createCompatibilityLayer(projectId);
    } catch (error) {
      this.logError(`Error creating compatibility layer for project ${projectId}`, error);
      throw error;
    }
  }

  /**
   * Validate migration completeness and correctness
   */
  async validateMigration(
    projectId: string
  ): Promise<ValidationResult> {
    try {
      return await this.databaseConversionService.validateMigration(projectId);
    } catch (error) {
      this.logError(`Error validating migration for project ${projectId}`, error);
      throw error;
    }
  }
  
  /**
   * Generate human-readable explanation of a migration plan
   */
  async explainMigrationPlan(projectId: string): Promise<string> {
    try {
      // Get the project
      const project = await this.databaseConversionService.getConversionProject(projectId);
      if (!project) {
        throw new Error(`Conversion project not found: ${projectId}`);
      }
      
      if (!project.migrationPlan) {
        throw new Error('No migration plan exists yet. Please generate one first.');
      }
      
      // Build prompt for AI
      const tableCount = project.migrationPlan.tableMappings.length;
      const viewCount = project.migrationPlan.viewMappings?.length || 0;
      const procedureCount = project.migrationPlan.procedureMappings?.length || 0;
      const triggerCount = project.migrationPlan.triggerMappings?.length || 0;
      
      const skippedTables = project.migrationPlan.tableMappings.filter(t => t.skip).length;
      const skippedViews = project.migrationPlan.viewMappings?.filter(v => v.skip).length || 0;
      const skippedProcedures = project.migrationPlan.procedureMappings?.filter(p => p.skip).length || 0;
      const skippedTriggers = project.migrationPlan.triggerMappings?.filter(t => t.skip).length || 0;
      
      const prompt = `
        I have a database migration plan for a project named "${project.name}" with the following elements:
        - Tables: ${tableCount} (${skippedTables} skipped)
        - Views: ${viewCount} (${skippedViews} skipped)
        - Procedures: ${procedureCount} (${skippedProcedures} skipped)
        - Triggers: ${triggerCount} (${skippedTriggers} skipped)
        
        The source database is: ${project.sourceConfig.type}
        The target database is: ${project.targetConfig.type}
        
        Some example table mappings:
        ${project.migrationPlan.tableMappings.slice(0, 3).map(mapping => `
          Source: ${mapping.sourceTable} -> Target: ${mapping.targetTable}
          Columns: ${mapping.columnMappings.slice(0, 3).map(col => 
            `${col.sourceColumn} -> ${col.targetColumn}${col.transformation ? ` (with transformation)` : ''}`
          ).join(', ')}${mapping.columnMappings.length > 3 ? '...' : ''}
        `).join('\n')}
        
        Please provide a human-readable explanation of this migration plan in a clear, concise manner.
        Explain what the migration will do and highlight any important transformations or potential issues.
        The explanation should be suitable for a non-technical stakeholder.
      `;
      
      return this.llmService.generateText(prompt);
    } catch (error) {
      this.logError(`Error explaining migration plan for project ${projectId}`, error);
      throw error;
    }
  }
  
  /**
   * Generate insights about a database schema
   */
  async generateSchemaInsights(projectId: string): Promise<string> {
    try {
      // Get the project
      const project = await this.databaseConversionService.getConversionProject(projectId);
      if (!project) {
        throw new Error(`Conversion project not found: ${projectId}`);
      }
      
      if (!project.schemaAnalysis) {
        throw new Error('No schema analysis exists yet. Please analyze the database first.');
      }
      
      // Build prompt for AI
      const tableNames = project.schemaAnalysis.tables.map(t => t.name).join(', ');
      const tableCount = project.schemaAnalysis.tables.length;
      const viewCount = project.schemaAnalysis.views.length;
      const procedureCount = project.schemaAnalysis.procedures?.length || 0;
      const triggerCount = project.schemaAnalysis.triggers?.length || 0;
      
      // Find tables with the most foreign keys (most connected)
      const tablesWithForeignKeyCount = project.schemaAnalysis.tables.map(table => ({
        name: table.name,
        foreignKeyCount: table.foreignKeys.length
      }));
      
      tablesWithForeignKeyCount.sort((a, b) => b.foreignKeyCount - a.foreignKeyCount);
      const mostConnectedTables = tablesWithForeignKeyCount
        .slice(0, 5)
        .filter(t => t.foreignKeyCount > 0)
        .map(t => `${t.name} (${t.foreignKeyCount} connections)`);
      
      const prompt = `
        As a database expert, analyze this database schema and provide insights:
        
        Database Type: ${project.schemaAnalysis.databaseType}
        Database Name: ${project.schemaAnalysis.databaseName}
        Number of Tables: ${tableCount}
        Number of Views: ${viewCount}
        Number of Procedures/Functions: ${procedureCount}
        Number of Triggers: ${triggerCount}
        Tables: ${tableNames}
        Most Connected Tables: ${mostConnectedTables.join(', ') || 'None found'}
        
        Please provide the following insights:
        1. What appears to be the main purpose of this database?
        2. Identify potential entity relationships and the overall data model
        3. Highlight any potential issues or areas for improvement in the schema
        4. Suggest best practices for migrating this schema to a modern database
        
        Format your response as a structured assessment with clear sections.
      `;
      
      return this.llmService.generateText(prompt);
    } catch (error) {
      this.logError(`Error generating schema insights for project ${projectId}`, error);
      throw error;
    }
  }
  
  /**
   * Log an error
   */
  private logError(message: string, error: any) {
    console.error(`[DatabaseConversionAgent] ${message}:`, error);
    this.addAuditLog('ERROR', `${message}: ${error.message}`);
  }
  
  /**
   * Add an audit log
   */
  private async addAuditLog(level: string, message: string) {
    await this.storage.createAuditLog({
      timestamp: new Date(),
      level,
      component: this.name,
      message,
      details: JSON.stringify({ agent: this.id }),
      userId: 1 // System user
    });
  }
}