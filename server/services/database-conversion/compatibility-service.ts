/**
 * Compatibility Service
 * 
 * This service creates compatibility layers between databases,
 * helping legacy applications work with the migrated database.
 */

import { BaseService } from '../base-service';
import { IStorage } from '../../storage';
import {
  DatabaseConnectionConfig,
  MigrationPlan,
  MigrationResult,
  CompatibilityLayerResult,
  TableMapping
} from './types';

/**
 * Service for creating database compatibility layers
 */
export class CompatibilityService extends BaseService {
  constructor(storage: IStorage) {
    super('compatibility-service', storage);
  }
  
  /**
   * Create a compatibility layer between source and target databases
   */
  async createCompatibilityLayer(
    sourceConfig: DatabaseConnectionConfig,
    targetConfig: DatabaseConnectionConfig,
    migrationPlan: MigrationPlan,
    migrationResult: MigrationResult
  ): Promise<CompatibilityLayerResult> {
    console.log('Creating compatibility layer...');
    
    // Determine strategy based on database types
    const sourceType = sourceConfig.type || 'unknown';
    const targetType = targetConfig.type || 'unknown';
    
    try {
      if (targetType === 'postgresql') {
        return this.createPostgresCompatibilityLayer(sourceConfig, targetConfig, migrationPlan, migrationResult);
      } else {
        throw new Error(`Compatibility layer not supported for target database type: ${targetType}`);
      }
    } catch (error) {
      console.error('Error creating compatibility layer:', error);
      throw error;
    }
  }
  
  /**
   * Create a PostgreSQL compatibility layer
   */
  private async createPostgresCompatibilityLayer(
    sourceConfig: DatabaseConnectionConfig,
    targetConfig: DatabaseConnectionConfig,
    migrationPlan: MigrationPlan,
    migrationResult: MigrationResult
  ): Promise<CompatibilityLayerResult> {
    const result: CompatibilityLayerResult = {
      success: false,
      createdViews: [],
      createdFunctions: [],
      documentation: ''
    };
    
    try {
      // Connect to target database
      const { Pool } = require('pg');
      const pool = new Pool({
        connectionString: targetConfig.connectionString,
        host: targetConfig.host,
        port: targetConfig.port,
        database: targetConfig.database,
        user: targetConfig.username,
        password: targetConfig.password,
      });
      
      // Create schema if specified in source config but not in target schema
      const sourceSchema = sourceConfig.schema;
      const targetSchema = targetConfig.schema || 'public';
      
      if (sourceSchema && sourceSchema !== targetSchema) {
        await pool.query(`CREATE SCHEMA IF NOT EXISTS ${sourceSchema}`);
        result.createdViews.push({
          name: `${sourceSchema}`,
          definition: `CREATE SCHEMA IF NOT EXISTS ${sourceSchema}`
        });
      }
      
      // Create views for each table mapping
      for (const mapping of migrationPlan.tableMappings) {
        // Skip tables that were marked to skip
        if (mapping.skip) continue;
        
        // If source table is fully qualified with schema, extract just the table name
        const sourceTableParts = mapping.sourceTable.split('.');
        const sourceTableName = sourceTableParts.length > 1 ? sourceTableParts[1] : sourceTableParts[0];
        const sourceTableSchema = sourceTableParts.length > 1 ? sourceTableParts[0] : sourceSchema || 'public';
        
        // If target table is fully qualified with schema, extract just the table name
        const targetTableParts = mapping.targetTable.split('.');
        const targetTableName = targetTableParts.length > 1 ? targetTableParts[1] : targetTableParts[0];
        const targetTableSchema = targetTableParts.length > 1 ? targetTableParts[0] : targetSchema || 'public';
        
        // If source and target tables are in different schemas, create a view in the source schema
        if (sourceTableSchema !== targetTableSchema) {
          // Build the view column mappings
          const viewColumns = mapping.columnMappings.map(colMap => {
            if (colMap.transformation) {
              return `${colMap.transformation} AS ${colMap.sourceColumn}`;
            } else {
              return `${colMap.targetColumn} AS ${colMap.sourceColumn}`;
            }
          }).join(', ');
          
          // Create view SQL
          const viewSQL = `
            CREATE OR REPLACE VIEW ${sourceTableSchema}.${sourceTableName} AS
            SELECT ${viewColumns}
            FROM ${targetTableSchema}.${targetTableName}
          `;
          
          // Execute the view creation
          await pool.query(viewSQL);
          
          // Add to result
          result.createdViews.push({
            name: `${sourceTableSchema}.${sourceTableName}`,
            definition: viewSQL
          });
        }
      }
      
      // Create views for view mappings if present
      if (migrationPlan.viewMappings) {
        for (const viewMapping of migrationPlan.viewMappings) {
          // Skip views that were marked to skip
          if (viewMapping.skip) continue;
          
          // If source view is fully qualified with schema, extract just the view name
          const sourceViewParts = viewMapping.sourceView.split('.');
          const sourceViewName = sourceViewParts.length > 1 ? sourceViewParts[1] : sourceViewParts[0];
          const sourceViewSchema = sourceViewParts.length > 1 ? sourceViewParts[0] : sourceSchema || 'public';
          
          // If target view is fully qualified with schema, extract just the view name
          const targetViewParts = viewMapping.targetView.split('.');
          const targetViewName = targetViewParts.length > 1 ? targetViewParts[1] : targetViewParts[0];
          const targetViewSchema = targetViewParts.length > 1 ? targetViewParts[0] : targetSchema || 'public';
          
          // If source and target views are in different schemas, create a view in the source schema
          if (sourceViewSchema !== targetViewSchema || sourceViewName !== targetViewName) {
            // Create view SQL, either using rewritten definition or as a pass-through
            const viewSQL = viewMapping.rewrittenDefinition || `
              CREATE OR REPLACE VIEW ${sourceViewSchema}.${sourceViewName} AS
              SELECT * FROM ${targetViewSchema}.${targetViewName}
            `;
            
            // Execute the view creation
            await pool.query(viewSQL);
            
            // Add to result
            result.createdViews.push({
              name: `${sourceViewSchema}.${sourceViewName}`,
              definition: viewSQL
            });
          }
        }
      }
      
      // Create function compatibility layer if needed
      if (migrationPlan.procedureMappings) {
        for (const procMapping of migrationPlan.procedureMappings) {
          // Skip procedures that were marked to skip
          if (procMapping.skip) continue;
          
          // If source has a rewritten definition, use it
          if (procMapping.rewrittenDefinition) {
            // Execute the function creation
            await pool.query(procMapping.rewrittenDefinition);
            
            // Add to result
            result.createdFunctions.push({
              name: procMapping.sourceProcedure,
              definition: procMapping.rewrittenDefinition
            });
          }
        }
      }
      
      // Generate documentation
      result.documentation = this.generateCompatibilityDocumentation(
        sourceConfig,
        targetConfig,
        migrationPlan,
        result
      );
      
      // Close the database connection
      await pool.end();
      
      // Update result
      result.success = true;
      
      return result;
    } catch (error) {
      console.error('Error creating PostgreSQL compatibility layer:', error);
      result.error = error.message;
      return result;
    }
  }
  
  /**
   * Generate documentation for the compatibility layer
   */
  private generateCompatibilityDocumentation(
    sourceConfig: DatabaseConnectionConfig,
    targetConfig: DatabaseConnectionConfig,
    migrationPlan: MigrationPlan,
    result: CompatibilityLayerResult
  ): string {
    const sourceType = sourceConfig.type || 'unknown';
    const targetType = targetConfig.type || 'unknown';
    
    let doc = `
      # Database Compatibility Layer Documentation
      
      ## Overview
      
      This compatibility layer allows applications that were designed to work with the
      original ${sourceType} database to continue functioning with the new ${targetType}
      database. The layer consists of views and functions that map between the old and
      new database structures.
      
      ## Database Connection Information
      
      ### Original Database (${sourceType})
      
      - Host: ${sourceConfig.host || 'from connection string'}
      - Database: ${sourceConfig.database || 'from connection string'}
      - Schema: ${sourceConfig.schema || 'default'}
      
      ### New Database (${targetType})
      
      - Host: ${targetConfig.host || 'from connection string'}
      - Database: ${targetConfig.database || 'from connection string'}
      - Schema: ${targetConfig.schema || 'default'}
      
      ## Compatibility Views
      
      The following views were created to maintain compatibility with the original schema:
      
      ${result.createdViews.map(view => `
      ### ${view.name}
      
      \`\`\`sql
      ${view.definition}
      \`\`\`
      `).join('\n')}
      
      ## Compatibility Functions
      
      The following functions were created to maintain compatibility with the original schema:
      
      ${result.createdFunctions.map(func => `
      ### ${func.name}
      
      \`\`\`sql
      ${func.definition}
      \`\`\`
      `).join('\n')}
      
      ## Usage Notes
      
      - Applications should continue to connect using the original connection string
      - The compatibility layer is designed to be transparent to the application
      - Any application changes should be noted here
      
      ## Maintenance
      
      The compatibility layer should be maintained alongside the main database schema.
      If changes are made to the target database schema, the compatibility views and
      functions may need to be updated.
    `;
    
    return doc;
  }
}