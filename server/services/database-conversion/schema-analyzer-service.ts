/**
 * Schema Analyzer Service
 * 
 * This service is responsible for analyzing database schemas and
 * creating a detailed schema representation that can be used for
 * migration planning.
 */

import { BaseService } from '../base-service';
import { IStorage } from '../../storage';
import { LLMService } from '../llm-service';
import {
  DatabaseConnectionConfig,
  SchemaAnalysisResult,
  TableDefinition,
  ViewDefinition,
  ProcedureDefinition,
  TriggerDefinition,
  DatabaseType
} from './types';

/**
 * Service for analyzing database schemas
 */
export class SchemaAnalyzerService extends BaseService {
  private llmService: LLMService;
  
  constructor(
    storage: IStorage,
    llmService: LLMService
  ) {
    super('schema-analyzer-service', storage);
    this.llmService = llmService;
  }
  
  /**
   * Analyze a database schema from a connection
   */
  async analyzeSchema(connectionConfig: DatabaseConnectionConfig): Promise<SchemaAnalysisResult> {
    // Determine database type
    const databaseType = connectionConfig.type || await this.detectDatabaseType(connectionConfig);
    
    // Get the appropriate analyzer based on database type
    const analyzer = this.getAnalyzerForType(databaseType);
    
    try {
      // Execute the analysis
      return await analyzer.analyze(connectionConfig);
    } catch (error) {
      console.error(`Error analyzing schema for ${databaseType} database:`, error);
      throw new Error(`Failed to analyze ${databaseType} database: ${error.message}`);
    }
  }
  
  /**
   * Detect database type from connection
   */
  private async detectDatabaseType(connectionConfig: DatabaseConnectionConfig): Promise<DatabaseType> {
    const connStr = connectionConfig.connectionString?.toLowerCase() || '';
    
    if (connStr.includes('postgresql') || connStr.includes('postgres')) {
      return 'postgresql';
    } else if (connStr.includes('sqlserver') || connStr.includes('mssql')) {
      return 'sqlserver';
    } else if (connStr.includes('mysql')) {
      return 'mysql';
    } else if (connStr.includes('oracle')) {
      return 'oracle';
    } else if (connStr.includes('mongodb')) {
      return 'mongodb';
    } else if (connStr.includes('sqlite')) {
      return 'sqlite';
    }
    
    // If we can't automatically detect, default to PostgreSQL
    return 'postgresql';
  }
  
  /**
   * Get appropriate analyzer for database type
   */
  private getAnalyzerForType(type: DatabaseType): DatabaseSchemaAnalyzer {
    switch (type) {
      case 'postgresql':
        return new PostgresSchemaAnalyzer(this.llmService);
      case 'sqlserver':
        return new SqlServerSchemaAnalyzer(this.llmService);
      case 'mysql':
        return new MySqlSchemaAnalyzer(this.llmService);
      case 'oracle':
        return new OracleSchemaAnalyzer(this.llmService);
      case 'mongodb':
        return new MongoDbSchemaAnalyzer(this.llmService);
      case 'sqlite':
        return new SqliteSchemaAnalyzer(this.llmService);
      default:
        return new GenericSchemaAnalyzer(this.llmService);
    }
  }
  
  /**
   * Generate insights for a schema using AI
   */
  async generateSchemaInsights(analysis: SchemaAnalysisResult): Promise<string> {
    // Use LLM to generate insights about the schema
    const tableNames = analysis.tables.map(t => t.name).join(', ');
    const tableCount = analysis.tables.length;
    const viewCount = analysis.views.length;
    const procedureCount = analysis.procedures?.length || 0;
    const triggerCount = analysis.triggers?.length || 0;
    
    // Find tables with the most foreign keys (most connected)
    const tablesWithForeignKeyCount = analysis.tables.map(table => ({
      name: table.name,
      foreignKeyCount: table.foreignKeys.length
    }));
    
    tablesWithForeignKeyCount.sort((a, b) => b.foreignKeyCount - a.foreignKeyCount);
    const mostConnectedTables = tablesWithForeignKeyCount
      .slice(0, 5)
      .filter(t => t.foreignKeyCount > 0)
      .map(t => `${t.name} (${t.foreignKeyCount} connections)`);
    
    // Generate a description of the schema for the LLM
    const schemaDescription = `
      Database Type: ${analysis.databaseType}
      Database Name: ${analysis.databaseName}
      Number of Tables: ${tableCount}
      Number of Views: ${viewCount}
      Number of Procedures/Functions: ${procedureCount}
      Number of Triggers: ${triggerCount}
      Tables: ${tableNames}
      Most Connected Tables: ${mostConnectedTables.join(', ') || 'None found'}
    `;
    
    // Generate insights using the LLM
    const prompt = `
      As a database expert, analyze this database schema and provide insights:
      
      ${schemaDescription}
      
      Please provide the following insights:
      1. What appears to be the main purpose of this database?
      2. Identify potential entity relationships and the overall data model
      3. Highlight any potential issues or areas for improvement in the schema
      4. Suggest best practices for migrating this schema to a modern PostgreSQL database
      
      Format your response as a structured assessment with clear sections.
    `;
    
    return this.llmService.generateText(prompt);
  }
}

/**
 * Interface for database schema analyzers
 */
interface DatabaseSchemaAnalyzer {
  analyze(connectionConfig: DatabaseConnectionConfig): Promise<SchemaAnalysisResult>;
}

/**
 * PostgreSQL schema analyzer
 */
class PostgresSchemaAnalyzer implements DatabaseSchemaAnalyzer {
  constructor(private llmService: LLMService) {}
  
  async analyze(connectionConfig: DatabaseConnectionConfig): Promise<SchemaAnalysisResult> {
    // Here we would connect to the PostgreSQL database
    // and extract schema information using queries against
    // the information_schema tables
    
    // This is a placeholder implementation
    console.log('Analyzing PostgreSQL schema...');
    
    const tables: TableDefinition[] = [];
    const views: ViewDefinition[] = [];
    const procedures: ProcedureDefinition[] = [];
    const triggers: TriggerDefinition[] = [];
    
    // Create connection to PostgreSQL
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: connectionConfig.connectionString,
      // If connection string isn't provided, use individual parameters
      host: connectionConfig.host,
      port: connectionConfig.port,
      database: connectionConfig.database,
      user: connectionConfig.username,
      password: connectionConfig.password,
      // Default schema is public if not specified
      schema: connectionConfig.schema || 'public',
    });
    
    try {
      // Get database name
      const dbNameResult = await pool.query('SELECT current_database() as db_name');
      const databaseName = dbNameResult.rows[0].db_name;
      
      // Get database version
      const versionResult = await pool.query('SELECT version()');
      const databaseVersion = versionResult.rows[0].version;
      
      // Get all tables
      const schemaClause = connectionConfig.schema 
        ? `AND table_schema = '${connectionConfig.schema}'` 
        : "AND table_schema NOT IN ('pg_catalog', 'information_schema')";
      
      const tablesQuery = `
        SELECT 
          table_name,
          table_schema
        FROM 
          information_schema.tables
        WHERE 
          table_type = 'BASE TABLE'
          ${schemaClause}
        ORDER BY 
          table_schema, table_name
      `;
      
      const tablesResult = await pool.query(tablesQuery);
      
      // Process each table
      for (const tableRow of tablesResult.rows) {
        const tableName = tableRow.table_name;
        const tableSchema = tableRow.table_schema;
        
        // Get columns
        const columnsQuery = `
          SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default,
            character_maximum_length,
            numeric_precision,
            numeric_scale
          FROM 
            information_schema.columns
          WHERE 
            table_name = $1
            AND table_schema = $2
          ORDER BY 
            ordinal_position
        `;
        
        const columnsResult = await pool.query(columnsQuery, [tableName, tableSchema]);
        
        // Get primary key
        const pkQuery = `
          SELECT 
            tc.constraint_name,
            kcu.column_name
          FROM 
            information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
          WHERE 
            tc.constraint_type = 'PRIMARY KEY'
            AND tc.table_name = $1
            AND tc.table_schema = $2
          ORDER BY 
            kcu.ordinal_position
        `;
        
        const pkResult = await pool.query(pkQuery, [tableName, tableSchema]);
        
        let primaryKey = undefined;
        if (pkResult.rows.length > 0) {
          primaryKey = {
            name: pkResult.rows[0].constraint_name,
            columns: pkResult.rows.map(row => row.column_name)
          };
        }
        
        // Get foreign keys
        const fkQuery = `
          SELECT 
            tc.constraint_name,
            kcu.column_name,
            ccu.table_schema AS referenced_table_schema,
            ccu.table_name AS referenced_table_name,
            ccu.column_name AS referenced_column_name,
            rc.update_rule,
            rc.delete_rule
          FROM 
            information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage ccu
              ON tc.constraint_name = ccu.constraint_name
              AND tc.table_schema = ccu.constraint_schema
            JOIN information_schema.referential_constraints rc
              ON tc.constraint_name = rc.constraint_name
              AND tc.table_schema = rc.constraint_schema
          WHERE 
            tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_name = $1
            AND tc.table_schema = $2
          ORDER BY 
            kcu.ordinal_position
        `;
        
        const fkResult = await pool.query(fkQuery, [tableName, tableSchema]);
        
        // Process foreign keys
        const foreignKeys = [];
        const fkMap = new Map();
        
        for (const fkRow of fkResult.rows) {
          const fkName = fkRow.constraint_name;
          
          if (!fkMap.has(fkName)) {
            fkMap.set(fkName, {
              name: fkName,
              columns: [],
              referencedTable: `${fkRow.referenced_table_schema}.${fkRow.referenced_table_name}`,
              referencedColumns: [],
              onUpdate: fkRow.update_rule,
              onDelete: fkRow.delete_rule
            });
          }
          
          const fk = fkMap.get(fkName);
          fk.columns.push(fkRow.column_name);
          fk.referencedColumns.push(fkRow.referenced_column_name);
        }
        
        fkMap.forEach(fk => foreignKeys.push(fk));
        
        // Get indexes
        const indexQuery = `
          SELECT 
            indexname,
            indexdef
          FROM 
            pg_indexes
          WHERE 
            tablename = $1
            AND schemaname = $2
        `;
        
        const indexResult = await pool.query(indexQuery, [tableName, tableSchema]);
        
        // Process indexes
        const indexes = [];
        for (const idxRow of indexResult.rows) {
          // Skip primary key indexes as they're already included
          if (primaryKey && idxRow.indexname === primaryKey.name) {
            continue;
          }
          
          // Parse index definition to determine if it's unique and extract columns
          const indexDef = idxRow.indexdef;
          const isUnique = indexDef.includes('UNIQUE');
          
          // Extract columns from the index definition
          // This is a simplified approach and might need enhancement for complex indexes
          const columnsMatch = indexDef.match(/\(([^)]+)\)/);
          const columns = columnsMatch 
            ? columnsMatch[1].split(',').map(col => col.trim()) 
            : [];
          
          indexes.push({
            name: idxRow.indexname,
            isUnique,
            columns,
            // Attempt to determine index type
            type: indexDef.includes('USING btree') ? 'btree' : 
                 indexDef.includes('USING hash') ? 'hash' :
                 indexDef.includes('USING gist') ? 'gist' :
                 indexDef.includes('USING gin') ? 'gin' : 'unknown'
          });
        }
        
        // Get check constraints
        const checkQuery = `
          SELECT 
            tc.constraint_name,
            pgc.check_clause
          FROM 
            information_schema.table_constraints tc
            JOIN pg_constraint pgc ON tc.constraint_name = pgc.conname
          WHERE 
            tc.constraint_type = 'CHECK'
            AND tc.table_name = $1
            AND tc.table_schema = $2
        `;
        
        const checkResult = await pool.query(checkQuery, [tableName, tableSchema]);
        
        // Process check constraints
        const checkConstraints = checkResult.rows.map(row => ({
          name: row.constraint_name,
          expression: row.check_clause
        }));
        
        // Get approximate row count
        const countQuery = `
          SELECT 
            reltuples::bigint AS approximate_count
          FROM 
            pg_class
            JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
          WHERE 
            relname = $1
            AND nspname = $2
        `;
        
        const countResult = await pool.query(countQuery, [tableName, tableSchema]);
        const approximateRowCount = countResult.rows[0]?.approximate_count || 0;
        
        // Get approximate size
        const sizeQuery = `
          SELECT 
            pg_total_relation_size($1) AS total_size
        `;
        
        const sizeResult = await pool.query(sizeQuery, [`${tableSchema}.${tableName}`]);
        const approximateSize = sizeResult.rows[0]?.total_size || 0;
        
        // Create table definition
        tables.push({
          name: tableName,
          schema: tableSchema,
          columns: columnsResult.rows.map(col => ({
            name: col.column_name,
            dataType: col.data_type,
            isNullable: col.is_nullable === 'YES',
            defaultValue: col.column_default,
            maxLength: col.character_maximum_length,
            precision: col.numeric_precision,
            scale: col.numeric_scale,
            isIdentity: col.column_default?.includes('nextval') || false,
          })),
          primaryKey,
          indexes,
          foreignKeys,
          checkConstraints,
          approximateRowCount,
          approximateSize
        });
      }
      
      // Get views
      const viewsQuery = `
        SELECT 
          table_name,
          table_schema,
          view_definition
        FROM 
          information_schema.views
        WHERE 
          ${schemaClause}
        ORDER BY 
          table_schema, table_name
      `;
      
      const viewsResult = await pool.query(viewsQuery);
      
      // Process each view
      for (const viewRow of viewsResult.rows) {
        const viewName = viewRow.table_name;
        const viewSchema = viewRow.table_schema;
        const viewDefinition = viewRow.view_definition;
        
        // Get view columns
        const columnsQuery = `
          SELECT 
            column_name,
            data_type,
            is_nullable
          FROM 
            information_schema.columns
          WHERE 
            table_name = $1
            AND table_schema = $2
          ORDER BY 
            ordinal_position
        `;
        
        const columnsResult = await pool.query(columnsQuery, [viewName, viewSchema]);
        
        // Check if it's a materialized view
        const matViewQuery = `
          SELECT 
            1 
          FROM 
            pg_matviews
          WHERE 
            matviewname = $1
            AND schemaname = $2
        `;
        
        const matViewResult = await pool.query(matViewQuery, [viewName, viewSchema]);
        const isMaterialized = matViewResult.rows.length > 0;
        
        // Create view definition
        views.push({
          name: viewName,
          schema: viewSchema,
          definition: viewDefinition,
          columns: columnsResult.rows.map(col => ({
            name: col.column_name,
            dataType: col.data_type,
            isNullable: col.is_nullable === 'YES'
          })),
          isMaterialized
        });
      }
      
      // Get procedures/functions
      const proceduresQuery = `
        SELECT 
          p.proname AS name,
          n.nspname AS schema,
          pg_get_functiondef(p.oid) AS definition,
          p.prorettype::regtype::text AS return_type,
          p.proargtypes,
          p.proargnames,
          p.proargmodes
        FROM 
          pg_proc p
          JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE 
          n.nspname NOT IN ('pg_catalog', 'information_schema')
          ${connectionConfig.schema ? `AND n.nspname = '${connectionConfig.schema}'` : ''}
        ORDER BY 
          n.nspname, p.proname
      `;
      
      const proceduresResult = await pool.query(proceduresQuery);
      
      // Process each procedure/function
      for (const procRow of proceduresResult.rows) {
        const procName = procRow.name;
        const procSchema = procRow.schema;
        const procDefinition = procRow.definition;
        const returnType = procRow.return_type;
        
        // Parse parameter information
        const parameters = [];
        
        if (procRow.proargnames && procRow.proargnames.length > 0) {
          // If we have argument names, modes, and types
          const argNames = procRow.proargnames;
          const argModes = procRow.proargmodes;
          
          for (let i = 0; i < argNames.length; i++) {
            parameters.push({
              name: argNames[i],
              dataType: 'unknown', // Would need more complex logic to get types
              direction: argModes && argModes[i] 
                ? (argModes[i] === 'i' ? 'IN' : argModes[i] === 'o' ? 'OUT' : 'INOUT')
                : 'IN'
            });
          }
        }
        
        // Create procedure definition
        procedures.push({
          name: procName,
          schema: procSchema,
          definition: procDefinition,
          parameters,
          returnType,
          isFunction: returnType !== 'void'
        });
      }
      
      // Get triggers
      const triggersQuery = `
        SELECT 
          t.tgname AS name,
          n.nspname AS schema,
          c.relname AS table_name,
          pg_get_triggerdef(t.oid) AS definition,
          (t.tgtype & 1) <> 0 AS row_trigger
        FROM 
          pg_trigger t
          JOIN pg_class c ON t.tgrelid = c.oid
          JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE 
          NOT t.tgisinternal
          AND n.nspname NOT IN ('pg_catalog', 'information_schema')
          ${connectionConfig.schema ? `AND n.nspname = '${connectionConfig.schema}'` : ''}
        ORDER BY 
          t.tgrelid, t.tgname
      `;
      
      const triggersResult = await pool.query(triggersQuery);
      
      // Process each trigger
      for (const trigRow of triggersResult.rows) {
        const trigName = trigRow.name;
        const trigSchema = trigRow.schema;
        const trigTableName = trigRow.table_name;
        const trigDefinition = trigRow.definition;
        const isRowLevel = trigRow.row_trigger;
        
        // Parse trigger definition to extract events and timing
        const events = [];
        let timing = 'AFTER';
        
        if (trigDefinition.includes(' BEFORE ')) {
          timing = 'BEFORE';
        } else if (trigDefinition.includes(' INSTEAD OF ')) {
          timing = 'INSTEAD OF';
        }
        
        if (trigDefinition.includes(' INSERT ')) {
          events.push('INSERT');
        }
        if (trigDefinition.includes(' UPDATE ')) {
          events.push('UPDATE');
        }
        if (trigDefinition.includes(' DELETE ')) {
          events.push('DELETE');
        }
        
        // Create trigger definition
        triggers.push({
          name: trigName,
          schema: trigSchema,
          tableName: trigTableName,
          definition: trigDefinition,
          events,
          timing,
          isRowLevel
        });
      }
      
      // Return the complete schema analysis
      return {
        databaseType: 'postgresql',
        databaseVersion,
        databaseName,
        tables,
        views,
        procedures,
        triggers
      };
    } catch (error) {
      console.error('Error analyzing PostgreSQL schema:', error);
      throw error;
    } finally {
      await pool.end();
    }
  }
}

/**
 * SQL Server schema analyzer
 */
class SqlServerSchemaAnalyzer implements DatabaseSchemaAnalyzer {
  constructor(private llmService: LLMService) {}
  
  async analyze(connectionConfig: DatabaseConnectionConfig): Promise<SchemaAnalysisResult> {
    // Implementation would connect to SQL Server using tedious or mssql
    // and extract schema information
    
    // This is a placeholder
    return {
      databaseType: 'sqlserver',
      databaseName: connectionConfig.database || 'unknown',
      tables: [],
      views: []
    };
  }
}

/**
 * MySQL schema analyzer
 */
class MySqlSchemaAnalyzer implements DatabaseSchemaAnalyzer {
  constructor(private llmService: LLMService) {}
  
  async analyze(connectionConfig: DatabaseConnectionConfig): Promise<SchemaAnalysisResult> {
    // Implementation would connect to MySQL using mysql2
    // and extract schema information
    
    // This is a placeholder
    return {
      databaseType: 'mysql',
      databaseName: connectionConfig.database || 'unknown',
      tables: [],
      views: []
    };
  }
}

/**
 * Oracle schema analyzer
 */
class OracleSchemaAnalyzer implements DatabaseSchemaAnalyzer {
  constructor(private llmService: LLMService) {}
  
  async analyze(connectionConfig: DatabaseConnectionConfig): Promise<SchemaAnalysisResult> {
    // Implementation would connect to Oracle using oracledb
    // and extract schema information
    
    // This is a placeholder
    return {
      databaseType: 'oracle',
      databaseName: connectionConfig.database || 'unknown',
      tables: [],
      views: []
    };
  }
}

/**
 * MongoDB schema analyzer
 */
class MongoDbSchemaAnalyzer implements DatabaseSchemaAnalyzer {
  constructor(private llmService: LLMService) {}
  
  async analyze(connectionConfig: DatabaseConnectionConfig): Promise<SchemaAnalysisResult> {
    // Implementation would connect to MongoDB using mongodb
    // and infer schema from document collections
    
    // This is a placeholder
    return {
      databaseType: 'mongodb',
      databaseName: connectionConfig.database || 'unknown',
      tables: [],
      views: []
    };
  }
}

/**
 * SQLite schema analyzer
 */
class SqliteSchemaAnalyzer implements DatabaseSchemaAnalyzer {
  constructor(private llmService: LLMService) {}
  
  async analyze(connectionConfig: DatabaseConnectionConfig): Promise<SchemaAnalysisResult> {
    // Implementation would connect to SQLite using sqlite3
    // and extract schema information
    
    // This is a placeholder
    return {
      databaseType: 'sqlite',
      databaseName: connectionConfig.database || 'unknown',
      tables: [],
      views: []
    };
  }
}

/**
 * Generic schema analyzer
 */
class GenericSchemaAnalyzer implements DatabaseSchemaAnalyzer {
  constructor(private llmService: LLMService) {}
  
  async analyze(connectionConfig: DatabaseConnectionConfig): Promise<SchemaAnalysisResult> {
    // Use AI to generate a general approach when a specific analyzer isn't available
    // This would be a fallback that prompts the user for more information
    
    // This is a placeholder
    return {
      databaseType: 'unknown',
      databaseName: connectionConfig.database || 'unknown',
      tables: [],
      views: [],
      issues: [
        {
          severity: 'WARNING',
          message: 'No specific analyzer available for this database type. Schema information is limited.'
        }
      ]
    };
  }
}