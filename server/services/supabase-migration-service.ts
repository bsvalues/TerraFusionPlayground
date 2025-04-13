/**
 * Supabase Migration Service
 * 
 * This service provides functionality to migrate data from the existing database
 * to Supabase. It includes methods for migrating specific data types and
 * utilities for data transformation.
 */

import supabase from '../../shared/supabase-client';
import { IStorage } from '../storage';
import { TABLES } from '../../shared/supabase-schema';
import { logger } from '../utils/logger';
import { v4 as uuid } from 'uuid';

export class SupabaseMigrationService {
  private storage: IStorage;
  private batchSize: number = 100; // Default batch size for migrations

  /**
   * Create a new instance of SupabaseMigrationService
   * @param {IStorage} storage - Storage instance to use for retrieving existing data
   */
  constructor(storage: IStorage) {
    this.storage = storage;
    logger.info('SupabaseMigrationService initialized');
  }

  /**
   * Set the batch size for migrations
   * @param {number} size - The batch size to use
   */
  setBatchSize(size: number): void {
    this.batchSize = size;
    logger.info(`Migration batch size set to ${size}`);
  }

  /**
   * Validate Supabase connection
   * @returns {Promise<boolean>} - True if connection is valid, false otherwise
   */
  async validateConnection(): Promise<boolean> {
    try {
      // Attempt to fetch a small amount of data to validate connection
      const { data, error } = await supabase
        .from(TABLES.PROPERTIES)
        .select('id')
        .limit(1);
      
      if (error && error.code !== 'PGRST116') {
        // If we get any error other than table not found, connection is not valid
        logger.error('Supabase connection validation failed:', error);
        return false;
      }
      
      // Connection is valid
      logger.info('Supabase connection validation successful');
      return true;
    } catch (error) {
      logger.error('Error validating Supabase connection:', error);
      return false;
    }
  }

  /**
   * Migrate properties from the existing database to Supabase
   * @returns {Promise<{success: boolean, count?: number, error?: any}>} - Migration result
   */
  async migrateProperties(): Promise<{success: boolean, count?: number, error?: any}> {
    try {
      logger.info('Starting property migration to Supabase');
      
      // Get properties from existing storage
      const properties = await this.storage.getProperties();
      
      if (properties.length === 0) {
        logger.info('No properties found to migrate');
        return { success: true, count: 0 };
      }
      
      logger.info(`Found ${properties.length} properties to migrate`);
      
      // Create batches for processing
      const batches = this.createBatches(properties, this.batchSize);
      let totalMigrated = 0;
      
      // Process each batch
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const supabaseProperties = batch.map(prop => ({
          id: uuid(),
          property_id: prop.propertyId,
          address: prop.address,
          parcel_number: prop.parcelNumber,
          property_type: prop.propertyType,
          status: prop.status,
          acres: parseFloat(prop.acres) || 0,
          value: prop.value ? parseFloat(prop.value) : null,
          extra_fields: prop.extraFields || null,
          created_at: new Date(prop.createdAt).toISOString(),
          updated_at: new Date(prop.lastUpdated).toISOString()
        }));
        
        // Insert the batch into Supabase
        const { error } = await supabase
          .from(TABLES.PROPERTIES)
          .insert(supabaseProperties);
        
        if (error) {
          logger.error(`Error migrating property batch ${i+1}:`, error);
          return { success: false, count: totalMigrated, error };
        }
        
        totalMigrated += batch.length;
        logger.info(`Migrated property batch ${i+1}/${batches.length} (${totalMigrated}/${properties.length})`);
      }
      
      logger.info(`Property migration complete: ${totalMigrated} properties migrated`);
      return { success: true, count: totalMigrated };
    } catch (error) {
      logger.error('Error during property migration:', error);
      return { success: false, error };
    }
  }

  /**
   * Migrate property analyses from the existing database to Supabase
   * @returns {Promise<{success: boolean, count?: number, error?: any}>} - Migration result
   */
  async migratePropertyAnalyses(): Promise<{success: boolean, count?: number, error?: any}> {
    try {
      logger.info('Starting property analyses migration to Supabase');
      
      // Get property analyses from existing storage
      const analyses = await this.storage.getPropertyAnalyses();
      
      if (analyses.length === 0) {
        logger.info('No property analyses found to migrate');
        return { success: true, count: 0 };
      }
      
      logger.info(`Found ${analyses.length} property analyses to migrate`);
      
      // Create batches for processing
      const batches = this.createBatches(analyses, this.batchSize);
      let totalMigrated = 0;
      
      // Process each batch
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const supabaseAnalyses = batch.map(analysis => ({
          id: uuid(),
          property_id: analysis.propertyId,
          analysis_id: analysis.analysisId,
          title: analysis.title,
          description: analysis.description,
          methodology: analysis.methodology,
          value_conclusion: analysis.valueConclusion ? parseFloat(analysis.valueConclusion) : null,
          confidence_level: analysis.confidenceLevel || null,
          comparable_properties: analysis.comparableProperties || null,
          adjustment_notes: analysis.adjustmentNotes || null,
          created_by: analysis.createdBy.toString(),
          approved_by: analysis.approvedBy ? analysis.approvedBy.toString() : null,
          review_date: analysis.reviewDate ? new Date(analysis.reviewDate).toISOString() : null,
          created_at: new Date(analysis.createdAt).toISOString(),
          updated_at: new Date(analysis.lastUpdated).toISOString(),
          status: analysis.status
        }));
        
        // Insert the batch into Supabase
        const { error } = await supabase
          .from(TABLES.PROPERTY_ANALYSES)
          .insert(supabaseAnalyses);
        
        if (error) {
          logger.error(`Error migrating property analysis batch ${i+1}:`, error);
          return { success: false, count: totalMigrated, error };
        }
        
        totalMigrated += batch.length;
        logger.info(`Migrated property analysis batch ${i+1}/${batches.length} (${totalMigrated}/${analyses.length})`);
      }
      
      logger.info(`Property analyses migration complete: ${totalMigrated} analyses migrated`);
      return { success: true, count: totalMigrated };
    } catch (error) {
      logger.error('Error during property analyses migration:', error);
      return { success: false, error };
    }
  }

  /**
   * Migrate property appeals from the existing database to Supabase
   * @returns {Promise<{success: boolean, count?: number, error?: any}>} - Migration result
   */
  async migratePropertyAppeals(): Promise<{success: boolean, count?: number, error?: any}> {
    try {
      logger.info('Starting property appeals migration to Supabase');
      
      // Get property appeals from existing storage
      const appeals = await this.storage.getPropertyAppeals();
      
      if (appeals.length === 0) {
        logger.info('No property appeals found to migrate');
        return { success: true, count: 0 };
      }
      
      logger.info(`Found ${appeals.length} property appeals to migrate`);
      
      // Create batches for processing
      const batches = this.createBatches(appeals, this.batchSize);
      let totalMigrated = 0;
      
      // Process each batch
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const supabaseAppeals = batch.map(appeal => ({
          id: uuid(),
          property_id: appeal.propertyId,
          user_id: appeal.userId.toString(),
          appeal_number: appeal.appealNumber,
          appeal_type: appeal.appealType,
          reason: appeal.reason,
          evidence_urls: appeal.evidenceUrls,
          hearing_date: appeal.hearingDate ? new Date(appeal.hearingDate).toISOString() : null,
          decision: appeal.decision,
          decision_date: appeal.decisionDate ? new Date(appeal.decisionDate).toISOString() : null,
          notes: appeal.notes,
          status: appeal.status,
          created_at: new Date(appeal.createdAt).toISOString(),
          updated_at: new Date(appeal.lastUpdated).toISOString(),
          notification_sent: appeal.notificationSent
        }));
        
        // Insert the batch into Supabase
        const { error } = await supabase
          .from(TABLES.PROPERTY_APPEALS)
          .insert(supabaseAppeals);
        
        if (error) {
          logger.error(`Error migrating property appeal batch ${i+1}:`, error);
          return { success: false, count: totalMigrated, error };
        }
        
        totalMigrated += batch.length;
        logger.info(`Migrated property appeal batch ${i+1}/${batches.length} (${totalMigrated}/${appeals.length})`);
      }
      
      logger.info(`Property appeals migration complete: ${totalMigrated} appeals migrated`);
      return { success: true, count: totalMigrated };
    } catch (error) {
      logger.error('Error during property appeals migration:', error);
      return { success: false, error };
    }
  }

  /**
   * Migrate data lineage records from the existing database to Supabase
   * @returns {Promise<{success: boolean, count?: number, error?: any}>} - Migration result
   */
  async migrateDataLineage(): Promise<{success: boolean, count?: number, error?: any}> {
    try {
      logger.info('Starting data lineage migration to Supabase');
      
      // Get data lineage records from existing storage
      const lineageRecords = await this.storage.getDataLineageRecords();
      
      if (lineageRecords.length === 0) {
        logger.info('No data lineage records found to migrate');
        return { success: true, count: 0 };
      }
      
      logger.info(`Found ${lineageRecords.length} data lineage records to migrate`);
      
      // Create batches for processing
      const batches = this.createBatches(lineageRecords, this.batchSize);
      let totalMigrated = 0;
      
      // Process each batch
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const supabaseLineageRecords = batch.map(record => ({
          id: uuid(),
          property_id: record.propertyId,
          field_name: record.fieldName,
          old_value: record.oldValue,
          new_value: record.newValue,
          change_timestamp: new Date(record.changeTimestamp).toISOString(),
          source: record.source,
          user_id: record.userId.toString(),
          source_details: record.sourceDetails || null,
          created_at: new Date(record.createdAt).toISOString()
        }));
        
        // Insert the batch into Supabase
        const { error } = await supabase
          .from(TABLES.PROPERTY_DATA_CHANGES)
          .insert(supabaseLineageRecords);
        
        if (error) {
          logger.error(`Error migrating data lineage batch ${i+1}:`, error);
          return { success: false, count: totalMigrated, error };
        }
        
        totalMigrated += batch.length;
        logger.info(`Migrated data lineage batch ${i+1}/${batches.length} (${totalMigrated}/${lineageRecords.length})`);
      }
      
      logger.info(`Data lineage migration complete: ${totalMigrated} records migrated`);
      return { success: true, count: totalMigrated };
    } catch (error) {
      logger.error('Error during data lineage migration:', error);
      return { success: false, error };
    }
  }

  /**
   * Migrate agent experiences from the existing database to Supabase
   * @returns {Promise<{success: boolean, count?: number, error?: any}>} - Migration result
   */
  async migrateAgentExperiences(): Promise<{success: boolean, count?: number, error?: any}> {
    try {
      logger.info('Starting agent experiences migration to Supabase');
      
      // Get agent experiences from existing storage
      const experiences = await this.storage.getAgentExperiences();
      
      if (!experiences || experiences.length === 0) {
        logger.info('No agent experiences found to migrate');
        return { success: true, count: 0 };
      }
      
      logger.info(`Found ${experiences.length} agent experiences to migrate`);
      
      // Create batches for processing
      const batches = this.createBatches(experiences, this.batchSize);
      let totalMigrated = 0;
      
      // Process each batch
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const supabaseExperiences = batch.map(exp => ({
          id: uuid(),
          agent_id: exp.agentId.toString(),
          agent_name: exp.agentName,
          experience_id: exp.experienceId,
          action: exp.action,
          entity_type: exp.entityType,
          entity_id: exp.entityId,
          state: exp.state,
          reward: exp.reward,
          priority: exp.priority,
          feedback: exp.feedback,
          timestamp: new Date(exp.timestamp).toISOString(),
          created_at: new Date(exp.createdAt).toISOString(),
          used_for_training: exp.usedForTraining
        }));
        
        // Insert the batch into Supabase
        const { error } = await supabase
          .from(TABLES.AGENT_EXPERIENCES)
          .insert(supabaseExperiences);
        
        if (error) {
          logger.error(`Error migrating agent experience batch ${i+1}:`, error);
          return { success: false, count: totalMigrated, error };
        }
        
        totalMigrated += batch.length;
        logger.info(`Migrated agent experience batch ${i+1}/${batches.length} (${totalMigrated}/${experiences.length})`);
      }
      
      logger.info(`Agent experiences migration complete: ${totalMigrated} experiences migrated`);
      return { success: true, count: totalMigrated };
    } catch (error) {
      logger.error('Error during agent experiences migration:', error);
      return { success: false, error };
    }
  }

  /**
   * Migrate property market trends from the existing database to Supabase
   * @returns {Promise<{success: boolean, count?: number, error?: any}>} - Migration result
   */
  async migratePropertyMarketTrends(): Promise<{success: boolean, count?: number, error?: any}> {
    try {
      logger.info('Starting property market trends migration to Supabase');
      
      // Get property market trends from existing storage
      const trends = await this.storage.getPropertyMarketTrends();
      
      if (!trends || trends.length === 0) {
        logger.info('No property market trends found to migrate');
        return { success: true, count: 0 };
      }
      
      logger.info(`Found ${trends.length} property market trends to migrate`);
      
      // Create batches for processing
      const batches = this.createBatches(trends, this.batchSize);
      let totalMigrated = 0;
      
      // Process each batch
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const supabaseTrends = batch.map(trend => ({
          id: uuid(),
          property_id: trend.propertyId,
          timestamp: new Date(trend.timestamp).toISOString(),
          value: trend.value,
          percent_change: trend.percentChange,
          comparable_sales: trend.comparableSales,
          market_indicators: trend.marketIndicators,
          prediction_factors: trend.predictionFactors,
          confidence_score: trend.confidenceScore,
          created_at: new Date(trend.createdAt).toISOString()
        }));
        
        // Insert the batch into Supabase
        const { error } = await supabase
          .from(TABLES.PROPERTY_MARKET_TRENDS)
          .insert(supabaseTrends);
        
        if (error) {
          logger.error(`Error migrating property market trend batch ${i+1}:`, error);
          return { success: false, count: totalMigrated, error };
        }
        
        totalMigrated += batch.length;
        logger.info(`Migrated property market trend batch ${i+1}/${batches.length} (${totalMigrated}/${trends.length})`);
      }
      
      logger.info(`Property market trends migration complete: ${totalMigrated} trends migrated`);
      return { success: true, count: totalMigrated };
    } catch (error) {
      logger.error('Error during property market trends migration:', error);
      return { success: false, error };
    }
  }

  /**
   * Migrate all data from the existing database to Supabase
   * @returns {Promise<{success: boolean, results: Record<string, {success: boolean, count?: number, error?: any}>}>} - Migration result
   */
  async migrateAllData(): Promise<{
    success: boolean,
    results: Record<string, {success: boolean, count?: number, error?: any}>
  }> {
    logger.info('Starting full data migration to Supabase');
    
    // Validate connection first
    const connectionValid = await this.validateConnection();
    if (!connectionValid) {
      return {
        success: false,
        results: {
          connection: { success: false, error: 'Could not establish a valid connection to Supabase' }
        }
      };
    }
    
    // Migrate all data types
    const results: Record<string, {success: boolean, count?: number, error?: any}> = {};
    
    results.properties = await this.migrateProperties();
    results.propertyAnalyses = await this.migratePropertyAnalyses();
    results.propertyAppeals = await this.migratePropertyAppeals();
    results.dataLineage = await this.migrateDataLineage();
    results.agentExperiences = await this.migrateAgentExperiences();
    results.propertyMarketTrends = await this.migratePropertyMarketTrends();
    
    // Check if all migrations were successful
    const allSuccessful = Object.values(results).every(result => result.success);
    
    if (allSuccessful) {
      logger.info('Full data migration to Supabase completed successfully');
    } else {
      logger.error('Some migrations failed during full data migration process');
    }
    
    return {
      success: allSuccessful,
      results
    };
  }

  /**
   * Helper method to create batches of items for processing
   * @param {T[]} items - Array of items to batch
   * @param {number} batchSize - Size of each batch
   * @returns {T[][]} - Array of batches
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    
    return batches;
  }
}