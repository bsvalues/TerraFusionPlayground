/**
 * Types for Database Conversion System
 */

/**
 * Database types supported by the conversion system
 */
export enum DatabaseType {
  PostgreSQL = 'postgresql',
  MySQL = 'mysql',
  SQLite = 'sqlite',
  SQLServer = 'sqlserver',
  Oracle = 'oracle',
  MongoDB = 'mongodb',
  Firestore = 'firestore',
  DynamoDB = 'dynamodb',
  Prisma = 'prisma',
  Knex = 'knex',
  Drizzle = 'drizzle',
  Sequelize = 'sequelize',
  TypeORM = 'typeorm',
  MikroORM = 'mikroorm',
  ObjectionJS = 'objectionjs',
  Custom = 'custom'
}

/**
 * Schema field type mapping
 */
export enum FieldType {
  String = 'string',
  Number = 'number',
  Integer = 'integer',
  BigInteger = 'bigint',
  Float = 'float', 
  Double = 'double',
  Decimal = 'decimal',
  Boolean = 'boolean',
  Date = 'date',
  DateTime = 'datetime',
  Time = 'time',
  Timestamp = 'timestamp',
  JSON = 'json',
  JSONB = 'jsonb',
  UUID = 'uuid',
  Binary = 'binary',
  Blob = 'blob',
  Text = 'text',
  Enum = 'enum',
  Array = 'array',
  Object = 'object',
  Geography = 'geography',
  Geometry = 'geometry',
  Point = 'point',
  Custom = 'custom'
}

/**
 * Connection test result
 */
export interface ConnectionTestResult {
  success: boolean;
  message: string;
  error?: string;
  metaInfo?: Record<string, any>;
}

/**
 * Schema analysis result
 */
export interface SchemaAnalysisResult {
  tables: TableSchema[];
  views: ViewSchema[];
  relationships: Relationship[];
  statistics: SchemaStatistics;
}

/**
 * Schema statistics
 */
export interface SchemaStatistics {
  tableCount: number;
  viewCount: number;
  relationshipCount: number;
  totalFieldsCount: number;
  indexCount: number;
  triggersCount: number;
  storedProceduresCount: number;
  databaseSize?: string;
}

/**
 * Table schema
 */
export interface TableSchema {
  name: string;
  schema?: string;
  description?: string;
  fields: FieldSchema[];
  primaryKey?: string[];
  uniqueKeys?: string[][];
  indexes?: IndexSchema[];
  rowCount?: number;
}

/**
 * View schema
 */
export interface ViewSchema {
  name: string;
  schema?: string;
  description?: string;
  fields: FieldSchema[];
  definition?: string;
}

/**
 * Field schema
 */
export interface FieldSchema {
  name: string;
  type: FieldType;
  nativeType: string;
  primaryKey?: boolean;
  nullable?: boolean;
  defaultValue?: any;
  maxLength?: number;
  precision?: number;
  scale?: number;
  enumValues?: string[];
  description?: string;
  constraints?: string[];
}

/**
 * Index schema
 */
export interface IndexSchema {
  name: string;
  fields: string[];
  unique: boolean;
  type?: string;
}

/**
 * Relationship
 */
export interface Relationship {
  name?: string;
  type: 'oneToOne' | 'oneToMany' | 'manyToOne' | 'manyToMany';
  sourceTable: string;
  sourceFields: string[];
  targetTable: string;
  targetFields: string[];
  onUpdate?: string;
  onDelete?: string;
}

/**
 * Schema mapping
 */
export interface SchemaMapping {
  sourceField: string;
  sourceTable: string;
  targetField: string;
  targetTable: string;
  transformationExpression?: string;
}

/**
 * Conversion operation status
 */
export enum ConversionStatus {
  NotStarted = 'not_started',
  Analyzing = 'analyzing',
  Planning = 'planning',
  Converting = 'converting',
  GeneratingCompatibilityLayer = 'generating_compatibility_layer',
  Testing = 'testing',
  Completed = 'completed',
  Failed = 'failed',
  Cancelled = 'cancelled',
  Paused = 'paused'
}

/**
 * Conversion operation result
 */
export interface ConversionResult {
  status: ConversionStatus;
  startTime: Date;
  endTime?: Date;
  tablesProcessed: number;
  totalTables: number;
  recordsProcessed: number;
  errorCount: number;
  warnings: string[];
  errors: string[];
  targetConnectionInfo?: Record<string, any>;
}

/**
 * Compatibility layer options
 */
export interface CompatibilityLayerOptions {
  generateMigrationScripts?: boolean;
  generateORMModels?: boolean;
  ormType?: 'sequelize' | 'typeorm' | 'prisma' | 'drizzle' | 'mongoose' | 'custom';
  includeQueryHelpers?: boolean;
  includeCRUDOperations?: boolean;
  includeDataValidation?: boolean;
}

/**
 * Database type information
 */
export interface DatabaseTypeInfo {
  id: DatabaseType;
  name: string;
  description: string;
  features: string[];
  connectionStringFormat: string;
  connectionStringExample: string;
  icon?: string;
  maxSupportedTableCount?: number;
  compatibilityNotes?: string;
  documentationUrl?: string;
}