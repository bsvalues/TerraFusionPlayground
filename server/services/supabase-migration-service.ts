/**
 * Supabase Migration Service
 * 
 * This service handles the migration of data from the existing database
 * to Supabase. It provides utilities for creating tables, migrating data,
 * and verifying the migration.
 */

import { IStorage } from '../storage';
import supabase, { database } from '../../shared/supabase-client';
import { TABLES } from '../../shared/supabase-schema';
import { logger } from '../utils/logger';

export class SupabaseMigrationService {
  constructor(private storage: IStorage) {}

  /**
   * Check if a table exists in Supabase
   */
  async tableExists(tableName: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', tableName);
      
      if (error) {
        logger.error(`Error checking if table ${tableName} exists: ${error.message}`);
        return false;
      }
      
      return data && data.length > 0;
    } catch (error: any) {
      logger.error(`Error checking if table ${tableName} exists: ${error.message}`);
      return false;
    }
  }

  /**
   * Create tables in Supabase if they don't exist
   */
  async createTables(): Promise<boolean> {
    try {
      // Create tables only if they don't exist
      // Note: This is a simplified example - in production, use migrations with more detailed schema definitions
      const createTablesQuery = `
        -- Create properties table if it doesn't exist
        CREATE TABLE IF NOT EXISTS ${TABLES.PROPERTIES} (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          property_id TEXT NOT NULL UNIQUE,
          address TEXT NOT NULL,
          parcel_number TEXT NOT NULL,
          property_type TEXT NOT NULL,
          status TEXT NOT NULL,
          acres NUMERIC,
          value NUMERIC,
          extra_fields JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create property analyses table if it doesn't exist
        CREATE TABLE IF NOT EXISTS ${TABLES.PROPERTY_ANALYSES} (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          property_id TEXT NOT NULL REFERENCES ${TABLES.PROPERTIES}(property_id),
          analysis_id TEXT NOT NULL UNIQUE,
          title TEXT NOT NULL,
          description TEXT,
          methodology TEXT NOT NULL,
          value_conclusion NUMERIC,
          confidence_level TEXT,
          comparable_properties TEXT[],
          adjustment_notes TEXT,
          created_by TEXT NOT NULL,
          approved_by TEXT,
          review_date TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          status TEXT NOT NULL
        );

        -- Create property appeals table if it doesn't exist
        CREATE TABLE IF NOT EXISTS ${TABLES.PROPERTY_APPEALS} (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          property_id TEXT NOT NULL REFERENCES ${TABLES.PROPERTIES}(property_id),
          user_id TEXT NOT NULL,
          appeal_number TEXT NOT NULL UNIQUE,
          appeal_type TEXT NOT NULL,
          reason TEXT NOT NULL,
          evidence_urls TEXT[],
          hearing_date TIMESTAMP WITH TIME ZONE,
          decision TEXT,
          decision_date TIMESTAMP WITH TIME ZONE,
          notes TEXT,
          status TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          notification_sent BOOLEAN
        );

        -- Create property data changes table if it doesn't exist
        CREATE TABLE IF NOT EXISTS ${TABLES.PROPERTY_DATA_CHANGES} (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          property_id TEXT NOT NULL REFERENCES ${TABLES.PROPERTIES}(property_id),
          field_name TEXT NOT NULL,
          old_value TEXT NOT NULL,
          new_value TEXT NOT NULL,
          change_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
          source TEXT NOT NULL,
          user_id TEXT NOT NULL,
          source_details JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create property insight shares table if it doesn't exist
        CREATE TABLE IF NOT EXISTS ${TABLES.PROPERTY_INSIGHT_SHARES} (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          share_id TEXT NOT NULL UNIQUE,
          property_id TEXT NOT NULL REFERENCES ${TABLES.PROPERTIES}(property_id),
          property_name TEXT NOT NULL,
          property_address TEXT NOT NULL,
          analysis_ids TEXT[],
          created_by TEXT NOT NULL,
          access_token TEXT NOT NULL UNIQUE,
          expires_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          access_count INTEGER DEFAULT 0,
          last_accessed_at TIMESTAMP WITH TIME ZONE
        );

        -- Create agent experiences table if it doesn't exist
        CREATE TABLE IF NOT EXISTS ${TABLES.AGENT_EXPERIENCES} (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          agent_id TEXT NOT NULL,
          agent_name TEXT NOT NULL,
          experience_id TEXT NOT NULL UNIQUE,
          action TEXT NOT NULL,
          entity_type TEXT,
          entity_id TEXT,
          state JSONB NOT NULL,
          reward NUMERIC NOT NULL,
          priority INTEGER NOT NULL,
          feedback TEXT,
          timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          used_for_training BOOLEAN DEFAULT FALSE
        );

        -- Create user profiles table if it doesn't exist
        CREATE TABLE IF NOT EXISTS ${TABLES.USER_PROFILES} (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          auth_id TEXT NOT NULL UNIQUE,
          email TEXT NOT NULL UNIQUE,
          display_name TEXT NOT NULL,
          role TEXT NOT NULL,
          organization_id TEXT,
          preferences JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          last_login_at TIMESTAMP WITH TIME ZONE
        );

        -- Create organizations table if it doesn't exist
        CREATE TABLE IF NOT EXISTS ${TABLES.ORGANIZATIONS} (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          address TEXT,
          contact_email TEXT,
          contact_phone TEXT,
          subscription_tier TEXT NOT NULL,
          subscription_expires_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create property market trends table if it doesn't exist
        CREATE TABLE IF NOT EXISTS ${TABLES.PROPERTY_MARKET_TRENDS} (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          property_id TEXT NOT NULL REFERENCES ${TABLES.PROPERTIES}(property_id),
          timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
          value NUMERIC NOT NULL,
          percent_change NUMERIC NOT NULL,
          comparable_sales TEXT[],
          market_indicators JSONB NOT NULL,
          prediction_factors JSONB,
          confidence_score NUMERIC NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create compliance reports table if it doesn't exist
        CREATE TABLE IF NOT EXISTS ${TABLES.COMPLIANCE_REPORTS} (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          report_id TEXT NOT NULL UNIQUE,
          year INTEGER NOT NULL,
          county_code TEXT NOT NULL,
          report_type TEXT NOT NULL,
          generated_at TIMESTAMP WITH TIME ZONE NOT NULL,
          submitted_by TEXT,
          submitted_at TIMESTAMP WITH TIME ZONE,
          status TEXT NOT NULL,
          issues JSONB,
          summary JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create functions, triggers, etc. as needed
        -- ...
      `;

      // Execute the query to create tables
      const { error } = await supabase.rpc('exec_sql', { query: createTablesQuery });
      
      if (error) {
        logger.error(`Error creating tables: ${error.message}`);
        return false;
      }
      
      logger.info('Successfully created tables in Supabase');
      return true;
    } catch (error: any) {
      logger.error(`Error creating tables: ${error.message}`);
      return false;
    }
  }

  /**
   * Migrate properties data to Supabase
   */
  async migrateProperties(): Promise<boolean> {
    try {
      // Get all properties from current storage
      const properties = await this.storage.getAllProperties();
      
      if (!properties || properties.length === 0) {
        logger.info('No properties to migrate');
        return true;
      }
      
      logger.info(`Migrating ${properties.length} properties to Supabase`);
      
      // Convert properties to Supabase format
      const supabaseProperties = properties.map(property => ({
        property_id: property.propertyId,
        address: property.address,
        parcel_number: property.parcelNumber,
        property_type: property.propertyType,
        status: property.status,
        acres: parseFloat(property.acres),
        value: property.value ? parseFloat(property.value as string) : null,
        extra_fields: property.extraFields,
        // Don't include id, created_at, updated_at as they'll be generated by Supabase
      }));
      
      // Insert properties into Supabase
      const { data, error } = await supabase
        .from(TABLES.PROPERTIES)
        .upsert(supabaseProperties, { 
          onConflict: 'property_id',
          ignoreDuplicates: false
        });
      
      if (error) {
        logger.error(`Error migrating properties: ${error.message}`);
        return false;
      }
      
      logger.info(`Successfully migrated ${supabaseProperties.length} properties to Supabase`);
      return true;
    } catch (error: any) {
      logger.error(`Error migrating properties: ${error.message}`);
      return false;
    }
  }

  /**
   * Migrate property analyses to Supabase
   */
  async migratePropertyAnalyses(): Promise<boolean> {
    try {
      // Get all property analyses from current storage
      const analyses = await this.storage.getAllPropertyAnalyses();
      
      if (!analyses || analyses.length === 0) {
        logger.info('No property analyses to migrate');
        return true;
      }
      
      logger.info(`Migrating ${analyses.length} property analyses to Supabase`);
      
      // Convert analyses to Supabase format
      const supabaseAnalyses = analyses.map(analysis => ({
        property_id: analysis.propertyId,
        analysis_id: analysis.analysisId,
        title: analysis.title,
        description: analysis.description,
        methodology: analysis.methodology,
        value_conclusion: analysis.valueConclusion ? parseFloat(analysis.valueConclusion as string) : null,
        confidence_level: analysis.confidenceLevel,
        comparable_properties: analysis.comparableProperties,
        adjustment_notes: analysis.adjustmentNotes,
        created_by: analysis.createdBy.toString(),
        approved_by: analysis.approvedBy ? analysis.approvedBy.toString() : null,
        review_date: analysis.reviewDate,
        status: analysis.status,
        // Don't include id, created_at, updated_at as they'll be generated by Supabase
      }));
      
      // Insert analyses into Supabase
      const { data, error } = await supabase
        .from(TABLES.PROPERTY_ANALYSES)
        .upsert(supabaseAnalyses, { 
          onConflict: 'analysis_id',
          ignoreDuplicates: false
        });
      
      if (error) {
        logger.error(`Error migrating property analyses: ${error.message}`);
        return false;
      }
      
      logger.info(`Successfully migrated ${supabaseAnalyses.length} property analyses to Supabase`);
      return true;
    } catch (error: any) {
      logger.error(`Error migrating property analyses: ${error.message}`);
      return false;
    }
  }

  /**
   * Migrate property appeals to Supabase
   */
  async migratePropertyAppeals(): Promise<boolean> {
    try {
      // Get all property appeals from current storage
      const appeals = await this.storage.getAllAppeals();
      
      if (!appeals || appeals.length === 0) {
        logger.info('No property appeals to migrate');
        return true;
      }
      
      logger.info(`Migrating ${appeals.length} property appeals to Supabase`);
      
      // Convert appeals to Supabase format
      const supabaseAppeals = appeals.map(appeal => ({
        property_id: appeal.propertyId,
        user_id: appeal.userId.toString(),
        appeal_number: appeal.appealNumber,
        appeal_type: appeal.appealType,
        reason: appeal.reason,
        evidence_urls: appeal.evidenceUrls,
        hearing_date: appeal.hearingDate,
        decision: appeal.decision,
        decision_date: appeal.decisionDate,
        notes: appeal.notes,
        status: appeal.status,
        notification_sent: appeal.notificationSent,
        // Don't include id, created_at, updated_at as they'll be generated by Supabase
      }));
      
      // Insert appeals into Supabase
      const { data, error } = await supabase
        .from(TABLES.PROPERTY_APPEALS)
        .upsert(supabaseAppeals, { 
          onConflict: 'appeal_number',
          ignoreDuplicates: false
        });
      
      if (error) {
        logger.error(`Error migrating property appeals: ${error.message}`);
        return false;
      }
      
      logger.info(`Successfully migrated ${supabaseAppeals.length} property appeals to Supabase`);
      return true;
    } catch (error: any) {
      logger.error(`Error migrating property appeals: ${error.message}`);
      return false;
    }
  }

  /**
   * Migrate property data changes to Supabase
   */
  async migratePropertyDataChanges(): Promise<boolean> {
    try {
      // Get all property data changes from current storage
      const changes = await this.storage.getPropertyDataChanges();
      
      if (!changes || changes.length === 0) {
        logger.info('No property data changes to migrate');
        return true;
      }
      
      logger.info(`Migrating ${changes.length} property data changes to Supabase`);
      
      // Convert changes to Supabase format
      const supabaseChanges = changes.map(change => ({
        property_id: change.propertyId,
        field_name: change.fieldName,
        old_value: change.oldValue,
        new_value: change.newValue,
        change_timestamp: change.changeTimestamp,
        source: change.source,
        user_id: change.userId.toString(),
        source_details: change.sourceDetails,
        // Don't include id, created_at as they'll be generated by Supabase
      }));
      
      // Insert changes into Supabase
      const { data, error } = await supabase
        .from(TABLES.PROPERTY_DATA_CHANGES)
        .insert(supabaseChanges);
      
      if (error) {
        logger.error(`Error migrating property data changes: ${error.message}`);
        return false;
      }
      
      logger.info(`Successfully migrated ${supabaseChanges.length} property data changes to Supabase`);
      return true;
    } catch (error: any) {
      logger.error(`Error migrating property data changes: ${error.message}`);
      return false;
    }
  }

  /**
   * Migrate property insight shares to Supabase
   */
  async migratePropertyInsightShares(): Promise<boolean> {
    try {
      // Get all property insight shares from current storage
      const shares = await this.storage.getAllPropertyInsightShares();
      
      if (!shares || shares.length === 0) {
        logger.info('No property insight shares to migrate');
        return true;
      }
      
      logger.info(`Migrating ${shares.length} property insight shares to Supabase`);
      
      // Convert shares to Supabase format
      const supabaseShares = shares.map(share => ({
        share_id: share.shareId,
        property_id: share.propertyId,
        property_name: share.propertyName || 'Unknown Property', // Fallback if not available
        property_address: share.propertyAddress || 'Unknown Address', // Fallback if not available
        analysis_ids: share.analysisIds,
        created_by: share.createdBy.toString(),
        access_token: share.accessToken,
        expires_at: share.expiresAt,
        access_count: share.accessCount || 0,
        last_accessed_at: share.lastAccessedAt,
        // Don't include id, created_at as they'll be generated by Supabase
      }));
      
      // Insert shares into Supabase
      const { data, error } = await supabase
        .from(TABLES.PROPERTY_INSIGHT_SHARES)
        .upsert(supabaseShares, { 
          onConflict: 'share_id',
          ignoreDuplicates: false
        });
      
      if (error) {
        logger.error(`Error migrating property insight shares: ${error.message}`);
        return false;
      }
      
      logger.info(`Successfully migrated ${supabaseShares.length} property insight shares to Supabase`);
      return true;
    } catch (error: any) {
      logger.error(`Error migrating property insight shares: ${error.message}`);
      return false;
    }
  }

  /**
   * Migrate agent experiences to Supabase
   */
  async migrateAgentExperiences(): Promise<boolean> {
    try {
      // Get all agent experiences from current storage
      // Note: You may need to implement this method in your storage interface
      const experiences = await this.storage.getAgentExperiences?.() || [];
      
      if (!experiences || experiences.length === 0) {
        logger.info('No agent experiences to migrate');
        return true;
      }
      
      logger.info(`Migrating ${experiences.length} agent experiences to Supabase`);
      
      // Convert experiences to Supabase format
      const supabaseExperiences = experiences.map(exp => ({
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
        timestamp: exp.timestamp,
        used_for_training: exp.usedForTraining || false,
        // Don't include id, created_at as they'll be generated by Supabase
      }));
      
      // Insert experiences into Supabase
      const { data, error } = await supabase
        .from(TABLES.AGENT_EXPERIENCES)
        .upsert(supabaseExperiences, { 
          onConflict: 'experience_id',
          ignoreDuplicates: false
        });
      
      if (error) {
        logger.error(`Error migrating agent experiences: ${error.message}`);
        return false;
      }
      
      logger.info(`Successfully migrated ${supabaseExperiences.length} agent experiences to Supabase`);
      return true;
    } catch (error: any) {
      logger.error(`Error migrating agent experiences: ${error.message}`);
      return false;
    }
  }

  /**
   * Run the complete migration process
   */
  async runMigration(): Promise<boolean> {
    try {
      logger.info('Starting migration to Supabase...');
      
      // Create tables
      const tablesCreated = await this.createTables();
      if (!tablesCreated) {
        logger.error('Failed to create tables. Migration aborted.');
        return false;
      }
      
      // Migrate data in a specific order to respect foreign key constraints
      const propertyMigrated = await this.migrateProperties();
      if (!propertyMigrated) {
        logger.error('Failed to migrate properties. Continuing with other data...');
        // Continue with other migrations even if this one fails
      }
      
      // Migrate other data
      await this.migratePropertyAnalyses();
      await this.migratePropertyAppeals();
      await this.migratePropertyDataChanges();
      await this.migratePropertyInsightShares();
      await this.migrateAgentExperiences();
      
      logger.info('Migration to Supabase completed!');
      return true;
    } catch (error: any) {
      logger.error(`Migration failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Verify migration by comparing record counts
   */
  async verifyMigration(): Promise<Record<string, { source: number, supabase: number, match: boolean }>> {
    const results: Record<string, { source: number, supabase: number, match: boolean }> = {};
    
    try {
      // Verify properties
      const sourceProperties = await this.storage.getAllProperties();
      const { data: supabaseProperties, error: propertiesError } = await supabase
        .from(TABLES.PROPERTIES)
        .select('id');
      
      if (propertiesError) throw new Error(`Error fetching properties from Supabase: ${propertiesError.message}`);
      
      results[TABLES.PROPERTIES] = {
        source: sourceProperties?.length || 0,
        supabase: supabaseProperties?.length || 0,
        match: (sourceProperties?.length || 0) === (supabaseProperties?.length || 0)
      };
      
      // Verify property analyses
      const sourceAnalyses = await this.storage.getAllPropertyAnalyses();
      const { data: supabaseAnalyses, error: analysesError } = await supabase
        .from(TABLES.PROPERTY_ANALYSES)
        .select('id');
      
      if (analysesError) throw new Error(`Error fetching analyses from Supabase: ${analysesError.message}`);
      
      results[TABLES.PROPERTY_ANALYSES] = {
        source: sourceAnalyses?.length || 0,
        supabase: supabaseAnalyses?.length || 0,
        match: (sourceAnalyses?.length || 0) === (supabaseAnalyses?.length || 0)
      };
      
      // Add verification for other tables as needed
      
      logger.info('Migration verification completed', { results });
      return results;
    } catch (error: any) {
      logger.error(`Migration verification failed: ${error.message}`);
      return results;
    }
  }
}