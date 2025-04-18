/**
 * Schema Conversion Agent
 * 
 * This agent is responsible for converting GIS data schemas between different formats.
 * It can analyze GIS data structures and create mappings between different schema formats.
 */

import { v4 as uuidv4 } from 'uuid';
import { IStorage } from '../../../storage';
import { 
  GISAgentType, 
  GISTaskType, 
  TaskStatus, 
  IGISAgent 
} from '../agent-orchestration-service';
import { GISAgentTask, InsertAgentMessage } from '@shared/gis-schema';
import { ErrorTrackingService, ErrorSeverity, ErrorCategory, ErrorSource } from '../../error-tracking-service';

export class SchemaConversionAgent implements IGISAgent {
  public id: string;
  public type: GISAgentType;
  public name: string;
  public description: string;
  public capabilities: string[];
  public status: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
  
  private storage: IStorage;
  private errorTrackingService: ErrorTrackingService;
  private isInitialized: boolean = false;
  
  // Supported source formats
  private supportedSourceFormats = [
    'ESRI Shapefile',
    'GeoJSON',
    'KML',
    'GML',
    'PostGIS',
    'MapInfo TAB',
    'Spatialite',
    'CSV with coordinates',
    'OGC GeoPackage'
  ];
  
  // Supported target formats
  private supportedTargetFormats = [
    'GeoJSON',
    'PostGIS',
    'OGC GeoPackage',
    'Spatialite',
    'ESRI Geodatabase',
    'OGC WFS'
  ];
  
  constructor(storage: IStorage, id?: string) {
    this.id = id || `schema-conversion-agent-${uuidv4()}`;
    this.type = GISAgentType.SCHEMA_CONVERSION;
    this.name = 'Schema Conversion Agent';
    this.description = 'Converts GIS data schemas between different formats';
    this.capabilities = [
      'schema-analysis',
      'format-detection', 
      'field-mapping', 
      'schema-validation', 
      'schema-transformation'
    ];
    this.status = 'OFFLINE';
    this.storage = storage;
    this.errorTrackingService = new ErrorTrackingService(storage);
  }
  
  /**
   * Initialize the agent
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    try {
      console.log(`Initializing ${this.name} (${this.id})...`);

      // Log agent initialization - let database generate the ID
      await this.storage.createAgentMessage({
        agentId: this.id,
        type: 'INFO',
        content: `Agent ${this.name} (${this.id}) initialized`,
        timestamp: new Date()
      });

      this.status = 'AVAILABLE';
      this.isInitialized = true;
      console.log(`${this.name} (${this.id}) initialized successfully`);
    } catch (error: any) {
      console.error(`Failed to initialize ${this.name} (${this.id}):`, error);
      this.status = 'OFFLINE';
      
      // Track the error
      this.errorTrackingService.trackGisError(error, {
        component: 'SchemaConversionAgent',
        method: 'initialize',
        agentId: this.id,
        severity: ErrorSeverity.HIGH
      });
      
      throw error;
    }
  }
  
  /**
   * Process a task
   * @param task The task to process
   * @returns The result of the task
   */
  public async processTask(task: GISAgentTask): Promise<any> {
    console.log(`${this.name} (${this.id}) processing task ${task.id}...`);
    
    try {
      // Log task start
      await this.logMessage('INFO', `Processing task ${task.id}: ${task.taskType}`);
      
      // Validate the task
      if (!task.data) {
        throw new Error('Task data is required');
      }
      
      let result;
      
      // Process the task based on its type
      switch (task.taskType) {
        case GISTaskType.SCHEMA_VALIDATION:
          result = await this.validateSchema(task.data);
          break;
        case GISTaskType.FORMAT_CONVERSION:
          result = await this.convertFormat(task.data);
          break;
        default:
          throw new Error(`Unsupported task type: ${task.taskType}`);
      }
      
      // Log task completion
      await this.logMessage('INFO', `Task ${task.id} completed successfully`);
      
      return result;
    } catch (error: any) {
      // Log task failure
      await this.logMessage('ERROR', `Task ${task.id} failed: ${error.message}`);
      
      // Track the error
      this.errorTrackingService.trackGisError(error, {
        component: 'SchemaConversionAgent',
        method: 'processTask',
        agentId: this.id,
        taskId: task.id, 
        taskType: task.taskType,
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.TASK_PROCESSING
      });
      
      throw error;
    }
  }
  
  /**
   * Validate a GIS schema
   * @param data The schema data to validate
   * @returns The validation result
   */
  private async validateSchema(data: any): Promise<any> {
    const { schema, format } = data;
    
    if (!schema) {
      throw new Error('Schema is required for validation');
    }
    
    if (!format) {
      throw new Error('Format is required for validation');
    }
    
    // Check if the format is supported
    if (!this.isSupportedFormat(format)) {
      throw new Error(`Unsupported format: ${format}`);
    }
    
    await this.logMessage('INFO', `Validating schema in ${format} format`);
    
    // Perform validation based on the format
    const validationResults = {
      isValid: true,
      format,
      issues: [],
      warnings: [],
      summary: {}
    };
    
    try {
      // Actual validation logic would be implemented here
      // For now, we'll simulate validation
      
      // Check for required fields based on format
      const requiredFields = this.getRequiredFieldsForFormat(format);
      const missingFields = requiredFields.filter(field => !schema[field]);
      
      if (missingFields.length > 0) {
        validationResults.isValid = false;
        validationResults.issues.push({
          type: 'MISSING_REQUIRED_FIELDS',
          message: `Missing required fields: ${missingFields.join(', ')}`,
          fields: missingFields
        });
      }
      
      // Check for unsupported data types
      const unsupportedTypes = this.findUnsupportedTypes(schema, format);
      if (unsupportedTypes.length > 0) {
        validationResults.isValid = false;
        validationResults.issues.push({
          type: 'UNSUPPORTED_DATA_TYPES',
          message: `Unsupported data types: ${unsupportedTypes.map(ut => `${ut.field}: ${ut.type}`).join(', ')}`,
          fields: unsupportedTypes.map(ut => ut.field)
        });
      }
      
      // Look for potential data loss issues
      const dataLossRisks = this.identifyDataLossRisks(schema, format);
      if (dataLossRisks.length > 0) {
        validationResults.warnings.push({
          type: 'DATA_LOSS_RISK',
          message: `Potential data loss issues: ${dataLossRisks.map(r => `${r.field}: ${r.reason}`).join(', ')}`,
          fields: dataLossRisks.map(r => r.field)
        });
      }
      
      // Generate schema summary
      validationResults.summary = {
        fieldCount: Object.keys(schema).length,
        geometryType: schema.geometryType || 'unknown',
        spatialReference: schema.spatialReference || 'unknown',
        analyzedAt: new Date().toISOString()
      };
      
      await this.logMessage('INFO', `Schema validation ${validationResults.isValid ? 'passed' : 'failed'} with ${validationResults.issues.length} issues and ${validationResults.warnings.length} warnings`);
      
      return validationResults;
    } catch (error: any) {
      await this.logMessage('ERROR', `Schema validation error: ${error.message}`);
      
      // Track the error
      this.errorTrackingService.trackGisError(error, {
        component: 'SchemaConversionAgent',
        method: 'validateSchema',
        agentId: this.id,
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.VALIDATION,
        source: ErrorSource.AGENT,
        context: { format }
      });
      
      throw new Error(`Schema validation failed: ${error.message}`);
    }
  }
  
  /**
   * Convert a GIS schema from one format to another
   * @param data The data containing source schema, source format, and target format
   * @returns The converted schema
   */
  private async convertFormat(data: any): Promise<any> {
    const { sourceSchema, sourceFormat, targetFormat } = data;
    
    if (!sourceSchema) {
      throw new Error('Source schema is required for conversion');
    }
    
    if (!sourceFormat) {
      throw new Error('Source format is required for conversion');
    }
    
    if (!targetFormat) {
      throw new Error('Target format is required for conversion');
    }
    
    // Check if the formats are supported
    if (!this.isSupportedFormat(sourceFormat)) {
      throw new Error(`Unsupported source format: ${sourceFormat}`);
    }
    
    if (!this.isSupportedFormat(targetFormat)) {
      throw new Error(`Unsupported target format: ${targetFormat}`);
    }
    
    await this.logMessage('INFO', `Converting schema from ${sourceFormat} to ${targetFormat}`);
    
    // Perform conversion based on the formats
    try {
      // Actual conversion logic would be implemented here
      // For now, we'll simulate conversion
      
      // Create field mappings between source and target formats
      const fieldMappings = this.createFieldMappings(sourceSchema, sourceFormat, targetFormat);
      
      // Transform the schema
      const targetSchema = this.transformSchema(sourceSchema, fieldMappings, targetFormat);
      
      // Create conversion result
      const conversionResult = {
        sourceFormat,
        targetFormat,
        sourceSchema,
        targetSchema,
        fieldMappings,
        conversionSummary: {
          fieldsMapped: Object.keys(fieldMappings).length,
          fieldsDropped: Object.keys(sourceSchema).length - Object.keys(targetSchema).length,
          convertedAt: new Date().toISOString()
        }
      };
      
      await this.logMessage('INFO', `Schema conversion completed successfully with ${conversionResult.conversionSummary.fieldsMapped} fields mapped and ${conversionResult.conversionSummary.fieldsDropped} fields dropped`);
      
      return conversionResult;
    } catch (error: any) {
      await this.logMessage('ERROR', `Schema conversion error: ${error.message}`);
      
      // Track the error
      this.errorTrackingService.trackGisError(error, {
        component: 'SchemaConversionAgent',
        method: 'convertFormat',
        agentId: this.id,
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.CONVERSION,
        source: ErrorSource.AGENT,
        context: { 
          sourceFormat,
          targetFormat,
          fieldsCount: Object.keys(sourceSchema || {}).length
        }
      });
      
      throw new Error(`Schema conversion failed: ${error.message}`);
    }
  }
  
  /**
   * Check if a format is supported
   * @param format The format to check
   * @returns True if the format is supported, false otherwise
   */
  private isSupportedFormat(format: string): boolean {
    return [...this.supportedSourceFormats, ...this.supportedTargetFormats].includes(format);
  }
  
  /**
   * Get required fields for a format
   * @param format The format to get required fields for
   * @returns The required fields for the format
   */
  private getRequiredFieldsForFormat(format: string): string[] {
    // In a real implementation, this would return the actual required fields for each format
    switch (format) {
      case 'ESRI Shapefile':
        return ['geometry', 'attributes'];
      case 'GeoJSON':
        return ['type', 'geometry', 'properties'];
      case 'PostGIS':
        return ['tableName', 'geometry_column', 'columns'];
      case 'OGC GeoPackage':
        return ['tableName', 'geometry_column', 'columns'];
      default:
        return ['geometry'];
    }
  }
  
  /**
   * Find unsupported data types in a schema for a specific format
   * @param schema The schema to check
   * @param format The format to check against
   * @returns A list of fields with unsupported data types
   */
  private findUnsupportedTypes(schema: any, format: string): {field: string, type: string}[] {
    // In a real implementation, this would check for actual unsupported types for each format
    const unsupportedTypes: {field: string, type: string}[] = [];
    
    // Example implementation
    if (format === 'ESRI Shapefile') {
      // Shapefiles have limited field name lengths and data types
      for (const [field, details] of Object.entries(schema)) {
        if (field.length > 10) {
          unsupportedTypes.push({
            field,
            type: 'field name too long'
          });
        }
        
        if (details.type === 'BLOB' || details.type === 'JSON') {
          unsupportedTypes.push({
            field,
            type: details.type
          });
        }
      }
    }
    
    return unsupportedTypes;
  }
  
  /**
   * Identify potential data loss risks when converting a schema
   * @param schema The schema to check
   * @param format The target format
   * @returns A list of fields with potential data loss risks
   */
  private identifyDataLossRisks(schema: any, format: string): {field: string, reason: string}[] {
    // In a real implementation, this would identify actual data loss risks for each format
    const dataLossRisks: {field: string, reason: string}[] = [];
    
    // Example implementation
    if (format === 'ESRI Shapefile') {
      // Shapefiles have limited field types and sizes
      for (const [field, details] of Object.entries(schema)) {
        if (details.type === 'VARCHAR' && details.length > 254) {
          dataLossRisks.push({
            field,
            reason: 'VARCHAR field length exceeds 254 characters'
          });
        }
        
        if (details.type === 'DATE' && details.hasTimeComponent) {
          dataLossRisks.push({
            field,
            reason: 'Time component will be lost in DATE field'
          });
        }
      }
    }
    
    return dataLossRisks;
  }
  
  /**
   * Create field mappings between source and target formats
   * @param sourceSchema The source schema
   * @param sourceFormat The source format
   * @param targetFormat The target format
   * @returns The field mappings
   */
  private createFieldMappings(sourceSchema: any, sourceFormat: string, targetFormat: string): Record<string, string> {
    // In a real implementation, this would create actual field mappings between formats
    const fieldMappings: Record<string, string> = {};
    
    // Example implementation - just map fields directly for now
    for (const field of Object.keys(sourceSchema)) {
      // Skip fields that can't be mapped to the target format
      if (this.canMapField(field, sourceSchema[field], sourceFormat, targetFormat)) {
        fieldMappings[field] = field;
      }
    }
    
    return fieldMappings;
  }
  
  /**
   * Check if a field can be mapped from one format to another
   * @param field The field name
   * @param fieldDetails The field details
   * @param sourceFormat The source format
   * @param targetFormat The target format
   * @returns True if the field can be mapped, false otherwise
   */
  private canMapField(
    field: string, 
    fieldDetails: any, 
    sourceFormat: string, 
    targetFormat: string
  ): boolean {
    // In a real implementation, this would check if a field can be mapped between formats
    
    // Example implementation - simple check for non-mappable types
    if (targetFormat === 'ESRI Shapefile' && (
      fieldDetails.type === 'BLOB' || 
      fieldDetails.type === 'JSON' || 
      field.length > 10
    )) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Transform a schema from one format to another
   * @param sourceSchema The source schema
   * @param fieldMappings The field mappings
   * @param targetFormat The target format
   * @returns The transformed schema
   */
  private transformSchema(
    sourceSchema: any, 
    fieldMappings: Record<string, string>, 
    targetFormat: string
  ): any {
    // In a real implementation, this would transform the schema between formats
    const targetSchema: any = {};
    
    // Example implementation - simple transformation
    for (const [sourceField, targetField] of Object.entries(fieldMappings)) {
      const fieldDetails = sourceSchema[sourceField];
      
      // Map field details to target format
      targetSchema[targetField] = this.mapFieldToTargetFormat(fieldDetails, targetFormat);
    }
    
    // Add format-specific required fields
    this.addFormatSpecificFields(targetSchema, targetFormat);
    
    return targetSchema;
  }
  
  /**
   * Map field details to a target format
   * @param fieldDetails The field details
   * @param targetFormat The target format
   * @returns The mapped field details
   */
  private mapFieldToTargetFormat(fieldDetails: any, targetFormat: string): any {
    // In a real implementation, this would map field details to the target format
    
    // Example implementation - simple mapping
    const mappedField = { ...fieldDetails };
    
    // Handle format-specific transformations
    if (targetFormat === 'ESRI Shapefile') {
      // Shapefiles have limited data types
      if (mappedField.type === 'VARCHAR') {
        mappedField.type = 'TEXT';
        mappedField.length = Math.min(mappedField.length || 255, 254);
      } else if (mappedField.type === 'INTEGER') {
        mappedField.type = 'NUMBER';
        mappedField.precision = 10;
      } else if (mappedField.type === 'FLOAT' || mappedField.type === 'DOUBLE') {
        mappedField.type = 'NUMBER';
        mappedField.precision = 19;
        mappedField.scale = 11;
      }
    } else if (targetFormat === 'GeoJSON') {
      // GeoJSON properties are just simple types
      if (mappedField.type === 'GEOMETRY') {
        mappedField.type = 'Feature';
      }
    }
    
    return mappedField;
  }
  
  /**
   * Add format-specific fields to a schema
   * @param schema The schema to add fields to
   * @param format The format to add fields for
   */
  private addFormatSpecificFields(schema: any, format: string): void {
    // In a real implementation, this would add actual format-specific fields
    
    // Example implementation
    if (format === 'GeoJSON') {
      schema.type = 'FeatureCollection';
      schema.features = [];
    } else if (format === 'PostGIS') {
      schema.srid = 4326; // Default to WGS84
      schema.schema = 'public'; // Default to public schema
    }
  }
  
  /**
   * Log a message from the agent
   * @param type The message type
   * @param content The message content
   */
  private async logMessage(type: 'INFO' | 'WARNING' | 'ERROR', content: string): Promise<void> {
    try {
      const message: InsertAgentMessage = {
        agentId: this.id,
        type,
        content,
        timestamp: new Date()
      };
      
      await this.storage.createAgentMessage(message);
    } catch (error: any) {
      console.error(`Failed to log message from agent ${this.id}:`, error);
      
      // Track the error, but don't re-throw since this is a non-critical operation
      this.errorTrackingService.trackGisError(error, {
        component: 'SchemaConversionAgent',
        method: 'logMessage',
        agentId: this.id,
        severity: ErrorSeverity.LOW,
        category: ErrorCategory.LOGGING,
        source: ErrorSource.INTERNAL,
        context: { 
          messageType: type,
          messageContent: content.substring(0, 100) // Include just the beginning in case it's long
        }
      });
      
      // Don't throw here, as this is a non-critical operation
    }
  }
  
  /**
   * Shutdown the agent
   */
  public async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }
    
    try {
      console.log(`Shutting down ${this.name} (${this.id})...`);
      
      // Log agent shutdown
      await this.logMessage('INFO', `Agent ${this.name} (${this.id}) shutting down`);
      
      this.status = 'OFFLINE';
      this.isInitialized = false;
      console.log(`${this.name} (${this.id}) shut down successfully`);
    } catch (error: any) {
      console.error(`Failed to shut down ${this.name} (${this.id}):`, error);
      
      // Track the error
      this.errorTrackingService.trackGisError(error, {
        component: 'SchemaConversionAgent',
        method: 'shutdown',
        agentId: this.id,
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.LIFECYCLE,
        source: ErrorSource.INTERNAL,
        context: { 
          agentStatus: this.status,
          isInitialized: this.isInitialized.toString()
        }
      });
      
      throw error;
    }
  }
}

/**
 * Create a new Schema Conversion Agent
 * @param storage The storage implementation
 * @returns A new Schema Conversion Agent
 */
export function createSchemaConversionAgent(storage: IStorage): SchemaConversionAgent {
  return new SchemaConversionAgent(storage);
}