/**
 * Data Transformation Service
 * 
 * This service handles intelligent data transformations during migration,
 * using AI to enhance and clean data as it's being migrated.
 */

import { BaseService } from '../base-service';
import { IStorage } from '../../storage';
import { LLMService } from '../llm-service';
import {
  DatabaseConnectionConfig,
  TableDefinition,
  ColumnDefinition,
  TableMapping
} from './types';

/**
 * Types of data transformations
 */
export enum TransformationType {
  NORMALIZE = 'normalize',
  CLEAN = 'clean',
  FORMAT = 'format',
  SPLIT = 'split',
  MERGE = 'merge',
  EXTRACT = 'extract',
  CALCULATE = 'calculate',
  REMAP = 'remap',
  FILTER = 'filter',
  ENRICH = 'enrich'
}

/**
 * A data transformation rule
 */
export interface TransformationRule {
  /**
   * Type of transformation
   */
  type: TransformationType;
  
  /**
   * Source column(s)
   */
  sourceColumns: string[];
  
  /**
   * Target column(s)
   */
  targetColumns: string[];
  
  /**
   * SQL or other transformation expression
   */
  expression?: string;
  
  /**
   * Natural language description of the transformation
   */
  description: string;
  
  /**
   * Additional parameters for the transformation
   */
  parameters?: Record<string, any>;
  
  /**
   * Should this transformation be applied for all rows or only matching ones
   */
  condition?: string;
}

/**
 * Data cleanup configuration
 */
export interface DataCleanupConfig {
  /**
   * Replace NULL values
   */
  replaceNulls?: {
    /**
     * Columns to apply to
     */
    columns: string[];
    
    /**
     * Default value to use
     */
    defaultValue: any;
  }[];
  
  /**
   * Trim whitespace
   */
  trimWhitespace?: {
    /**
     * Columns to apply to
     */
    columns: string[];
  };
  
  /**
   * Remove duplicate rows
   */
  removeDuplicates?: {
    /**
     * Columns to consider for uniqueness
     */
    uniqueColumns: string[];
  };
  
  /**
   * Standardize case
   */
  standardizeCase?: {
    /**
     * Columns to apply to
     */
    columns: string[];
    
    /**
     * Case to convert to ('upper', 'lower', 'title')
     */
    targetCase: 'upper' | 'lower' | 'title';
  }[];
  
  /**
   * Fix data type issues
   */
  fixDataTypes?: {
    /**
     * Column to apply to
     */
    column: string;
    
    /**
     * Target data type
     */
    targetType: string;
    
    /**
     * Conversion expression
     */
    conversionExpression: string;
  }[];
}

/**
 * Service for transforming data during migration
 */
export class DataTransformationService extends BaseService {
  private llmService: LLMService;
  
  constructor(
    storage: IStorage,
    llmService: LLMService
  ) {
    super('data-transformation-service', storage);
    this.llmService = llmService;
  }
  
  /**
   * Generate transformation rules for a table mapping
   */
  async generateTransformationRules(
    sourceTable: TableDefinition,
    targetTable: TableDefinition,
    naturalLanguageInstructions?: string
  ): Promise<TransformationRule[]> {
    console.log(`Generating transformation rules for ${sourceTable.name} to ${targetTable.name}...`);
    
    // If natural language instructions are provided, use AI to generate transformations
    if (naturalLanguageInstructions) {
      return this.generateAITransformations(sourceTable, targetTable, naturalLanguageInstructions);
    }
    
    // Otherwise, generate basic transformations based on schema differences
    return this.generateBasicTransformations(sourceTable, targetTable);
  }
  
  /**
   * Generate data cleanup configuration
   */
  async generateDataCleanupConfig(
    tableDefinition: TableDefinition,
    sampleData?: any[],
    naturalLanguageInstructions?: string
  ): Promise<DataCleanupConfig> {
    console.log(`Generating data cleanup config for ${tableDefinition.name}...`);
    
    // If natural language instructions are provided, use AI to generate cleanup config
    if (naturalLanguageInstructions) {
      return this.generateAICleanupConfig(tableDefinition, sampleData, naturalLanguageInstructions);
    }
    
    // Otherwise, generate basic cleanup config based on schema
    return this.generateBasicCleanupConfig(tableDefinition, sampleData);
  }
  
  /**
   * Convert transformation rules to SQL expressions for a table mapping
   */
  async transformRulesToMapping(
    sourceTable: TableDefinition,
    targetTable: TableDefinition,
    rules: TransformationRule[]
  ): Promise<TableMapping> {
    console.log('Converting transformation rules to SQL expressions...');
    
    // Create a map of source to target columns for easier lookup
    const columnMap = new Map<string, string>();
    const expressions = new Map<string, string>();
    
    // Start with direct mappings for columns with same name in both tables
    const sourceColumnNames = new Set(sourceTable.columns.map(c => c.name));
    const targetColumnNames = new Set(targetTable.columns.map(c => c.name));
    
    // Find common column names
    const commonColumns = [...sourceColumnNames].filter(col => targetColumnNames.has(col));
    
    // Create direct mappings for common columns
    for (const col of commonColumns) {
      columnMap.set(col, col);
    }
    
    // Apply transformation rules
    for (const rule of rules) {
      switch (rule.type) {
        case TransformationType.NORMALIZE:
        case TransformationType.CLEAN:
        case TransformationType.FORMAT:
          // These are simple transformations that typically affect one column
          if (rule.sourceColumns.length === 1 && rule.targetColumns.length === 1) {
            columnMap.set(rule.sourceColumns[0], rule.targetColumns[0]);
            if (rule.expression) {
              expressions.set(rule.sourceColumns[0], rule.expression);
            }
          }
          break;
          
        case TransformationType.SPLIT:
          // Splitting one source column into multiple target columns
          if (rule.sourceColumns.length === 1 && rule.targetColumns.length > 1 && rule.expression) {
            // The expression should produce multiple columns
            expressions.set(rule.sourceColumns[0], rule.expression);
            // We don't set columnMap here because it's handled by the expression
          }
          break;
          
        case TransformationType.MERGE:
          // Merging multiple source columns into one target column
          if (rule.sourceColumns.length > 1 && rule.targetColumns.length === 1 && rule.expression) {
            // The expression should merge multiple columns
            for (const sourceCol of rule.sourceColumns) {
              // We map each source column to the target, but the expression handles the merge
              columnMap.set(sourceCol, rule.targetColumns[0]);
            }
            expressions.set(rule.targetColumns[0], rule.expression);
          }
          break;
          
        case TransformationType.EXTRACT:
        case TransformationType.CALCULATE:
          // These typically create a new target column based on source column(s)
          if (rule.targetColumns.length === 1 && rule.expression) {
            // The expression extracts or calculates a value
            expressions.set(rule.targetColumns[0], rule.expression);
          }
          break;
          
        case TransformationType.REMAP:
          // Remapping values from one set to another
          if (rule.sourceColumns.length === 1 && rule.targetColumns.length === 1 && rule.expression) {
            columnMap.set(rule.sourceColumns[0], rule.targetColumns[0]);
            expressions.set(rule.sourceColumns[0], rule.expression);
          }
          break;
          
        case TransformationType.FILTER:
          // Filtering rows
          // This doesn't affect column mapping, but adds a condition to the mapping
          break;
          
        case TransformationType.ENRICH:
          // Adding additional data from external sources
          if (rule.targetColumns.length === 1 && rule.expression) {
            expressions.set(rule.targetColumns[0], rule.expression);
          }
          break;
      }
    }
    
    // Create column mappings
    const columnMappings = [];
    
    // Add mappings from the map
    for (const [sourceCol, targetCol] of columnMap.entries()) {
      columnMappings.push({
        sourceColumn: sourceCol,
        targetColumn: targetCol,
        transformation: expressions.get(sourceCol)
      });
    }
    
    // Add any target-only expressions (like calculated columns)
    for (const [targetCol, expr] of expressions.entries()) {
      if (!columnMappings.some(m => m.targetColumn === targetCol)) {
        // This is a target-only expression
        columnMappings.push({
          sourceColumn: '', // No direct source column
          targetColumn: targetCol,
          transformation: expr
        });
      }
    }
    
    // Create the filter condition by combining any FILTER rules
    const filterRules = rules.filter(r => r.type === TransformationType.FILTER);
    const filterCondition = filterRules.length > 0
      ? filterRules.map(r => r.expression).filter(Boolean).join(' AND ')
      : undefined;
    
    // Create the table mapping
    return {
      sourceTable: sourceTable.name,
      targetTable: targetTable.name,
      columnMappings,
      filterCondition
    };
  }
  
  /**
   * Apply data cleanup transformations to a SQL query
   */
  applyDataCleanup(
    baseQuery: string,
    cleanupConfig: DataCleanupConfig,
    dbType: string = 'postgresql'
  ): string {
    let query = baseQuery;
    
    // If the query already has a WHERE clause, we need to extend it rather than replace it
    const hasWhere = query.toLowerCase().includes('where');
    
    // Process each cleanup transformation
    if (cleanupConfig.replaceNulls) {
      for (const replaceNull of cleanupConfig.replaceNulls) {
        for (const column of replaceNull.columns) {
          // Use COALESCE for NULL replacement
          query = query.replace(
            new RegExp(`\\b${column}\\b`, 'g'),
            `COALESCE(${column}, ${this.sqlValueLiteral(replaceNull.defaultValue, dbType)}) AS ${column}`
          );
        }
      }
    }
    
    if (cleanupConfig.trimWhitespace) {
      for (const column of cleanupConfig.trimWhitespace.columns) {
        // Trim whitespace based on database type
        if (dbType === 'postgresql') {
          query = query.replace(
            new RegExp(`\\b${column}\\b`, 'g'),
            `TRIM(${column}) AS ${column}`
          );
        } else if (dbType === 'sqlserver') {
          query = query.replace(
            new RegExp(`\\b${column}\\b`, 'g'),
            `LTRIM(RTRIM(${column})) AS ${column}`
          );
        } else if (dbType === 'mysql') {
          query = query.replace(
            new RegExp(`\\b${column}\\b`, 'g'),
            `TRIM(${column}) AS ${column}`
          );
        }
      }
    }
    
    if (cleanupConfig.standardizeCase) {
      for (const caseRule of cleanupConfig.standardizeCase) {
        for (const column of caseRule.columns) {
          // Apply case transformation based on database type and target case
          if (dbType === 'postgresql') {
            if (caseRule.targetCase === 'upper') {
              query = query.replace(
                new RegExp(`\\b${column}\\b`, 'g'),
                `UPPER(${column}) AS ${column}`
              );
            } else if (caseRule.targetCase === 'lower') {
              query = query.replace(
                new RegExp(`\\b${column}\\b`, 'g'),
                `LOWER(${column}) AS ${column}`
              );
            } else if (caseRule.targetCase === 'title') {
              query = query.replace(
                new RegExp(`\\b${column}\\b`, 'g'),
                `INITCAP(${column}) AS ${column}`
              );
            }
          } else if (dbType === 'sqlserver') {
            if (caseRule.targetCase === 'upper') {
              query = query.replace(
                new RegExp(`\\b${column}\\b`, 'g'),
                `UPPER(${column}) AS ${column}`
              );
            } else if (caseRule.targetCase === 'lower') {
              query = query.replace(
                new RegExp(`\\b${column}\\b`, 'g'),
                `LOWER(${column}) AS ${column}`
              );
            }
          } else if (dbType === 'mysql') {
            if (caseRule.targetCase === 'upper') {
              query = query.replace(
                new RegExp(`\\b${column}\\b`, 'g'),
                `UPPER(${column}) AS ${column}`
              );
            } else if (caseRule.targetCase === 'lower') {
              query = query.replace(
                new RegExp(`\\b${column}\\b`, 'g'),
                `LOWER(${column}) AS ${column}`
              );
            }
          }
        }
      }
    }
    
    if (cleanupConfig.fixDataTypes) {
      for (const typeRule of cleanupConfig.fixDataTypes) {
        // Apply data type conversion
        query = query.replace(
          new RegExp(`\\b${typeRule.column}\\b`, 'g'),
          `${typeRule.conversionExpression} AS ${typeRule.column}`
        );
      }
    }
    
    if (cleanupConfig.removeDuplicates) {
      // To remove duplicates, we need to modify the entire query structure
      // using ROW_NUMBER() or DISTINCT depending on the database type
      
      const uniqueColumns = cleanupConfig.removeDuplicates.uniqueColumns.join(', ');
      
      if (dbType === 'postgresql') {
        // For PostgreSQL, we can use DISTINCT ON
        query = `SELECT DISTINCT ON (${uniqueColumns}) * FROM (${query}) AS source_data`;
      } else if (dbType === 'sqlserver') {
        // For SQL Server, we use ROW_NUMBER()
        query = `
          WITH numbered_rows AS (
            SELECT *, ROW_NUMBER() OVER (PARTITION BY ${uniqueColumns} ORDER BY ${uniqueColumns}) AS row_num
            FROM (${query}) AS source_data
          )
          SELECT * FROM numbered_rows WHERE row_num = 1
        `;
      } else if (dbType === 'mysql') {
        // For MySQL, we can use GROUP BY
        query = `SELECT * FROM (${query}) AS source_data GROUP BY ${uniqueColumns}`;
      }
    }
    
    return query;
  }
  
  /**
   * Format a value as a SQL literal
   */
  private sqlValueLiteral(value: any, dbType: string): string {
    if (value === null) {
      return 'NULL';
    }
    
    if (typeof value === 'string') {
      // Escape single quotes based on database type
      if (dbType === 'postgresql' || dbType === 'mysql') {
        return `'${value.replace(/'/g, "''")}'`;
      } else if (dbType === 'sqlserver') {
        return `'${value.replace(/'/g, "''")}'`;
      }
    }
    
    if (typeof value === 'number') {
      return value.toString();
    }
    
    if (typeof value === 'boolean') {
      if (dbType === 'postgresql') {
        return value ? 'TRUE' : 'FALSE';
      } else if (dbType === 'sqlserver') {
        return value ? '1' : '0';
      } else if (dbType === 'mysql') {
        return value ? '1' : '0';
      }
    }
    
    if (value instanceof Date) {
      if (dbType === 'postgresql') {
        return `'${value.toISOString()}'::timestamp`;
      } else if (dbType === 'sqlserver') {
        return `'${value.toISOString()}'`;
      } else if (dbType === 'mysql') {
        return `'${value.toISOString()}'`;
      }
    }
    
    // Default to string representation
    return `'${value.toString().replace(/'/g, "''")}'`;
  }
  
  /**
   * Generate transformations based on AI analysis
   */
  private async generateAITransformations(
    sourceTable: TableDefinition,
    targetTable: TableDefinition,
    instructions: string
  ): Promise<TransformationRule[]> {
    // Build prompt for AI to generate transformations
    const sourceColumns = sourceTable.columns.map(col => 
      `${col.name} (${col.dataType}${col.isNullable ? ', nullable' : ''})`
    ).join('\n');
    
    const targetColumns = targetTable.columns.map(col => 
      `${col.name} (${col.dataType}${col.isNullable ? ', nullable' : ''})`
    ).join('\n');
    
    const prompt = `
      I need to transform data from a source table to a target table. 
      
      SOURCE TABLE: ${sourceTable.name}
      COLUMNS:
      ${sourceColumns}
      
      TARGET TABLE: ${targetTable.name}
      COLUMNS:
      ${targetColumns}
      
      USER INSTRUCTIONS:
      ${instructions}
      
      Based on the source and target table structures and the user instructions, generate a list of transformation rules in JSON format.
      Each transformation rule should include:
      1. The type of transformation (normalize, clean, format, split, merge, extract, calculate, remap, filter, or enrich)
      2. The source column(s) involved
      3. The target column(s) affected
      4. A SQL expression that implements the transformation (use PostgreSQL syntax)
      5. A natural language description of what the transformation does
      
      Return the transformation rules as a valid JSON array of objects.
    `;
    
    // Call AI to generate transformations
    const response = await this.llmService.generateText(prompt);
    
    try {
      // Parse the response as JSON
      // We need to extract JSON from the response, which might include other text
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in the AI response');
      }
      
      const rules = JSON.parse(jsonMatch[0]) as TransformationRule[];
      return rules;
    } catch (error) {
      console.error('Error parsing AI transformation rules:', error);
      console.log('AI response:', response);
      
      // Return a basic transformation
      return this.generateBasicTransformations(sourceTable, targetTable);
    }
  }
  
  /**
   * Generate basic transformations based on schema differences
   */
  private generateBasicTransformations(
    sourceTable: TableDefinition,
    targetTable: TableDefinition
  ): TransformationRule[] {
    const rules: TransformationRule[] = [];
    
    // Create mappings for columns with same name (identity mapping)
    const sourceColumnNames = new Set(sourceTable.columns.map(c => c.name));
    const targetColumnNames = new Set(targetTable.columns.map(c => c.name));
    
    // Find common column names
    const commonColumns = [...sourceColumnNames].filter(col => targetColumnNames.has(col));
    
    // Create direct mappings for common columns
    for (const col of commonColumns) {
      rules.push({
        type: TransformationType.NORMALIZE,
        sourceColumns: [col],
        targetColumns: [col],
        description: `Direct mapping of column ${col}`
      });
    }
    
    // Check for columns that need data type conversion
    for (const col of commonColumns) {
      const sourceCol = sourceTable.columns.find(c => c.name === col);
      const targetCol = targetTable.columns.find(c => c.name === col);
      
      if (sourceCol.dataType !== targetCol.dataType) {
        // We need a data type conversion
        rules.push({
          type: TransformationType.NORMALIZE,
          sourceColumns: [col],
          targetColumns: [col],
          expression: `CAST(${col} AS ${targetCol.dataType})`,
          description: `Convert ${col} from ${sourceCol.dataType} to ${targetCol.dataType}`
        });
      }
    }
    
    return rules;
  }
  
  /**
   * Generate data cleanup configuration using AI
   */
  private async generateAICleanupConfig(
    tableDefinition: TableDefinition,
    sampleData: any[] = [],
    instructions: string
  ): Promise<DataCleanupConfig> {
    // Build prompt for AI to generate cleanup config
    const columns = tableDefinition.columns.map(col => 
      `${col.name} (${col.dataType}${col.isNullable ? ', nullable' : ''})`
    ).join('\n');
    
    let sampleDataStr = '';
    if (sampleData.length > 0) {
      // Convert sample data to a string representation
      // Limit to maximum 5 rows to keep prompt size reasonable
      const sampleRows = sampleData.slice(0, 5).map(row => 
        JSON.stringify(row)
      ).join('\n');
      
      sampleDataStr = `
        SAMPLE DATA (${Math.min(sampleData.length, 5)} of ${sampleData.length} rows):
        ${sampleRows}
      `;
    }
    
    const prompt = `
      I need to clean data in a table before migration.
      
      TABLE: ${tableDefinition.name}
      COLUMNS:
      ${columns}
      ${sampleDataStr}
      
      USER INSTRUCTIONS:
      ${instructions}
      
      Based on the table structure, sample data, and user instructions, generate a data cleanup configuration in JSON format.
      Include any of the following that are appropriate:
      1. Replace NULL values with defaults
      2. Trim whitespace from string columns
      3. Remove duplicate rows
      4. Standardize case (upper, lower, title case)
      5. Fix data type issues
      
      Return the cleanup configuration as a valid JSON object.
    `;
    
    // Call AI to generate cleanup config
    const response = await this.llmService.generateText(prompt);
    
    try {
      // Parse the response as JSON
      // We need to extract JSON from the response, which might include other text
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON object found in the AI response');
      }
      
      const config = JSON.parse(jsonMatch[0]) as DataCleanupConfig;
      return config;
    } catch (error) {
      console.error('Error parsing AI cleanup config:', error);
      console.log('AI response:', response);
      
      // Return a basic cleanup config
      return this.generateBasicCleanupConfig(tableDefinition, sampleData);
    }
  }
  
  /**
   * Generate basic data cleanup configuration
   */
  private generateBasicCleanupConfig(
    tableDefinition: TableDefinition,
    sampleData: any[] = []
  ): DataCleanupConfig {
    const config: DataCleanupConfig = {};
    
    // Identify string columns for whitespace trimming
    const stringColumns = tableDefinition.columns
      .filter(col => ['varchar', 'char', 'text', 'string'].some(t => col.dataType.toLowerCase().includes(t)))
      .map(col => col.name);
    
    if (stringColumns.length > 0) {
      config.trimWhitespace = {
        columns: stringColumns
      };
    }
    
    // If there's a primary key, suggest removing duplicates based on it
    if (tableDefinition.primaryKey) {
      config.removeDuplicates = {
        uniqueColumns: tableDefinition.primaryKey.columns
      };
    }
    
    return config;
  }
}