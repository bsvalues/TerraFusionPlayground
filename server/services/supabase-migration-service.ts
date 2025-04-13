/**
 * Supabase Migration Service
 * 
 * This service provides functionality to migrate data from the existing database
 * to Supabase. It includes methods for migrating specific data types and
 * utilities for data transformation.
 */

import { IStorage } from '../storage';
import { database } from '../../shared/supabase-client';
import { TABLES } from '../../shared/supabase-schema';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export class SupabaseMigrationService {
  private storage: IStorage;
  private batchSize: number = 100; // Default batch size for migrations

  /**
   * Creates an instance of SupabaseMigrationService.
   * @param {IStorage} storage - The storage interface to use for fetching data from the existing database
   */
  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Validate Supabase connection
   * @returns {Promise<boolean>} - True if connection is valid, false otherwise
   */
  async validateConnection(): Promise<boolean> {
    try {
      // Simple ping query to test connection
      const { error } = await database.from('system_health').select('count(*)', { count: 'exact', head: true });
      
      // If the table doesn't exist, that might be fine - we just want to test connection
      if (error && error.code !== 'PGRST116') {
        logger.error('Supabase connection validation failed:', error);
        return false;
      }
      
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
      logger.info('Starting properties migration');
      
      // Get all properties from existing database
      const properties = await this.storage.getProperties();
      
      // Prepare batches for processing
      const batches = this.createBatches(properties, this.batchSize);
      let totalInserted = 0;
      
      // Process each batch
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const supabaseProperties = batch.map(property => ({
          id: uuidv4(),
          property_id: property.propertyId,
          address: property.address,
          parcel_number: property.parcelNumber,
          property_type: property.propertyType,
          status: property.status,
          acres: parseFloat(property.acres) || 0,
          value: property.value ? parseFloat(property.value) : null,
          extra_fields: property.extraFields || null,
          created_at: new Date(property.createdAt).toISOString(),
          updated_at: new Date(property.lastUpdated).toISOString()
        }));
        
        const { error } = await database.from(TABLES.PROPERTIES).insert(supabaseProperties);
        
        if (error) {
          logger.error(`Error during property batch ${i+1} insertion:`, error);
          return { success: false, error };
        }
        
        totalInserted += batch.length;
        logger.info(`Migrated properties batch ${i+1}/${batches.length} (${totalInserted}/${properties.length})`);
      }
      
      logger.info(`Properties migration completed successfully. Migrated ${totalInserted} properties.`);
      return { success: true, count: totalInserted };
    } catch (error) {
      logger.error('Error migrating properties:', error);
      return { success: false, error };
    }
  }

  /**
   * Migrate property analyses from the existing database to Supabase
   * @returns {Promise<{success: boolean, count?: number, error?: any}>} - Migration result
   */
  async migratePropertyAnalyses(): Promise<{success: boolean, count?: number, error?: any}> {
    try {
      logger.info('Starting property analyses migration');
      
      // Get all property analyses from existing database
      const analyses = await this.storage.getPropertyAnalyses();
      
      // Prepare batches for processing
      const batches = this.createBatches(analyses, this.batchSize);
      let totalInserted = 0;
      
      // Process each batch
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const supabaseAnalyses = batch.map(analysis => ({
          id: uuidv4(),
          property_id: analysis.propertyId,
          analysis_id: analysis.analysisId,
          title: analysis.title,
          description: analysis.description,
          methodology: analysis.methodology,
          value_conclusion: analysis.valueConclusion ? parseFloat(analysis.valueConclusion) : null,
          confidence_level: analysis.confidenceLevel || null,
          comparable_properties: analysis.comparableProperties || null,
          adjustment_notes: analysis.adjustmentNotes,
          created_by: analysis.createdBy.toString(),
          approved_by: analysis.approvedBy ? analysis.approvedBy.toString() : null,
          review_date: analysis.reviewDate ? new Date(analysis.reviewDate).toISOString() : null,
          created_at: new Date(analysis.createdAt).toISOString(),
          updated_at: new Date(analysis.lastUpdated).toISOString(),
          status: analysis.status
        }));
        
        const { error } = await database.from(TABLES.PROPERTY_ANALYSES).insert(supabaseAnalyses);
        
        if (error) {
          logger.error(`Error during property analyses batch ${i+1} insertion:`, error);
          return { success: false, error };
        }
        
        totalInserted += batch.length;
        logger.info(`Migrated property analyses batch ${i+1}/${batches.length} (${totalInserted}/${analyses.length})`);
      }
      
      logger.info(`Property analyses migration completed successfully. Migrated ${totalInserted} analyses.`);
      return { success: true, count: totalInserted };
    } catch (error) {
      logger.error('Error migrating property analyses:', error);
      return { success: false, error };
    }
  }

  /**
   * Migrate property appeals from the existing database to Supabase
   * @returns {Promise<{success: boolean, count?: number, error?: any}>} - Migration result
   */
  async migratePropertyAppeals(): Promise<{success: boolean, count?: number, error?: any}> {
    try {
      logger.info('Starting property appeals migration');
      
      // Get all property appeals from existing database
      const appeals = await this.storage.getPropertyAppeals();
      
      // Prepare batches for processing
      const batches = this.createBatches(appeals, this.batchSize);
      let totalInserted = 0;
      
      // Process each batch
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const supabaseAppeals = batch.map(appeal => ({
          id: uuidv4(),
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
        
        const { error } = await database.from(TABLES.PROPERTY_APPEALS).insert(supabaseAppeals);
        
        if (error) {
          logger.error(`Error during property appeals batch ${i+1} insertion:`, error);
          return { success: false, error };
        }
        
        totalInserted += batch.length;
        logger.info(`Migrated property appeals batch ${i+1}/${batches.length} (${totalInserted}/${appeals.length})`);
      }
      
      logger.info(`Property appeals migration completed successfully. Migrated ${totalInserted} appeals.`);
      return { success: true, count: totalInserted };
    } catch (error) {
      logger.error('Error migrating property appeals:', error);
      return { success: false, error };
    }
  }

  /**
   * Migrate data lineage records from the existing database to Supabase
   * @returns {Promise<{success: boolean, count?: number, error?: any}>} - Migration result
   */
  async migrateDataLineage(): Promise<{success: boolean, count?: number, error?: any}> {
    try {
      logger.info('Starting data lineage migration');
      
      // Get all data lineage records from existing database
      const dataChanges = await this.storage.getDataLineageRecords();
      
      // Prepare batches for processing
      const batches = this.createBatches(dataChanges, this.batchSize);
      let totalInserted = 0;
      
      // Process each batch
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const supabaseDataChanges = batch.map(change => ({
          id: uuidv4(),
          property_id: change.propertyId,
          field_name: change.fieldName,
          old_value: change.oldValue,
          new_value: change.newValue,
          change_timestamp: new Date(change.changeTimestamp).toISOString(),
          source: change.source,
          user_id: change.userId.toString(),
          source_details: change.sourceDetails || null,
          created_at: new Date(change.createdAt).toISOString()
        }));
        
        const { error } = await database.from(TABLES.PROPERTY_DATA_CHANGES).insert(supabaseDataChanges);
        
        if (error) {
          logger.error(`Error during data lineage batch ${i+1} insertion:`, error);
          return { success: false, error };
        }
        
        totalInserted += batch.length;
        logger.info(`Migrated data lineage batch ${i+1}/${batches.length} (${totalInserted}/${dataChanges.length})`);
      }
      
      logger.info(`Data lineage migration completed successfully. Migrated ${totalInserted} records.`);
      return { success: true, count: totalInserted };
    } catch (error) {
      logger.error('Error migrating data lineage:', error);
      return { success: false, error };
    }
  }

  /**
   * Migrate agent experiences from the existing database to Supabase
   * @returns {Promise<{success: boolean, count?: number, error?: any}>} - Migration result
   */
  async migrateAgentExperiences(): Promise<{success: boolean, count?: number, error?: any}> {
    try {
      logger.info('Starting agent experiences migration');
      
      // Get all agent experiences from existing database
      const experiences = await this.storage.getAgentExperiences();
      
      // Prepare batches for processing
      const batches = this.createBatches(experiences, this.batchSize);
      let totalInserted = 0;
      
      // Process each batch
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const supabaseExperiences = batch.map(exp => ({
          id: uuidv4(),
          agent_id: exp.agentId,
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
        
        const { error } = await database.from(TABLES.AGENT_EXPERIENCES).insert(supabaseExperiences);
        
        if (error) {
          logger.error(`Error during agent experiences batch ${i+1} insertion:`, error);
          return { success: false, error };
        }
        
        totalInserted += batch.length;
        logger.info(`Migrated agent experiences batch ${i+1}/${batches.length} (${totalInserted}/${experiences.length})`);
      }
      
      logger.info(`Agent experiences migration completed successfully. Migrated ${totalInserted} experiences.`);
      return { success: true, count: totalInserted };
    } catch (error) {
      logger.error('Error migrating agent experiences:', error);
      return { success: false, error };
    }
  }

  /**
   * Migrate property market trends from the existing database to Supabase
   * @returns {Promise<{success: boolean, count?: number, error?: any}>} - Migration result
   */
  async migratePropertyMarketTrends(): Promise<{success: boolean, count?: number, error?: any}> {
    try {
      logger.info('Starting property market trends migration');
      
      // Get all property market trends from existing database
      const trends = await this.storage.getPropertyMarketTrends();
      
      // Prepare batches for processing
      const batches = this.createBatches(trends, this.batchSize);
      let totalInserted = 0;
      
      // Process each batch
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const supabaseTrends = batch.map(trend => ({
          id: uuidv4(),
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
        
        const { error } = await database.from(TABLES.PROPERTY_MARKET_TRENDS).insert(supabaseTrends);
        
        if (error) {
          logger.error(`Error during property market trends batch ${i+1} insertion:`, error);
          return { success: false, error };
        }
        
        totalInserted += batch.length;
        logger.info(`Migrated property market trends batch ${i+1}/${batches.length} (${totalInserted}/${trends.length})`);
      }
      
      logger.info(`Property market trends migration completed successfully. Migrated ${totalInserted} trends.`);
      return { success: true, count: totalInserted };
    } catch (error) {
      logger.error('Error migrating property market trends:', error);
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
    logger.info('Starting complete data migration to Supabase');
    
    const results: Record<string, {success: boolean, count?: number, error?: any}> = {};
    let overallSuccess = true;
    
    // Validate connection before starting
    const connectionValid = await this.validateConnection();
    if (!connectionValid) {
      logger.error('Cannot proceed with migration. Supabase connection validation failed.');
      return { 
        success: false, 
        results: { 
          connection: { 
            success: false, 
            error: 'Supabase connection validation failed' 
          } 
        } 
      };
    }
    
    // Migrate properties
    results.properties = await this.migrateProperties();
    if (!results.properties.success) overallSuccess = false;
    
    // Migrate property analyses
    results.analyses = await this.migratePropertyAnalyses();
    if (!results.analyses.success) overallSuccess = false;
    
    // Migrate property appeals
    results.appeals = await this.migratePropertyAppeals();
    if (!results.appeals.success) overallSuccess = false;
    
    // Migrate data lineage records
    results.dataLineage = await this.migrateDataLineage();
    if (!results.dataLineage.success) overallSuccess = false;
    
    // Migrate agent experiences
    results.agentExperiences = await this.migrateAgentExperiences();
    if (!results.agentExperiences.success) overallSuccess = false;
    
    // Migrate property market trends
    results.marketTrends = await this.migratePropertyMarketTrends();
    if (!results.marketTrends.success) overallSuccess = false;
    
    if (overallSuccess) {
      logger.info('Complete data migration to Supabase completed successfully');
    } else {
      logger.warn('Complete data migration to Supabase completed with some errors');
    }
    
    return { success: overallSuccess, results };
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