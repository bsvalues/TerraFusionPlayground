/**
 * Types for Database Conversion Suite
 * 
 * These types define the various structures used by the database conversion system.
 */

/**
 * Supported database types
 */
export type DatabaseType = 
  | 'postgresql'
  | 'sqlserver'
  | 'mysql'
  | 'oracle'
  | 'mongodb'
  | 'sqlite'
  | 'firebird'
  | 'db2'
  | 'access'
  | 'excel'
  | 'csv'
  | 'unknown';

/**
 * Configuration for connecting to a database
 */
export interface DatabaseConnectionConfig {
  /**
   * Type of database
   */
  type?: DatabaseType;
  
  /**
   * Connection string (if applicable)
   */
  connectionString?: string;
  
  /**
   * Hostname (if not using connection string)
   */
  host?: string;
  
  /**
   * Port (if not using connection string)
   */
  port?: number;
  
  /**
   * Database name (if not using connection string)
   */
  database?: string;
  
  /**
   * Schema name (if applicable)
   */
  schema?: string;
  
  /**
   * Username (if not using connection string)
   */
  username?: string;
  
  /**
   * Password (if not using connection string)
   */
  password?: string;
  
  /**
   * Additional connection options
   */
  options?: Record<string, any>;
  
  /**
   * File path (for file-based databases like SQLite, Access, Excel, CSV)
   */
  filePath?: string;
}

/**
 * Column definition in a database table
 */
export interface ColumnDefinition {
  /**
   * Column name
   */
  name: string;
  
  /**
   * Data type
   */
  dataType: string;
  
  /**
   * Is column nullable
   */
  isNullable: boolean;
  
  /**
   * Default value (if any)
   */
  defaultValue?: string;
  
  /**
   * Maximum length (for string types)
   */
  maxLength?: number;
  
  /**
   * Precision (for numeric types)
   */
  precision?: number;
  
  /**
   * Scale (for numeric types)
   */
  scale?: number;
  
  /**
   * Is this an identity/auto-increment column
   */
  isIdentity?: boolean;
  
  /**
   * Is this a computed column
   */
  isComputed?: boolean;
  
  /**
   * Computation expression (for computed columns)
   */
  computedExpression?: string;
  
  /**
   * Additional metadata specific to database type
   */
  metadata?: Record<string, any>;
}

/**
 * Index definition in a database table
 */
export interface IndexDefinition {
  /**
   * Index name
   */
  name: string;
  
  /**
   * Is this a unique index
   */
  isUnique: boolean;
  
  /**
   * Columns included in the index
   */
  columns: string[];
  
  /**
   * Index type (e.g., btree, hash, etc.)
   */
  type?: string;
  
  /**
   * Additional metadata specific to database type
   */
  metadata?: Record<string, any>;
}

/**
 * Foreign key definition in a database table
 */
export interface ForeignKeyDefinition {
  /**
   * Constraint name
   */
  name: string;
  
  /**
   * Source columns (in the table that contains the foreign key)
   */
  columns: string[];
  
  /**
   * Referenced table
   */
  referencedTable: string;
  
  /**
   * Referenced columns (in the referenced table)
   */
  referencedColumns: string[];
  
  /**
   * On delete action
   */
  onDelete?: 'CASCADE' | 'SET NULL' | 'SET DEFAULT' | 'RESTRICT' | 'NO ACTION';
  
  /**
   * On update action
   */
  onUpdate?: 'CASCADE' | 'SET NULL' | 'SET DEFAULT' | 'RESTRICT' | 'NO ACTION';
  
  /**
   * Additional metadata specific to database type
   */
  metadata?: Record<string, any>;
}

/**
 * Check constraint definition in a database table
 */
export interface CheckConstraintDefinition {
  /**
   * Constraint name
   */
  name: string;
  
  /**
   * SQL expression for the check
   */
  expression: string;
  
  /**
   * Additional metadata specific to database type
   */
  metadata?: Record<string, any>;
}

/**
 * Table definition in a database
 */
export interface TableDefinition {
  /**
   * Table name
   */
  name: string;
  
  /**
   * Schema name (if applicable)
   */
  schema?: string;
  
  /**
   * Table columns
   */
  columns: ColumnDefinition[];
  
  /**
   * Primary key (if any)
   */
  primaryKey?: {
    name: string;
    columns: string[];
  };
  
  /**
   * Indexes (excluding primary key)
   */
  indexes: IndexDefinition[];
  
  /**
   * Foreign keys
   */
  foreignKeys: ForeignKeyDefinition[];
  
  /**
   * Check constraints
   */
  checkConstraints: CheckConstraintDefinition[];
  
  /**
   * Approximate row count (if available)
   */
  approximateRowCount?: number;
  
  /**
   * Approximate size in bytes (if available)
   */
  approximateSize?: number;
  
  /**
   * Is this a temporary table
   */
  isTemporary?: boolean;
  
  /**
   * Additional metadata specific to database type
   */
  metadata?: Record<string, any>;
}

/**
 * View definition in a database
 */
export interface ViewDefinition {
  /**
   * View name
   */
  name: string;
  
  /**
   * Schema name (if applicable)
   */
  schema?: string;
  
  /**
   * SQL definition
   */
  definition: string;
  
  /**
   * Columns in the view
   */
  columns: ColumnDefinition[];
  
  /**
   * Is this a materialized view
   */
  isMaterialized?: boolean;
  
  /**
   * Additional metadata specific to database type
   */
  metadata?: Record<string, any>;
}

/**
 * Procedure/Function definition in a database
 */
export interface ProcedureDefinition {
  /**
   * Procedure/Function name
   */
  name: string;
  
  /**
   * Schema name (if applicable)
   */
  schema?: string;
  
  /**
   * SQL definition
   */
  definition: string;
  
  /**
   * Parameters
   */
  parameters: {
    name: string;
    dataType: string;
    direction: 'IN' | 'OUT' | 'INOUT';
    defaultValue?: string;
  }[];
  
  /**
   * Return type (for functions)
   */
  returnType?: string;
  
  /**
   * Is this a function (true) or procedure (false)
   */
  isFunction: boolean;
  
  /**
   * Additional metadata specific to database type
   */
  metadata?: Record<string, any>;
}

/**
 * Trigger definition in a database
 */
export interface TriggerDefinition {
  /**
   * Trigger name
   */
  name: string;
  
  /**
   * Schema name (if applicable)
   */
  schema?: string;
  
  /**
   * Table the trigger is on
   */
  tableName: string;
  
  /**
   * SQL definition
   */
  definition: string;
  
  /**
   * Events that fire the trigger
   */
  events: ('INSERT' | 'UPDATE' | 'DELETE')[];
  
  /**
   * Timing (before or after the event)
   */
  timing: 'BEFORE' | 'AFTER' | 'INSTEAD OF';
  
  /**
   * Is this a row-level (true) or statement-level (false) trigger
   */
  isRowLevel: boolean;
  
  /**
   * Additional metadata specific to database type
   */
  metadata?: Record<string, any>;
}

/**
 * Schema analysis result
 */
export interface SchemaAnalysisResult {
  /**
   * Database type
   */
  databaseType: DatabaseType;
  
  /**
   * Database version (if available)
   */
  databaseVersion?: string;
  
  /**
   * Database name
   */
  databaseName: string;
  
  /**
   * Tables
   */
  tables: TableDefinition[];
  
  /**
   * Views
   */
  views: ViewDefinition[];
  
  /**
   * Procedures/Functions
   */
  procedures?: ProcedureDefinition[];
  
  /**
   * Triggers
   */
  triggers?: TriggerDefinition[];
  
  /**
   * Additional metadata specific to database type
   */
  metadata?: Record<string, any>;
  
  /**
   * Any issues encountered during analysis
   */
  issues?: {
    severity: 'WARNING' | 'ERROR';
    message: string;
    objectName?: string;
    objectType?: string;
  }[];
}

/**
 * Table mapping in a migration plan
 */
export interface TableMapping {
  /**
   * Source table
   */
  sourceTable: string;
  
  /**
   * Target table
   */
  targetTable: string;
  
  /**
   * Column mappings
   */
  columnMappings: {
    sourceColumn: string;
    targetColumn: string;
    transformation?: string;
  }[];
  
  /**
   * Filter condition for migrating data
   */
  filterCondition?: string;
  
  /**
   * Custom SQL for data transformation
   */
  customTransformationSQL?: string;
  
  /**
   * Skip this table during migration
   */
  skip?: boolean;
  
  /**
   * Reason for skipping (if skip is true)
   */
  skipReason?: string;
}

/**
 * Migration plan
 */
export interface MigrationPlan {
  /**
   * Plan ID
   */
  id?: string;
  
  /**
   * Table mappings
   */
  tableMappings: TableMapping[];
  
  /**
   * View mappings
   */
  viewMappings?: {
    sourceView: string;
    targetView: string;
    rewrittenDefinition?: string;
    skip?: boolean;
    skipReason?: string;
  }[];
  
  /**
   * Procedure/Function mappings
   */
  procedureMappings?: {
    sourceProcedure: string;
    targetProcedure: string;
    rewrittenDefinition?: string;
    skip?: boolean;
    skipReason?: string;
  }[];
  
  /**
   * Trigger mappings
   */
  triggerMappings?: {
    sourceTrigger: string;
    targetTrigger: string;
    rewrittenDefinition?: string;
    skip?: boolean;
    skipReason?: string;
  }[];
  
  /**
   * Custom SQL scripts to run pre-migration
   */
  preMigrationScripts?: string[];
  
  /**
   * Custom SQL scripts to run post-migration
   */
  postMigrationScripts?: string[];
  
  /**
   * Created at timestamp
   */
  createdAt?: Date;
  
  /**
   * Modified at timestamp
   */
  modifiedAt?: Date;
  
  /**
   * AI-generated notes about the migration plan
   */
  notes?: string;
}

/**
 * Options for migration execution
 */
export interface MigrationOptions {
  /**
   * Only create schema, don't migrate data
   */
  schemaOnly?: boolean;
  
  /**
   * Batch size for data migration
   */
  batchSize?: number;
  
  /**
   * Truncate target tables before loading data
   */
  truncateBeforeLoad?: boolean;
  
  /**
   * Disable constraints during data load
   */
  disableConstraintsDuringLoad?: boolean;
  
  /**
   * Create indexes after data load rather than before
   */
  createIndexesAfterDataLoad?: boolean;
  
  /**
   * Skip validation step
   */
  skipValidation?: boolean;
  
  /**
   * Tables to include (if not specified, all mapped tables are included)
   */
  includeTables?: string[];
  
  /**
   * Tables to exclude
   */
  excludeTables?: string[];
  
  /**
   * Progress callback function
   */
  progressCallback?: (progress: number, stage: string) => Promise<void>;
}

/**
 * Result of a database migration
 */
export interface MigrationResult {
  /**
   * Success flag
   */
  success: boolean;
  
  /**
   * Start time
   */
  startTime: Date;
  
  /**
   * End time
   */
  endTime: Date;
  
  /**
   * Table results
   */
  tableResults: {
    tableName: string;
    rowsProcessed: number;
    success: boolean;
    error?: string;
  }[];
  
  /**
   * Total rows processed
   */
  totalRowsProcessed: number;
  
  /**
   * Error message (if any)
   */
  error?: string;
  
  /**
   * Warnings
   */
  warnings: string[];
  
  /**
   * Detailed log
   */
  log: string[];
}

/**
 * Result of creating a compatibility layer
 */
export interface CompatibilityLayerResult {
  /**
   * Success flag
   */
  success: boolean;
  
  /**
   * Created views
   */
  createdViews: {
    name: string;
    definition: string;
  }[];
  
  /**
   * Created functions
   */
  createdFunctions: {
    name: string;
    definition: string;
  }[];
  
  /**
   * Error message (if any)
   */
  error?: string;
  
  /**
   * Documentation
   */
  documentation: string;
}

/**
 * Result of validating a migration
 */
export interface ValidationResult {
  /**
   * Success flag
   */
  success: boolean;
  
  /**
   * Table validations
   */
  tableValidations: {
    tableName: string;
    sourceRowCount: number;
    targetRowCount: number;
    countMatch: boolean;
    dataSamplesMatch: boolean;
    issues: string[];
  }[];
  
  /**
   * Constraint validations
   */
  constraintValidations?: {
    constraintType: string;
    sourceName: string;
    targetName: string;
    isValid: boolean;
    issues: string[];
  }[];
  
  /**
   * Overall issues
   */
  issues: string[];
  
  /**
   * Detailed validation report
   */
  report: string;
}

/**
 * Status of a conversion project
 */
export type ConversionProjectStatus =
  | 'created'
  | 'analyzing'
  | 'analyzed'
  | 'planning'
  | 'planned'
  | 'migrating'
  | 'migrated'
  | 'creating_compatibility'
  | 'compatibility_created'
  | 'validating'
  | 'completed'
  | 'failed';

/**
 * A database conversion project
 */
export interface ConversionProject {
  /**
   * Project ID
   */
  id: string;
  
  /**
   * Project name
   */
  name: string;
  
  /**
   * Project description
   */
  description: string;
  
  /**
   * Source database configuration
   */
  sourceConfig: DatabaseConnectionConfig;
  
  /**
   * Target database configuration
   */
  targetConfig: DatabaseConnectionConfig;
  
  /**
   * Project status
   */
  status: ConversionProjectStatus;
  
  /**
   * Schema analysis result (if analysis is complete)
   */
  schemaAnalysis?: SchemaAnalysisResult;
  
  /**
   * Migration plan (if planning is complete)
   */
  migrationPlan?: MigrationPlan;
  
  /**
   * Migration result (if migration is complete)
   */
  migrationResult?: MigrationResult;
  
  /**
   * Compatibility layer result (if compatibility layer creation is complete)
   */
  compatibilityResult?: CompatibilityLayerResult;
  
  /**
   * Validation result (if validation is complete)
   */
  validationResult?: ValidationResult;
  
  /**
   * Current progress (0-100)
   */
  progress: number;
  
  /**
   * Current stage
   */
  currentStage: string;
  
  /**
   * Error message (if status is 'failed')
   */
  error?: string;
  
  /**
   * Created at timestamp
   */
  createdAt: Date;
  
  /**
   * Updated at timestamp
   */
  updatedAt: Date;
  
  /**
   * Custom metadata
   */
  metadata?: Record<string, any>;
}