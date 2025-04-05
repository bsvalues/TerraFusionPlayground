/**
 * Data Import Service
 * 
 * This service handles importing property data from CSV files, 
 * including validation, parsing, and storing in the database.
 */

import fs from 'fs';
import { parse } from 'csv-parse';
import { IStorage } from '../storage';
import { DataStagingService } from './data-staging-service';
import { InsertProperty } from '../../shared/schema';

export interface ValidationResult {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  isValid: boolean;
  errors?: string[];
}

export interface ImportResult {
  total: number;
  successfulImports: number;
  failedImports: number;
  errors?: string[];
}

export interface StagingResult {
  total: number;
  staged: number;
  failed: number;
  stagingIds: string[];
  errors?: string[];
}

export class DataImportService {
  private stagingService: DataStagingService;
  
  constructor(private storage: IStorage) {
    this.stagingService = new DataStagingService(storage);
  }
  
  /**
   * Validate a CSV file containing property data
   * @param filePath Path to the CSV file
   * @returns Validation result
   */
  async validateCSV(filePath: string): Promise<ValidationResult> {
    return new Promise((resolve, reject) => {
      const records: any[] = [];
      const errors: string[] = [];
      let totalRecords = 0;
      
      fs.createReadStream(filePath)
        .pipe(parse({
          columns: true,
          skip_empty_lines: true,
          trim: true
        }))
        .on('data', (record) => {
          totalRecords++;
          records.push(record);
        })
        .on('error', (error) => {
          reject(error);
        })
        .on('end', () => {
          // Validate each record
          const validationResults = records.map(record => this.validatePropertyRecord(record));
          const validRecords = validationResults.filter(result => result.isValid).length;
          const invalidRecords = totalRecords - validRecords;
          
          // Collect all errors
          validationResults.forEach(result => {
            if (!result.isValid && result.errors) {
              errors.push(...result.errors);
            }
          });
          
          resolve({
            totalRecords,
            validRecords,
            invalidRecords,
            isValid: invalidRecords === 0 && totalRecords > 0,
            errors: errors.length > 0 ? errors : undefined
          });
        });
    });
  }
  
  /**
   * Import properties directly from a CSV file to the database
   * @param filePath Path to the CSV file
   * @returns Import result
   */
  async importPropertiesFromCSV(filePath: string): Promise<ImportResult> {
    return new Promise((resolve, reject) => {
      const records: any[] = [];
      const errors: string[] = [];
      let totalRecords = 0;
      
      fs.createReadStream(filePath)
        .pipe(parse({
          columns: true,
          skip_empty_lines: true,
          trim: true
        }))
        .on('data', (record) => {
          totalRecords++;
          records.push(record);
        })
        .on('error', (error) => {
          reject(error);
        })
        .on('end', async () => {
          let successfulImports = 0;
          let failedImports = 0;
          
          // Process each record
          for (const record of records) {
            try {
              const validationResult = this.validatePropertyRecord(record);
              
              if (!validationResult.isValid) {
                failedImports++;
                if (validationResult.errors) {
                  errors.push(...validationResult.errors);
                }
                continue;
              }
              
              const property = this.mapRecordToProperty(record);
              await this.storage.createProperty(property);
              successfulImports++;
            } catch (error) {
              failedImports++;
              const errorMessage = error instanceof Error ? error.message : String(error);
              errors.push(`Error importing record: ${errorMessage}`);
            }
          }
          
          resolve({
            total: totalRecords,
            successfulImports,
            failedImports,
            errors: errors.length > 0 ? errors : undefined
          });
        });
    });
  }
  
  /**
   * Stage properties from a CSV file for review before committing
   * @param filePath Path to the CSV file
   * @returns Staging result
   */
  async stagePropertiesFromCSV(filePath: string): Promise<StagingResult> {
    return new Promise((resolve, reject) => {
      const records: any[] = [];
      const errors: string[] = [];
      let totalRecords = 0;
      
      fs.createReadStream(filePath)
        .pipe(parse({
          columns: true,
          skip_empty_lines: true,
          trim: true
        }))
        .on('data', (record) => {
          totalRecords++;
          records.push(record);
        })
        .on('error', (error) => {
          reject(error);
        })
        .on('end', async () => {
          let staged = 0;
          let failed = 0;
          const stagingIds: string[] = [];
          
          // Process each record
          for (const record of records) {
            try {
              const property = this.mapRecordToProperty(record);
              const stagedProperty = await this.stagingService.stageProperty(property, 'csv-import');
              staged++;
              stagingIds.push(stagedProperty.stagingId);
            } catch (error) {
              failed++;
              const errorMessage = error instanceof Error ? error.message : String(error);
              errors.push(`Error staging record: ${errorMessage}`);
            }
          }
          
          resolve({
            total: totalRecords,
            staged,
            failed,
            stagingIds,
            errors: errors.length > 0 ? errors : undefined
          });
        });
    });
  }
  
  /**
   * Validate a property record from a CSV file
   * @param record Property record from CSV
   * @returns Validation result
   */
  private validatePropertyRecord(record: any): { isValid: boolean; errors?: string[] } {
    const errors: string[] = [];
    
    // Check required fields
    const requiredFields = ['propertyId', 'address', 'parcelNumber', 'propertyType'];
    for (const field of requiredFields) {
      if (!record[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    }
    
    // Validate propertyId format
    if (record.propertyId && !/^[A-Za-z0-9-_]+$/.test(record.propertyId)) {
      errors.push('Property ID must contain only alphanumeric characters, hyphens, and underscores');
    }
    
    // Validate numeric fields
    const numericFields = ['acres', 'value', 'squareFeet', 'bedrooms', 'bathrooms', 'yearBuilt'];
    for (const field of numericFields) {
      if (record[field] && isNaN(Number(record[field]))) {
        errors.push(`Field ${field} must be a number`);
      }
    }
    
    // Validate status
    if (record.status && !['active', 'pending', 'sold', 'inactive'].includes(record.status.toLowerCase())) {
      errors.push('Status must be one of: active, pending, sold, inactive');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
  
  /**
   * Map a CSV record to a property object
   * @param record Property record from CSV
   * @returns Property object
   */
  private mapRecordToProperty(record: any): InsertProperty {
    // Initialize extraFields to store non-schema properties
    const extraFields: Record<string, any> = {};
    
    // Process extraFields if it exists in the record
    if (record.extraFields) {
      try {
        if (typeof record.extraFields === 'string') {
          Object.assign(extraFields, JSON.parse(record.extraFields));
        } else if (typeof record.extraFields === 'object') {
          Object.assign(extraFields, record.extraFields);
        }
      } catch (error) {
        console.error('Error parsing extraFields:', error);
      }
    }
    
    // Add additional fields to extraFields
    if (record.squareFeet) extraFields.squareFeet = Number(record.squareFeet);
    if (record.bedrooms) extraFields.bedrooms = Number(record.bedrooms);
    if (record.bathrooms) extraFields.bathrooms = Number(record.bathrooms);
    if (record.yearBuilt) extraFields.yearBuilt = Number(record.yearBuilt);
    if (record.improvementType) extraFields.improvementType = record.improvementType;
    if (record.quality) extraFields.quality = record.quality;
    if (record.condition) extraFields.condition = record.condition;
    
    // Convert numeric fields to strings as required by the InsertProperty type
    // For acres (required numeric field in the schema)
    const acres = record.acres ? String(Number(record.acres)) : "0"; // Required field, default to "0"
    // For value (optional numeric field in the schema)
    const value = record.value ? String(Number(record.value)) : null; // Optional field
    
    // Store any additional fields in extraFields
    if (record.zoning) extraFields.zoning = record.zoning;
    if (record.landUseCode) extraFields.landUseCode = record.landUseCode;
    if (record.topography) extraFields.topography = record.topography;
    if (record.floodZone) extraFields.floodZone = record.floodZone;
    
    // Map to property object (matching the exact InsertProperty schema)
    return {
      propertyId: record.propertyId,
      address: record.address,
      parcelNumber: record.parcelNumber,
      propertyType: record.propertyType,
      status: record.status || 'active',
      acres,
      value,
      extraFields
    };
  }
}