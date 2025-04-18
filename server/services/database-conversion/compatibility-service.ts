/**
 * Compatibility Layer Service
 * 
 * This service is responsible for creating compatibility layers to ensure
 * migrated databases work with existing applications.
 */

import { IStorage } from '../../storage';
import { MCPService } from '../mcp';
import {
  DatabaseType,
  CompatibilityLayerOptions,
  TableSchema,
  FieldSchema,
  FieldType,
  Relationship
} from './types';

export class CompatibilityLayerService {
  private storage: IStorage;
  private mcpService: MCPService;

  constructor(storage: IStorage, mcpService: MCPService) {
    this.storage = storage;
    this.mcpService = mcpService;
  }

  /**
   * Generate a compatibility layer for a conversion project
   * @param projectId Conversion project ID
   * @param options Options for the compatibility layer
   * @returns ID of the created compatibility layer
   */
  public async generateCompatibilityLayer(
    projectId: string,
    options?: CompatibilityLayerOptions
  ): Promise<any> {
    try {
      console.log(`Generating compatibility layer for project ${projectId}...`);

      // Get the project
      const project = await this.storage.getConversionProject(projectId);
      if (!project) {
        throw new Error(`Project not found: ${projectId}`);
      }

      // Log the start of compatibility layer generation
      await this.storage.createConversionLog({
        projectId,
        timestamp: new Date(),
        level: 'info',
        message: 'Starting compatibility layer generation',
        details: {
          sourceType: project.sourceType,
          targetType: project.targetType,
          options
        }
      });

      // Get schema mappings for the project
      const mappings = await this.storage.getProjectSchemaMappings(projectId);
      
      // Create code snippets based on the options
      const codeSnippets: Record<string, string> = {};
      const adaptorCode: string[] = [];
      
      // Determine ORM type to use
      const ormType = options?.ormType || 'sequelize';
      
      // Fill in code snippets
      if (options?.generateORMModels) {
        codeSnippets['orm-models'] = await this.generateORMModels(
          project.sourceType,
          project.targetType,
          mappings,
          ormType
        );
      }
      
      if (options?.generateMigrationScripts) {
        codeSnippets['migration-scripts'] = await this.generateMigrationScripts(
          project.sourceType,
          project.targetType,
          mappings
        );
      }
      
      // Generate query helpers
      if (options?.includeQueryHelpers) {
        codeSnippets['query-helpers'] = await this.generateQueryHelpers(
          project.sourceType,
          project.targetType,
          mappings,
          ormType
        );
      }
      
      // Generate CRUD operations
      if (options?.includeCRUDOperations) {
        codeSnippets['crud-operations'] = await this.generateCRUDOperations(
          project.sourceType,
          project.targetType,
          mappings,
          ormType
        );
      }

      // Generate validation code
      if (options?.includeDataValidation) {
        codeSnippets['data-validation'] = await this.generateDataValidation(
          project.sourceType,
          project.targetType,
          mappings
        );
      }
      
      // Generate adaptor layer
      adaptorCode.push(this.generateAdaptorLayerHeader(project.sourceType, project.targetType));
      
      // Add connection handling
      adaptorCode.push(this.generateConnectionHandling(project.sourceType, project.targetType));
      
      // Add general utility functions
      adaptorCode.push(this.generateUtilityFunctions());
      
      // Add the main adaptor class
      adaptorCode.push(this.generateAdaptorClass(
        project.sourceType, 
        project.targetType, 
        mappings,
        options
      ));
      
      codeSnippets['adaptor-layer'] = adaptorCode.join('\n\n');
      
      // Generate README with usage instructions
      codeSnippets['readme'] = this.generateReadme(
        project.sourceType,
        project.targetType,
        options
      );
      
      // Create compatibility layer record
      const compatibilityLayer = await this.storage.createCompatibilityLayer({
        projectId,
        name: `Compatibility Layer - ${new Date().toLocaleDateString()}`,
        description: `Compatibility layer for ${project.sourceType} to ${project.targetType} conversion.`,
        codeSnippets: codeSnippets,
        targetDatabase: project.targetType,
        createdAt: new Date(),
        options: options
      });

      // Log the completion of compatibility layer generation
      await this.storage.createConversionLog({
        projectId,
        timestamp: new Date(),
        level: 'info',
        message: 'Compatibility layer generation completed',
        details: {
          compatibilityLayerId: compatibilityLayer.id,
          snippetsGenerated: Object.keys(codeSnippets)
        }
      });

      return compatibilityLayer;
    } catch (error) {
      console.error(`Error generating compatibility layer for project ${projectId}:`, error);
      
      // Log the error
      await this.storage.createConversionLog({
        projectId,
        timestamp: new Date(),
        level: 'error',
        message: 'Failed to generate compatibility layer',
        details: {
          error: error instanceof Error ? error.message : String(error)
        }
      });

      throw error;
    }
  }

  /* Private code generation methods */

  private async generateORMModels(
    sourceType: string,
    targetType: string,
    mappings: any[],
    ormType: string
  ): Promise<string> {
    // Group mappings by table to recreate the table structure
    const tableMap = new Map<string, any[]>();
    
    for (const mapping of mappings) {
      const targetTable = mapping.targetTable;
      
      if (!tableMap.has(targetTable)) {
        tableMap.set(targetTable, []);
      }
      
      tableMap.get(targetTable)?.push(mapping);
    }
    
    // Generate models based on ORM type
    let modelCode = '';
    
    switch (ormType.toLowerCase()) {
      case 'sequelize':
        modelCode = this.generateSequelizeModels(tableMap);
        break;
      case 'typeorm':
        modelCode = this.generateTypeORMModels(tableMap);
        break;
      case 'prisma':
        modelCode = this.generatePrismaSchema(tableMap);
        break;
      case 'drizzle':
        modelCode = this.generateDrizzleSchema(tableMap);
        break;
      case 'mongoose':
        modelCode = this.generateMongooseModels(tableMap);
        break;
      default:
        modelCode = this.generateGenericModels(tableMap);
    }
    
    return modelCode;
  }

  private async generateMigrationScripts(
    sourceType: string,
    targetType: string,
    mappings: any[]
  ): Promise<string> {
    // Group mappings by table to recreate the table structure
    const tableMap = new Map<string, any[]>();
    
    for (const mapping of mappings) {
      const targetTable = mapping.targetTable;
      
      if (!tableMap.has(targetTable)) {
        tableMap.set(targetTable, []);
      }
      
      tableMap.get(targetTable)?.push(mapping);
    }
    
    // Generate migration SQL or script based on the target database type
    let migrationCode = '';
    
    // Add migration header
    migrationCode += `-- Migration script for ${sourceType} to ${targetType}\n`;
    migrationCode += `-- Generated on ${new Date().toISOString()}\n\n`;
    
    if (targetType === DatabaseType.PostgreSQL) {
      migrationCode += this.generatePostgreSQLMigration(tableMap);
    } else if (targetType === DatabaseType.MySQL) {
      migrationCode += this.generateMySQLMigration(tableMap);
    } else if (targetType === DatabaseType.SQLite) {
      migrationCode += this.generateSQLiteMigration(tableMap);
    } else if (targetType === DatabaseType.SQLServer) {
      migrationCode += this.generateSQLServerMigration(tableMap);
    } else {
      migrationCode += this.generateGenericSQLMigration(tableMap);
    }
    
    return migrationCode;
  }

  private async generateQueryHelpers(
    sourceType: string,
    targetType: string,
    mappings: any[],
    ormType: string
  ): Promise<string> {
    // Group mappings by table
    const tableMap = new Map<string, any[]>();
    
    for (const mapping of mappings) {
      const sourceTable = mapping.sourceTable;
      
      if (!tableMap.has(sourceTable)) {
        tableMap.set(sourceTable, []);
      }
      
      tableMap.get(sourceTable)?.push(mapping);
    }
    
    let helperCode = '';
    
    // Add query helper header
    helperCode += `/**\n`;
    helperCode += ` * Query Helper Functions\n`;
    helperCode += ` * For ${sourceType} to ${targetType} compatibility\n`;
    helperCode += ` * Generated for ${ormType}\n`;
    helperCode += ` */\n\n`;
    
    // Generate query helper functions based on ORM
    switch (ormType.toLowerCase()) {
      case 'sequelize':
        helperCode += this.generateSequelizeQueryHelpers(tableMap);
        break;
      case 'typeorm':
        helperCode += this.generateTypeORMQueryHelpers(tableMap);
        break;
      case 'prisma':
        helperCode += this.generatePrismaQueryHelpers(tableMap);
        break;
      case 'drizzle':
        helperCode += this.generateDrizzleQueryHelpers(tableMap);
        break;
      default:
        helperCode += this.generateGenericQueryHelpers(tableMap);
    }
    
    return helperCode;
  }

  private async generateCRUDOperations(
    sourceType: string,
    targetType: string,
    mappings: any[],
    ormType: string
  ): Promise<string> {
    // Group mappings by table
    const tableMap = new Map<string, any[]>();
    
    for (const mapping of mappings) {
      const targetTable = mapping.targetTable;
      
      if (!tableMap.has(targetTable)) {
        tableMap.set(targetTable, []);
      }
      
      tableMap.get(targetTable)?.push(mapping);
    }
    
    let crudCode = '';
    
    // Add CRUD operations header
    crudCode += `/**\n`;
    crudCode += ` * CRUD Operations\n`;
    crudCode += ` * For ${sourceType} to ${targetType} compatibility\n`;
    crudCode += ` * Generated for ${ormType}\n`;
    crudCode += ` */\n\n`;
    
    // Generate CRUD operations based on ORM
    switch (ormType.toLowerCase()) {
      case 'sequelize':
        crudCode += this.generateSequelizeCRUD(tableMap);
        break;
      case 'typeorm':
        crudCode += this.generateTypeORMCRUD(tableMap);
        break;
      case 'prisma':
        crudCode += this.generatePrismaCRUD(tableMap);
        break;
      case 'drizzle':
        crudCode += this.generateDrizzleCRUD(tableMap);
        break;
      default:
        crudCode += this.generateGenericCRUD(tableMap);
    }
    
    return crudCode;
  }

  private async generateDataValidation(
    sourceType: string,
    targetType: string,
    mappings: any[]
  ): Promise<string> {
    // Group mappings by table
    const tableMap = new Map<string, any[]>();
    
    for (const mapping of mappings) {
      const targetTable = mapping.targetTable;
      
      if (!tableMap.has(targetTable)) {
        tableMap.set(targetTable, []);
      }
      
      tableMap.get(targetTable)?.push(mapping);
    }
    
    let validationCode = '';
    
    // Add validation header
    validationCode += `/**\n`;
    validationCode += ` * Data Validation Functions\n`;
    validationCode += ` * For ${sourceType} to ${targetType} compatibility\n`;
    validationCode += ` */\n\n`;
    
    // Use Zod for validation (popular TypeScript validation library)
    validationCode += `import { z } from 'zod';\n\n`;
    
    // Generate validation schemas for each table
    for (const [tableName, tableMappings] of tableMap.entries()) {
      validationCode += `/**\n`;
      validationCode += ` * Validation schema for the ${tableName} table\n`;
      validationCode += ` */\n`;
      validationCode += `export const ${this.toCamelCase(tableName)}Schema = z.object({\n`;
      
      // Add validation for each field
      for (const mapping of tableMappings) {
        const fieldName = mapping.targetField;
        const fieldType = mapping.targetType || 'string'; // Default to string
        
        validationCode += `  ${fieldName}: `;
        
        // Generate appropriate Zod validator based on field type
        switch (fieldType.toLowerCase()) {
          case 'string':
          case 'text':
          case 'char':
          case 'varchar':
            validationCode += `z.string()`;
            if (mapping.maxLength) {
              validationCode += `.max(${mapping.maxLength})`;
            }
            break;
          case 'number':
          case 'integer':
          case 'int':
            validationCode += `z.number().int()`;
            break;
          case 'float':
          case 'double':
          case 'decimal':
            validationCode += `z.number()`;
            break;
          case 'boolean':
            validationCode += `z.boolean()`;
            break;
          case 'date':
          case 'datetime':
          case 'timestamp':
            validationCode += `z.date()`;
            break;
          case 'array':
            validationCode += `z.array(z.any())`;
            break;
          case 'json':
          case 'jsonb':
            validationCode += `z.object({}).passthrough()`;
            break;
          case 'uuid':
            validationCode += `z.string().uuid()`;
            break;
          case 'email':
            validationCode += `z.string().email()`;
            break;
          default:
            validationCode += `z.any()`;
        }
        
        // Handle nullable fields
        if (mapping.nullable) {
          validationCode += `.nullable()`;
        }
        
        validationCode += `,\n`;
      }
      
      validationCode += `});\n\n`;
      
      // Add validation function
      validationCode += `/**\n`;
      validationCode += ` * Validate ${tableName} data\n`;
      validationCode += ` * @param data Data to validate\n`;
      validationCode += ` * @returns Validation result\n`;
      validationCode += ` */\n`;
      validationCode += `export function validate${this.toPascalCase(tableName)}(data: any) {\n`;
      validationCode += `  try {\n`;
      validationCode += `    return { success: true, data: ${this.toCamelCase(tableName)}Schema.parse(data) };\n`;
      validationCode += `  } catch (error) {\n`;
      validationCode += `    return { success: false, error };\n`;
      validationCode += `  }\n`;
      validationCode += `}\n\n`;
    }
    
    return validationCode;
  }

  /* Code generation helper methods */

  private generateAdaptorLayerHeader(sourceType: string, targetType: string): string {
    return `/**
 * Database Compatibility Layer
 * 
 * This module provides compatibility between ${sourceType} and ${targetType}
 * database systems. It abstracts away the differences in query syntax,
 * data types, and connection handling.
 * 
 * Generated by TaxI_AI Database Conversion System
 */

/**
 * Import necessary dependencies based on source and target databases
 */`;
  }

  private generateConnectionHandling(sourceType: string, targetType: string): string {
    let code = `/**
 * Connection handling functions
 */

// Target database connection
let targetConnection = null;

/**
 * Initialize the database connection
 * @param {string} connectionString - Target database connection string
 * @returns {Promise<any>} - Connection object
 */
export async function initializeConnection(connectionString) {
  try {
    console.log('Initializing database connection...');`;
    
    // Add database-specific connection code
    switch (targetType) {
      case DatabaseType.PostgreSQL:
        code += `
    
    // PostgreSQL connection
    const { Pool } = require('pg');
    targetConnection = new Pool({
      connectionString,
    });
    
    // Test the connection
    const client = await targetConnection.connect();
    client.release();`;
        break;
      
      case DatabaseType.MySQL:
        code += `
    
    // MySQL connection
    const mysql = require('mysql2/promise');
    targetConnection = await mysql.createConnection(connectionString);`;
        break;
      
      case DatabaseType.SQLite:
        code += `
    
    // SQLite connection
    const sqlite3 = require('sqlite3');
    const { open } = require('sqlite');
    targetConnection = await open({
      filename: connectionString.replace('sqlite://', ''),
      driver: sqlite3.Database
    });`;
        break;
      
      case DatabaseType.MongoDB:
        code += `
    
    // MongoDB connection
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(connectionString);
    await client.connect();
    targetConnection = client.db();`;
        break;
      
      default:
        code += `
    
    // Generic connection - modify as needed
    targetConnection = await connectToDatabase(connectionString);`;
    }
    
    code += `
    
    console.log('Database connection established successfully');
    return targetConnection;
  } catch (error) {
    console.error('Failed to initialize database connection:', error);
    throw error;
  }
}

/**
 * Close the database connection
 * @returns {Promise<void>}
 */
export async function closeConnection() {
  try {
    if (targetConnection) {`;
    
    // Add database-specific disconnection code
    switch (targetType) {
      case DatabaseType.PostgreSQL:
        code += `
      await targetConnection.end();`;
        break;
      
      case DatabaseType.MySQL:
        code += `
      await targetConnection.end();`;
        break;
      
      case DatabaseType.MongoDB:
        code += `
      await targetConnection.client.close();`;
        break;
      
      default:
        code += `
      await targetConnection.close();`;
    }
    
    code += `
      
      targetConnection = null;
      console.log('Database connection closed');
    }
  } catch (error) {
    console.error('Error closing database connection:', error);
    throw error;
  }
}

/**
 * Get the current database connection
 * @returns {any} - Database connection
 */
export function getConnection() {
  if (!targetConnection) {
    throw new Error('Database connection not initialized. Call initializeConnection() first.');
  }
  return targetConnection;
}`;
    
    return code;
  }

  private generateUtilityFunctions(): string {
    return `/**
 * Utility functions
 */

/**
 * Convert a snake_case string to camelCase
 * @param {string} str - String to convert
 * @returns {string} - Converted string
 */
function snakeToCamel(str) {
  return str.replace(/([-_][a-z])/g, group => 
    group.toUpperCase()
      .replace('-', '')
      .replace('_', '')
  );
}

/**
 * Convert a camelCase string to snake_case
 * @param {string} str - String to convert
 * @returns {string} - Converted string
 */
function camelToSnake(str) {
  return str.replace(/[A-Z]/g, letter => \`_\${letter.toLowerCase()}\`);
}

/**
 * Transform object keys from one case to another
 * @param {object} obj - Object to transform
 * @param {Function} transformer - Case transformation function
 * @returns {object} - Transformed object
 */
function transformObjectKeys(obj, transformer) {
  if (Array.isArray(obj)) {
    return obj.map(item => transformObjectKeys(item, transformer));
  }
  
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((result, key) => {
      result[transformer(key)] = transformObjectKeys(obj[key], transformer);
      return result;
    }, {});
  }
  
  return obj;
}

/**
 * Format a query parameter for the target database
 * @param {any} value - Value to format
 * @returns {string} - Formatted value
 */
function formatQueryParam(value) {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  
  if (typeof value === 'string') {
    // Escape single quotes for SQL
    return \`'\${value.replace(/'/g, "''")}']\`;
  }
  
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }
  
  if (value instanceof Date) {
    return \`'\${value.toISOString()}']\`;
  }
  
  if (Array.isArray(value) || typeof value === 'object') {
    return \`'\${JSON.stringify(value)}']\`;
  }
  
  return String(value);
}`;
  }

  private generateAdaptorClass(
    sourceType: string, 
    targetType: string, 
    mappings: any[],
    options?: CompatibilityLayerOptions
  ): string {
    // Group mappings by source table
    const tableMap = new Map<string, any[]>();
    
    for (const mapping of mappings) {
      const sourceTable = mapping.sourceTable;
      
      if (!tableMap.has(sourceTable)) {
        tableMap.set(sourceTable, []);
      }
      
      tableMap.get(sourceTable)?.push(mapping);
    }
    
    let code = `/**
 * Database Adaptor Class
 * 
 * Provides compatibility between ${sourceType} and ${targetType}
 */
export class DatabaseAdaptor {
  constructor() {
    this.connection = getConnection();
  }
  
  /**
   * Execute a query on the target database
   * @param {string} query - SQL query to execute
   * @param {Array} params - Query parameters
   * @returns {Promise<any>} - Query results
   */
  async executeQuery(query, params = []) {`;
    
    // Add database-specific query execution
    switch (targetType) {
      case DatabaseType.PostgreSQL:
        code += `
    try {
      const result = await this.connection.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }`;
        break;
      
      case DatabaseType.MySQL:
        code += `
    try {
      const [rows] = await this.connection.execute(query, params);
      return rows;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }`;
        break;
      
      case DatabaseType.SQLite:
        code += `
    try {
      const result = await this.connection.all(query, params);
      return result;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }`;
        break;
      
      case DatabaseType.MongoDB:
        code += `
    try {
      // Note: MongoDB doesn't use SQL, this is just a placeholder
      // In a real implementation, this would be replaced with MongoDB query operations
      throw new Error('executeQuery is not applicable for MongoDB. Use collection methods instead.');
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }`;
        break;
      
      default:
        code += `
    try {
      const result = await this.connection.query(query, params);
      return result;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }`;
    }
    
    code += `
  }`;
    
    // Add adaptor methods for each source table
    for (const [tableName, tableMappings] of tableMap.entries()) {
      const camelCaseTableName = this.toCamelCase(tableName);
      
      // GET ALL method
      code += `
  
  /**
   * Get all records from ${tableName}
   * @param {object} options - Query options
   * @returns {Promise<Array>} - Array of records
   */
  async getAll${this.toPascalCase(tableName)}(options = {}) {`;
      
      if (targetType === DatabaseType.MongoDB) {
        code += `
    try {
      const collection = this.connection.collection('${tableName}');
      const limit = options.limit || 0;
      const skip = options.offset || 0;
      const sort = options.orderBy ? { [options.orderBy]: options.direction === 'desc' ? -1 : 1 } : {};
      
      const query = options.filter || {};
      const result = await collection.find(query).limit(limit).skip(skip).sort(sort).toArray();
      
      return result.map(item => transformObjectKeys(item, snakeToCamel));
    } catch (error) {
      console.error('Error getting ${tableName}:', error);
      throw error;
    }`;
      } else {
        code += `
    try {
      let query = \`SELECT * FROM ${tableName}\`;
      const params = [];
      
      if (options.filter) {
        const conditions = [];
        Object.entries(options.filter).forEach(([key, value], index) => {
          conditions.push(\`\${camelToSnake(key)} = $\${index + 1}\`);
          params.push(value);
        });
        
        if (conditions.length > 0) {
          query += \` WHERE \${conditions.join(' AND ')}\`;
        }
      }
      
      if (options.orderBy) {
        const direction = options.direction === 'desc' ? 'DESC' : 'ASC';
        query += \` ORDER BY \${camelToSnake(options.orderBy)} \${direction}\`;
      }
      
      if (options.limit) {
        query += \` LIMIT \${options.limit}\`;
      }
      
      if (options.offset) {
        query += \` OFFSET \${options.offset}\`;
      }
      
      const result = await this.executeQuery(query, params);
      return result.map(item => transformObjectKeys(item, snakeToCamel));
    } catch (error) {
      console.error('Error getting ${tableName}:', error);
      throw error;
    }`;
      }
      
      code += `
  }`;
      
      // GET BY ID method
      const primaryKeyMapping = tableMappings.find(m => m.isPrimaryKey);
      const idField = primaryKeyMapping ? primaryKeyMapping.targetField : 'id';
      
      code += `
  
  /**
   * Get a record from ${tableName} by ID
   * @param {string|number} id - Record ID
   * @returns {Promise<object>} - Record
   */
  async get${this.toPascalCase(tableName)}ById(id) {`;
      
      if (targetType === DatabaseType.MongoDB) {
        code += `
    try {
      const collection = this.connection.collection('${tableName}');
      const result = await collection.findOne({ ${idField}: id });
      
      if (!result) {
        return null;
      }
      
      return transformObjectKeys(result, snakeToCamel);
    } catch (error) {
      console.error('Error getting ${tableName} by ID:', error);
      throw error;
    }`;
      } else {
        code += `
    try {
      const query = \`SELECT * FROM ${tableName} WHERE ${idField} = $1\`;
      const result = await this.executeQuery(query, [id]);
      
      if (result.length === 0) {
        return null;
      }
      
      return transformObjectKeys(result[0], snakeToCamel);
    } catch (error) {
      console.error('Error getting ${tableName} by ID:', error);
      throw error;
    }`;
      }
      
      code += `
  }`;
      
      // CREATE method
      code += `
  
  /**
   * Create a new record in ${tableName}
   * @param {object} data - Record data
   * @returns {Promise<object>} - Created record
   */
  async create${this.toPascalCase(tableName)}(data) {`;
      
      if (targetType === DatabaseType.MongoDB) {
        code += `
    try {
      const collection = this.connection.collection('${tableName}');
      const transformedData = transformObjectKeys(data, camelToSnake);
      
      const result = await collection.insertOne(transformedData);
      
      return this.get${this.toPascalCase(tableName)}ById(result.insertedId);
    } catch (error) {
      console.error('Error creating ${tableName}:', error);
      throw error;
    }`;
      } else {
        code += `
    try {
      const transformedData = transformObjectKeys(data, camelToSnake);
      const fields = Object.keys(transformedData).map(key => key);
      const values = Object.values(transformedData);
      
      const placeholders = values.map((_, i) => \`$\${i + 1}\`).join(', ');
      
      const query = \`
        INSERT INTO ${tableName} (\${fields.join(', ')})
        VALUES (\${placeholders})
        RETURNING *
      \`;
      
      const result = await this.executeQuery(query, values);
      
      return transformObjectKeys(result[0], snakeToCamel);
    } catch (error) {
      console.error('Error creating ${tableName}:', error);
      throw error;
    }`;
      }
      
      code += `
  }`;
      
      // UPDATE method
      code += `
  
  /**
   * Update a record in ${tableName}
   * @param {string|number} id - Record ID
   * @param {object} data - Record data
   * @returns {Promise<object>} - Updated record
   */
  async update${this.toPascalCase(tableName)}(id, data) {`;
      
      if (targetType === DatabaseType.MongoDB) {
        code += `
    try {
      const collection = this.connection.collection('${tableName}');
      const transformedData = transformObjectKeys(data, camelToSnake);
      
      await collection.updateOne({ ${idField}: id }, { $set: transformedData });
      
      return this.get${this.toPascalCase(tableName)}ById(id);
    } catch (error) {
      console.error('Error updating ${tableName}:', error);
      throw error;
    }`;
      } else {
        code += `
    try {
      const transformedData = transformObjectKeys(data, camelToSnake);
      const updates = Object.entries(transformedData)
        .map(([key, _], i) => \`\${key} = $\${i + 1}\`)
        .join(', ');
      
      const values = Object.values(transformedData);
      
      const query = \`
        UPDATE ${tableName}
        SET \${updates}
        WHERE ${idField} = $\${values.length + 1}
        RETURNING *
      \`;
      
      const result = await this.executeQuery(query, [...values, id]);
      
      if (result.length === 0) {
        return null;
      }
      
      return transformObjectKeys(result[0], snakeToCamel);
    } catch (error) {
      console.error('Error updating ${tableName}:', error);
      throw error;
    }`;
      }
      
      code += `
  }`;
      
      // DELETE method
      code += `
  
  /**
   * Delete a record from ${tableName}
   * @param {string|number} id - Record ID
   * @returns {Promise<boolean>} - Success indicator
   */
  async delete${this.toPascalCase(tableName)}(id) {`;
      
      if (targetType === DatabaseType.MongoDB) {
        code += `
    try {
      const collection = this.connection.collection('${tableName}');
      const result = await collection.deleteOne({ ${idField}: id });
      
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting ${tableName}:', error);
      throw error;
    }`;
      } else {
        code += `
    try {
      const query = \`DELETE FROM ${tableName} WHERE ${idField} = $1\`;
      const result = await this.executeQuery(query, [id]);
      
      return true;
    } catch (error) {
      console.error('Error deleting ${tableName}:', error);
      throw error;
    }`;
      }
      
      code += `
  }`;
    }
    
    code += `
}

// Export an instance of the adaptor
export const dbAdaptor = new DatabaseAdaptor();`;
    
    return code;
  }

  private generateReadme(sourceType: string, targetType: string, options?: CompatibilityLayerOptions): string {
    return `# Database Compatibility Layer

## Overview

This compatibility layer provides seamless integration between ${sourceType} and ${targetType} database systems. It abstracts away the differences in query syntax, data types, and connection handling to make your migration smoother.

## Generated Components

${options?.generateORMModels ? '✅ ORM Models - Database models for ' + (options.ormType || 'Sequelize') : '❌ ORM Models - Not generated'}
${options?.generateMigrationScripts ? '✅ Migration Scripts - SQL scripts for database migration' : '❌ Migration Scripts - Not generated'}
${options?.includeQueryHelpers ? '✅ Query Helpers - Utility functions for common database queries' : '❌ Query Helpers - Not generated'}
${options?.includeCRUDOperations ? '✅ CRUD Operations - Create, Read, Update, Delete operations' : '❌ CRUD Operations - Not generated'}
${options?.includeDataValidation ? '✅ Data Validation - Input validation for database operations' : '❌ Data Validation - Not generated'}
✅ Adaptor Layer - Core compatibility layer between database systems

## Installation

1. Copy the generated files to your project
2. Install the required dependencies:

\`\`\`bash
npm install pg # For PostgreSQL
npm install mysql2 # For MySQL
npm install sqlite3 # For SQLite
npm install mongodb # For MongoDB
\`\`\`

## Usage

### Initialize the Connection

\`\`\`javascript
const { initializeConnection, dbAdaptor } = require('./db-adaptor');

// Initialize the database connection
async function init() {
  await initializeConnection('your-connection-string');
  
  // Now you can use the adaptor
  const users = await dbAdaptor.getAllUsers();
  console.log(users);
}

init().catch(console.error);
\`\`\`

### Example CRUD Operations

\`\`\`javascript
// Get all records
const users = await dbAdaptor.getAllUsers({ 
  limit: 10, 
  offset: 0,
  orderBy: 'createdAt',
  direction: 'desc'
});

// Get record by ID
const user = await dbAdaptor.getUserById(123);

// Create a record
const newUser = await dbAdaptor.createUser({
  username: 'johndoe',
  email: 'john@example.com',
  createdAt: new Date()
});

// Update a record
const updatedUser = await dbAdaptor.updateUser(123, {
  username: 'janedoe'
});

// Delete a record
const success = await dbAdaptor.deleteUser(123);
\`\`\`

## Database Type Mappings

This compatibility layer handles the following type mappings between ${sourceType} and ${targetType}:

- String types (varchar, text, etc.)
- Numeric types (integer, float, etc.)
- Boolean types
- Date and timestamp types
- JSON types
- Array types
- UUID types

## Support

For issues or questions, please contact your database administrator.
`;
  }

  /* Specific ORM code generation methods */

  private generateSequelizeModels(tableMap: Map<string, any[]>): string {
    let code = `/**
 * Sequelize ORM Models
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  // Define models
`;
    
    for (const [tableName, mappings] of tableMap.entries()) {
      const modelName = this.toPascalCase(tableName);
      
      code += `  const ${modelName} = sequelize.define('${tableName}', {\n`;
      
      // Add field definitions
      for (const mapping of mappings) {
        const fieldName = mapping.targetField;
        const fieldType = mapping.targetType || 'STRING';
        
        code += `    ${fieldName}: {\n`;
        
        // Determine Sequelize type
        switch (fieldType.toLowerCase()) {
          case 'string':
          case 'text':
          case 'varchar':
          case 'char':
            code += `      type: DataTypes.STRING`;
            if (mapping.maxLength) {
              code += `(${mapping.maxLength})`;
            }
            break;
          case 'text':
            code += `      type: DataTypes.TEXT`;
            break;
          case 'integer':
          case 'int':
            code += `      type: DataTypes.INTEGER`;
            break;
          case 'bigint':
            code += `      type: DataTypes.BIGINT`;
            break;
          case 'float':
            code += `      type: DataTypes.FLOAT`;
            break;
          case 'double':
            code += `      type: DataTypes.DOUBLE`;
            break;
          case 'decimal':
            code += `      type: DataTypes.DECIMAL`;
            if (mapping.precision && mapping.scale) {
              code += `(${mapping.precision}, ${mapping.scale})`;
            }
            break;
          case 'boolean':
            code += `      type: DataTypes.BOOLEAN`;
            break;
          case 'date':
            code += `      type: DataTypes.DATEONLY`;
            break;
          case 'datetime':
          case 'timestamp':
            code += `      type: DataTypes.DATE`;
            break;
          case 'json':
          case 'jsonb':
            code += `      type: DataTypes.JSON`;
            break;
          case 'uuid':
            code += `      type: DataTypes.UUID`;
            break;
          default:
            code += `      type: DataTypes.STRING`;
        }
        
        code += `,\n`;
        
        // Add additional field attributes
        if (mapping.primaryKey) {
          code += `      primaryKey: true,\n`;
        }
        
        if (mapping.autoIncrement) {
          code += `      autoIncrement: true,\n`;
        }
        
        if (mapping.unique) {
          code += `      unique: true,\n`;
        }
        
        if (mapping.nullable === false) {
          code += `      allowNull: false,\n`;
        }
        
        if (mapping.defaultValue !== undefined) {
          if (typeof mapping.defaultValue === 'string') {
            code += `      defaultValue: '${mapping.defaultValue}',\n`;
          } else {
            code += `      defaultValue: ${mapping.defaultValue},\n`;
          }
        }
        
        code += `    },\n`;
      }
      
      code += `  }, {
    tableName: '${tableName}',
    timestamps: true,
    underscored: true,
  });\n\n`;
    }
    
    // Add associations
    code += `  // Define associations
  return {`;
    
    for (const [tableName, _] of tableMap.entries()) {
      const modelName = this.toPascalCase(tableName);
      code += `    ${modelName},\n`;
    }
    
    code += `  };
};`;
    
    return code;
  }

  private generateTypeORMModels(tableMap: Map<string, any[]>): string {
    let code = `/**
 * TypeORM Models
 */

import { Entity, Column, PrimaryGeneratedColumn, PrimaryColumn, OneToMany, ManyToOne, JoinColumn } from "typeorm";

`;
    
    for (const [tableName, mappings] of tableMap.entries()) {
      const modelName = this.toPascalCase(tableName);
      
      code += `@Entity("${tableName}")
export class ${modelName} {
`;
      
      // Add field definitions
      for (const mapping of mappings) {
        const fieldName = mapping.targetField;
        const fieldType = mapping.targetType || 'string';
        
        // Add decorators
        if (mapping.primaryKey) {
          if (mapping.autoIncrement) {
            code += `  @PrimaryGeneratedColumn()
`;
          } else {
            code += `  @PrimaryColumn()
`;
          }
        } else {
          code += `  @Column(`;
          
          const options = [];
          
          if (mapping.nullable !== undefined) {
            options.push(`nullable: ${mapping.nullable}`);
          }
          
          if (mapping.unique) {
            options.push(`unique: true`);
          }
          
          if (mapping.defaultValue !== undefined) {
            if (typeof mapping.defaultValue === 'string') {
              options.push(`default: '${mapping.defaultValue}'`);
            } else {
              options.push(`default: ${mapping.defaultValue}`);
            }
          }
          
          // Type-specific options
          switch (fieldType.toLowerCase()) {
            case 'string':
            case 'varchar':
            case 'char':
              if (mapping.maxLength) {
                options.push(`length: ${mapping.maxLength}`);
              }
              break;
            case 'decimal':
              if (mapping.precision && mapping.scale) {
                options.push(`precision: ${mapping.precision}, scale: ${mapping.scale}`);
              }
              break;
          }
          
          if (options.length > 0) {
            code += `{ ${options.join(', ')} }`;
          }
          
          code += `)
`;
        }
        
        // Add field
        let typescriptType = 'string';
        
        // Map to TypeScript type
        switch (fieldType.toLowerCase()) {
          case 'integer':
          case 'int':
          case 'bigint':
          case 'float':
          case 'double':
          case 'decimal':
          case 'number':
            typescriptType = 'number';
            break;
          case 'boolean':
            typescriptType = 'boolean';
            break;
          case 'date':
          case 'datetime':
          case 'timestamp':
            typescriptType = 'Date';
            break;
          case 'json':
          case 'jsonb':
            typescriptType = 'any';
            break;
        }
        
        if (mapping.nullable) {
          typescriptType += ' | null';
        }
        
        code += `  ${fieldName}: ${typescriptType};
        
`;
      }
      
      code += `}

`;
    }
    
    return code;
  }

  private generatePrismaSchema(tableMap: Map<string, any[]>): string {
    let code = `// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql" // Change this based on your target database
  url      = env("DATABASE_URL")
}

`;
    
    for (const [tableName, mappings] of tableMap.entries()) {
      const modelName = this.toPascalCase(tableName);
      
      code += `model ${modelName} {
`;
      
      // Add field definitions
      for (const mapping of mappings) {
        const fieldName = mapping.targetField;
        let fieldType = mapping.targetType || 'String';
        
        // Map to Prisma type
        switch (fieldType.toLowerCase()) {
          case 'string':
          case 'varchar':
          case 'char':
          case 'text':
            fieldType = 'String';
            break;
          case 'integer':
          case 'int':
            fieldType = 'Int';
            break;
          case 'bigint':
            fieldType = 'BigInt';
            break;
          case 'float':
          case 'double':
          case 'decimal':
          case 'number':
            fieldType = 'Float';
            break;
          case 'boolean':
            fieldType = 'Boolean';
            break;
          case 'date':
            fieldType = 'DateTime';
            break;
          case 'datetime':
          case 'timestamp':
            fieldType = 'DateTime';
            break;
          case 'json':
          case 'jsonb':
            fieldType = 'Json';
            break;
          case 'uuid':
            fieldType = 'String';
            break;
        }
        
        code += `  ${fieldName} ${fieldType}`;
        
        // Add modifiers
        if (mapping.primaryKey) {
          code += ' @id';
          
          if (mapping.autoIncrement) {
            code += ' @default(autoincrement())';
          } else if (fieldType === 'String' && (mapping.targetType || '').toLowerCase() === 'uuid') {
            code += ' @default(uuid())';
          }
        }
        
        if (mapping.unique && !mapping.primaryKey) {
          code += ' @unique';
        }
        
        if (!mapping.nullable && !mapping.primaryKey) {
          code += ' @required';
        }
        
        if (mapping.defaultValue !== undefined && !mapping.primaryKey) {
          if (typeof mapping.defaultValue === 'string') {
            code += ` @default("${mapping.defaultValue}")`;
          } else if (typeof mapping.defaultValue === 'boolean') {
            code += ` @default(${mapping.defaultValue})`;
          } else if (typeof mapping.defaultValue === 'number') {
            code += ` @default(${mapping.defaultValue})`;
          } else if (mapping.defaultValue === null) {
            // Prisma doesn't support explicit null defaults, they're implicit
          } else {
            code += ` @default(${String(mapping.defaultValue)})`;
          }
        }
        
        if (mapping.targetField !== mapping.sourceField) {
          code += ` @map("${mapping.sourceField}")`;
        }
        
        code += `
`;
      }
      
      if (tableName !== modelName.toLowerCase()) {
        code += `
  @@map("${tableName}")`;
      }
      
      code += `
}

`;
    }
    
    return code;
  }

  private generateDrizzleSchema(tableMap: Map<string, any[]>): string {
    let code = `/**
 * Drizzle ORM Schema
 */

import { pgTable, serial, text, integer, boolean, timestamp, uuid, jsonb, unique } from 'drizzle-orm/pg-core';
// Uncomment below imports based on your target database:
// import { mysqlTable, serial, text, int, boolean, timestamp, json, unique } from 'drizzle-orm/mysql-core';
// import { sqliteTable, text, integer, numeric, blob } from 'drizzle-orm/sqlite-core';

export const schema = {
`;
    
    for (const [tableName, mappings] of tableMap.entries()) {
      const modelName = this.toCamelCase(tableName);
      
      code += `  ${modelName}: pgTable('${tableName}', {
`;
      
      // Add field definitions
      for (const mapping of mappings) {
        const fieldName = mapping.targetField;
        const fieldType = mapping.targetType || 'text';
        
        // Start field definition
        code += `    ${fieldName}: `;
        
        // Map to Drizzle type
        switch (fieldType.toLowerCase()) {
          case 'serial':
          case 'autoincrement':
            code += `serial('${fieldName}')`;
            break;
          case 'string':
          case 'varchar':
          case 'char':
          case 'text':
            code += `text('${fieldName}')`;
            break;
          case 'integer':
          case 'int':
            code += `integer('${fieldName}')`;
            break;
          case 'boolean':
            code += `boolean('${fieldName}')`;
            break;
          case 'date':
          case 'datetime':
          case 'timestamp':
            code += `timestamp('${fieldName}')`;
            break;
          case 'json':
          case 'jsonb':
            code += `jsonb('${fieldName}')`;
            break;
          case 'uuid':
            code += `uuid('${fieldName}')`;
            break;
          default:
            code += `text('${fieldName}')`;
        }
        
        // Add modifiers
        let hasModifiers = false;
        
        if (mapping.primaryKey) {
          code += `.primaryKey()`;
          hasModifiers = true;
        }
        
        if (mapping.unique && !mapping.primaryKey) {
          code += `.unique()`;
          hasModifiers = true;
        }
        
        if (mapping.nullable === false && !hasModifiers) {
          code += `.notNull()`;
          hasModifiers = true;
        }
        
        if (mapping.defaultValue !== undefined) {
          if (typeof mapping.defaultValue === 'string') {
            code += `.default('${mapping.defaultValue}')`;
          } else {
            code += `.default(${mapping.defaultValue})`;
          }
        }
        
        code += `,
`;
      }
      
      code += `  }),
      
`;
    }
    
    code += `};

export default schema;
`;
    
    return code;
  }

  private generateMongooseModels(tableMap: Map<string, any[]>): string {
    let code = `/**
 * Mongoose Schema Models
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

`;
    
    for (const [tableName, mappings] of tableMap.entries()) {
      const modelName = this.toPascalCase(tableName);
      
      code += `// ${modelName} Schema
const ${this.toCamelCase(tableName)}Schema = new Schema({
`;
      
      // Add field definitions
      for (const mapping of mappings) {
        const fieldName = mapping.targetField;
        const fieldType = mapping.targetType || 'String';
        
        code += `  ${fieldName}: {
    type: `;
        
        // Map to Mongoose type
        switch (fieldType.toLowerCase()) {
          case 'string':
          case 'varchar':
          case 'char':
          case 'text':
          case 'uuid':
            code += `String`;
            break;
          case 'integer':
          case 'int':
          case 'bigint':
          case 'float':
          case 'double':
          case 'decimal':
          case 'number':
            code += `Number`;
            break;
          case 'boolean':
            code += `Boolean`;
            break;
          case 'date':
          case 'datetime':
          case 'timestamp':
            code += `Date`;
            break;
          case 'json':
          case 'jsonb':
          case 'object':
            code += `Schema.Types.Mixed`;
            break;
          case 'array':
            code += `[Schema.Types.Mixed]`;
            break;
          default:
            code += `String`;
        }
        
        code += `,
`;
        
        // Add modifiers
        if (mapping.nullable === false) {
          code += `    required: true,
`;
        }
        
        if (mapping.unique) {
          code += `    unique: true,
`;
        }
        
        if (mapping.defaultValue !== undefined) {
          if (typeof mapping.defaultValue === 'string') {
            code += `    default: '${mapping.defaultValue}',
`;
          } else {
            code += `    default: ${mapping.defaultValue},
`;
          }
        }
        
        code += `  },
`;
      }
      
      // Add timestamps
      code += `}, {
  timestamps: true,
  collection: '${tableName}'
});

const ${modelName} = mongoose.model('${modelName}', ${this.toCamelCase(tableName)}Schema);

`;
    }
    
    code += `module.exports = {
`;
    
    for (const [tableName, _] of tableMap.entries()) {
      const modelName = this.toPascalCase(tableName);
      code += `  ${modelName},
`;
    }
    
    code += `};
`;
    
    return code;
  }

  private generateGenericModels(tableMap: Map<string, any[]>): string {
    let code = `/**
 * Generic Database Models
 * 
 * This file contains database models that can be adapted to different ORMs.
 */

/**
 * Model Definitions
 */
`;
    
    for (const [tableName, mappings] of tableMap.entries()) {
      const modelName = this.toPascalCase(tableName);
      
      code += `
/**
 * ${modelName} model
 * Table name: ${tableName}
 */
export interface ${modelName} {
`;
      
      // Add field definitions
      for (const mapping of mappings) {
        const fieldName = mapping.targetField;
        const fieldType = mapping.targetType || 'string';
        
        code += `  /**
   * ${mapping.description || fieldName}
   * Source field: ${mapping.sourceField || fieldName}
   * ${mapping.primaryKey ? 'Primary key' : ''}
   */
  ${fieldName}`;
        
        // Add optional indicator
        if (mapping.nullable) {
          code += '?';
        }
        
        code += ': ';
        
        // Map to TypeScript type
        switch (fieldType.toLowerCase()) {
          case 'string':
          case 'varchar':
          case 'char':
          case 'text':
          case 'uuid':
            code += 'string';
            break;
          case 'integer':
          case 'int':
          case 'bigint':
          case 'float':
          case 'double':
          case 'decimal':
          case 'number':
            code += 'number';
            break;
          case 'boolean':
            code += 'boolean';
            break;
          case 'date':
          case 'datetime':
          case 'timestamp':
            code += 'Date';
            break;
          case 'json':
          case 'jsonb':
          case 'object':
            code += 'Record<string, any>';
            break;
          case 'array':
            code += 'any[]';
            break;
          default:
            code += 'any';
        }
        
        code += ';';
      }
      
      code += `}

`;
    }
    
    return code;
  }

  /* Migration script generation methods */

  private generatePostgreSQLMigration(tableMap: Map<string, any[]>): string {
    let code = '';
    
    // Add transaction start
    code += 'BEGIN;\n\n';
    
    // Generate table creation for each table
    for (const [tableName, mappings] of tableMap.entries()) {
      code += `-- Create table: ${tableName}\n`;
      code += `CREATE TABLE IF NOT EXISTS ${tableName} (\n`;
      
      // Add columns
      const columnDefs = [];
      const primaryKeys = [];
      
      for (const mapping of mappings) {
        let columnDef = `  ${mapping.targetField} `;
        
        // Determine PostgreSQL type
        switch ((mapping.targetType || 'text').toLowerCase()) {
          case 'string':
          case 'varchar':
          case 'char':
            columnDef += `VARCHAR`;
            if (mapping.maxLength) {
              columnDef += `(${mapping.maxLength})`;
            }
            break;
          case 'text':
            columnDef += `TEXT`;
            break;
          case 'integer':
          case 'int':
            columnDef += `INTEGER`;
            break;
          case 'serial':
            columnDef += `SERIAL`;
            break;
          case 'bigserial':
            columnDef += `BIGSERIAL`;
            break;
          case 'bigint':
            columnDef += `BIGINT`;
            break;
          case 'float':
            columnDef += `FLOAT`;
            break;
          case 'double':
            columnDef += `DOUBLE PRECISION`;
            break;
          case 'decimal':
            columnDef += `DECIMAL`;
            if (mapping.precision && mapping.scale) {
              columnDef += `(${mapping.precision}, ${mapping.scale})`;
            }
            break;
          case 'boolean':
            columnDef += `BOOLEAN`;
            break;
          case 'date':
            columnDef += `DATE`;
            break;
          case 'datetime':
          case 'timestamp':
            columnDef += `TIMESTAMP WITH TIME ZONE`;
            break;
          case 'json':
            columnDef += `JSON`;
            break;
          case 'jsonb':
            columnDef += `JSONB`;
            break;
          case 'uuid':
            columnDef += `UUID`;
            break;
          default:
            columnDef += `TEXT`;
        }
        
        // Add constraints
        if (mapping.nullable === false) {
          columnDef += ` NOT NULL`;
        }
        
        if (mapping.unique && !mapping.primaryKey) {
          columnDef += ` UNIQUE`;
        }
        
        if (mapping.defaultValue !== undefined) {
          if (typeof mapping.defaultValue === 'string') {
            columnDef += ` DEFAULT '${mapping.defaultValue}'`;
          } else {
            columnDef += ` DEFAULT ${mapping.defaultValue}`;
          }
        }
        
        if (mapping.primaryKey) {
          primaryKeys.push(mapping.targetField);
        }
        
        columnDefs.push(columnDef);
      }
      
      // Add primary key constraint if there are any primary keys
      if (primaryKeys.length > 0) {
        columnDefs.push(`  PRIMARY KEY (${primaryKeys.join(', ')})`);
      }
      
      code += columnDefs.join(',\n');
      code += '\n);\n\n';
      
      // Add indexes
      for (const mapping of mappings) {
        if (mapping.index && !mapping.primaryKey && !mapping.unique) {
          code += `-- Add index on ${tableName}.${mapping.targetField}\n`;
          code += `CREATE INDEX IF NOT EXISTS idx_${tableName}_${mapping.targetField} ON ${tableName} (${mapping.targetField});\n\n`;
        }
      }
    }
    
    // Add transaction end
    code += 'COMMIT;\n';
    
    return code;
  }

  private generateMySQLMigration(tableMap: Map<string, any[]>): string {
    let code = '';
    
    // Generate table creation for each table
    for (const [tableName, mappings] of tableMap.entries()) {
      code += `-- Create table: ${tableName}\n`;
      code += `CREATE TABLE IF NOT EXISTS \`${tableName}\` (\n`;
      
      // Add columns
      const columnDefs = [];
      const primaryKeys = [];
      
      for (const mapping of mappings) {
        let columnDef = `  \`${mapping.targetField}\` `;
        
        // Determine MySQL type
        switch ((mapping.targetType || 'text').toLowerCase()) {
          case 'string':
          case 'varchar':
          case 'char':
            columnDef += `VARCHAR`;
            if (mapping.maxLength) {
              columnDef += `(${mapping.maxLength})`;
            } else {
              columnDef += `(255)`;
            }
            break;
          case 'text':
            columnDef += `TEXT`;
            break;
          case 'integer':
          case 'int':
            columnDef += `INT`;
            break;
          case 'serial':
            columnDef += `INT AUTO_INCREMENT`;
            break;
          case 'bigserial':
            columnDef += `BIGINT AUTO_INCREMENT`;
            break;
          case 'bigint':
            columnDef += `BIGINT`;
            break;
          case 'float':
            columnDef += `FLOAT`;
            break;
          case 'double':
            columnDef += `DOUBLE`;
            break;
          case 'decimal':
            columnDef += `DECIMAL`;
            if (mapping.precision && mapping.scale) {
              columnDef += `(${mapping.precision}, ${mapping.scale})`;
            }
            break;
          case 'boolean':
            columnDef += `BOOLEAN`;
            break;
          case 'date':
            columnDef += `DATE`;
            break;
          case 'datetime':
          case 'timestamp':
            columnDef += `DATETIME`;
            break;
          case 'json':
          case 'jsonb':
            columnDef += `JSON`;
            break;
          case 'uuid':
            columnDef += `CHAR(36)`;
            break;
          default:
            columnDef += `TEXT`;
        }
        
        // Add constraints
        if (mapping.nullable === false) {
          columnDef += ` NOT NULL`;
        }
        
        if (mapping.unique && !mapping.primaryKey) {
          columnDef += ` UNIQUE`;
        }
        
        if (mapping.defaultValue !== undefined) {
          if (typeof mapping.defaultValue === 'string') {
            columnDef += ` DEFAULT '${mapping.defaultValue}'`;
          } else {
            columnDef += ` DEFAULT ${mapping.defaultValue}`;
          }
        }
        
        if (mapping.primaryKey) {
          primaryKeys.push(mapping.targetField);
        }
        
        columnDefs.push(columnDef);
      }
      
      // Add primary key constraint if there are any primary keys
      if (primaryKeys.length > 0) {
        columnDefs.push(`  PRIMARY KEY (${primaryKeys.map(pk => `\`${pk}\``).join(', ')})`);
      }
      
      code += columnDefs.join(',\n');
      code += '\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n';
      
      // Add indexes
      for (const mapping of mappings) {
        if (mapping.index && !mapping.primaryKey && !mapping.unique) {
          code += `-- Add index on ${tableName}.${mapping.targetField}\n`;
          code += `CREATE INDEX idx_${tableName}_${mapping.targetField} ON \`${tableName}\` (\`${mapping.targetField}\`);\n\n`;
        }
      }
    }
    
    return code;
  }

  private generateSQLiteMigration(tableMap: Map<string, any[]>): string {
    let code = '';
    
    // Generate table creation for each table
    for (const [tableName, mappings] of tableMap.entries()) {
      code += `-- Create table: ${tableName}\n`;
      code += `CREATE TABLE IF NOT EXISTS "${tableName}" (\n`;
      
      // Add columns
      const columnDefs = [];
      const primaryKeys = [];
      
      for (const mapping of mappings) {
        let columnDef = `  "${mapping.targetField}" `;
        
        // Determine SQLite type
        switch ((mapping.targetType || 'text').toLowerCase()) {
          case 'string':
          case 'varchar':
          case 'char':
          case 'text':
          case 'uuid':
            columnDef += `TEXT`;
            break;
          case 'integer':
          case 'int':
          case 'serial':
          case 'bigserial':
          case 'bigint':
            columnDef += `INTEGER`;
            break;
          case 'float':
          case 'double':
          case 'decimal':
            columnDef += `REAL`;
            break;
          case 'boolean':
            columnDef += `INTEGER`; // SQLite doesn't have a native boolean
            break;
          case 'date':
          case 'datetime':
          case 'timestamp':
            columnDef += `TEXT`; // Store as ISO string
            break;
          case 'json':
          case 'jsonb':
            columnDef += `TEXT`; // Store as JSON string
            break;
          default:
            columnDef += `TEXT`;
        }
        
        // Add constraints
        if (mapping.nullable === false) {
          columnDef += ` NOT NULL`;
        }
        
        if (mapping.unique && !mapping.primaryKey) {
          columnDef += ` UNIQUE`;
        }
        
        if (mapping.defaultValue !== undefined) {
          if (typeof mapping.defaultValue === 'string') {
            columnDef += ` DEFAULT '${mapping.defaultValue}'`;
          } else {
            columnDef += ` DEFAULT ${mapping.defaultValue}`;
          }
        }
        
        if (mapping.primaryKey) {
          if (mapping.autoIncrement) {
            columnDef += ` PRIMARY KEY AUTOINCREMENT`;
          } else {
            primaryKeys.push(mapping.targetField);
          }
        }
        
        columnDefs.push(columnDef);
      }
      
      // Add primary key constraint if there are any primary keys and no autoincrement
      if (primaryKeys.length > 0) {
        columnDefs.push(`  PRIMARY KEY (${primaryKeys.map(pk => `"${pk}"`).join(', ')})`);
      }
      
      code += columnDefs.join(',\n');
      code += '\n);\n\n';
      
      // Add indexes
      for (const mapping of mappings) {
        if (mapping.index && !mapping.primaryKey && !mapping.unique) {
          code += `-- Add index on ${tableName}.${mapping.targetField}\n`;
          code += `CREATE INDEX IF NOT EXISTS idx_${tableName}_${mapping.targetField} ON "${tableName}" ("${mapping.targetField}");\n\n`;
        }
      }
    }
    
    return code;
  }

  private generateSQLServerMigration(tableMap: Map<string, any[]>): string {
    let code = '';
    
    // Generate table creation for each table
    for (const [tableName, mappings] of tableMap.entries()) {
      code += `-- Create table: ${tableName}\n`;
      code += `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='${tableName}' AND xtype='U')\n`;
      code += `BEGIN\n`;
      code += `  CREATE TABLE [${tableName}] (\n`;
      
      // Add columns
      const columnDefs = [];
      const primaryKeys = [];
      
      for (const mapping of mappings) {
        let columnDef = `    [${mapping.targetField}] `;
        
        // Determine SQL Server type
        switch ((mapping.targetType || 'text').toLowerCase()) {
          case 'string':
          case 'varchar':
          case 'char':
            columnDef += `NVARCHAR`;
            if (mapping.maxLength) {
              columnDef += `(${mapping.maxLength})`;
            } else {
              columnDef += `(255)`;
            }
            break;
          case 'text':
            columnDef += `NVARCHAR(MAX)`;
            break;
          case 'integer':
          case 'int':
            columnDef += `INT`;
            break;
          case 'serial':
            columnDef += `INT IDENTITY(1,1)`;
            break;
          case 'bigserial':
            columnDef += `BIGINT IDENTITY(1,1)`;
            break;
          case 'bigint':
            columnDef += `BIGINT`;
            break;
          case 'float':
            columnDef += `FLOAT`;
            break;
          case 'double':
            columnDef += `FLOAT`;
            break;
          case 'decimal':
            columnDef += `DECIMAL`;
            if (mapping.precision && mapping.scale) {
              columnDef += `(${mapping.precision}, ${mapping.scale})`;
            }
            break;
          case 'boolean':
            columnDef += `BIT`;
            break;
          case 'date':
            columnDef += `DATE`;
            break;
          case 'datetime':
          case 'timestamp':
            columnDef += `DATETIME2`;
            break;
          case 'json':
          case 'jsonb':
            columnDef += `NVARCHAR(MAX)`; // SQL Server 2016+ supports JSON
            break;
          case 'uuid':
            columnDef += `UNIQUEIDENTIFIER`;
            break;
          default:
            columnDef += `NVARCHAR(MAX)`;
        }
        
        // Add constraints
        if (mapping.nullable === false) {
          columnDef += ` NOT NULL`;
        } else {
          columnDef += ` NULL`;
        }
        
        if (mapping.defaultValue !== undefined) {
          if (typeof mapping.defaultValue === 'string') {
            columnDef += ` DEFAULT '${mapping.defaultValue}'`;
          } else {
            columnDef += ` DEFAULT ${mapping.defaultValue}`;
          }
        }
        
        if (mapping.primaryKey) {
          primaryKeys.push(mapping.targetField);
        }
        
        columnDefs.push(columnDef);
      }
      
      // Add primary key constraint if there are any primary keys
      if (primaryKeys.length > 0) {
        columnDefs.push(`    CONSTRAINT [PK_${tableName}] PRIMARY KEY CLUSTERED (${primaryKeys.map(pk => `[${pk}]`).join(', ')})`);
      }
      
      code += columnDefs.join(',\n');
      code += '\n  );\n';
      code += `END;\n\n`;
      
      // Add indexes and unique constraints
      for (const mapping of mappings) {
        if (mapping.unique && !mapping.primaryKey) {
          code += `-- Add unique constraint on ${tableName}.${mapping.targetField}\n`;
          code += `IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='UQ_${tableName}_${mapping.targetField}' AND object_id = OBJECT_ID('${tableName}'))\n`;
          code += `BEGIN\n`;
          code += `  ALTER TABLE [${tableName}] ADD CONSTRAINT [UQ_${tableName}_${mapping.targetField}] UNIQUE ([${mapping.targetField}]);\n`;
          code += `END;\n\n`;
        } else if (mapping.index && !mapping.primaryKey) {
          code += `-- Add index on ${tableName}.${mapping.targetField}\n`;
          code += `IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_${tableName}_${mapping.targetField}' AND object_id = OBJECT_ID('${tableName}'))\n`;
          code += `BEGIN\n`;
          code += `  CREATE INDEX [IX_${tableName}_${mapping.targetField}] ON [${tableName}] ([${mapping.targetField}]);\n`;
          code += `END;\n\n`;
        }
      }
    }
    
    return code;
  }

  private generateGenericSQLMigration(tableMap: Map<string, any[]>): string {
    let code = '';
    
    // Generate table creation for each table
    for (const [tableName, mappings] of tableMap.entries()) {
      code += `-- Create table: ${tableName}\n`;
      code += `CREATE TABLE IF NOT EXISTS ${tableName} (\n`;
      
      // Add columns
      const columnDefs = [];
      const primaryKeys = [];
      
      for (const mapping of mappings) {
        let columnDef = `  ${mapping.targetField} `;
        
        // Use a generic type that should work in most SQL databases
        switch ((mapping.targetType || 'text').toLowerCase()) {
          case 'string':
          case 'varchar':
          case 'char':
            columnDef += `VARCHAR`;
            if (mapping.maxLength) {
              columnDef += `(${mapping.maxLength})`;
            } else {
              columnDef += `(255)`;
            }
            break;
          case 'text':
            columnDef += `TEXT`;
            break;
          case 'integer':
          case 'int':
            columnDef += `INTEGER`;
            break;
          case 'bigint':
            columnDef += `BIGINT`;
            break;
          case 'float':
            columnDef += `FLOAT`;
            break;
          case 'double':
            columnDef += `DOUBLE PRECISION`;
            break;
          case 'decimal':
            columnDef += `DECIMAL`;
            if (mapping.precision && mapping.scale) {
              columnDef += `(${mapping.precision}, ${mapping.scale})`;
            }
            break;
          case 'boolean':
            columnDef += `BOOLEAN`;
            break;
          case 'date':
            columnDef += `DATE`;
            break;
          case 'datetime':
          case 'timestamp':
            columnDef += `TIMESTAMP`;
            break;
          case 'json':
          case 'jsonb':
            columnDef += `TEXT`; // Use TEXT as a generic fallback for JSON
            break;
          case 'uuid':
            columnDef += `VARCHAR(36)`;
            break;
          default:
            columnDef += `TEXT`;
        }
        
        // Add constraints
        if (mapping.nullable === false) {
          columnDef += ` NOT NULL`;
        }
        
        if (mapping.unique && !mapping.primaryKey) {
          columnDef += ` UNIQUE`;
        }
        
        if (mapping.defaultValue !== undefined) {
          if (typeof mapping.defaultValue === 'string') {
            columnDef += ` DEFAULT '${mapping.defaultValue}'`;
          } else {
            columnDef += ` DEFAULT ${mapping.defaultValue}`;
          }
        }
        
        if (mapping.primaryKey) {
          primaryKeys.push(mapping.targetField);
        }
        
        columnDefs.push(columnDef);
      }
      
      // Add primary key constraint if there are any primary keys
      if (primaryKeys.length > 0) {
        columnDefs.push(`  PRIMARY KEY (${primaryKeys.join(', ')})`);
      }
      
      code += columnDefs.join(',\n');
      code += '\n);\n\n';
      
      // Add indexes
      for (const mapping of mappings) {
        if (mapping.index && !mapping.primaryKey && !mapping.unique) {
          code += `-- Add index on ${tableName}.${mapping.targetField}\n`;
          code += `CREATE INDEX idx_${tableName}_${mapping.targetField} ON ${tableName} (${mapping.targetField});\n\n`;
        }
      }
    }
    
    return code;
  }

  /* Query helper generation methods */

  private generateSequelizeQueryHelpers(tableMap: Map<string, any[]>): string {
    let code = `/**
 * Sequelize Query Helpers
 */

const { Op } = require('sequelize');

/**
 * Helper functions
 */
`;
    
    for (const [tableName, mappings] of tableMap.entries()) {
      const modelName = this.toPascalCase(tableName);
      
      code += `/**
 * ${modelName} query helpers
 */

/**
 * Find by criteria
 * @param {Object} models - Sequelize models
 * @param {Object} criteria - Search criteria
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Found records
 */
exports.find${modelName}ByCriteria = async (models, criteria = {}, options = {}) => {
  const queryOptions = {
    where: {},
    ...options
  };
  
  // Build query criteria
`;
      
      // Add fields to query
      for (const mapping of mappings) {
        const fieldName = this.toCamelCase(mapping.targetField);
        
        code += `  if (criteria.${fieldName} !== undefined) {
    queryOptions.where.${mapping.targetField} = criteria.${fieldName};
  }
  
`;
      }
      
      // Add a few common operators for range queries
      for (const mapping of mappings) {
        const fieldType = (mapping.targetType || '').toLowerCase();
        if (['number', 'integer', 'float', 'decimal', 'double', 'date', 'datetime', 'timestamp'].includes(fieldType)) {
          const fieldName = this.toCamelCase(mapping.targetField);
          
          code += `  // Range queries for ${fieldName}
  if (criteria.${fieldName}Min !== undefined) {
    queryOptions.where.${mapping.targetField} = {
      ...queryOptions.where.${mapping.targetField},
      [Op.gte]: criteria.${fieldName}Min
    };
  }
  
  if (criteria.${fieldName}Max !== undefined) {
    queryOptions.where.${mapping.targetField} = {
      ...queryOptions.where.${mapping.targetField},
      [Op.lte]: criteria.${fieldName}Max
    };
  }
  
`;
        }
      }
      
      // Add string search capability for string fields
      for (const mapping of mappings) {
        const fieldType = (mapping.targetType || '').toLowerCase();
        if (['string', 'text', 'varchar', 'char'].includes(fieldType)) {
          const fieldName = this.toCamelCase(mapping.targetField);
          
          code += `  // String search for ${fieldName}
  if (criteria.${fieldName}Contains !== undefined) {
    queryOptions.where.${mapping.targetField} = {
      ...queryOptions.where.${mapping.targetField},
      [Op.like]: \`%\${criteria.${fieldName}Contains}%\`
    };
  }
  
`;
        }
      }
      
      // Finish the function
      code += `  return await models.${modelName}.findAll(queryOptions);
};

/**
 * Get paginated data
 * @param {Object} models - Sequelize models
 * @param {number} page - Page number (1-based)
 * @param {number} pageSize - Items per page
 * @param {Object} criteria - Search criteria
 * @param {Object} options - Query options
 * @returns {Promise<Object>} - Paginated results
 */
exports.get${modelName}Paginated = async (models, page = 1, pageSize = 10, criteria = {}, options = {}) => {
  const offset = (page - 1) * pageSize;
  
  const queryOptions = {
    ...options,
    limit: pageSize,
    offset
  };
  
  const { count, rows } = await models.${modelName}.findAndCountAll({
    ...queryOptions,
    where: criteria
  });
  
  return {
    totalItems: count,
    items: rows,
    totalPages: Math.ceil(count / pageSize),
    currentPage: page
  };
};

`;
    }
    
    return code;
  }

  private generateTypeORMQueryHelpers(tableMap: Map<string, any[]>): string {
    let code = `/**
 * TypeORM Query Helpers
 */

import { Repository, Like, Between, FindOptionsWhere, FindManyOptions } from "typeorm";

/**
 * Helper functions
 */
`;
    
    for (const [tableName, mappings] of tableMap.entries()) {
      const modelName = this.toPascalCase(tableName);
      
      code += `/**
 * ${modelName} query helpers
 */

/**
 * Find by criteria
 * @param repository - TypeORM repository
 * @param criteria - Search criteria
 * @param options - Query options
 * @returns Found records
 */
export async function find${modelName}ByCriteria<T>(
  repository: Repository<T>,
  criteria: any = {},
  options: Partial<FindManyOptions<T>> = {}
): Promise<T[]> {
  const whereClause: FindOptionsWhere<T> = {};
  
  // Build query criteria
`;
      
      // Add fields to query
      for (const mapping of mappings) {
        const fieldName = this.toCamelCase(mapping.targetField);
        
        code += `  if (criteria.${fieldName} !== undefined) {
    whereClause.${mapping.targetField} = criteria.${fieldName};
  }
  
`;
      }
      
      // Add string search capability for string fields
      for (const mapping of mappings) {
        const fieldType = (mapping.targetType || '').toLowerCase();
        if (['string', 'text', 'varchar', 'char'].includes(fieldType)) {
          const fieldName = this.toCamelCase(mapping.targetField);
          
          code += `  // String search for ${fieldName}
  if (criteria.${fieldName}Contains !== undefined) {
    whereClause.${mapping.targetField} = Like(\`%\${criteria.${fieldName}Contains}%\`);
  }
  
`;
        }
      }
      
      // Add a few common operators for range queries
      for (const mapping of mappings) {
        const fieldType = (mapping.targetType || '').toLowerCase();
        if (['number', 'integer', 'float', 'decimal', 'double', 'date', 'datetime', 'timestamp'].includes(fieldType)) {
          const fieldName = this.toCamelCase(mapping.targetField);
          
          code += `  // Range queries for ${fieldName}
  if (criteria.${fieldName}Min !== undefined && criteria.${fieldName}Max !== undefined) {
    whereClause.${mapping.targetField} = Between(criteria.${fieldName}Min, criteria.${fieldName}Max);
  }
  
`;
        }
      }
      
      // Finish the function
      code += `  return repository.find({
    where: whereClause,
    ...options
  });
}

/**
 * Get paginated data
 * @param repository - TypeORM repository
 * @param page - Page number (1-based)
 * @param pageSize - Items per page
 * @param criteria - Search criteria
 * @param options - Query options
 * @returns Paginated results
 */
export async function get${modelName}Paginated<T>(
  repository: Repository<T>,
  page: number = 1,
  pageSize: number = 10,
  criteria: any = {},
  options: Partial<FindManyOptions<T>> = {}
): Promise<{
  items: T[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
}> {
  const skip = (page - 1) * pageSize;
  
  const [items, totalItems] = await repository.findAndCount({
    where: criteria,
    skip,
    take: pageSize,
    ...options
  });
  
  return {
    items,
    totalItems,
    totalPages: Math.ceil(totalItems / pageSize),
    currentPage: page
  };
}

`;
    }
    
    return code;
  }

  private generatePrismaQueryHelpers(tableMap: Map<string, any[]>): string {
    let code = `/**
 * Prisma Query Helpers
 */

/**
 * Helper functions
 */
`;
    
    for (const [tableName, mappings] of tableMap.entries()) {
      const modelName = this.toPascalCase(tableName);
      const modelNameLower = modelName.charAt(0).toLowerCase() + modelName.slice(1);
      
      code += `/**
 * ${modelName} query helpers
 */

/**
 * Find by criteria
 * @param prisma - Prisma client
 * @param criteria - Search criteria
 * @param options - Query options
 * @returns Found records
 */
export async function find${modelName}ByCriteria(
  prisma,
  criteria = {},
  options = {}
) {
  const whereClause = {};
  
  // Build query criteria
`;
      
      // Add fields to query
      for (const mapping of mappings) {
        const fieldName = this.toCamelCase(mapping.targetField);
        
        code += `  if (criteria.${fieldName} !== undefined) {
    whereClause.${fieldName} = criteria.${fieldName};
  }
  
`;
      }
      
      // Add string search capability for string fields
      for (const mapping of mappings) {
        const fieldType = (mapping.targetType || '').toLowerCase();
        if (['string', 'text', 'varchar', 'char'].includes(fieldType)) {
          const fieldName = this.toCamelCase(mapping.targetField);
          
          code += `  // String search for ${fieldName}
  if (criteria.${fieldName}Contains !== undefined) {
    whereClause.${fieldName} = {
      contains: criteria.${fieldName}Contains,
      mode: 'insensitive'
    };
  }
  
`;
        }
      }
      
      // Add a few common operators for range queries
      for (const mapping of mappings) {
        const fieldType = (mapping.targetType || '').toLowerCase();
        if (['number', 'integer', 'float', 'decimal', 'double', 'date', 'datetime', 'timestamp'].includes(fieldType)) {
          const fieldName = this.toCamelCase(mapping.targetField);
          
          code += `  // Range queries for ${fieldName}
  if (criteria.${fieldName}Min !== undefined || criteria.${fieldName}Max !== undefined) {
    whereClause.${fieldName} = {
      ...(criteria.${fieldName}Min !== undefined ? { gte: criteria.${fieldName}Min } : {}),
      ...(criteria.${fieldName}Max !== undefined ? { lte: criteria.${fieldName}Max } : {})
    };
  }
  
`;
        }
      }
      
      // Finish the function
      code += `  return prisma.${modelNameLower}.findMany({
    where: whereClause,
    ...options
  });
}

/**
 * Get paginated data
 * @param prisma - Prisma client
 * @param page - Page number (1-based)
 * @param pageSize - Items per page
 * @param criteria - Search criteria
 * @param options - Query options
 * @returns Paginated results
 */
export async function get${modelName}Paginated(
  prisma,
  page = 1,
  pageSize = 10,
  criteria = {},
  options = {}
) {
  const skip = (page - 1) * pageSize;
  
  const [items, totalItems] = await Promise.all([
    prisma.${modelNameLower}.findMany({
      where: criteria,
      skip,
      take: pageSize,
      ...options
    }),
    prisma.${modelNameLower}.count({
      where: criteria
    })
  ]);
  
  return {
    items,
    totalItems,
    totalPages: Math.ceil(totalItems / pageSize),
    currentPage: page
  };
}

`;
    }
    
    return code;
  }

  private generateDrizzleQueryHelpers(tableMap: Map<string, any[]>): string {
    let code = `/**
 * Drizzle ORM Query Helpers
 */

import { and, eq, like, gt, lt, gte, lte, desc, asc, SQL } from 'drizzle-orm';
import { schema } from '../schema';

/**
 * Helper functions
 */
`;
    
    for (const [tableName, mappings] of tableMap.entries()) {
      const modelName = this.toPascalCase(tableName);
      const tableRef = `schema.${this.toCamelCase(tableName)}`;
      
      code += `/**
 * ${modelName} query helpers
 */

/**
 * Find by criteria
 * @param db - Drizzle database instance
 * @param criteria - Search criteria
 * @param options - Query options
 * @returns Found records
 */
export async function find${modelName}ByCriteria(
  db,
  criteria = {},
  options = {}
) {
  let queryBuilderParts = [];
  
  // Build query criteria
`;
      
      // Add fields to query
      for (const mapping of mappings) {
        const fieldName = this.toCamelCase(mapping.targetField);
        
        code += `  if (criteria.${fieldName} !== undefined) {
    queryBuilderParts.push(eq(${tableRef}.${mapping.targetField}, criteria.${fieldName}));
  }
  
`;
      }
      
      // Add string search capability for string fields
      for (const mapping of mappings) {
        const fieldType = (mapping.targetType || '').toLowerCase();
        if (['string', 'text', 'varchar', 'char'].includes(fieldType)) {
          const fieldName = this.toCamelCase(mapping.targetField);
          
          code += `  // String search for ${fieldName}
  if (criteria.${fieldName}Contains !== undefined) {
    queryBuilderParts.push(like(${tableRef}.${mapping.targetField}, \`%\${criteria.${fieldName}Contains}%\`));
  }
  
`;
        }
      }
      
      // Add a few common operators for range queries
      for (const mapping of mappings) {
        const fieldType = (mapping.targetType || '').toLowerCase();
        if (['number', 'integer', 'float', 'decimal', 'double', 'date', 'datetime', 'timestamp'].includes(fieldType)) {
          const fieldName = this.toCamelCase(mapping.targetField);
          
          code += `  // Range queries for ${fieldName}
  if (criteria.${fieldName}Min !== undefined) {
    queryBuilderParts.push(gte(${tableRef}.${mapping.targetField}, criteria.${fieldName}Min));
  }
  
  if (criteria.${fieldName}Max !== undefined) {
    queryBuilderParts.push(lte(${tableRef}.${mapping.targetField}, criteria.${fieldName}Max));
  }
  
`;
        }
      }
      
      // Finish the function
      code += `  const whereClause = queryBuilderParts.length > 0 ? and(...queryBuilderParts) : undefined;
  
  // Handle order by
  let orderBy = [];
  if (options.orderBy) {
    const direction = options.direction === 'desc' ? desc : asc;
    orderBy.push(direction(${tableRef}[options.orderBy]));
  }
  
  return db.select().from(${tableRef})
    .where(whereClause)
    .orderBy(...orderBy)
    .limit(options.limit)
    .offset(options.offset);
}

/**
 * Get paginated data
 * @param db - Drizzle database instance
 * @param page - Page number (1-based)
 * @param pageSize - Items per page
 * @param criteria - Search criteria
 * @param options - Query options
 * @returns Paginated results
 */
export async function get${modelName}Paginated(
  db,
  page = 1,
  pageSize = 10,
  criteria = {},
  options = {}
) {
  const skip = (page - 1) * pageSize;
  
  // Build where clause
  let queryBuilderParts = [];
  for (const [key, value] of Object.entries(criteria)) {
    if (${tableRef}[key]) {
      queryBuilderParts.push(eq(${tableRef}[key], value));
    }
  }
  
  const whereClause = queryBuilderParts.length > 0 ? and(...queryBuilderParts) : undefined;
  
  // Handle order by
  let orderBy = [];
  if (options.orderBy) {
    const direction = options.direction === 'desc' ? desc : asc;
    orderBy.push(direction(${tableRef}[options.orderBy]));
  }
  
  const [items, countResult] = await Promise.all([
    db.select().from(${tableRef})
      .where(whereClause)
      .orderBy(...orderBy)
      .limit(pageSize)
      .offset(skip),
    db.select({ count: SQL\`COUNT(*)\` }).from(${tableRef})
      .where(whereClause)
  ]);
  
  const totalItems = Number(countResult[0]?.count || 0);
  
  return {
    items,
    totalItems,
    totalPages: Math.ceil(totalItems / pageSize),
    currentPage: page
  };
}

`;
    }
    
    return code;
  }

  private generateGenericQueryHelpers(tableMap: Map<string, any[]>): string {
    let code = `/**
 * Generic Query Helpers
 * 
 * These functions can be adapted to work with various ORMs or database libraries.
 */

/**
 * Helper functions
 */
`;
    
    for (const [tableName, mappings] of tableMap.entries()) {
      const modelName = this.toPascalCase(tableName);
      
      code += `/**
 * ${modelName} query helpers
 */

/**
 * Find by criteria
 * @param db - Database access object
 * @param criteria - Search criteria
 * @param options - Query options
 * @returns Found records
 */
export async function find${modelName}ByCriteria(
  db,
  criteria = {},
  options = {}
) {
  // Build where clause based on criteria
  const conditions = [];
  const params = [];
  
  // Build query criteria for each field
`;
      
      // Add fields to query
      for (const mapping of mappings) {
        const fieldName = this.toCamelCase(mapping.targetField);
        
        code += `  if (criteria.${fieldName} !== undefined) {
    conditions.push(\`${mapping.targetField} = ?\`);
    params.push(criteria.${fieldName});
  }
  
`;
      }
      
      // Add string search capability for string fields
      for (const mapping of mappings) {
        const fieldType = (mapping.targetType || '').toLowerCase();
        if (['string', 'text', 'varchar', 'char'].includes(fieldType)) {
          const fieldName = this.toCamelCase(mapping.targetField);
          
          code += `  // String search for ${fieldName}
  if (criteria.${fieldName}Contains !== undefined) {
    conditions.push(\`${mapping.targetField} LIKE ?\`);
    params.push(\`%\${criteria.${fieldName}Contains}%\`);
  }
  
`;
        }
      }
      
      // Add a few common operators for range queries
      for (const mapping of mappings) {
        const fieldType = (mapping.targetType || '').toLowerCase();
        if (['number', 'integer', 'float', 'decimal', 'double', 'date', 'datetime', 'timestamp'].includes(fieldType)) {
          const fieldName = this.toCamelCase(mapping.targetField);
          
          code += `  // Range queries for ${fieldName}
  if (criteria.${fieldName}Min !== undefined) {
    conditions.push(\`${mapping.targetField} >= ?\`);
    params.push(criteria.${fieldName}Min);
  }
  
  if (criteria.${fieldName}Max !== undefined) {
    conditions.push(\`${mapping.targetField} <= ?\`);
    params.push(criteria.${fieldName}Max);
  }
  
`;
        }
      }
      
      // Finish the function
      code += `  // Build SQL query
  let query = \`SELECT * FROM ${tableName}\`;
  
  if (conditions.length > 0) {
    query += \` WHERE \${conditions.join(' AND ')}\`;
  }
  
  // Add order by
  if (options.orderBy) {
    const direction = options.direction === 'desc' ? 'DESC' : 'ASC';
    query += \` ORDER BY \${options.orderBy} \${direction}\`;
  }
  
  // Add limit and offset
  if (options.limit) {
    query += \` LIMIT \${options.limit}\`;
  }
  
  if (options.offset) {
    query += \` OFFSET \${options.offset}\`;
  }
  
  // Execute query (implementation depends on the database library)
  return db.query(query, params);
}

/**
 * Get paginated data
 * @param db - Database access object
 * @param page - Page number (1-based)
 * @param pageSize - Items per page
 * @param criteria - Search criteria
 * @param options - Query options
 * @returns Paginated results
 */
export async function get${modelName}Paginated(
  db,
  page = 1,
  pageSize = 10,
  criteria = {},
  options = {}
) {
  const skip = (page - 1) * pageSize;
  
  // Build find options
  const findOptions = {
    ...options,
    limit: pageSize,
    offset: skip
  };
  
  // Build where clause for count query
  const conditions = [];
  const params = [];
  
  // Add criteria to conditions and params (simplified example)
  for (const [key, value] of Object.entries(criteria)) {
    conditions.push(\`\${key} = ?\`);
    params.push(value);
  }
  
  // Count query
  let countQuery = \`SELECT COUNT(*) as total FROM ${tableName}\`;
  if (conditions.length > 0) {
    countQuery += \` WHERE \${conditions.join(' AND ')}\`;
  }
  
  // Execute queries
  const [items, countResult] = await Promise.all([
    find${modelName}ByCriteria(db, criteria, findOptions),
    db.query(countQuery, params)
  ]);
  
  const totalItems = countResult[0]?.total || 0;
  
  return {
    items,
    totalItems,
    totalPages: Math.ceil(totalItems / pageSize),
    currentPage: page
  };
}

`;
    }
    
    return code;
  }

  /* CRUD operations generation methods */

  private generateSequelizeCRUD(tableMap: Map<string, any[]>): string {
    let code = `/**
 * Sequelize CRUD Operations
 */

/**
 * CRUD service factory
 * @param {Object} models - Sequelize models
 * @returns {Object} - CRUD services
 */
module.exports = (models) => {
  return {
`;
    
    for (const [tableName, mappings] of tableMap.entries()) {
      const modelName = this.toPascalCase(tableName);
      const modelVar = modelName.charAt(0).toLowerCase() + modelName.slice(1);
      
      code += `    // ${modelName} CRUD operations
    ${modelVar}: {
      /**
       * Find all records
       * @param {Object} options - Query options
       * @returns {Promise<Array>} - Found records
       */
      findAll: async (options = {}) => {
        return await models.${modelName}.findAll(options);
      },
      
      /**
       * Find one record by ID
       * @param {number|string} id - Record ID
       * @param {Object} options - Query options
       * @returns {Promise<Object>} - Found record
       */
      findById: async (id, options = {}) => {
        return await models.${modelName}.findByPk(id, options);
      },
      
      /**
       * Find one record by criteria
       * @param {Object} where - Query criteria
       * @param {Object} options - Query options
       * @returns {Promise<Object>} - Found record
       */
      findOne: async (where, options = {}) => {
        return await models.${modelName}.findOne({
          ...options,
          where
        });
      },
      
      /**
       * Create a record
       * @param {Object} data - Record data
       * @param {Object} options - Query options
       * @returns {Promise<Object>} - Created record
       */
      create: async (data, options = {}) => {
        return await models.${modelName}.create(data, options);
      },
      
      /**
       * Update a record
       * @param {number|string} id - Record ID
       * @param {Object} data - Record data
       * @param {Object} options - Query options
       * @returns {Promise<Object>} - Updated record
       */
      update: async (id, data, options = {}) => {
        const record = await models.${modelName}.findByPk(id);
        
        if (!record) {
          throw new Error('Record not found');
        }
        
        return await record.update(data, options);
      },
      
      /**
       * Delete a record
       * @param {number|string} id - Record ID
       * @param {Object} options - Query options
       * @returns {Promise<boolean>} - Success indicator
       */
      delete: async (id, options = {}) => {
        const record = await models.${modelName}.findByPk(id);
        
        if (!record) {
          throw new Error('Record not found');
        }
        
        await record.destroy(options);
        return true;
      },
      
      /**
       * Count records
       * @param {Object} where - Query criteria
       * @returns {Promise<number>} - Record count
       */
      count: async (where = {}) => {
        return await models.${modelName}.count({ where });
      }
    },
    
`;
    }
    
    code += `  };
};`;
    
    return code;
  }

  private generateTypeORMCRUD(tableMap: Map<string, any[]>): string {
    let code = `/**
 * TypeORM CRUD Operations
 */

import { Repository, DeepPartial, FindOptionsWhere } from "typeorm";

/**
 * Generic CRUD service for TypeORM entities
 */
export class GenericCrudService<T> {
  constructor(private repository: Repository<T>) {}

  /**
   * Find all records
   * @param options - Query options
   * @returns Found records
   */
  async findAll(options = {}): Promise<T[]> {
    return this.repository.find(options);
  }

  /**
   * Find one record by ID
   * @param id - Record ID
   * @param options - Query options
   * @returns Found record
   */
  async findById(id: string | number, options = {}): Promise<T | null> {
    // @ts-ignore - id type varies by entity
    return this.repository.findOne({
      where: { id },
      ...options
    });
  }

  /**
   * Find one record by criteria
   * @param where - Query criteria
   * @param options - Query options
   * @returns Found record
   */
  async findOne(where: FindOptionsWhere<T>, options = {}): Promise<T | null> {
    return this.repository.findOne({
      where,
      ...options
    });
  }

  /**
   * Create a record
   * @param data - Record data
   * @returns Created record
   */
  async create(data: DeepPartial<T>): Promise<T> {
    const entity = this.repository.create(data);
    return this.repository.save(entity as any);
  }

  /**
   * Update a record
   * @param id - Record ID
   * @param data - Record data
   * @returns Updated record
   */
  async update(id: string | number, data: DeepPartial<T>): Promise<T> {
    // @ts-ignore - id type varies by entity
    const entity = await this.findById(id);
    
    if (!entity) {
      throw new Error('Record not found');
    }
    
    return this.repository.save({
      ...entity,
      ...data
    } as any);
  }

  /**
   * Delete a record
   * @param id - Record ID
   * @returns Success indicator
   */
  async delete(id: string | number): Promise<boolean> {
    // @ts-ignore - id type varies by entity
    const result = await this.repository.delete(id);
    return result.affected !== undefined && result.affected > 0;
  }

  /**
   * Count records
   * @param where - Query criteria
   * @returns Record count
   */
  async count(where: FindOptionsWhere<T> = {}): Promise<number> {
    return this.repository.count({ where });
  }
}

/**
 * Export CRUD services for each entity
 */
`;
    
    for (const [tableName, mappings] of tableMap.entries()) {
      const modelName = this.toPascalCase(tableName);
      
      code += `
/**
 * ${modelName} CRUD service
 */
export class ${modelName}Service extends GenericCrudService<${modelName}> {
  constructor(repository: Repository<${modelName}>) {
    super(repository);
  }
  
  // Add custom methods specific to ${modelName} here
}
`;
    }
    
    return code;
  }

  private generatePrismaCRUD(tableMap: Map<string, any[]>): string {
    let code = `/**
 * Prisma CRUD Operations
 */

/**
 * CRUD service factory
 * @param prisma - Prisma client
 * @returns Object with CRUD services
 */
export function createCrudServices(prisma) {
  return {
`;
    
    for (const [tableName, mappings] of tableMap.entries()) {
      const modelName = this.toPascalCase(tableName);
      const modelVar = modelName.charAt(0).toLowerCase() + modelName.slice(1);
      
      code += `    // ${modelName} CRUD operations
    ${modelVar}: {
      /**
       * Find all records
       * @param options - Query options
       * @returns Found records
       */
      findAll: async (options = {}) => {
        return prisma.${modelVar}.findMany(options);
      },
      
      /**
       * Find one record by ID
       * @param id - Record ID
       * @param options - Query options
       * @returns Found record
       */
      findById: async (id, options = {}) => {
        return prisma.${modelVar}.findUnique({
          where: { id },
          ...options
        });
      },
      
      /**
       * Find one record by criteria
       * @param where - Query criteria
       * @param options - Query options
       * @returns Found record
       */
      findOne: async (where, options = {}) => {
        return prisma.${modelVar}.findFirst({
          where,
          ...options
        });
      },
      
      /**
       * Create a record
       * @param data - Record data
       * @returns Created record
       */
      create: async (data) => {
        return prisma.${modelVar}.create({
          data
        });
      },
      
      /**
       * Update a record
       * @param id - Record ID
       * @param data - Record data
       * @returns Updated record
       */
      update: async (id, data) => {
        return prisma.${modelVar}.update({
          where: { id },
          data
        });
      },
      
      /**
       * Delete a record
       * @param id - Record ID
       * @returns Deleted record
       */
      delete: async (id) => {
        return prisma.${modelVar}.delete({
          where: { id }
        });
      },
      
      /**
       * Count records
       * @param where - Query criteria
       * @returns Record count
       */
      count: async (where = {}) => {
        return prisma.${modelVar}.count({
          where
        });
      }
    },
    
`;
    }
    
    code += `  };
}
`;
    
    return code;
  }

  private generateDrizzleCRUD(tableMap: Map<string, any[]>): string {
    let code = `/**
 * Drizzle ORM CRUD Operations
 */

import { eq } from 'drizzle-orm';
import { schema } from '../schema';

/**
 * CRUD service factory
 * @param db - Drizzle database instance
 * @returns Object with CRUD services
 */
export function createCrudServices(db) {
  return {
`;
    
    for (const [tableName, mappings] of tableMap.entries()) {
      const modelName = this.toPascalCase(tableName);
      const tableVar = this.toCamelCase(tableName);
      
      // Find the primary key column
      const primaryKey = mappings.find(m => m.primaryKey)?.targetField || 'id';
      
      code += `    // ${modelName} CRUD operations
    ${tableVar}: {
      /**
       * Find all records
       * @param options - Query options (limit, offset, orderBy)
       * @returns Found records
       */
      findAll: async (options = {}) => {
        let query = db.select().from(schema.${tableVar});
        
        if (options.limit) {
          query = query.limit(options.limit);
        }
        
        if (options.offset) {
          query = query.offset(options.offset);
        }
        
        return query;
      },
      
      /**
       * Find one record by ID
       * @param id - Record ID
       * @returns Found record
       */
      findById: async (id) => {
        const results = await db.select()
          .from(schema.${tableVar})
          .where(eq(schema.${tableVar}.${primaryKey}, id))
          .limit(1);
        
        return results[0];
      },
      
      /**
       * Find one record by criteria
       * @param where - Query criteria
       * @returns Found record
       */
      findOne: async (whereCondition) => {
        // Convert object condition to Drizzle condition
        // This is simplified - in a real app you'd need more complex logic
        const conditions = [];
        
        for (const [key, value] of Object.entries(whereCondition)) {
          if (schema.${tableVar}[key]) {
            conditions.push(eq(schema.${tableVar}[key], value));
          }
        }
        
        const results = await db.select()
          .from(schema.${tableVar})
          .where(...conditions)
          .limit(1);
        
        return results[0];
      },
      
      /**
       * Create a record
       * @param data - Record data
       * @returns Created record
       */
      create: async (data) => {
        const result = await db.insert(schema.${tableVar})
          .values(data)
          .returning();
        
        return result[0];
      },
      
      /**
       * Update a record
       * @param id - Record ID
       * @param data - Record data
       * @returns Updated record
       */
      update: async (id, data) => {
        const result = await db.update(schema.${tableVar})
          .set(data)
          .where(eq(schema.${tableVar}.${primaryKey}, id))
          .returning();
        
        return result[0];
      },
      
      /**
       * Delete a record
       * @param id - Record ID
       * @returns Success indicator
       */
      delete: async (id) => {
        const result = await db.delete(schema.${tableVar})
          .where(eq(schema.${tableVar}.${primaryKey}, id))
          .returning();
        
        return result.length > 0;
      },
      
      /**
       * Count records
       * @param whereCondition - Query criteria
       * @returns Record count
       */
      count: async (whereCondition = {}) => {
        // Convert object condition to Drizzle condition
        const conditions = [];
        
        for (const [key, value] of Object.entries(whereCondition)) {
          if (schema.${tableVar}[key]) {
            conditions.push(eq(schema.${tableVar}[key], value));
          }
        }
        
        const result = await db.select({ count: { value: count() } })
          .from(schema.${tableVar})
          .where(...conditions);
        
        return result[0]?.count?.value || 0;
      }
    },
    
`;
    }
    
    code += `  };
}
`;
    
    return code;
  }

  private generateGenericCRUD(tableMap: Map<string, any[]>): string {
    let code = `/**
 * Generic CRUD Operations
 * 
 * These operations can be adapted to work with various database libraries.
 */

/**
 * Base CRUD service class
 */
export class BaseCrudService {
  constructor(tableName, db) {
    this.tableName = tableName;
    this.db = db;
    this.primaryKey = 'id'; // Default primary key
  }
  
  /**
   * Find all records
   * @param options - Query options
   * @returns Found records
   */
  async findAll(options = {}) {
    let query = \`SELECT * FROM \${this.tableName}\`;
    const params = [];
    
    // Add WHERE clause if conditions are provided
    if (options.where) {
      const whereClause = this._buildWhereClause(options.where);
      query += \` WHERE \${whereClause.conditions}\`;
      params.push(...whereClause.params);
    }
    
    // Add ORDER BY clause
    if (options.orderBy) {
      const direction = options.direction === 'desc' ? 'DESC' : 'ASC';
      query += \` ORDER BY \${options.orderBy} \${direction}\`;
    }
    
    // Add LIMIT and OFFSET
    if (options.limit) {
      query += \` LIMIT ?\`;
      params.push(options.limit);
    }
    
    if (options.offset) {
      query += \` OFFSET ?\`;
      params.push(options.offset);
    }
    
    return this.db.query(query, params);
  }
  
  /**
   * Find one record by ID
   * @param id - Record ID
   * @returns Found record
   */
  async findById(id) {
    const query = \`SELECT * FROM \${this.tableName} WHERE \${this.primaryKey} = ? LIMIT 1\`;
    const results = await this.db.query(query, [id]);
    return results[0];
  }
  
  /**
   * Find one record by criteria
   * @param where - Query criteria
   * @returns Found record
   */
  async findOne(where) {
    const whereClause = this._buildWhereClause(where);
    const query = \`SELECT * FROM \${this.tableName} WHERE \${whereClause.conditions} LIMIT 1\`;
    const results = await this.db.query(query, whereClause.params);
    return results[0];
  }
  
  /**
   * Create a record
   * @param data - Record data
   * @returns Created record
   */
  async create(data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    
    const query = \`
      INSERT INTO \${this.tableName} (\${keys.join(', ')})
      VALUES (\${placeholders})
    \`;
    
    const result = await this.db.query(query, values);
    const insertedId = result.insertId || (data[this.primaryKey] || null);
    
    if (insertedId) {
      return this.findById(insertedId);
    }
    
    return data;
  }
  
  /**
   * Update a record
   * @param id - Record ID
   * @param data - Record data
   * @returns Updated record
   */
  async update(id, data) {
    const entries = Object.entries(data);
    const setClause = entries.map(([key]) => \`\${key} = ?\`).join(', ');
    const values = [...entries.map(([_, value]) => value), id];
    
    const query = \`
      UPDATE \${this.tableName}
      SET \${setClause}
      WHERE \${this.primaryKey} = ?
    \`;
    
    await this.db.query(query, values);
    return this.findById(id);
  }
  
  /**
   * Delete a record
   * @param id - Record ID
   * @returns Success indicator
   */
  async delete(id) {
    const query = \`DELETE FROM \${this.tableName} WHERE \${this.primaryKey} = ?\`;
    const result = await this.db.query(query, [id]);
    return result.affectedRows > 0;
  }
  
  /**
   * Count records
   * @param where - Query criteria
   * @returns Record count
   */
  async count(where = {}) {
    let query = \`SELECT COUNT(*) as count FROM \${this.tableName}\`;
    const params = [];
    
    // Add WHERE clause if conditions are provided
    if (Object.keys(where).length > 0) {
      const whereClause = this._buildWhereClause(where);
      query += \` WHERE \${whereClause.conditions}\`;
      params.push(...whereClause.params);
    }
    
    const result = await this.db.query(query, params);
    return result[0]?.count || 0;
  }
  
  /**
   * Build a WHERE clause from an object
   * @private
   * @param where - Query criteria
   * @returns Object with conditions string and params array
   */
  _buildWhereClause(where) {
    const conditions = [];
    const params = [];
    
    for (const [key, value] of Object.entries(where)) {
      conditions.push(\`\${key} = ?\`);
      params.push(value);
    }
    
    return {
      conditions: conditions.join(' AND '),
      params
    };
  }
}

/**
 * Create CRUD service factory
 * @param db - Database connection
 * @returns Object with CRUD services
 */
export function createCrudServices(db) {
  return {
`;
    
    for (const [tableName, mappings] of tableMap.entries()) {
      const modelName = this.toPascalCase(tableName);
      const serviceVar = this.toCamelCase(tableName);
      
      // Find the primary key column
      const primaryKey = mappings.find(m => m.primaryKey)?.targetField || 'id';
      
      code += `    // ${modelName} CRUD operations
    ${serviceVar}: new BaseCrudService('${tableName}', db),
    
`;
    }
    
    code += `  };
}
`;
    
    return code;
  }

  /* Helper methods */

  private toCamelCase(str: string): string {
    return str.replace(/([-_][a-z])/g, group => 
      group.toUpperCase()
        .replace('-', '')
        .replace('_', '')
    );
  }

  private toPascalCase(str: string): string {
    const camelCase = this.toCamelCase(str);
    return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
  }
}