import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import { IStorage } from '../storage';
import { InsertProperty, InsertLandRecord, InsertImprovement, InsertField } from '../../shared/schema';

/**
 * Service for importing data from various sources into the system
 */
export class DataImportService {
  constructor(private storage: IStorage) {}

  /**
   * Import properties and related data from a CSV file
   * @param filePath Path to the CSV file
   * @returns Summary of the import operation
   */
  async importPropertiesFromCSV(filePath: string): Promise<ImportResult> {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      
      // Parse CSV file
      parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      })
      .on('data', (data) => {
        results.push(data);
      })
      .on('error', (error) => {
        reject(error);
      })
      .on('end', async () => {
        try {
          const importResult = await this.processPropertyData(results);
          resolve(importResult);
        } catch (error) {
          reject(error);
        }
      });
    });
  }
  
  /**
   * Process parsed property data and import into the system
   * @param parsedData The parsed data from CSV
   * @returns Summary of the import operation
   */
  private async processPropertyData(parsedData: any[]): Promise<ImportResult> {
    const result: ImportResult = {
      totalRecords: parsedData.length,
      successfulImports: 0,
      failedImports: 0,
      propertyImportResults: [],
      errors: []
    };
    
    // Process each property record
    for (const data of parsedData) {
      try {
        // Validate required fields
        if (!data.propertyId || !data.address || !data.parcelNumber) {
          throw new Error(`Missing required fields for property: ${JSON.stringify(data)}`);
        }
        
        // Create property object
        const propertyData: InsertProperty = {
          propertyId: data.propertyId,
          parcelNumber: data.parcelNumber,
          address: data.address,
          propertyType: data.propertyType || 'Residential',
          acres: data.acres || '0.0',
          value: data.value || '0',
          status: data.status || 'active'
        };
        
        // Import property
        const property = await this.storage.createProperty(propertyData);
        
        // Create land records if applicable
        if (data.zoning || data.landUseCode) {
          const landRecord: InsertLandRecord = {
            propertyId: property.propertyId,
            zoning: data.zoning || 'Unknown',
            landUseCode: data.landUseCode || 'Unknown',
            floodZone: data.floodZone || null,
            topography: data.topography || null,
            frontage: data.frontage || null,
            depth: data.depth || null,
            shape: data.shape || null,
            utilities: data.utilities || null
          };
          
          await this.storage.createLandRecord(landRecord);
        }
        
        // Create improvements if applicable
        if (data.improvementType || data.squareFeet) {
          const improvement: InsertImprovement = {
            propertyId: property.propertyId,
            improvementType: data.improvementType || 'Building',
            yearBuilt: data.yearBuilt ? parseInt(data.yearBuilt) : null,
            squareFeet: data.squareFeet || null,
            bedrooms: data.bedrooms ? parseInt(data.bedrooms) : null,
            bathrooms: data.bathrooms || null,
            quality: data.quality || null,
            condition: data.condition || null
          };
          
          await this.storage.createImprovement(improvement);
        }
        
        // Create additional fields if needed
        if (data.extraFields) {
          try {
            const extraFields = JSON.parse(data.extraFields);
            for (const [key, value] of Object.entries(extraFields)) {
              const field: InsertField = {
                propertyId: property.propertyId,
                fieldType: key,
                fieldValue: String(value)
              };
              
              await this.storage.createField(field);
            }
          } catch (error) {
            console.warn(`Failed to parse extra fields for property ${property.propertyId}: ${error}`);
          }
        }
        
        result.successfulImports++;
        result.propertyImportResults.push({
          propertyId: property.propertyId,
          success: true,
          message: 'Property imported successfully'
        });
        
        // Create audit log
        await this.storage.createAuditLog({
          userId: 1, // System user
          action: 'IMPORT',
          entityType: 'property',
          entityId: property.propertyId,
          details: { source: 'CSV Import', propertyId: property.propertyId },
          ipAddress: 'system'
        });
        
      } catch (error) {
        result.failedImports++;
        result.errors.push({
          record: data,
          error: error instanceof Error ? error.message : String(error)
        });
        result.propertyImportResults.push({
          propertyId: data.propertyId || 'unknown',
          success: false,
          message: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    // Create system activity for the overall import
    await this.storage.createSystemActivity({
      agentId: 1, // Data Management Agent
      activity: `Imported ${result.successfulImports} properties with ${result.failedImports} failures`,
      entityType: 'import',
      entityId: 'property_batch'
    });
    
    return result;
  }
  
  /**
   * Import property data from a direct database connection
   * This is a placeholder for future implementation - would connect to PACS database
   */
  async importPropertiesFromDatabase(connectionString: string, query: string): Promise<ImportResult> {
    // This would be implemented to connect directly to the PACS database
    // For now, return a not implemented result
    return {
      totalRecords: 0,
      successfulImports: 0,
      failedImports: 0,
      propertyImportResults: [],
      errors: [{
        record: {},
        error: 'Direct database import not yet implemented'
      }]
    };
  }
  
  /**
   * Validate a CSV file before importing
   * @param filePath Path to the CSV file
   * @returns Validation results
   */
  async validateCSVFile(filePath: string): Promise<ValidationResult> {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      const validationResult: ValidationResult = {
        isValid: true,
        totalRecords: 0,
        validRecords: 0,
        invalidRecords: 0,
        errors: []
      };
      
      // Parse CSV file
      parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      })
      .on('data', (data) => {
        results.push(data);
        validationResult.totalRecords++;
        
        // Validate required fields
        if (!data.propertyId || !data.address || !data.parcelNumber) {
          validationResult.isValid = false;
          validationResult.invalidRecords++;
          validationResult.errors.push({
            record: data,
            error: `Missing required fields for property: ${JSON.stringify(data)}`
          });
        } else {
          validationResult.validRecords++;
        }
      })
      .on('error', (error) => {
        reject(error);
      })
      .on('end', () => {
        resolve(validationResult);
      });
    });
  }
}

/**
 * Interface for import operation results
 */
export interface ImportResult {
  totalRecords: number;
  successfulImports: number;
  failedImports: number;
  propertyImportResults: PropertyImportResult[];
  errors: ImportError[];
}

/**
 * Interface for individual property import results
 */
export interface PropertyImportResult {
  propertyId: string;
  success: boolean;
  message: string;
}

/**
 * Interface for import errors
 */
export interface ImportError {
  record: any;
  error: string;
}

/**
 * Interface for CSV validation results
 */
export interface ValidationResult {
  isValid: boolean;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  errors: ImportError[];
}