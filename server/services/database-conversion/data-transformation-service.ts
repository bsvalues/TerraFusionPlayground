/**
 * Data Transformation Service
 * 
 * This service is responsible for transforming data formats during the migration process.
 */

import { IStorage } from '../../storage';
import { MCPService } from '../mcp';
import { FieldType } from './types';

export class DataTransformationService {
  private storage: IStorage;
  private mcpService: MCPService;

  constructor(storage: IStorage, mcpService: MCPService) {
    this.storage = storage;
    this.mcpService = mcpService;
  }

  /**
   * Transform a data value from one type to another
   * @param value The value to transform
   * @param sourceType Source field type
   * @param targetType Target field type
   * @param options Optional transformation options
   */
  public transformValue(
    value: any, 
    sourceType: FieldType, 
    targetType: FieldType, 
    options?: TransformationOptions
  ): any {
    if (value === null || value === undefined) {
      return null;
    }

    try {
      // Handle type conversions
      switch (targetType) {
        case FieldType.String:
          return this.toStringType(value, sourceType, options);
        case FieldType.Number:
        case FieldType.Float:
        case FieldType.Double:
          return this.toNumberType(value, sourceType, options);
        case FieldType.Integer:
        case FieldType.BigInteger:
          return this.toIntegerType(value, sourceType, options);
        case FieldType.Boolean:
          return this.toBooleanType(value, sourceType, options);
        case FieldType.Date:
        case FieldType.DateTime:
        case FieldType.Timestamp:
          return this.toDateType(value, sourceType, options);
        case FieldType.JSON:
        case FieldType.JSONB:
          return this.toJsonType(value, sourceType, options);
        case FieldType.UUID:
          return this.toUuidType(value, sourceType, options);
        case FieldType.Array:
          return this.toArrayType(value, sourceType, options);
        default:
          // For types we don't explicitly handle, attempt a basic conversion or return as-is
          return value;
      }
    } catch (error) {
      console.error(`Error transforming value from ${sourceType} to ${targetType}:`, error);
      
      // Return a default value based on the target type
      return this.getDefaultValueForType(targetType);
    }
  }

  /**
   * Apply a transformation expression to a value
   * @param value The value to transform
   * @param expression The transformation expression
   */
  public applyTransformationExpression(value: any, expression: string): any {
    try {
      // Simple expressions like "value.toUpperCase()" or "value * 2"
      if (expression.includes('value')) {
        // Replace the 'value' token with the actual value
        // WARNING: This is a simplified approach for demo purposes
        // In a production environment, you would use a proper expression parser or sandbox
        
        // For now, we'll handle a few common transformations
        if (expression === 'value.toUpperCase()' && typeof value === 'string') {
          return value.toUpperCase();
        } else if (expression === 'value.toLowerCase()' && typeof value === 'string') {
          return value.toLowerCase();
        } else if (expression === 'value.trim()' && typeof value === 'string') {
          return value.trim();
        } else if (expression.match(/value \* \d+/) && typeof value === 'number') {
          const multiplier = parseInt(expression.split('*')[1].trim(), 10);
          return value * multiplier;
        } else if (expression.match(/value \/ \d+/) && typeof value === 'number') {
          const divisor = parseInt(expression.split('/')[1].trim(), 10);
          return value / divisor;
        } else if (expression.match(/value \+ \d+/) && typeof value === 'number') {
          const addend = parseInt(expression.split('+')[1].trim(), 10);
          return value + addend;
        } else if (expression.match(/value - \d+/) && typeof value === 'number') {
          const subtrahend = parseInt(expression.split('-')[1].trim(), 10);
          return value - subtrahend;
        } else {
          // Fallback
          return value;
        }
      } else if (expression.startsWith('CONCAT(') && expression.endsWith(')')) {
        // Handle CONCAT operation
        const args = expression.substring(7, expression.length - 1).split(',');
        return args.map(arg => {
          const trimmed = arg.trim();
          if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
            return trimmed.substring(1, trimmed.length - 1);
          } else if (trimmed === 'value') {
            return value;
          }
          return trimmed;
        }).join('');
      } else if (expression.startsWith('REPLACE(') && expression.endsWith(')')) {
        // Handle REPLACE operation
        const args = expression.substring(8, expression.length - 1).split(',');
        if (args.length === 3 && typeof value === 'string') {
          const searchStr = args[1].trim().replace(/^'|'$/g, '');
          const replaceStr = args[2].trim().replace(/^'|'$/g, '');
          return value.replace(new RegExp(searchStr, 'g'), replaceStr);
        }
      } else if (expression === 'CURRENT_TIMESTAMP') {
        return new Date();
      } else if (expression === 'UUID()' || expression === 'GENERATE_UUID()') {
        return this.generateUuid();
      }
      
      // If no transformation matched, return the original value
      return value;
    } catch (error) {
      console.error(`Error applying transformation expression "${expression}":`, error);
      return value;
    }
  }

  /**
   * Attempt field inference based on data
   * @param values Sample values from a field
   * @returns Inferred field type and properties
   */
  public inferFieldAttributes(values: any[]): InferredFieldAttributes {
    // Filter out null and undefined values
    const nonNullValues = values.filter(v => v !== null && v !== undefined);
    
    if (nonNullValues.length === 0) {
      return {
        type: FieldType.String, // Default to string
        nullable: true,
        maxLength: undefined,
        precision: undefined,
        scale: undefined
      };
    }

    // Determine the most common type
    const typeDistribution = this.getTypeDistribution(nonNullValues);
    const mostCommonType = this.getMostCommonType(typeDistribution);
    
    // Initialize field attributes
    const fieldAttributes: InferredFieldAttributes = {
      type: mostCommonType,
      nullable: values.some(v => v === null || v === undefined),
      maxLength: undefined,
      precision: undefined,
      scale: undefined
    };

    // Fill in type-specific attributes
    switch (mostCommonType) {
      case FieldType.String:
        fieldAttributes.maxLength = this.inferStringMaxLength(nonNullValues);
        break;
      case FieldType.Number:
      case FieldType.Float:
      case FieldType.Decimal:
        const precision = this.inferNumericPrecision(nonNullValues);
        fieldAttributes.precision = precision.precision;
        fieldAttributes.scale = precision.scale;
        break;
      case FieldType.Enum:
        fieldAttributes.enumValues = [...new Set(nonNullValues)];
        break;
    }

    return fieldAttributes;
  }

  /* Private transformation helper methods */

  private toStringType(value: any, sourceType: FieldType, options?: TransformationOptions): string {
    switch (sourceType) {
      case FieldType.Number:
      case FieldType.Integer:
      case FieldType.BigInteger:
      case FieldType.Float:
      case FieldType.Double:
      case FieldType.Decimal:
        return value.toString();
      case FieldType.Boolean:
        return value ? 'true' : 'false';
      case FieldType.Date:
      case FieldType.DateTime:
      case FieldType.Timestamp:
        return value instanceof Date 
          ? value.toISOString()
          : new Date(value).toISOString();
      case FieldType.JSON:
      case FieldType.JSONB:
        return JSON.stringify(value);
      case FieldType.Array:
        return Array.isArray(value) 
          ? value.join(',') 
          : String(value);
      default:
        return String(value);
    }
  }

  private toNumberType(value: any, sourceType: FieldType, options?: TransformationOptions): number {
    switch (sourceType) {
      case FieldType.String:
        return parseFloat(value);
      case FieldType.Boolean:
        return value ? 1 : 0;
      case FieldType.Date:
      case FieldType.DateTime:
      case FieldType.Timestamp:
        return value instanceof Date 
          ? value.getTime() 
          : new Date(value).getTime();
      default:
        return Number(value);
    }
  }

  private toIntegerType(value: any, sourceType: FieldType, options?: TransformationOptions): number {
    switch (sourceType) {
      case FieldType.String:
        return parseInt(value, 10);
      case FieldType.Number:
      case FieldType.Float:
      case FieldType.Double:
      case FieldType.Decimal:
        return Math.round(value);
      case FieldType.Boolean:
        return value ? 1 : 0;
      case FieldType.Date:
      case FieldType.DateTime:
      case FieldType.Timestamp:
        return value instanceof Date 
          ? Math.floor(value.getTime() / 1000) 
          : Math.floor(new Date(value).getTime() / 1000);
      default:
        return Math.round(Number(value));
    }
  }

  private toBooleanType(value: any, sourceType: FieldType, options?: TransformationOptions): boolean {
    switch (sourceType) {
      case FieldType.String:
        const lowercaseValue = String(value).toLowerCase();
        return lowercaseValue === 'true' || lowercaseValue === 'yes' || lowercaseValue === '1';
      case FieldType.Number:
      case FieldType.Integer:
      case FieldType.BigInteger:
      case FieldType.Float:
      case FieldType.Double:
      case FieldType.Decimal:
        return value !== 0;
      default:
        return Boolean(value);
    }
  }

  private toDateType(value: any, sourceType: FieldType, options?: TransformationOptions): Date | null {
    try {
      switch (sourceType) {
        case FieldType.String:
          return new Date(value);
        case FieldType.Number:
        case FieldType.Integer:
        case FieldType.BigInteger:
          return new Date(value);
        case FieldType.Timestamp:
          // Assuming timestamp is in seconds (Unix timestamp)
          return new Date(value * 1000);
        default:
          return new Date(value);
      }
    } catch (error) {
      console.error('Error converting to date:', error);
      return null;
    }
  }

  private toJsonType(value: any, sourceType: FieldType, options?: TransformationOptions): object | string {
    switch (sourceType) {
      case FieldType.String:
        try {
          return JSON.parse(value);
        } catch (error) {
          // If not valid JSON, wrap in an object
          return { value };
        }
      case FieldType.Array:
        return Array.isArray(value) ? value : [value];
      default:
        // For other types, try to create a JSON representation
        if (typeof value === 'object' && value !== null) {
          return value;
        } else {
          return { value };
        }
    }
  }

  private toUuidType(value: any, sourceType: FieldType, options?: TransformationOptions): string {
    if (sourceType === FieldType.String && this.isValidUuid(value)) {
      return value;
    } else {
      // Generate a new UUID if the value can't be converted
      return this.generateUuid();
    }
  }

  private toArrayType(value: any, sourceType: FieldType, options?: TransformationOptions): any[] {
    switch (sourceType) {
      case FieldType.String:
        try {
          // Try to parse as JSON first
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) ? parsed : value.split(',').map(item => item.trim());
        } catch (error) {
          // If not valid JSON, split by comma
          return value.split(',').map(item => item.trim());
        }
      case FieldType.JSON:
      case FieldType.JSONB:
        return Array.isArray(value) ? value : [value];
      default:
        return [value];
    }
  }

  private getDefaultValueForType(type: FieldType): any {
    switch (type) {
      case FieldType.String:
        return '';
      case FieldType.Number:
      case FieldType.Integer:
      case FieldType.BigInteger:
      case FieldType.Float:
      case FieldType.Double:
      case FieldType.Decimal:
        return 0;
      case FieldType.Boolean:
        return false;
      case FieldType.Date:
      case FieldType.DateTime:
      case FieldType.Timestamp:
        return new Date();
      case FieldType.JSON:
      case FieldType.JSONB:
        return {};
      case FieldType.UUID:
        return this.generateUuid();
      case FieldType.Array:
        return [];
      default:
        return null;
    }
  }

  private generateUuid(): string {
    // Simple UUID generator for demo purposes
    // In a real implementation, you would use a proper UUID library
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private isValidUuid(str: string): boolean {
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return regex.test(str);
  }

  /* Field inference helper methods */

  private getTypeDistribution(values: any[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    values.forEach(value => {
      let type = typeof value;
      
      // Refine types for more specific categories
      if (type === 'object') {
        if (value instanceof Date) {
          type = 'date';
        } else if (Array.isArray(value)) {
          type = 'array';
        } else if (value === null) {
          type = 'null';
        }
      } else if (type === 'number') {
        if (Number.isInteger(value)) {
          type = 'integer';
        } else {
          type = 'float';
        }
      } else if (type === 'string') {
        // Check if string is a valid date
        if (!isNaN(Date.parse(value))) {
          type = 'date-string';
        }
        // Check if string is a valid UUID
        else if (this.isValidUuid(value)) {
          type = 'uuid';
        }
      }
      
      distribution[type] = (distribution[type] || 0) + 1;
    });
    
    return distribution;
  }

  private getMostCommonType(distribution: Record<string, number>): FieldType {
    let maxCount = 0;
    let mostCommonType = '';
    
    for (const [type, count] of Object.entries(distribution)) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonType = type;
      }
    }
    
    // Map to FieldType enum
    switch (mostCommonType) {
      case 'string':
        return FieldType.String;
      case 'integer':
        return FieldType.Integer;
      case 'float':
        return FieldType.Float;
      case 'boolean':
        return FieldType.Boolean;
      case 'date':
      case 'date-string':
        return FieldType.DateTime;
      case 'array':
        return FieldType.Array;
      case 'uuid':
        return FieldType.UUID;
      case 'object':
        return FieldType.JSON;
      default:
        return FieldType.String; // Default fallback
    }
  }

  private inferStringMaxLength(values: string[]): number {
    return Math.max(...values.map(v => String(v).length)) * 2; // Double for safety margin
  }

  private inferNumericPrecision(values: number[]): { precision: number, scale: number } {
    let maxPrecision = 0;
    let maxScale = 0;
    
    values.forEach(value => {
      const strValue = value.toString();
      const parts = strValue.split('.');
      
      // Total digits
      const totalDigits = strValue.replace('.', '').length;
      if (totalDigits > maxPrecision) {
        maxPrecision = totalDigits;
      }
      
      // Decimal places
      if (parts.length > 1) {
        const decimalPlaces = parts[1].length;
        if (decimalPlaces > maxScale) {
          maxScale = decimalPlaces;
        }
      }
    });
    
    // Add safety margins
    maxPrecision = Math.min(maxPrecision + 2, 38); // Max precision for most DBs is 38
    maxScale = Math.min(maxScale + 1, 18); // Max scale for most DBs is 18
    
    return { precision: maxPrecision, scale: maxScale };
  }
}

/* Types for the Data Transformation Service */

export interface TransformationOptions {
  format?: string;
  truncate?: boolean;
  defaultValue?: any;
  customTransformer?: (value: any) => any;
}

export interface InferredFieldAttributes {
  type: FieldType;
  nullable: boolean;
  maxLength?: number;
  precision?: number;
  scale?: number;
  enumValues?: any[];
}