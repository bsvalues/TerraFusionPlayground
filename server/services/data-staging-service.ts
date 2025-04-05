import { IStorage } from '../storage';
import { AuditLog, InsertAuditLog, InsertProperty, Property } from '../../shared/schema';

/**
 * Service for staging data before committing to main tables
 * Follows the import_staging and export_snapshots pattern
 */
export class DataStagingService {
  // In-memory stage for property data (in a real implementation, this would be in a staging table)
  private stagedProperties: Map<string, StagedProperty> = new Map();
  
  constructor(private storage: IStorage) {}
  
  /**
   * Stage a property for import
   * @param property The property data to stage
   * @param source The source of the data
   * @returns The staged property data with a staging ID
   */
  async stageProperty(property: InsertProperty, source: string): Promise<StagedProperty> {
    const stagingId = `stg_${Date.now()}_${property.propertyId}`;
    
    const stagedProperty: StagedProperty = {
      stagingId,
      property,
      validationStatus: 'pending',
      validationErrors: [],
      stagedAt: new Date(),
      source,
      committedAt: null
    };
    
    this.stagedProperties.set(stagingId, stagedProperty);
    
    // Log the staging activity
    await this.storage.createAuditLog({
      userId: 1, // System user
      action: 'STAGE',
      entityType: 'property',
      entityId: property.propertyId,
      details: { stagingId, source },
      ipAddress: 'system'
    });
    
    return stagedProperty;
  }
  
  /**
   * Stage multiple properties for import
   * @param properties The properties to stage
   * @param source The source of the data
   * @returns Map of staged properties
   */
  async stageProperties(properties: InsertProperty[], source: string): Promise<Map<string, StagedProperty>> {
    const stagedPropertiesMap = new Map<string, StagedProperty>();
    
    for (const property of properties) {
      const stagedProperty = await this.stageProperty(property, source);
      stagedPropertiesMap.set(stagedProperty.stagingId, stagedProperty);
    }
    
    return stagedPropertiesMap;
  }
  
  /**
   * Validate staged properties against business rules
   * @param stagingIds Optional array of staging IDs to validate (validates all if not provided)
   * @returns The validation results
   */
  async validateStagedProperties(stagingIds?: string[]): Promise<StagingValidationResult> {
    const idsToValidate = stagingIds || Array.from(this.stagedProperties.keys());
    const validationResult: StagingValidationResult = {
      totalValidated: idsToValidate.length,
      valid: 0,
      invalid: 0,
      detailedResults: []
    };
    
    for (const id of idsToValidate) {
      const stagedProperty = this.stagedProperties.get(id);
      
      if (!stagedProperty) {
        validationResult.invalid++;
        validationResult.detailedResults.push({
          stagingId: id,
          isValid: false,
          errors: [`Staged property with ID ${id} not found`]
        });
        continue;
      }
      
      // Reset validation state
      stagedProperty.validationErrors = [];
      
      // Perform validations
      if (!stagedProperty.property.propertyId) {
        stagedProperty.validationErrors.push('Property ID is required');
      }
      
      if (!stagedProperty.property.parcelNumber) {
        stagedProperty.validationErrors.push('Parcel number is required');
      }
      
      if (!stagedProperty.property.address) {
        stagedProperty.validationErrors.push('Address is required');
      }
      
      // Check for duplicates in existing data
      try {
        const existingProperty = await this.storage.getPropertyByPropertyId(stagedProperty.property.propertyId);
        if (existingProperty) {
          stagedProperty.validationErrors.push(`Property with ID ${stagedProperty.property.propertyId} already exists`);
        }
      } catch (error) {
        console.error(`Error checking for duplicate property: ${error}`);
        stagedProperty.validationErrors.push('Error checking for duplicate property');
      }
      
      // Update validation status
      stagedProperty.validationStatus = stagedProperty.validationErrors.length === 0 ? 'valid' : 'invalid';
      
      // Update result counts
      if (stagedProperty.validationStatus === 'valid') {
        validationResult.valid++;
      } else {
        validationResult.invalid++;
      }
      
      // Add to detailed results
      validationResult.detailedResults.push({
        stagingId: id,
        isValid: stagedProperty.validationStatus === 'valid',
        errors: stagedProperty.validationErrors
      });
    }
    
    return validationResult;
  }
  
  /**
   * Commit validated properties to the main tables
   * @param stagingIds Optional array of staging IDs to commit (commits all valid properties if not provided)
   * @returns The commit results
   */
  async commitStagedProperties(stagingIds?: string[]): Promise<StagingCommitResult> {
    // Determine which staging IDs to commit
    let idsToCommit: string[];
    
    if (stagingIds) {
      idsToCommit = stagingIds;
    } else {
      // Get all valid staged properties
      idsToCommit = Array.from(this.stagedProperties.entries())
        .filter(([_, stagedProperty]) => stagedProperty.validationStatus === 'valid')
        .map(([id, _]) => id);
    }
    
    const commitResult: StagingCommitResult = {
      totalAttempted: idsToCommit.length,
      successful: 0,
      failed: 0,
      detailedResults: []
    };
    
    // Commit each property
    for (const id of idsToCommit) {
      const stagedProperty = this.stagedProperties.get(id);
      
      if (!stagedProperty) {
        commitResult.failed++;
        commitResult.detailedResults.push({
          stagingId: id,
          success: false,
          propertyId: null,
          error: `Staged property with ID ${id} not found`
        });
        continue;
      }
      
      // Skip invalid properties
      if (stagedProperty.validationStatus !== 'valid') {
        commitResult.failed++;
        commitResult.detailedResults.push({
          stagingId: id,
          success: false,
          propertyId: stagedProperty.property.propertyId,
          error: `Cannot commit invalid property: ${stagedProperty.validationErrors.join(', ')}`
        });
        continue;
      }
      
      try {
        // Commit to main table
        const committedProperty = await this.storage.createProperty(stagedProperty.property);
        
        // Update staged property
        stagedProperty.committedAt = new Date();
        
        // Update result
        commitResult.successful++;
        commitResult.detailedResults.push({
          stagingId: id,
          success: true,
          propertyId: committedProperty.propertyId,
          error: null
        });
        
        // Log the commit
        await this.storage.createAuditLog({
          userId: 1, // System user
          action: 'COMMIT',
          entityType: 'property',
          entityId: committedProperty.propertyId,
          details: { stagingId: id, source: stagedProperty.source },
          ipAddress: 'system'
        });
        
      } catch (error) {
        commitResult.failed++;
        commitResult.detailedResults.push({
          stagingId: id,
          success: false,
          propertyId: stagedProperty.property.propertyId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    // Create system activity for the overall commit
    await this.storage.createSystemActivity({
      agentId: 1, // Data Management Agent
      activity: `Committed ${commitResult.successful} properties with ${commitResult.failed} failures`,
      entityType: 'import',
      entityId: 'property_stage_commit'
    });
    
    return commitResult;
  }
  
  /**
   * Get all staged properties
   * @returns Map of all staged properties
   */
  getStagedProperties(): Map<string, StagedProperty> {
    return this.stagedProperties;
  }
  
  /**
   * Get a staged property by its staging ID
   * @param stagingId The staging ID
   * @returns The staged property or undefined if not found
   */
  getStagedProperty(stagingId: string): StagedProperty | undefined {
    return this.stagedProperties.get(stagingId);
  }
  
  /**
   * Delete a staged property
   * @param stagingId The staging ID
   * @returns True if deleted, false if not found
   */
  async deleteStagedProperty(stagingId: string): Promise<boolean> {
    const stagedProperty = this.stagedProperties.get(stagingId);
    
    if (!stagedProperty) {
      return false;
    }
    
    const result = this.stagedProperties.delete(stagingId);
    
    if (result) {
      // Log the deletion
      await this.storage.createAuditLog({
        userId: 1, // System user
        action: 'DELETE_STAGED',
        entityType: 'property',
        entityId: stagedProperty.property.propertyId,
        details: { stagingId, source: stagedProperty.source },
        ipAddress: 'system'
      });
    }
    
    return result;
  }
  
  /**
   * Create a snapshot of existing property data (for export/backup)
   * @param propertyIds Optional array of property IDs to snapshot (snapshots all if not provided)
   * @returns The snapshot result
   */
  async createPropertySnapshot(propertyIds?: string[]): Promise<SnapshotResult> {
    let properties: Property[];
    
    if (propertyIds) {
      properties = [];
      for (const id of propertyIds) {
        const property = await this.storage.getPropertyByPropertyId(id);
        if (property) {
          properties.push(property);
        }
      }
    } else {
      properties = await this.storage.getAllProperties();
    }
    
    const snapshotId = `snap_${Date.now()}`;
    const snapshotResult: SnapshotResult = {
      snapshotId,
      timestamp: new Date(),
      recordCount: properties.length,
      data: properties
    };
    
    // Log the snapshot
    await this.storage.createSystemActivity({
      agentId: 1, // Data Management Agent
      activity: `Created property snapshot with ${properties.length} records`,
      entityType: 'snapshot',
      entityId: snapshotId
    });
    
    return snapshotResult;
  }
}

/**
 * Interface for staged property data
 */
export interface StagedProperty {
  stagingId: string;
  property: InsertProperty;
  validationStatus: 'pending' | 'valid' | 'invalid';
  validationErrors: string[];
  stagedAt: Date;
  source: string;
  committedAt: Date | null;
}

/**
 * Interface for staging validation results
 */
export interface StagingValidationResult {
  totalValidated: number;
  valid: number;
  invalid: number;
  detailedResults: {
    stagingId: string;
    isValid: boolean;
    errors: string[];
  }[];
}

/**
 * Interface for staging commit results
 */
export interface StagingCommitResult {
  totalAttempted: number;
  successful: number;
  failed: number;
  detailedResults: {
    stagingId: string;
    success: boolean;
    propertyId: string | null;
    error: string | null;
  }[];
}

/**
 * Interface for property snapshot results
 */
export interface SnapshotResult {
  snapshotId: string;
  timestamp: Date;
  recordCount: number;
  data: Property[];
}